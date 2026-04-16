package routes

import (
	"SahabatMart/backend/controllers"
	"context"
	"log"
	"net/http"
	"strings"

	"SahabatMart/backend/utils"
	"gorm.io/gorm"
)

func SetupRoutes(db *gorm.DB) http.Handler {
	mux := http.NewServeMux()

	authCtrl := controllers.NewAuthController(db)
	buyerCtrl := controllers.NewBuyerController(db)
	merchantCtrl := controllers.NewMerchantController(db)
	adminCtrl := controllers.NewAdminController(db)
	affiliateCtrl := controllers.NewAffiliateController(db)

	// Middleware
	cors := corsMiddleware
	recover := recoverMiddleware

	// --- Auth Routes ---
	mux.HandleFunc("/api/auth/register", authCtrl.Register)
	mux.HandleFunc("/api/auth/login", authCtrl.Login)

	// --- Public Routes ---
	mux.HandleFunc("/api/public/products", adminCtrl.GetPublicProducts)

	// --- Buyer Routes ---
	buyerOnly := actorOnly("buyer", "admin", "superadmin", "merchant", "affiliate")
	mux.HandleFunc("/api/buyer/cart", buyerOnly(buyerCtrl.GetCart))
	mux.HandleFunc("/api/buyer/cart/add", buyerOnly(buyerCtrl.AddToCart))
	mux.HandleFunc("/api/buyer/checkout", buyerOnly(buyerCtrl.Checkout))
	mux.HandleFunc("/api/buyer/orders", buyerOnly(buyerCtrl.GetOrders))

	// --- Merchant Routes ---
	merchantOnly := actorOnly("merchant", "admin", "superadmin")
	mux.HandleFunc("/api/merchant/products", merchantOnly(merchantCtrl.GetProducts))
	mux.HandleFunc("/api/merchant/products/add", merchantOnly(merchantCtrl.AddProduct))
	mux.HandleFunc("/api/merchant/orders", merchantOnly(merchantCtrl.GetOrders))

	// --- Affiliate Routes ---
	affiliateOnly := actorOnly("affiliate", "admin", "superadmin")
	mux.HandleFunc("/api/affiliate/dashboard", affiliateOnly(affiliateCtrl.GetDashboard))
	mux.HandleFunc("/api/public/affiliate/track", affiliateCtrl.TrackClick)

	// --- Admin Routes ---
	adminOnly := actorOnly("admin", "superadmin")
	mux.HandleFunc("/api/admin/overview", adminOnly(adminCtrl.GetOverview))
	mux.HandleFunc("/api/admin/users", adminOnly(adminCtrl.GetUsers))
	mux.HandleFunc("/api/admin/merchants", adminOnly(adminCtrl.GetMerchants))

	return recover(cors(mux))
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARES (Clean Code Version)
// ─────────────────────────────────────────────────────────────────────────────

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
