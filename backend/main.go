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

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
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
		&models.User{}, &models.UserProfile{},
		&models.Merchant{}, &models.AffiliateMember{}, &models.MembershipTier{},
		&models.Category{}, &models.Product{}, &models.ProductVariant{}, &models.ProductTierCommission{},
		&models.Order{}, &models.OrderMerchantGroup{}, &models.OrderItem{},
		&models.Wallet{}, &models.WalletTransaction{}, &models.WithdrawalRequest{},
		&models.AffiliateCommission{}, &models.AffiliateWithdrawal{}, &models.AffiliateClickLog{},
		&models.CommissionPreset{}, &models.CommissionPresetLevel{},
		&models.PlatformConfig{}, &models.LogisticChannel{},
		&models.AffiliateTurnoverSnapshot{}, &models.LeaderboardCache{},
		&models.Banner{}, &models.BlogPost{},
		&models.Notification{}, &models.Review{},
		&models.Voucher{}, &models.CategoryCommission{}, &models.MerchantCommission{},
		&models.TierCommissionPreset{}, &models.TierCommissionPresetItem{},
		&models.MerchantCommissionPreset{},
		&models.Inventory{}, &models.InboundStock{}, &models.InboundItem{}, &models.StockMutation{},
		&models.Media{},
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

	// [SENTRY] Error Monitoring
	sentryDSN := getEnv("SENTRY_DSN", "")
	if sentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			Environment:      getEnv("APP_ENV", "development"),
			EnableTracing:    true,
			TracesSampleRate: 0.2,
		}); err != nil {
			log.Printf("⚠️  Sentry init failed: %v", err)
		} else {
			log.Println("📡 Sentry error monitoring enabled")
		}
	}
	defer sentry.Flush(2 * time.Second)

	ConnectDB()

	// Seed akun admin & produk inti
	seeder.AutoSeedCriticalData(DB)
	seeder.SeedAkuglowProducts(DB)

	// Start Housekeeping Background Worker (Automation)
	go services.StartHousekeeping(DB)

	handler := routes.SetupRoutes(DB)

	// [SENTRY] Wrap handler with Sentry recovery & performance monitoring
	sentryHandler := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	}).Handle(handler)

	// Serve Static Files (Uploaded Images)
	fileServer := http.FileServer(http.Dir("./uploads"))
	mux := http.NewServeMux()
	// Apply CORS to uploads too
	mux.Handle("/uploads/", routes.CorsMiddleware(http.StripPrefix("/uploads/", fileServer)))
	mux.Handle("/", sentryHandler)

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

