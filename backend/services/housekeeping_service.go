package services

import (
	"fmt"
	"log"
	"time"

	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

func StartHousekeeping(db *gorm.DB) {
	log.Println("🧹 Housekeeping Background Worker Started")
	financeService := NewFinanceService(db)
	notifService := NewNotificationService(db)
	affiliateService := NewAffiliateService(db, notifService)
	orderService := NewOrderService(db)

	ticker := time.NewTicker(5 * time.Minute) // Check every 5 minutes for expiry
	for range ticker.C {
		log.Println("🔄 Running Platform Housekeeping...")

		// 1. Process Merchant Settlements
		settled, err := financeService.ProcessSettlements()
		if err != nil {
			log.Printf("❌ Housekeeping Error (Settlement): %v", err)
		} else if settled > 0 {
			log.Printf("💰 Financial Sync: %d transactions settled to available balance", settled)
		}

		// 2. Auto-update Logistics & Order Completion
		if err := autoUpdateLogistics(db, orderService); err != nil {
			log.Printf("❌ Housekeeping Error (Logistics): %v", err)
		}

		// 3. Release Affiliate Commissions
		if err := releaseAffiliateCommissions(db, notifService); err != nil {
			log.Printf("❌ Housekeeping Error (Affiliate Commissions): %v", err)
		}

		// 4. Auto-expire unpaid orders & return stock
		if err := orderService.ExpireOrders(); err != nil {
			log.Printf("❌ Housekeeping Error (Order Expiry): %v", err)
		}

		// 5. Auto-upgrade Affiliate Tiers (Optimization: Only check recently active ones)
		// We avoid looping through 10K+ users every run. 
		// Real-time upgrades are handled in OrderService; this is a safety fallback.
		var recentlyActiveAffiliates []models.AffiliateMember
		checkSince := time.Now().Add(-15 * time.Minute)
		db.Where("status = 'active' AND updated_at >= ?", checkSince).Find(&recentlyActiveAffiliates)
		
		if len(recentlyActiveAffiliates) > 0 {
			log.Printf("👥 Safety Check: Validating tier upgrades for %d recently active affiliates...", len(recentlyActiveAffiliates))
			for _, aff := range recentlyActiveAffiliates {
				go affiliateService.TriggerTierUpgrade(aff.ID) // [BUG-M1 Fix] Run async
			}
		}

		// 6. Auto-cancel Merchant orders if not shipped within 48h
		if err := autoCancelOverdueMerchantOrders(db, orderService, notifService); err != nil {
			log.Printf("❌ Housekeeping Error (Merchant Overdue): %v", err)
		}

		// 7. Sync Leaderboard Cache (Hourly or every 5 mins for now)
		if err := affiliateService.SyncLeaderboard(); err != nil {
			log.Printf("❌ Housekeeping Error (Leaderboard): %v", err)
		}

		// 8. Cleanup Expired Vouchers
		if err := cleanupVouchers(db); err != nil {
			log.Printf("❌ Housekeeping Error (Voucher Cleanup): %v", err)
		}

		// 9. Sync Platform Ledger
		ledger, err := financeService.SyncPlatformLedger()
		if err == nil {
			log.Printf("📊 Platform Ledger Sync: %+v", ledger)
		}

		// 10. [Sync Fix] Update Merchant Stats & Send Warnings jika tidak memenuhi syarat
		_, errMerchant := affiliateService.CheckAndDowngradeMerchants()
		if errMerchant != nil {
			log.Printf("❌ Housekeeping Error (Merchant Downgrade Check): %v", errMerchant)
		}

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

func autoUpdateLogistics(db *gorm.DB, orderService *OrderService) error {
	// [BUG-M3 Fix] Simulasi resi "99" dihapus karena ini production environment. 
	// Webhook kurir yang akan mengubah status ke 'delivered'.
	// Di sini kita bisa integrasi cek status resi tertunda via API pihak ke-3 jika diperlukan.
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
