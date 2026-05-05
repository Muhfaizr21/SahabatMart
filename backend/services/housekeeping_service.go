package services

import (
	"fmt"
	"log"
	"strings"
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

		// 5. Auto-upgrade Affiliate Tiers (Now handled by service)
		// Process in batches to avoid DB spikes
		var affiliates []models.AffiliateMember
		db.Where("status = 'active'").Find(&affiliates)
		if len(affiliates) > 0 {
			log.Printf("👥 Checking tier upgrades for %d affiliates...", len(affiliates))
			for _, aff := range affiliates {
				affiliateService.TriggerTierUpgrade(aff.ID)
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
func releaseAffiliateCommissions(db *gorm.DB, notif *NotificationService) error {
	now := time.Now()

	// Fetch commissions yang hold_until sudah lewat DAN order sudah completed
	var commissions []models.AffiliateCommission
	db.Table("affiliate_commissions ac").
		Joins("JOIN orders o ON o.id = ac.order_id").
		Where("ac.status = 'pending' AND ac.hold_until <= ?", now).
		Where("o.status = ?", models.OrderCompleted).
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

	// Bulk update HANYA ID yang eligible (bukan semua pending)
	if err := db.Model(&models.AffiliateCommission{}).
		Where("id IN ?", eligibleIDs).
		Updates(map[string]interface{}{"status": "approved"}).Error; err != nil {
		return err
	}

	// Update total_earned per affiliate & kirim notifikasi
	for affiliateID, earned := range earningsByAffiliate {
		db.Model(&models.AffiliateMember{}).Where("id = ?", affiliateID).
			UpdateColumn("total_earned", gorm.Expr("total_earned + ?", earned))

		msg := fmt.Sprintf("Komisi Anda sebesar Rp %.0f telah cair dan siap untuk ditarik!", earned)
		notif.Push(affiliateID, "affiliate", "commission_released", "Komisi Siap Cair! 🎉", msg, "/affiliate/commissions")
		log.Printf("✅ Affiliate %s: Released Rp %.0f in commissions", affiliateID, earned)
	}
	return nil
}

func autoUpdateLogistics(db *gorm.DB, orderService *OrderService) error {
	var groups []models.OrderMerchantGroup
	// Find merchant groups that are SHIPPED but not yet DELIVERED
	db.Where("status = ? AND tracking_number IS NOT NULL AND tracking_number <> ''", models.MOrderShipped).Find(&groups)

	for _, group := range groups {
		// Simulation: Every order with "99" at end of tracking number is marked as Delivered
		if strings.HasSuffix(group.TrackingNumber, "99") {
			log.Printf("📦 Logistics Sync: Auto-delivering group %s", group.ID)
			if err := orderService.UpdateMerchantOrderStatus(group.ID, models.MOrderDelivered); err != nil {
				log.Printf("❌ Logistics Sync Error: %v", err)
			}
		}
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
