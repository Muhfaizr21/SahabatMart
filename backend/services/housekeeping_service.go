package services

import (
	"fmt"
	"log"
	"time"

	"akuglow/backend/models"
	"gorm.io/gorm"
)

func StartHousekeeping(db *gorm.DB) func() {
	log.Println("🧹 Housekeeping Background Worker Started")
	financeService := NewFinanceService(db)
	notifService := NewNotificationService(db)
	affiliateService := NewAffiliateService(db, notifService)
	orderService := NewOrderService(db)

	stop := make(chan struct{})
	ticker := time.NewTicker(5 * time.Minute)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("🔥 Housekeeping panic recovered: %v", r)
			}
		}()
		defer ticker.Stop()

		for {
			select {
			case <-stop:
				log.Println("🧹 Housekeeping worker stopped")
				return
			case <-ticker.C:
				runHousekeepingCycle(db, financeService, notifService, affiliateService, orderService)
			}
		}
	}()

	return func() { close(stop) }
}

func runHousekeepingCycle(db *gorm.DB,
	financeService *FinanceService,
	notifService *NotificationService,
	affiliateService *AffiliateService,
	orderService *OrderService,
) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("🔥 Housekeeping cycle panic recovered: %v", r)
		}
	}()

	log.Println("🔄 Running Platform Housekeeping...")

	tasks := []struct {
		name string
		fn   func() error
	}{
		{"Settlement", func() error {
			settled, err := financeService.ProcessSettlements()
			if err == nil && settled > 0 {
				log.Printf("💰 Financial Sync: %d transactions settled", settled)
			}
			return err
		}},
		{"Logistics", func() error { return autoUpdateLogisticsWithRetry(db, orderService) }},
		{"Affiliate Commissions", func() error { return releaseAffiliateCommissions(db, notifService) }},
		{"Order Expiry", func() error { return orderService.ExpireOrders() }},
		{"Merchant Overdue", func() error { return autoCancelOverdueMerchantOrders(db, orderService, notifService) }},
		{"Leaderboard Sync", func() error { return affiliateService.SyncLeaderboard() }},
		{"Voucher Cleanup", func() error { return cleanupVouchers(db) }},
		{"Platform Ledger", func() error {
			ledger, err := financeService.SyncPlatformLedger()
			if err == nil {
				log.Printf("📊 Platform Ledger Sync: %+v", ledger)
			}
			return err
		}},
		{"Merchant Downgrade", func() error {
			_, err := affiliateService.CheckAndDowngradeMerchants()
			return err
		}},
	}

	for _, task := range tasks {
		if err := task.fn(); err != nil {
			log.Printf("❌ Housekeeping Error (%s): %v", task.name, err)
		}
	}

	// Check recent affiliates for tier upgrades
	var recentlyActiveAffiliates []models.AffiliateMember
	checkSince := time.Now().Add(-15 * time.Minute)
	db.Where("status = 'active' AND updated_at >= ?", checkSince).Find(&recentlyActiveAffiliates)
	if len(recentlyActiveAffiliates) > 0 {
		log.Printf("👥 Safety Check: Validating tier upgrades for %d recently active affiliates...", len(recentlyActiveAffiliates))
		for _, aff := range recentlyActiveAffiliates {
			go func(id string) {
				defer func() { recover() }()
				affiliateService.TriggerTierUpgrade(id)
			}(aff.ID)
		}
	}

	// Cleanup old logs
	db.Exec("DELETE FROM user_location_logs WHERE created_at < ?", time.Now().AddDate(0, 0, -90))
	db.Exec("DELETE FROM ip_location_caches WHERE created_at < ?", time.Now().AddDate(0, 0, -90))

	// Weekly demographics report
	sendWeeklyDemographicsReport(db)
}

func autoUpdateLogisticsWithRetry(db *gorm.DB, orderService *OrderService) error {
	shippingSvc := NewShippingService(db)
	now := time.Now()
	deadline := now.Add(-48 * time.Hour)

	var groups []models.OrderMerchantGroup
	if err := db.Where("status = ? AND biteship_order_id != '' AND updated_at <= ?",
		models.MOrderShipped, deadline).Find(&groups).Error; err != nil {
		return err
	}

	for _, group := range groups {
		// [FIX #14] Validate biteship_order_id format before calling API
		if len(group.BiteshipOrderID) < 10 {
			log.Printf("⚠️ [FIX #14] Invalid biteship_order_id for group %s: %q", group.ID, group.BiteshipOrderID)
			db.Model(&group).Update("status", models.MOrderCancelled)
			db.Model(&group).Update("cancel_reason", "Status pengiriman tidak valid (invalid Biteship ID)")
			continue
		}

		tracking, err := shippingSvc.GetTracking(group.BiteshipOrderID)
		if err != nil {
			log.Printf("⚠️ [Housekeeping] Biteship tracking check failed for group %s: %v", group.ID, err)
			continue
		}

		status, _ := tracking["status"].(string)
		if status == "delivered" {
			now := time.Now()
			group.Status = models.MOrderDelivered
			group.DeliveredAt = &now
			if err := db.Save(&group).Error; err != nil {
				log.Printf("❌ [Housekeeping] Failed to update delivered status for group %s: %v", group.ID, err)
				continue
			}

			financeService := NewFinanceService(db)
			if err := financeService.UpdateSettlementDatesOnDelivery(db, group.OrderID); err != nil {
				log.Printf("⚠️ [Housekeeping] Failed to update settlement for order %s: %v", group.OrderID, err)
			}

			if err := orderService.SyncOrderStatusFromGroups(db, group.OrderID); err != nil {
				log.Printf("⚠️ [Housekeeping] Failed to sync order status for %s: %v", group.OrderID, err)
			}

			log.Printf("✅ [Housekeeping] Auto-delivered group %s via Biteship tracking", group.ID)
		} else if status == "cancelled" || status == "not_found" {
			// [FIX #14] Auto-cancel groups where Biteship rejected/dropped the shipment
			log.Printf("⚠️ [FIX #14] Biteship %s for group %s, auto-cancelling", status, group.ID)
			db.Model(&group).Updates(map[string]interface{}{
				"status":        models.MOrderCancelled,
				"cancel_reason": fmt.Sprintf("Status pengiriman dari Biteship: %s", status),
			})
		}
	}

	return nil
}

func sendWeeklyDemographicsReport(db *gorm.DB) {
	now := time.Now()
	if now.Weekday() != time.Monday || now.Hour() != 8 {
		return
	}

	weekStr := now.Format("2006-W02")
	var sentCfg models.PlatformConfig
	var lastSent string
	if err := db.Where("key = ?", "last_demographics_report_sent").First(&sentCfg).Error; err == nil {
		lastSent = sentCfg.Value
	}
	if lastSent == weekStr {
		return
	}

	var reportEnabled models.PlatformConfig
	var adminEmail models.PlatformConfig
	db.Where("key = ?", "demographics_weekly_report").First(&reportEnabled)
	db.Where("key = ?", "demographics_admin_email").First(&adminEmail)

	if reportEnabled.Value != "true" || adminEmail.Value == "" {
		return
	}

	var uniqueVisitors int64
	db.Model(&models.UserLocationLog{}).Where("created_at >= ?", now.AddDate(0, 0, -7)).Distinct("ip_hash").Count(&uniqueVisitors)

	var countriesCount int64
	db.Model(&models.UserLocationLog{}).Where("created_at >= ?", now.AddDate(0, 0, -7)).Distinct("country_code").Count(&countriesCount)

	type TopCity struct {
		City  string
		Count int64
	}
	var topCity TopCity
	db.Model(&models.UserLocationLog{}).Where("created_at >= ?", now.AddDate(0, 0, -7)).Select("city, COUNT(DISTINCT ip_hash) as count").Group("city").Order("count DESC").Limit(1).Scan(&topCity)

	var vCount, pCount, cCount, oCount int64
	db.Model(&models.UserLocationLog{}).Where("created_at >= ?", now.AddDate(0, 0, -7)).Distinct("ip_hash").Count(&vCount)
	db.Model(&models.UserLocationLog{}).Where("created_at >= ? AND visited_url LIKE ?", now.AddDate(0, 0, -7), "%/product%").Distinct("ip_hash").Count(&pCount)
	db.Model(&models.UserLocationLog{}).Where("created_at >= ? AND (visited_url LIKE ? OR visited_url LIKE ?)", now.AddDate(0, 0, -7), "%/checkout%", "%/cart%").Distinct("ip_hash").Count(&cCount)
	db.Model(&models.UserLocationLog{}).Where("created_at >= ? AND is_converted = true", now.AddDate(0, 0, -7)).Distinct("ip_hash").Count(&oCount)

	cRate := 0.0
	if vCount > 0 {
		cRate = float64(oCount) / float64(vCount) * 100.0
	}
	recommendation := "- Performa konversi berjalan dengan baik.\n"
	if cRate < 2.0 {
		recommendation = "- Rasio konversi mingguan di bawah 2%. Pertimbangkan promo gratis ongkir atau voucher.\n"
	}

	emailBody := fmt.Sprintf("Halo Admin,\n\nBerikut adalah Laporan Demografi Mingguan AkuGlow untuk periode 7 hari terakhir:\n\nMETRIK UTAMA:\n- Total Pengunjung Unik: %d\n- Jumlah Negara: %d\n- Kota dengan Traffic Tertinggi: %s (%d pengunjung)\n\nFUNNEL:\n- Total: %d\n- Lihat Produk: %d\n- Checkout: %d\n- Transaksi: %d\n\nREKOMENDASI:\n%s\nSalam,\nSistem Analitik AkuGlow",
		uniqueVisitors, countriesCount, topCity.City, topCity.Count,
		vCount, pCount, cCount, oCount, recommendation)

	emailSvc := NewEmailService(db)
	if err := emailSvc.SendEmail(adminEmail.Value, "Laporan Demografi Mingguan AkuGlow - "+weekStr, emailBody); err != nil {
		log.Printf("❌ Failed to send weekly demographics email: %v", err)
		return
	}

	log.Printf("📧 Weekly Demographics Report sent to %s", adminEmail.Value)
	if sentCfg.Key != "" {
		sentCfg.Value = weekStr
		db.Save(&sentCfg)
	} else {
		db.Create(&models.PlatformConfig{Key: "last_demographics_report_sent", Value: weekStr})
	}
}

// cleanupVouchers: Menonaktifkan voucher yang expired atau habis kuota
func cleanupVouchers(db *gorm.DB) error {
	now := time.Now()
	// Nonaktifkan yang expired
	if err := db.Model(&models.Voucher{}).Where("status = 'active' AND expiry_date <= ?", now).Update("status", "expired").Error; err != nil {
		return err
	}
	// Nonaktifkan yang kuota habis
	if err := db.Model(&models.Voucher{}).Where("status = 'active' AND quota <= used").Update("status", "exhausted").Error; err != nil {
		return err
	}
	return nil
}

// releaseAffiliateCommissions: pending → approved after hold_until passes
// [Audit Fix] Only release commissions where the associated ORDER is 'completed'
// [BUG-C2 Fix] Mencegah double-count total_earned:
//   - Fungsi ini HANYA mengubah status AffiliateCommission dari 'pending' → 'approved'
//   - Update total_earned TIDAK dilakukan di sini karena ProcessSettlements sudah
//     memindahkan PendingBalance → Balance (yang merepresentasikan earning yang cair)
//   - TriggerTierUpgrade akan re-kalkulasi total_earned dari data commission yang approved
func releaseAffiliateCommissions(db *gorm.DB, notif *NotificationService) error {
	now := time.Now()

	// Fetch commissions yang hold_until sudah lewat DAN order sudah completed
	// DAN WalletTransaction terkait sudah settled (ProcessSettlements sudah jalan)
	var commissions []models.AffiliateCommission
	db.Table("affiliate_commissions ac").
		Joins("JOIN orders o ON o.id = ac.order_id").
		Joins("LEFT JOIN wallet_transactions wt ON wt.reference_id = ac.id AND wt.reference_type = 'affiliate_commission'").
		Where("ac.status = 'pending' AND ac.hold_until <= ?", now).
		Where("o.status = ?", models.OrderCompleted).
		Where("wt.is_settled = true OR wt.id IS NULL"). // Guard: pastikan wallet sudah settled
		Select("ac.*").
		Find(&commissions)

	if len(commissions) == 0 {
		return nil
	}

	// Kumpulkan ID yang eligible
	var eligibleIDs []string
	earningsByAffiliate := make(map[string]float64)
	for _, c := range commissions {
		eligibleIDs = append(eligibleIDs, c.ID)
		earningsByAffiliate[c.AffiliateID] += c.Amount
	}

	// Bulk update status HANYA ID yang eligible
	if err := db.Model(&models.AffiliateCommission{}).
		Where("id IN ?", eligibleIDs).
		Updates(map[string]interface{}{"status": "approved"}).Error; err != nil {
		return err
	}

	// [BUG-C2 Fix] TIDAK update total_earned di sini. Alasannya:
	// ProcessSettlements sudah memindahkan wallet.PendingBalance → wallet.Balance.
	// total_earned di AffiliateMember adalah agregasi dari AffiliateCommission.status='approved'+'paid'.
	// TriggerTierUpgrade (yang dipanggil oleh ProcessSettlements) sudah re-kalkulasi dari DB.
	// Double-update di sini hanya menyebabkan inflasi total_earned.

	// Kirim notifikasi ke masing-masing affiliate
	configService := NewConfigService(db)
	withdrawPct := configService.GetFloat("affiliate_withdraw_pct", 70) / 100.0
	shoppingPct := configService.GetFloat("affiliate_shopping_pct", 30) / 100.0

	for affiliateID, earned := range earningsByAffiliate {
		withdrawableAmt := earned * withdrawPct
		shoppingAmt := earned * shoppingPct

		msg := fmt.Sprintf("Komisi Anda sebesar Rp %.0f telah cair! (Rp %.0f Bisa Ditarik, Rp %.0f Saldo Belanja)",
			earned, withdrawableAmt, shoppingAmt)
		notif.Push(affiliateID, "affiliate", "commission_released", "Komisi Siap Cair! 🎉", msg, "/affiliate/commissions")
		log.Printf("✅ Affiliate %s: Released Rp %.0f (Notified)", affiliateID, earned)
	}
	return nil
}

// autoCancelOverdueMerchantOrders: Membatalkan pesanan jika merchant tidak kirim dalam 48 jam
func autoCancelOverdueMerchantOrders(db *gorm.DB, orderService *OrderService, notif *NotificationService) error {
	deadline := time.Now().Add(-48 * time.Hour)

	var overdueGroups []models.OrderMerchantGroup
	// Mencari pesanan yang sudah dibayar (confirmed) tapi belum diproses/kirim lebih dari 48 jam
	err := db.Where("status = ? AND updated_at <= ?", models.MOrderConfirmed, deadline).Find(&overdueGroups).Error
	if err != nil {
		return err
	}

	for _, group := range overdueGroups {
		reason := "Sistem: Merchant tidak mengirim pesanan dalam waktu 48 jam"

		if err := orderService.CancelOrder(group.OrderID, reason, "system"); err == nil {
			log.Printf("⚠️ Auto-Cancelled Order %s due to Merchant %s delay", group.OrderID, group.MerchantID)

			// Notifikasi ke Merchant (Penalti Teguran)
			_ = notif.Push(group.MerchantID, "merchant", "order_penalty", "Pesanan Dibatalkan Otomatis",
				fmt.Sprintf("Pesanan %s dibatalkan karena Anda tidak memproses pengiriman dalam 48 jam.", group.OrderID), "")
		}
	}
	return nil
}
