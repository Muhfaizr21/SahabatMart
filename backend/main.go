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
		// Affiliate portal models
		&models.AffiliateCommission{}, &models.AffiliateLink{},
		&models.AffiliateClickLog{}, &models.AffiliateWithdrawal{},
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
}


func startHousekeeping(db *gorm.DB) {
	log.Println("🧹 Housekeeping Background Worker Started")
	financeService := services.NewFinanceService(db)
	notifService := services.NewNotificationService(db)

	ticker := time.NewTicker(1 * time.Hour) // Jalankan setiap jam
	for range ticker.C {
		log.Println("🔄 Running Platform Housekeeping...")

		// 1. Process Merchant Settlements (7-day delay)
		if err := financeService.ProcessSettlements(); err != nil {
			log.Printf("❌ Housekeeping Error (Settlement): %v", err)
		}

		// 2. Auto-update Logistics Status (Mock simulation)
		if err := autoUpdateLogistics(db); err != nil {
			log.Printf("❌ Housekeeping Error (Logistics): %v", err)
		}

		// 3. Release Affiliate Commissions (hold period expired)
		if err := releaseAffiliateCommissions(db, notifService); err != nil {
			log.Printf("❌ Housekeeping Error (Affiliate Commissions): %v", err)
		}

		// 4. Auto-upgrade Affiliate Tiers
		if err := autoUpgradeAffiliateTiers(db, notifService); err != nil {
			log.Printf("❌ Housekeeping Error (Affiliate Tier Upgrade): %v", err)
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

// autoUpgradeAffiliateTiers: check if affiliate earned enough to upgrade
func autoUpgradeAffiliateTiers(db *gorm.DB, notif *services.NotificationService) error {
	var affiliates []models.AffiliateMember
	db.Preload("Tier").Where("status = 'active'").Find(&affiliates)

	var tiers []models.MembershipTier
	db.Order("level ASC").Find(&tiers)

	for _, aff := range affiliates {
		if aff.Tier == nil {
			continue
		}
		for _, tier := range tiers {
			// Skip current and lower tiers
			if tier.Level <= aff.Tier.Level {
				continue
			}
			// Check if affiliate qualifies for this tier
			if aff.TotalEarned >= tier.MinEarningsUpgrade && tier.MinEarningsUpgrade > 0 {
				oldTierName := aff.Tier.Name
				db.Model(&aff).Update("membership_tier_id", tier.ID)

				// Get user_id for notification
				var u models.AffiliateMember
				db.Select("user_id").First(&u, "id = ?", aff.ID)
				if u.UserID != "" {
					msg := fmt.Sprintf("Selamat! Tier Anda telah naik dari %s ke %s. Nikmati komisi yang lebih besar! 🚀", oldTierName, tier.Name)
					notif.Push(u.UserID, "affiliate", "tier_upgrade",
						"Tier Naik! 🎉", msg, "/affiliate")
				}
				log.Printf("⬆️  Affiliate %s upgraded from %s to %s", aff.ID, oldTierName, tier.Name)
				break // Only upgrade one tier at a time
			}
		}
	}
	return nil
}


func autoUpdateLogistics(db *gorm.DB) error {
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
			
			// Optional: If all groups in an order are delivered, mark the top-level Order as Delivered
			// (Logic can be added here)
		}
	}
	return nil
}
