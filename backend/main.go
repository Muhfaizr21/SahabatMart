package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/routes"
	"akuglow/backend/services"
	"akuglow/backend/seeder"
	"flag"

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

	if getEnv("APP_ENV", "development") != "production" {
		log.Println("🛠️  Running database AutoMigrate...")
		DB.AutoMigrate(
		&models.User{}, &models.UserProfile{}, &models.Media{},
		&models.Merchant{}, &models.AffiliateMember{}, &models.MembershipTier{},
		&models.Category{}, &models.Product{}, &models.ProductVariant{}, &models.ProductTierCommission{},
		&models.Order{}, &models.OrderMerchantGroup{}, &models.OrderItem{},
		&models.Cart{}, &models.CartItem{},
		&models.AffiliateClickLog{}, &models.UserInteraction{}, &models.PlatformConfig{},
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
		&models.SkinEducation{}, &models.SkinCommunityGroup{}, &models.SkinCommunityPost{}, &models.SkinCommunityComment{}, &models.SkinCommunityLike{}, // BUG-13
		&models.SkinJourneyProgram{}, &models.SkinJourneyStep{}, &models.SkinJourneyRoutine{},
		&models.SkinJourneyProductMapping{}, &models.SkinJourneyAIConfig{}, &models.UserSkinJourney{},
		&models.UserSkinJourneyHistory{}, &models.SkinStepLog{},
		// Flow 2: Detail program sub-models
		&models.SkinJourneyPhase{}, &models.SkinJourneyBenefit{}, &models.SkinJourneyWarning{}, &models.SkinJourneyFAQ{},
		// Flow 3 & 4: Product steps with instructions
		&models.SkinJourneyProductStep{},
		&models.PasswordReset{},
		// Commission Preset System (Multi-Level)
		&models.CommissionPreset{}, &models.CommissionPresetLevel{},
		&models.TierCommissionPreset{}, &models.TierCommissionPresetItem{},
		&models.MerchantCommissionPreset{},
		// Finance models
		&models.FinanceRevenueAllocation{}, &models.FinancialLocation{}, &models.MoneyMutation{},
		// Demographics models
		&models.UserLocationLog{}, &models.IPLocationCache{},
		)
	} else {
		log.Println("⚡ Production mode: AutoMigrate disabled")
	}
}

func buildDSN() string {
	sslMode := "disable"
	if os.Getenv("APP_ENV") == "production" && os.Getenv("DB_HOST") != "localhost" && os.Getenv("DB_HOST") != "127.0.0.1" {
		sslMode = "require"
	}
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "akuglow"),
		getEnv("DB_PORT", "5432"),
		sslMode,
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
	shouldSeedChain := flag.Bool("seed-chain", false, "Populate database with 5-level affiliate chain")
	flag.Parse()

	if *shouldSeed {
		seeder.SeedAll(DB)
	} else if *shouldSeedChain {
		seeder.SeedAffiliateChain(DB)
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
	// Apply CORS to uploads too
	mux.Handle("/uploads/", routes.CorsMiddleware(http.StripPrefix("/uploads/", fileServer)))
	mux.Handle("/", handler)

	port := getEnv("PORT", "8080")

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(srv.ListenAndServe())
}

