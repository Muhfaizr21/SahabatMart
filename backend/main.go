package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"SahabatMart/backend/models"
	"SahabatMart/backend/routes"
	"SahabatMart/backend/services"
	"SahabatMart/backend/seeder"
	"time"
	"flag"
	"strings"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := buildDSN()
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ Gagal terhubung ke database:", err)
	}

	DB.AutoMigrate(
		&models.User{}, &models.UserProfile{},
		&models.Merchant{}, &models.AffiliateMember{}, &models.MembershipTier{},
		&models.Category{}, &models.Product{}, &models.ProductVariant{},
		&models.Order{}, &models.OrderMerchantGroup{}, &models.OrderItem{},
		&models.Cart{}, &models.CartItem{},
		&models.AffiliateClick{}, &models.PlatformConfig{},
		&models.Brand{}, &models.Attribute{}, &models.Voucher{},
		&models.Dispute{}, &models.LogisticChannel{}, &models.Region{},
		&models.BlogPost{}, &models.Banner{},
		&models.Wishlist{}, &models.CategoryCommission{}, &models.MerchantCommission{},
		&models.AuditLog{}, &models.PayoutRequest{}, &models.Notification{},
		&models.Review{}, &models.ContactMessage{},
		&models.Permission{}, &models.Role{},
		&models.Wallet{}, &models.WalletTransaction{}, &models.WithdrawalRequest{}, &models.Refund{},
		&models.Inventory{}, &models.RestockRequest{}, &models.RestockItem{},
		// Affiliate portal models
		&models.AffiliateCommission{}, &models.AffiliateLink{},
		&models.AffiliateClickLog{}, &models.AffiliateWithdrawal{},
		&models.AffiliateEducation{}, &models.AffiliateEvent{}, &models.PromoMaterial{},
	)
}

func buildDSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "sahabatmart"),
		getEnv("DB_PORT", "5432"),
	)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: .env file not found, using system environment variables")
	}

	ConnectDB()

	shouldSeed := flag.Bool("seed", false, "Populate database with sample data")
	flag.Parse()

	if *shouldSeed {
		seeder.SeedAll(DB)
	} else {
		// Auto-seed critical data even without --seed flag
		autoSeedCriticalData(DB)
	}

	// Start Housekeeping Background Worker (Automation)
	go startHousekeeping(DB)

	handler := routes.SetupRoutes(DB)

	port := getEnv("PORT", "8080")
	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

// autoSeedCriticalData: seed tier kalau belum ada, tanpa overwrite data existing
func autoSeedCriticalData(db *gorm.DB) {
	var count int64
	db.Model(&models.MembershipTier{}).Count(&count)
	if count == 0 {
		log.Println("🌱 Auto-seeding Membership Tiers (table is empty)...")
		tiers := []models.MembershipTier{
			{ID: 1, Name: "Bronze", Level: 1, BaseCommissionRate: 0.03, MinEarningsUpgrade: 5000000, MinWithdrawalAmount: 50000, CommissionHoldDays: 14, CookieDurationDays: 30, IsActive: true},
			{ID: 2, Name: "Silver", Level: 2, BaseCommissionRate: 0.05, MinEarningsUpgrade: 20000000, MinWithdrawalAmount: 100000, CommissionHoldDays: 10, CookieDurationDays: 45, IsActive: true},
			{ID: 3, Name: "Gold", Level: 3, BaseCommissionRate: 0.08, MinEarningsUpgrade: 100000000, MinWithdrawalAmount: 200000, CommissionHoldDays: 7, CookieDurationDays: 60, IsActive: true},
			{ID: 4, Name: "Platinum", Level: 4, BaseCommissionRate: 0.12, MinWithdrawalAmount: 500000, CommissionHoldDays: 3, CookieDurationDays: 90, IsActive: true},
		}
		for _, t := range tiers {
			db.Create(&t)
		}
		log.Println("✅ Membership Tiers auto-seeded successfully!")
	}

	// [Auto-Fix] Pastikan admin@akugrow.com selalu ACTIVE
	db.Model(&models.User{}).Where("email = ?", "admin@akugrow.com").Update("status", "active")
}


func startHousekeeping(db *gorm.DB) {
	log.Println("🧹 Housekeeping Background Worker Started")
	financeService := services.NewFinanceService(db)
	notifService := services.NewNotificationService(db)
	affiliateService := services.NewAffiliateService(db, notifService)
	orderService := services.NewOrderService(db)

	ticker := time.NewTicker(30 * time.Minute) // More frequent check
	for range ticker.C {
		log.Println("🔄 Running Platform Housekeeping...")

		// 1. Process Merchant Settlements
		if err := financeService.ProcessSettlements(); err != nil {
			log.Printf("❌ Housekeeping Error (Settlement): %v", err)
		}

		// 2. Auto-update Logistics & Order Completion
		if err := autoUpdateLogistics(db, notifService); err != nil {
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
		var affiliates []models.AffiliateMember
		db.Where("status = 'active'").Find(&affiliates)
		for _, aff := range affiliates {
			affiliateService.TriggerTierUpgrade(aff.ID)
		}

		// 6. Sync Platform Ledger
		ledger, err := financeService.SyncPlatformLedger()
		if err == nil {
			log.Printf("📊 Platform Ledger Sync: %+v", ledger)
		}
	}
}

// releaseAffiliateCommissions: pending → approved after hold_until passes
func releaseAffiliateCommissions(db *gorm.DB, notif *services.NotificationService) error {
	now := time.Now()

	// Find commissions where hold period has expired
	var commissions []models.AffiliateCommission
	db.Where("status = 'pending' AND hold_until <= ?", now).Find(&commissions)

	if len(commissions) == 0 {
		return nil
	}

	// Group by affiliate for batch total_earned update
	earningsByAffiliate := make(map[string]float64)
	for _, c := range commissions {
		earningsByAffiliate[c.AffiliateID] += c.Amount
	}

	// Bulk update status to approved
	db.Model(&models.AffiliateCommission{}).
		Where("status = 'pending' AND hold_until <= ?", now).
		Updates(map[string]interface{}{"status": "approved"})

	// Update total_earned per affiliate
	for affiliateID, earned := range earningsByAffiliate {
		db.Model(&models.AffiliateMember{}).Where("id = ?", affiliateID).
			Updates(map[string]interface{}{
				"total_earned": gorm.Expr("total_earned + ?", earned),
			})

		// Get affiliate user_id for notification
		var aff models.AffiliateMember
		db.Select("user_id").First(&aff, "id = ?", affiliateID)
		if aff.UserID != "" {
			msg := fmt.Sprintf("Komisi Anda sebesar Rp %.0f telah cair dan siap untuk dicairkan!", earned)
			notif.Push(aff.UserID, "affiliate", "commission_released",
				"Komisi Siap Dicairkan! 🎉", msg, "/affiliate/commissions")
		}
		log.Printf("✅ Affiliate %s: Released Rp %.0f in commissions", affiliateID, earned)
	}
	return nil
}

// autoUpgradeAffiliateTiers is now handled within AffiliateService.TriggerTierUpgrade


func autoUpdateLogistics(db *gorm.DB, notif *services.NotificationService) error {
	var groups []models.OrderMerchantGroup
	// Find merchant groups that are SHIPPED but not yet DELIVERED
	db.Where("status = ? AND tracking_number IS NOT NULL AND tracking_number <> ''", models.MOrderShipped).Find(&groups)

	for _, group := range groups {
		// Simulation: Every order with "99" at end of tracking number is marked as Delivered
		if strings.HasSuffix(group.TrackingNumber, "99") {
			now := time.Now()
			group.Status = models.MOrderDelivered
			group.DeliveredAt = &now
			db.Save(&group)
			log.Printf("📦 Merchant Order %s: Automated delivery sync completed", group.ID)

			// SYNC: Check if all groups in this order are now Delivered/Completed
			var totalGroups int64
			var deliveredGroups int64
			db.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", group.OrderID).Count(&totalGroups)
			db.Model(&models.OrderMerchantGroup{}).Where("order_id = ? AND status IN ?", group.OrderID, []string{string(models.MOrderDelivered), string(models.MOrderCompleted)}).Count(&deliveredGroups)

			if totalGroups > 0 && totalGroups == deliveredGroups {
				// All items delivered, update parent Order status
				db.Model(&models.Order{}).Where("id = ?", group.OrderID).Update("status", models.OrderCompleted)
				log.Printf("🎉 Parent Order %s marked as COMPLETED automatically", group.OrderID)
				
				// Send notification to Buyer
				var order models.Order
				db.Select("buyer_id").First(&order, "id = ?", group.OrderID)
				if order.BuyerID != nil && *order.BuyerID != "" {
					notif.Push(*order.BuyerID, "buyer", "order_completed", 
						"Pesanan Selesai! 🎁", "Seluruh item pesanan Anda telah diterima. Terima kasih sudah berbelanja!", "/orders")
				}
			}
		}
	}
	return nil
}
