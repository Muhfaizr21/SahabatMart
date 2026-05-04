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
	"flag"
	"time"

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
		&models.Category{}, &models.Product{}, &models.ProductVariant{}, &models.ProductTierCommission{},
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
		&models.PasswordReset{},
		// Commission Preset System (Multi-Level)
		&models.CommissionPreset{}, &models.CommissionPresetLevel{},
		&models.TierCommissionPreset{}, &models.TierCommissionPresetItem{},
	)
	
	// [Migration Fixes] Run startup migrations to fix schema issues
	// Fix 1: cancelled_by dari uuid ke varchar agar bisa menyimpan "system"
	DB.Exec("ALTER TABLE orders ALTER COLUMN cancelled_by TYPE varchar(100) USING cancelled_by::varchar(100)")
	// Fix 2: Perbaiki constraint keranjang agar mendukung multi-merchant & metadata berbeda
	DB.Exec("ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_variant_id_key")
	DB.Exec("DROP INDEX IF EXISTS idx_cart_items_cart_id_product_variant_id_key")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_composite_v2 ON cart_items (cart_id, product_variant_id, merchant_id, COALESCE(metadata, ''))")
	
	// [Akuglow Rebranding] Auto-update platform strings in DB
	DB.Model(&models.PlatformConfig{}).Where("key = ?", "platform_name").Update("value", "AkuGlow")
	DB.Model(&models.PlatformConfig{}).Where("value LIKE ?", "%AkuGlow%").
		Update("value", gorm.Expr("REPLACE(value, 'AkuGlow', 'AkuGlow')"))
	DB.Model(&models.Merchant{}).Where("store_name LIKE ?", "%AkuGlow%").
		Update("store_name", gorm.Expr("REPLACE(store_name, 'AkuGlow', 'AkuGlow')"))
    DB.Model(&models.User{}).Where("email LIKE ?", "%akugrow.com%").
		Update("email", gorm.Expr("REPLACE(email, 'akugrow.com', 'akuglow.com')"))
		
	// [Akuglow Rebranding] Auto-fix vouchers with zero expiry date to make them visible
	DB.Model(&models.Voucher{}).Where("(status = ? OR status = ?) AND (expiry_date < ? OR expiry_date IS NULL)", "active", "expired", time.Now()).
		Updates(map[string]interface{}{
			"status":      "active",
			"expiry_date": time.Now().Add(2160 * time.Hour), // Fix to 90 days from now
		})

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
		seeder.AutoSeedCriticalData(DB)
	}

	// Start Housekeeping Background Worker (Automation)
	go services.StartHousekeeping(DB)

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


