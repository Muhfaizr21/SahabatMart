package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/routes"
	"akuglow/backend/seeder"
	"akuglow/backend/services"

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

	// [DEPLOYMENT] Configure Database Connection Pool
	sqlDB, err := DB.DB()
	if err == nil {
		// SetMaxIdleConns sets the maximum number of connections in the idle connection pool.
		sqlDB.SetMaxIdleConns(10)

		// SetMaxOpenConns sets the maximum number of open connections to the database.
		sqlDB.SetMaxOpenConns(100)

		// SetConnMaxLifetime sets the maximum amount of time a connection may be reused.
		sqlDB.SetConnMaxLifetime(time.Hour)
		log.Println("⚡ Database Connection Pool configured (MaxOpen: 100, MaxIdle: 10)")
	} else {
		log.Printf("⚠️ Gagal mengatur Connection Pool: %v", err)
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
		&models.Media{}, &models.Payment{}, &models.PaymentWebhook{},
		&models.AuditLog{}, &models.SiteTheme{}, &models.SiteSection{},
		&models.SiteMenu{}, &models.SiteAsset{}, &models.SitePageContent{},
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

func validateRequiredEnv() error {
	required := []string{"JWT_SECRET", "DB_HOST", "DB_USER", "DB_NAME"}
	for _, key := range required {
		if v := os.Getenv(key); v == "" {
			return fmt.Errorf("required env %s is not set", key)
		}
	}
	return nil
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	dbReady := "ok"
	sqlDB, err := DB.DB()
	if err != nil || sqlDB.Ping() != nil {
		dbReady = "error"
	}
	w.Header().Set("Content-Type", "application/json")
	if dbReady != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	fmt.Fprintf(w, `{"status":"%s","database":"%s","timestamp":"%s"}`,
		map[bool]string{true: "ok", false: "error"}[dbReady == "ok"],
		dbReady, time.Now().Format(time.RFC3339))
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: .env file not found, using system environment variables")
	}

	if err := validateRequiredEnv(); err != nil {
		log.Fatalf("❌ Startup validation failed: %v", err)
	}

	appEnv := getEnv("APP_ENV", "development")
	log.Printf("🔧 Environment: %s", appEnv)



	// [SENTRY] Error Monitoring
	sentryDSN := getEnv("SENTRY_DSN", "")
	if sentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			Environment:      appEnv,
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

	// Seed akun admin, logistic channels, produk inti
	seeder.AutoSeedCriticalData(DB)
	seeder.AutoSeedLogisticChannels(DB)
	seeder.SeedAkuglowProducts(DB)

	// Start Housekeeping Background Worker (Automation)
	stopHK := services.StartHousekeeping(DB)

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
	mux.Handle("/healthz", http.HandlerFunc(healthHandler))
	mux.Handle("/", sentryHandler)

	port := getEnv("PORT", "8080")

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second, // Prevent Slowloris attacks
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 Server running on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	<-quit
	log.Println("🛑 Shutting down server...")

	if stopHK != nil {
		stopHK()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("❌ Server forced shutdown: %v", err)
	}

	log.Println("✅ Server stopped gracefully")
}
