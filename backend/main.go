package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"SahabatMart/backend/controllers"
	"SahabatMart/backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := "host=localhost user=muhfaiizr password=admin dbname=sahabatmart port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	var err error

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Gagal menyambung ke PostgreSQL: %v\n=> Pastikan service PostgreSQL sedang aktif.", err)
	}

	// Automigrate
	err = DB.AutoMigrate(
		&models.User{}, &models.UserProfile{}, &models.Merchant{}, &models.Product{},
		&models.Category{}, &models.BlogPost{}, &models.Banner{},
		&models.Voucher{}, &models.Region{}, &models.LogisticChannel{},
	)
	if err != nil {
		log.Fatalf("❌ Gagal melakukan AutoMigrate: %v", err)
	}

	// Seed Data
	SeedDatabase(DB)

	log.Println("✅ Berhasil menyambung ke PostgreSQL! (Database: sahabatmart)")
}

func SeedDatabase(db *gorm.DB) {
	log.Println("🌱 Memulai proses seeding data dummy SahabatMart...")

	var admin models.User
	db.Where("email = ?", "admin@sahabatmart.id").First(&admin)
	if admin.ID == "" {
		admin = models.User{
			Email:        "admin@sahabatmart.id",
			PasswordHash: "$2a$10$r.O0Hh.vO6v6v6v6v6v6v6v6v6v6v6v6v6v6v6v6v6v6v6v6v6",
			Role:         "superadmin",
			Status:       "active",
		}
		if err := db.Create(&admin).Error; err == nil {
			profile := models.UserProfile{UserID: admin.ID, FullName: "Admin SahabatMart Lux"}
			db.Create(&profile)
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

	// Admin API (Simplified list for main.go readability)
	mux.HandleFunc("/api/admin/overview", adminController.GetOverview)
	mux.HandleFunc("/api/admin/users", adminController.GetUsers)
	mux.HandleFunc("/api/admin/merchants", adminController.GetMerchants)
	mux.HandleFunc("/api/admin/products", adminController.GetProducts)
	mux.HandleFunc("/api/admin/products/add", adminController.AddProduct)
	mux.HandleFunc("/api/admin/products/moderate", adminController.ModerateProduct)
	mux.HandleFunc("/api/admin/products/delete", adminController.DeleteProduct)
	mux.HandleFunc("/api/admin/categories", adminController.GetCategories)
	mux.HandleFunc("/api/admin/finance", adminController.GetFinance)
	mux.HandleFunc("/api/admin/vouchers", adminController.GetVouchers)
	mux.HandleFunc("/api/admin/blogs", adminController.GetBlogs)
	mux.HandleFunc("/api/admin/banners", adminController.ManageBanners)

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
