package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"SahabatMart/backend/controllers"
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := buildDSN()
	var err error

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Gagal menyambung ke PostgreSQL: %v\n=> Pastikan service PostgreSQL sedang aktif.", err)
	}

	// Automigrate
	err = DB.AutoMigrate(
		&models.User{}, &models.UserProfile{},
		&models.PlatformConfig{}, &models.CategoryCommission{}, &models.MerchantCommission{},
		&models.AuditLog{}, &models.PayoutRequest{},
		&models.Merchant{}, &models.AffiliateConfig{},
		&models.Category{}, &models.Brand{}, &models.Attribute{},
		&models.Voucher{}, &models.Dispute{}, &models.LogisticChannel{},
		&models.AffiliateClick{}, &models.Region{}, &models.AdminNotification{},
		&models.BlogPost{}, &models.Product{}, &models.Banner{},
	)
	if err != nil {
		log.Fatalf("❌ Gagal melakukan AutoMigrate: %v", err)
	}

	// Seed Data
	SeedDatabase(DB)

	log.Println("✅ Berhasil menyambung ke PostgreSQL! (Database: sahabatmart)")
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func buildDSN() string {
	if databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL")); databaseURL != "" {
		return databaseURL
	}

	host := getEnv("DB_HOST", "localhost")
	user := getEnv("DB_USER", os.Getenv("USER"))
	password := os.Getenv("DB_PASSWORD")
	name := getEnv("DB_NAME", "sahabatmart")
	port := getEnv("DB_PORT", "5432")
	sslMode := getEnv("DB_SSLMODE", "disable")
	timezone := getEnv("DB_TIMEZONE", "Asia/Jakarta")

	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		host, user, password, name, port, sslMode, timezone,
	)
}

func SeedDatabase(db *gorm.DB) {
	log.Println("🌱 Memulai proses seeding data dummy SahabatMart...")

	adminPasswordHash, err := bcrypt.GenerateFromPassword([]byte("Admin@12345"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("❌ Gagal membuat password hash admin seed: %v", err)
	}

	var admin models.User
	db.Where("email IN ?", []string{"admin@platform.com", "admin@sahabatmart.id"}).First(&admin)
	if admin.ID == "" {
		admin = models.User{
			Email:        "admin@platform.com",
			PasswordHash: string(adminPasswordHash),
			Role:         "superadmin",
			Status:       "active",
		}
		if err := db.Create(&admin).Error; err == nil {
			profile := models.UserProfile{UserID: admin.ID, FullName: "Admin SahabatMart Lux"}
			db.Create(&profile)
		}
	} else {
		db.Model(&admin).Updates(map[string]interface{}{
			"email":                 "admin@platform.com",
			"password_hash":         string(adminPasswordHash),
			"role":                  "superadmin",
			"status":                "active",
			"failed_login_attempts": 0,
			"locked_until":          nil,
		})

		var profile models.UserProfile
		if err := db.Where("user_id = ?", admin.ID).First(&profile).Error; err == nil {
			db.Model(&profile).Update("full_name", "Super Administrator")
		} else {
			db.Create(&models.UserProfile{UserID: admin.ID, FullName: "Super Administrator"})
		}
	}

	var official models.Merchant
	db.Where("store_name = ?", "SahabatMart Official").First(&official)
	if official.ID == "" {
		official = models.Merchant{
			UserID:    admin.ID,
			StoreName: "SahabatMart Official",
			Slug:      "sahabatmart-official",
			Status:    "active",
			JoinedAt:  time.Now(),
		}
		db.Create(&official)
	}

	// Categories
	categories := []models.Category{
		{Name: "Elektronik", Slug: "elektronik", Order: 1},
		{Name: "Fashion", Slug: "fashion", Order: 2},
		{Name: "Kebutuhan Pokok", Slug: "kebutuhan-pokok", Order: 3},
		{Name: "Kesehatan", Slug: "kesehatan", Order: 4},
		{Name: "Hobi & Hiburan", Slug: "hobi-hiburan", Order: 5},
	}
	for _, c := range categories {
		db.Where("name = ?", c.Name).FirstOrCreate(&c)
	}

	// Products
	products := []models.Product{
		{
			MerchantID: official.ID, Name: "Galaxy Tab S6 Lite 10.4-inch", Slug: "galaxy-tab-s6-lite",
			Category: "Elektronik", Price: 4500000, OldPrice: 5200000, Rating: 4.5, Reviews: 120,
			Image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400", Badge: "Hot", BadgeClass: "hot", Status: "active",
		},
		{
			MerchantID: official.ID, Name: "Smart Watch IP67 Waterproof", Slug: "smart-watch-ip67",
			Category: "Elektronik", Price: 850000, OldPrice: 1200000, Rating: 4.8, Reviews: 85,
			Image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", Badge: "Trending", BadgeClass: "trending", Status: "active",
		},
		{
			MerchantID: official.ID, Name: "Wireless Headphones Sony XM4", Slug: "sony-xm4-wireless",
			Category: "Elektronik", Price: 3500000, OldPrice: 4200000, Rating: 5.0, Reviews: 250,
			Image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400", Badge: "-20%", BadgeClass: "offer", Status: "active",
		},
	}
	for _, p := range products {
		db.Where("name = ?", p.Name).FirstOrCreate(&p)
	}

	// Banners, Blogs, Vouchers (Omitted for brevity if not strictly needed, but let's keep them small)
	db.Where("title = ?", "Promo Elektronik Terbesar 2024").FirstOrCreate(&models.Banner{Title: "Promo Elektronik Terbesar 2024", Image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800", IsActive: true})
	db.Where("code = ?", "SAHABATBARU").FirstOrCreate(&models.Voucher{Code: "SAHABATBARU", Title: "Diskon Pengguna Baru", DiscountValue: 50000, MinOrder: 200000, Status: "active"})

	log.Println("✅ Seeding selesai!")
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func adminOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := utils.ParseJWT(r.Header.Get("Authorization"))
		if err != nil {
			utils.JSONError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		role := strings.ToLower(strings.TrimSpace(claims.Role))
		if role != "admin" && role != "superadmin" {
			utils.JSONError(w, http.StatusForbidden, "Forbidden")
			return
		}

		next.ServeHTTP(w, r)
	}
}

func handleAdmin(mux *http.ServeMux, path string, handler http.HandlerFunc) {
	mux.HandleFunc(path, adminOnly(handler))
}

func main() {
	ConnectDB()
	authController := controllers.AuthController{DB: DB}
	adminController := controllers.AdminController{DB: DB}
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintf(w, `{"status":"success","message":"SahabatMart API is running!"}`)
	})

	// Auth
	mux.HandleFunc("/api/auth/register", authController.Register)
	mux.HandleFunc("/api/auth/login", authController.Login)

	// Admin API
	handleAdmin(mux, "/api/admin/overview", adminController.GetOverview)
	handleAdmin(mux, "/api/admin/users", adminController.GetUsers)
	handleAdmin(mux, "/api/admin/users/stats", adminController.GetUserStats)
	handleAdmin(mux, "/api/admin/users/update", adminController.UpdateUser)
	handleAdmin(mux, "/api/admin/users/delete", adminController.DeleteUser)
	handleAdmin(mux, "/api/admin/merchants", adminController.GetMerchants)
	handleAdmin(mux, "/api/admin/merchants/stats", adminController.GetMerchantStats)
	handleAdmin(mux, "/api/admin/merchants/status", adminController.UpdateMerchantStatus)
	handleAdmin(mux, "/api/admin/merchants/verify", adminController.VerifyMerchant)
	handleAdmin(mux, "/api/admin/orders", adminController.GetAllOrders)
	handleAdmin(mux, "/api/admin/affiliates", adminController.GetAffiliates)
	handleAdmin(mux, "/api/admin/affiliates/configs", adminController.GetAffiliateConfigs)
	handleAdmin(mux, "/api/admin/affiliates/config", adminController.UpsertAffiliateConfig)
	handleAdmin(mux, "/api/admin/products", adminController.GetProducts)
	handleAdmin(mux, "/api/admin/products/add", adminController.AddProduct)
	handleAdmin(mux, "/api/admin/products/moderate", adminController.ModerateProduct)
	handleAdmin(mux, "/api/admin/products/delete", adminController.DeleteProduct)
	handleAdmin(mux, "/api/admin/categories", adminController.GetCategories)
	handleAdmin(mux, "/api/admin/categories/add", adminController.AddCategory)
	handleAdmin(mux, "/api/admin/categories/delete", adminController.DeleteCategory)
	handleAdmin(mux, "/api/admin/finance", adminController.GetFinance)
	handleAdmin(mux, "/api/admin/finance/monthly", adminController.GetMonthlyRevenue)
	handleAdmin(mux, "/api/admin/finance/transactions", adminController.GetTransactions)
	handleAdmin(mux, "/api/admin/commissions/category", adminController.ManageCommissions)
	handleAdmin(mux, "/api/admin/commissions/merchant", adminController.ManageMerchantCommissions)
	handleAdmin(mux, "/api/admin/commissions/bulk", adminController.BulkUpdateCommissions)
	handleAdmin(mux, "/api/admin/payouts", adminController.GetPayouts)
	handleAdmin(mux, "/api/admin/payouts/process", adminController.ProcessPayout)
	handleAdmin(mux, "/api/admin/brands", adminController.GetBrands)
	handleAdmin(mux, "/api/admin/brands/save", adminController.UpsertBrand)
	handleAdmin(mux, "/api/admin/brands/delete", adminController.DeleteBrand)
	handleAdmin(mux, "/api/admin/attributes", adminController.GetAttributes)
	handleAdmin(mux, "/api/admin/attributes/save", adminController.UpsertAttribute)
	handleAdmin(mux, "/api/admin/logistics", adminController.GetLogistics)
	handleAdmin(mux, "/api/admin/logistics/toggle", adminController.ToggleLogistic)
	handleAdmin(mux, "/api/admin/disputes", adminController.GetDisputes)
	handleAdmin(mux, "/api/admin/disputes/arbitrate", adminController.ArbitrateDispute)
	handleAdmin(mux, "/api/admin/vouchers", adminController.GetVouchers)
	handleAdmin(mux, "/api/admin/vouchers/save", adminController.UpsertVoucher)
	handleAdmin(mux, "/api/admin/affiliate-clicks", adminController.GetAffiliateClicks)
	handleAdmin(mux, "/api/admin/regions", adminController.GetRegions)
	handleAdmin(mux, "/api/admin/regions/save", adminController.UpsertRegion)
	handleAdmin(mux, "/api/admin/notifications", adminController.GetNotifications)
	handleAdmin(mux, "/api/admin/notifications/read", adminController.MarkNotificationRead)
	handleAdmin(mux, "/api/admin/settings", adminController.GetSettings)
	handleAdmin(mux, "/api/admin/settings/save", adminController.UpsertSettings)
	handleAdmin(mux, "/api/admin/settings/payout", adminController.PayoutSettings)
	handleAdmin(mux, "/api/admin/audit-logs", adminController.GetAuditLogs)
	handleAdmin(mux, "/api/admin/blogs", adminController.GetBlogs)
	handleAdmin(mux, "/api/admin/blogs/save", adminController.UpsertBlog)
	handleAdmin(mux, "/api/admin/blogs/delete", adminController.DeleteBlog)
	handleAdmin(mux, "/api/admin/banners", adminController.ManageBanners)
	handleAdmin(mux, "/api/admin/banners/delete", adminController.DeleteBanner)

	// Public API
	mux.HandleFunc("/api/public/products", adminController.GetPublicProducts)
	mux.HandleFunc("/api/public/product", adminController.GetPublicProductDetail)
	mux.HandleFunc("/api/public/categories", adminController.GetPublicCategories)
	mux.HandleFunc("/api/public/blogs", adminController.GetPublicBlogs)
	mux.HandleFunc("/api/public/banners", adminController.GetPublicBanners)
	mux.HandleFunc("/api/public/vouchers", adminController.GetPublicVouchers)

	handler := enableCORS(mux)
	fmt.Println("🚀 Backend server starting on :8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
