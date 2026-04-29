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
		&models.Supplier{}, &models.InboundStock{}, &models.InboundItem{}, &models.StockMutation{},
		// Affiliate portal models
		&models.AffiliateCommission{}, &models.AffiliateLink{},
		&models.AffiliateWithdrawal{},
		&models.AffiliateEducation{}, &models.AffiliateEvent{}, &models.PromoMaterial{},
		&models.AffiliateTurnoverSnapshot{}, &models.LeaderboardCache{},
		// Akuglow Skin Journey
		&models.SkinPreTest{}, &models.SkinProgress{}, &models.SkinJournal{}, &models.SkinWarriorLevel{},
		&models.SkinEducation{}, &models.SkinCommunityGroup{}, &models.SkinCommunityPost{}, &models.SkinCommunityComment{},
	)

	// Seed Sample Education for testing
	var count int64
	DB.Model(&models.SkinEducation{}).Count(&count)
	if count == 0 {
		DB.Create(&models.SkinEducation{
			Title:       "Berdamai dengan Jerawat",
			ContentType: "article",
			Content:     "Jerawat bukan tanda kamu kotor, tapi tanda kulitmu sedang bekerja keras. Mari belajar mencintainya...",
			MediaURL:    "https://example.com/article-1",
			DayTarget:   1,
		})
		DB.Create(&models.SkinEducation{
			Title:       "Podcast: Inner Healing for Skin",
			ContentType: "podcast",
			Content:     "Dengarkan bagaimana kesehatan mental berpengaruh pada kilau wajahmu.",
			MediaURL:    "https://example.com/podcast-1",
			DayTarget:   2,
		})
	}
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

	// Serve Static Files (Uploaded Images)
	fileServer := http.FileServer(http.Dir("./uploads"))
	mux := http.NewServeMux()
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fileServer))
	mux.Handle("/", handler)

	port := getEnv("PORT", "8080")
	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
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
		// Ini mengimplementasikan mekanisme downgrade yang didefinisikan dalam dokumen bisnis
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
func releaseAffiliateCommissions(db *gorm.DB, notif *services.NotificationService) error {
	now := time.Now()

	// [Audit Fix] Double-Check Order Status: Hanya cairkan komisi jika order 'completed'
	// Ini mencegah komisi cair jika order dibatalkan/refund tanpa melalui service.
	var commissions []models.AffiliateCommission
	db.Table("affiliate_commissions").
		Joins("JOIN orders ON orders.id = affiliate_commissions.order_id").
		Where("affiliate_commissions.status = 'pending' AND affiliate_commissions.hold_until <= ?", now).
		Where("orders.status = ?", models.OrderCompleted).
		Select("affiliate_commissions.*").
		Find(&commissions)

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

		// [Audit Fix] Always use AffiliateID (Member ID) for Affiliate Area Notifications
		msg := fmt.Sprintf("Komisi Anda sebesar Rp %.0f telah cair dan siap untuk ditarik!", earned)
		notif.Push(affiliateID, "affiliate", "commission_released",
			"Komisi Siap Cair! 🎉", msg, "/affiliate/commissions")
		
		log.Printf("✅ Affiliate %s: Released Rp %.0f in commissions", affiliateID, earned)
	}
	return nil
}

// autoUpgradeAffiliateTiers is now handled within AffiliateService.TriggerTierUpgrade


func autoUpdateLogistics(db *gorm.DB, notif *services.NotificationService) error {
	orderService := services.NewOrderService(db)
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
func autoCancelOverdueMerchantOrders(db *gorm.DB, orderService *services.OrderService, notif *services.NotificationService) error {
	deadline := time.Now().Add(-48 * time.Hour)

	var overdueGroups []models.OrderMerchantGroup
	// Mencari pesanan yang sudah dibayar (confirmed) tapi belum diproses/kirim lebih dari 48 jam
	err := db.Where("status = ? AND updated_at <= ?", models.MOrderConfirmed, deadline).Find(&overdueGroups).Error
	if err != nil {
		return err
	}

	for _, group := range overdueGroups {
		reason := "Sistem: Merchant tidak mengirim pesanan dalam waktu 48 jam"
		
		// Batalkan seluruh Order Induk jika ini satu-satunya group, atau cukup batalkan group ini saja?
		// Sesuai permintaan, kita batalkan order tersebut untuk keamanan pembeli
		if err := orderService.CancelOrder(group.OrderID, reason, "system"); err == nil {
			log.Printf("⚠️ Auto-Cancelled Order %s due to Merchant %s delay", group.OrderID, group.MerchantID)
			
			// Notifikasi ke Merchant (Penalti Teguran)
			_ = notif.Push(group.MerchantID, "merchant", "order_penalty", "Pesanan Dibatalkan Otomatis", 
				fmt.Sprintf("Pesanan %s dibatalkan karena Anda tidak memproses pengiriman dalam 48 jam.", group.OrderID), "")
		}
	}
	return nil
}
