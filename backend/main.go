package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"SahabatMart/backend/controllers"
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

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

func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic: %v", err)
				utils.JSONError(w, http.StatusInternalServerError, "Terjadi kesalahan internal")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Otorisasi Ketat
func actorOnly(allowedRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				utils.JSONError(w, http.StatusUnauthorized, "Silakan login terlebih dahulu")
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := utils.ParseJWT(token)
			if err != nil {
				utils.JSONError(w, http.StatusUnauthorized, "Sesi Anda telah berakhir, silakan login kembali")
				return
			}

			role := strings.ToLower(claims.Role)
			isAllowed := false
			for _, ar := range allowedRoles {
				if role == strings.ToLower(ar) {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				utils.JSONError(w, http.StatusForbidden, "Akses ditolak: Anda tidak memiliki otoritas")
				return
			}

			ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
			if claims.MerchantID != "" {
				ctx = context.WithValue(ctx, "merchant_id", claims.MerchantID)
			}
			if claims.AffiliateID != "" {
				ctx = context.WithValue(ctx, "affiliate_id", claims.AffiliateID)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		}
	}
}

func main() {
	ConnectDB()

	authCtrl := &controllers.AuthController{DB: DB}
	adminCtrl := &controllers.AdminController{DB: DB}
	buyerCtrl := &controllers.BuyerController{DB: DB}
	merchantCtrl := &controllers.MerchantController{DB: DB}
	affiliateCtrl := &controllers.AffiliateController{DB: DB}

	mux := http.NewServeMux()

	// Auth & Public
	mux.HandleFunc("/api/auth/register", authCtrl.Register)
	mux.HandleFunc("/api/auth/login", authCtrl.Login)
	mux.HandleFunc("/api/public/products", adminCtrl.GetPublicProducts)

	// Proteksi Buyer (Cart, Checkout, Orders)
	buyerOnly := actorOnly("buyer", "admin", "superadmin", "merchant", "affiliate")
	mux.HandleFunc("/api/buyer/cart", buyerOnly(buyerCtrl.GetCart))
	mux.HandleFunc("/api/buyer/cart/add", buyerOnly(buyerCtrl.AddToCart))
	mux.HandleFunc("/api/buyer/checkout", buyerOnly(buyerCtrl.Checkout))
	mux.HandleFunc("/api/buyer/orders", buyerOnly(buyerCtrl.GetOrders))

	// Proteksi Merchant
	merchantOnly := actorOnly("merchant", "admin", "superadmin")
	mux.HandleFunc("/api/merchant/products", merchantOnly(merchantCtrl.GetProducts))
	mux.HandleFunc("/api/merchant/products/add", merchantOnly(merchantCtrl.AddProduct))
	mux.HandleFunc("/api/merchant/orders", merchantOnly(merchantCtrl.GetOrders))

	// Proteksi Affiliate
	affiliateOnly := actorOnly("affiliate", "admin", "superadmin")
	mux.HandleFunc("/api/affiliate/dashboard", affiliateOnly(affiliateCtrl.GetDashboard))
	mux.HandleFunc("/api/public/affiliate/track", affiliateCtrl.TrackClick)

	// Proteksi Admin
	adminOnly := actorOnly("admin", "superadmin")
	mux.HandleFunc("/api/admin/overview", adminOnly(adminCtrl.GetOverview))

	handler := recoverMiddleware(corsMiddleware(mux))
	port := getEnv("PORT", "8080")
	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
