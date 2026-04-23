package routes

import (
	"SahabatMart/backend/controllers"
	"context"
	"log"
	"net/http"
	"strings"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"
	"gorm.io/gorm"
)

func SetupRoutes(db *gorm.DB) http.Handler {
	mux := http.NewServeMux()

	notifService := services.NewNotificationService(db)

	authCtrl := controllers.NewAuthController(db)
	buyerCtrl := controllers.NewBuyerController(db)
	merchantCtrl := controllers.NewMerchantController(db)
	adminCtrl := controllers.NewAdminController(db)
	affiliateCtrl := controllers.NewAffiliateController(db, notifService)
	productCtrl := controllers.NewProductController(db)
	contactCtrl := &controllers.ContactController{DB: db}
	rbacCtrl := controllers.NewRBACController(db)
	paymentCtrl := controllers.NewPaymentController(db)

	// Middleware
	cors := corsMiddleware
	recover := recoverMiddleware

	// [Monster Feature] Dynamic Role Middleware with DB Sync
	actorOnly := func(allowedRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
		return func(next http.HandlerFunc) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) {
				maintenance := false

				authHeader := r.Header.Get("Authorization")
				if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
					if maintenance {
						utils.JSONError(w, http.StatusServiceUnavailable, "Platform sedang dalam pemeliharaan (Maintenance)")
						return
					}
					utils.JSONError(w, http.StatusUnauthorized, "Silakan login terlebih dahulu")
					return
				}

				token := strings.TrimPrefix(authHeader, "Bearer ")
				claims, err := utils.ParseJWT(token)
				if err != nil {
					utils.JSONError(w, http.StatusUnauthorized, "Sesi Anda telah berakhir, silakan login kembali")
					return
				}

				// [Complex Sync] Pengecekan status user langsung ke DB
				var user models.User
				if err := db.Select("role", "status").First(&user, "id = ?", claims.UserID).Error; err != nil {
					utils.JSONError(w, http.StatusUnauthorized, "User tidak ditemukan")
					return
				}

				if user.Status != "active" {
					utils.JSONError(w, http.StatusForbidden, "Akun Anda sedang ditangguhkan atau tidak aktif")
					return
				}

				role := strings.ToLower(user.Role)
				if maintenance && role != "admin" && role != "superadmin" {
					utils.JSONError(w, http.StatusServiceUnavailable, "Platform sedang dalam pemeliharaan (Maintenance)")
					return
				}

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
				if claims.MerchantID != "" { ctx = context.WithValue(ctx, "merchant_id", claims.MerchantID) }
				if claims.AffiliateID != "" { ctx = context.WithValue(ctx, "affiliate_id", claims.AffiliateID) }

				next.ServeHTTP(w, r.WithContext(ctx))
			}
		}
	}

	// [Akuglow Sync] Permission-based Middleware (RBAC Phase 2)
	can := func(permissionCode string) func(http.HandlerFunc) http.HandlerFunc {
		return func(next http.HandlerFunc) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) {
				authHeader := r.Header.Get("Authorization")
				if authHeader == "" {
					utils.JSONError(w, http.StatusUnauthorized, "Login diperlukan")
					return
				}

				token := strings.TrimPrefix(authHeader, "Bearer ")
				claims, err := utils.ParseJWT(token)
				if err != nil {
					utils.JSONError(w, http.StatusUnauthorized, "Sesi berakhir")
					return
				}

				// Check Permission in DB via Role
				var count int64
				err = db.Table("role_permissions").
					Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
					Joins("JOIN users ON users.role::text = (SELECT name::text FROM roles WHERE id = role_permissions.role_id)").
					Where("users.id = ? AND permissions.code = ?", claims.UserID, permissionCode).
					Count(&count).Error

				if err != nil || count == 0 {
					// Fallback: Superadmin always has access
					var user models.User
					db.Select("role").First(&user, "id = ?", claims.UserID)
					if strings.ToLower(user.Role) != "superadmin" {
						utils.JSONError(w, http.StatusForbidden, "Akses ditolak: Anda tidak memiliki izin "+permissionCode)
						return
					}
				}

				ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
				next.ServeHTTP(w, r.WithContext(ctx))
			}
		}
	}

	// --- Auth Routes ---
	mux.HandleFunc("/api/auth/register", authCtrl.Register)
	mux.HandleFunc("/api/auth/login", authCtrl.Login)
	mux.HandleFunc("/api/auth/google/login", authCtrl.GoogleLogin)
	mux.HandleFunc("/api/auth/google/callback", authCtrl.GoogleCallback)
	
	// Middleware actor check
	anyUser := actorOnly("merchant", "affiliate", "admin", "superadmin")
	adminOnly := actorOnly("admin", "superadmin")
	superAdminOnly := actorOnly("superadmin")
	mux.HandleFunc("/api/auth/me", anyUser(authCtrl.GetMe))

	mux.HandleFunc("/api/tripay/webhook", paymentCtrl.TriPayCallback)
	mux.HandleFunc("/api/callback/tripay", paymentCtrl.TriPayCallback)


	// --- Buyer Routes (Now mapped to all authenticated users) ---
	buyerOnly := actorOnly("affiliate", "merchant", "admin", "superadmin")
	mux.HandleFunc("/api/buyer/cart", buyerOnly(buyerCtrl.GetCart))
	mux.HandleFunc("/api/buyer/cart/add", buyerOnly(buyerCtrl.AddToCart))
	mux.HandleFunc("/api/buyer/cart/item", buyerOnly(buyerCtrl.RemoveFromCart))
	mux.HandleFunc("/api/buyer/cart/move-from-wishlist", buyerOnly(buyerCtrl.MoveToCart))
	mux.HandleFunc("/api/buyer/checkout", buyerOnly(buyerCtrl.Checkout))
	mux.HandleFunc("/api/buyer/orders", buyerOnly(buyerCtrl.GetOrders))
	mux.HandleFunc("/api/buyer/orders/detail", buyerOnly(buyerCtrl.GetOrderDetail))
	mux.HandleFunc("/api/buyer/orders/payment-instructions", buyerOnly(buyerCtrl.GetPaymentInstructions))
	mux.HandleFunc("/api/buyer/profile", buyerOnly(buyerCtrl.GetProfile))
	mux.HandleFunc("/api/buyer/profile/update", buyerOnly(buyerCtrl.UpdateProfile))
	mux.HandleFunc("/api/buyer/wishlist", buyerOnly(buyerCtrl.GetWishlist))
	mux.HandleFunc("/api/buyer/wishlist/add", buyerOnly(buyerCtrl.AddToWishlist))
	mux.HandleFunc("/api/buyer/wishlist/check", buyerOnly(buyerCtrl.CheckWishlist))
	mux.HandleFunc("/api/buyer/wishlist/remove", buyerOnly(buyerCtrl.RemoveFromWishlist))
	mux.HandleFunc("/api/buyer/products/can-review", buyerOnly(productCtrl.CheckCanReview))
	mux.HandleFunc("/api/buyer/products/review", buyerOnly(productCtrl.SubmitReview))

	// --- Merchant Routes ---
	merchantOnly := actorOnly("merchant", "admin", "superadmin")
	// Products & Inventory
	mux.HandleFunc("/api/merchant/products", merchantOnly(merchantCtrl.GetProducts))
	mux.HandleFunc("/api/merchant/catalog", merchantOnly(merchantCtrl.GetCatalog))
	mux.HandleFunc("/api/merchant/restock", merchantOnly(merchantCtrl.GetRestockRequests))
	mux.HandleFunc("/api/merchant/restock/request", merchantOnly(merchantCtrl.RequestRestock))
	mux.HandleFunc("/api/merchant/restock/receive", merchantOnly(merchantCtrl.ReceiveRestock))
	
	// Orders
	mux.HandleFunc("/api/merchant/orders", merchantOnly(merchantCtrl.GetOrders))
	mux.HandleFunc("/api/merchant/orders/status", merchantOnly(merchantCtrl.UpdateOrderStatus))
	
	// Finance
	mux.HandleFunc("/api/merchant/wallet", merchantOnly(merchantCtrl.GetWallet))
	mux.HandleFunc("/api/merchant/wallet/withdraw", merchantOnly(merchantCtrl.RequestPayout))
	mux.HandleFunc("/api/merchant/wallet/history", merchantOnly(merchantCtrl.GetPayoutHistory))
	
	// Vouchers
	mux.HandleFunc("/api/merchant/vouchers", merchantOnly(merchantCtrl.GetVouchers))
	mux.HandleFunc("/api/merchant/vouchers/upsert", merchantOnly(merchantCtrl.UpsertVoucher))
	mux.HandleFunc("/api/merchant/vouchers/delete", merchantOnly(merchantCtrl.DeleteVoucher))
	
	// Disputes
	mux.HandleFunc("/api/merchant/disputes", merchantOnly(merchantCtrl.GetDisputes))
	mux.HandleFunc("/api/merchant/disputes/respond", merchantOnly(merchantCtrl.RespondDispute))
	
	// Store Profile
	mux.HandleFunc("/api/merchant/store", merchantOnly(merchantCtrl.GetStoreProfile))
	mux.HandleFunc("/api/merchant/store/update", merchantOnly(merchantCtrl.UpdateStoreProfile))
	
	mux.HandleFunc("/api/merchant/notifications", merchantOnly(merchantCtrl.GetNotifications))
	mux.HandleFunc("/api/merchant/notifications/read", merchantOnly(merchantCtrl.MarkNotificationRead))
	mux.HandleFunc("/api/merchant/affiliate-stats", merchantOnly(merchantCtrl.GetAffiliateStats))

	// --- Affiliate Routes ---
	// Per spec: Merchant = Mitra + Merchant, so merchant role MUST also access Mitra Area routes
	affiliateOnly := actorOnly("affiliate", "merchant", "admin", "superadmin")
	mux.HandleFunc("/api/affiliate/dashboard", affiliateOnly(affiliateCtrl.GetDashboard))
	mux.HandleFunc("/api/affiliate/commissions", affiliateOnly(affiliateCtrl.GetCommissions))
	mux.HandleFunc("/api/affiliate/links", affiliateOnly(affiliateCtrl.GetLinks))
	mux.HandleFunc("/api/affiliate/links/create", affiliateOnly(affiliateCtrl.CreateLink))
	mux.HandleFunc("/api/affiliate/links/delete", affiliateOnly(affiliateCtrl.DeleteLink))
	mux.HandleFunc("/api/affiliate/products", affiliateOnly(affiliateCtrl.GetTopProducts))
	mux.HandleFunc("/api/affiliate/withdrawals", affiliateOnly(affiliateCtrl.GetWithdrawals))
	mux.HandleFunc("/api/affiliate/withdrawals/request", affiliateOnly(affiliateCtrl.RequestWithdrawal))
	mux.HandleFunc("/api/affiliate/team-stats", affiliateOnly(affiliateCtrl.GetTeamStats))
	mux.HandleFunc("/api/affiliate/merchant-eligibility", affiliateOnly(affiliateCtrl.CheckMerchantEligibility))
	mux.HandleFunc("/api/affiliate/apply-merchant", affiliateOnly(affiliateCtrl.ApplyForMerchant))
	mux.HandleFunc("/api/affiliate/leaderboard", affiliateCtrl.GetLeaderboard) // Public leaderboard — no auth needed
	mux.HandleFunc("/api/affiliate/events", affiliateOnly(affiliateCtrl.GetEvents))
	mux.HandleFunc("/api/affiliate/educations", affiliateOnly(affiliateCtrl.GetEducations))
	mux.HandleFunc("/api/affiliate/promo-materials", affiliateOnly(affiliateCtrl.GetPromoMaterials))
	mux.HandleFunc("/api/affiliate/profile", affiliateOnly(affiliateCtrl.GetProfile))
	mux.HandleFunc("/api/affiliate/profile/update", affiliateOnly(affiliateCtrl.UpdateProfile))
	mux.HandleFunc("/api/affiliate/link-upline", affiliateOnly(affiliateCtrl.LinkUpline))
	mux.HandleFunc("/api/public/affiliate/track", affiliateCtrl.TrackClick)

	// --- Admin Routes ---
	adminOnly = actorOnly("admin", "superadmin")
	superAdminOnly = actorOnly("superadmin")
	
	// Administrative - Dashboard & Stats
	mux.HandleFunc("/api/admin/overview", adminOnly(adminCtrl.GetOverview))
	mux.HandleFunc("/api/admin/stats", adminOnly(adminCtrl.GetUserStats)) // Alias for dashboard stats
	mux.HandleFunc("/api/admin/users/stats", adminOnly(adminCtrl.GetUserStats))
	mux.HandleFunc("/api/admin/merchants/stats", adminOnly(adminCtrl.GetMerchantStats))
	mux.HandleFunc("/api/admin/monthly", adminOnly(adminCtrl.GetMonthlyRevenue))
	mux.HandleFunc("/api/admin/finance/monthly", adminOnly(adminCtrl.GetMonthlyRevenue)) // Alias for dashboard
	mux.HandleFunc("/api/admin/notifications", adminOnly(adminCtrl.GetNotifications))
	mux.HandleFunc("/api/admin/notifications/read", adminOnly(adminCtrl.MarkNotificationRead))

	// User Management
	mux.HandleFunc("/api/admin/users", can("manage_users")(adminCtrl.GetUsers))
	mux.HandleFunc("/api/admin/users/create", can("manage_users")(adminCtrl.CreateUser))
	mux.HandleFunc("/api/admin/users/update", can("manage_users")(adminCtrl.UpdateUser))
	mux.HandleFunc("/api/admin/users/delete", can("manage_users")(adminCtrl.DeleteUser))

	// Merchant Management
	mux.HandleFunc("/api/admin/merchants", adminOnly(adminCtrl.GetMerchants))
	mux.HandleFunc("/api/admin/merchants/status", adminOnly(adminCtrl.UpdateMerchantStatus))
	mux.HandleFunc("/api/admin/merchants/verify", adminOnly(adminCtrl.VerifyMerchant))
	mux.HandleFunc("/api/admin/merchants/restock", adminOnly(adminCtrl.GetRestockRequests))
	mux.HandleFunc("/api/admin/merchants/restock/moderate", adminOnly(adminCtrl.ModerateRestockRequest))

	// Product Catalog
	mux.HandleFunc("/api/admin/products", can("manage_products")(adminCtrl.GetProducts))
	mux.HandleFunc("/api/admin/products/moderate", can("manage_products")(adminCtrl.ModerateProduct))
	mux.HandleFunc("/api/admin/products/delete", can("manage_products")(adminCtrl.DeleteProduct))
	mux.HandleFunc("/api/admin/products/add", can("manage_products")(adminCtrl.AddProduct))
	mux.HandleFunc("/api/admin/products/update", can("manage_products")(adminCtrl.UpdateProduct))
	mux.HandleFunc("/api/admin/categories", adminOnly(adminCtrl.GetCategories))
	mux.HandleFunc("/api/admin/categories/add", adminOnly(adminCtrl.AddCategory))
	mux.HandleFunc("/api/admin/categories/delete", adminOnly(adminCtrl.DeleteCategory))
	mux.HandleFunc("/api/admin/brands", adminOnly(adminCtrl.GetBrands))
	mux.HandleFunc("/api/admin/brands/upsert", adminOnly(adminCtrl.UpsertBrand))
	mux.HandleFunc("/api/admin/brands/delete", adminOnly(adminCtrl.DeleteBrand))
	mux.HandleFunc("/api/admin/attributes", adminOnly(adminCtrl.GetAttributes))
	mux.HandleFunc("/api/admin/attributes/upsert", adminOnly(adminCtrl.UpsertAttribute))
	mux.HandleFunc("/api/admin/attributes/delete", adminOnly(adminCtrl.DeleteAttribute))

	// Order & Transactions
	mux.HandleFunc("/api/admin/orders", adminOnly(adminCtrl.GetAllOrders))
	mux.HandleFunc("/api/admin/orders/", adminOnly(adminCtrl.GetOrderDetail))
	mux.HandleFunc("/api/admin/orders/status", adminOnly(adminCtrl.UpdateOrderStatus))
	mux.HandleFunc("/api/admin/orders/freeze", adminOnly(adminCtrl.FreezeOrder))
	mux.HandleFunc("/api/admin/disputes", adminOnly(adminCtrl.GetDisputes))
	mux.HandleFunc("/api/admin/disputes/arbitrate", adminOnly(adminCtrl.ArbitrateDispute))

	// POS System
	mux.HandleFunc("/api/admin/pos/products", adminOnly(adminCtrl.POSGetProducts))
	mux.HandleFunc("/api/admin/pos/checkout", adminOnly(adminCtrl.POSCheckout))

	// analysis section removed redundant blog lines handled below

	// Analysis & Reports
	mux.HandleFunc("/api/admin/wishlist/stats", adminOnly(adminCtrl.GetWishlistStats))

	// Affiliate & Marketing
	mux.HandleFunc("/api/admin/affiliates", adminOnly(adminCtrl.GetAffiliates))
	mux.HandleFunc("/api/admin/affiliates/configs", adminOnly(adminCtrl.GetAffiliateConfigs))
	mux.HandleFunc("/api/admin/affiliates/config", adminOnly(adminCtrl.UpsertAffiliateConfig))
	mux.HandleFunc("/api/admin/affiliates/configs/upsert", adminOnly(adminCtrl.UpsertAffiliateConfig))
	mux.HandleFunc("/api/admin/affiliates/clicks", adminOnly(adminCtrl.GetAffiliateClicks))
	mux.HandleFunc("/api/admin/affiliates/withdrawals", adminOnly(adminCtrl.GetAffiliateWithdrawals))
	mux.HandleFunc("/api/admin/affiliates/withdrawals/process", adminOnly(adminCtrl.ProcessAffiliateWithdrawal))
	mux.HandleFunc("/api/admin/vouchers", adminOnly(adminCtrl.GetVouchers))
	mux.HandleFunc("/api/admin/vouchers/upsert", adminOnly(adminCtrl.UpsertVoucher))

	// Finance & Payouts
	mux.HandleFunc("/api/admin/finance", adminOnly(adminCtrl.GetFinance))
	mux.HandleFunc("/api/admin/transactions", adminOnly(adminCtrl.GetTransactions))
	mux.HandleFunc("/api/admin/finance/ledger", adminOnly(adminCtrl.GetFinanceLedger))
	mux.HandleFunc("/api/admin/payouts", adminOnly(adminCtrl.GetPayouts))
	mux.HandleFunc("/api/admin/payouts/process", adminOnly(adminCtrl.ProcessPayout))
	mux.HandleFunc("/api/admin/payouts/settings", adminOnly(adminCtrl.PayoutSettings))

	// CMS & Content
	mux.HandleFunc("/api/admin/blogs", adminOnly(adminCtrl.GetBlogs))
	mux.HandleFunc("/api/admin/blogs/upsert", adminOnly(adminCtrl.UpsertBlog))
	mux.HandleFunc("/api/admin/blogs/delete", adminOnly(adminCtrl.DeleteBlog))
	mux.HandleFunc("/api/admin/banners", adminOnly(adminCtrl.ManageBanners))
	mux.HandleFunc("/api/admin/banners/delete", superAdminOnly(adminCtrl.DeleteBanner))

	// Affiliate Resource Management
	mux.HandleFunc("/api/admin/education", adminOnly(adminCtrl.GetEducation))
	mux.HandleFunc("/api/admin/education/upsert", adminOnly(adminCtrl.UpsertEducation))
	mux.HandleFunc("/api/admin/education/delete", adminOnly(adminCtrl.DeleteEducation))
	mux.HandleFunc("/api/admin/events", adminOnly(adminCtrl.GetEvents))
	mux.HandleFunc("/api/admin/events/upsert", adminOnly(adminCtrl.UpsertEvent))
	mux.HandleFunc("/api/admin/events/delete", adminOnly(adminCtrl.DeleteEvent))
	mux.HandleFunc("/api/admin/promo", adminOnly(adminCtrl.GetPromoMaterials))
	mux.HandleFunc("/api/admin/promo/upsert", adminOnly(adminCtrl.UpsertPromoMaterial))
	mux.HandleFunc("/api/admin/promo/delete", adminOnly(adminCtrl.DeletePromoMaterial))

	// CMS & Inbox
	mux.HandleFunc("/api/admin/inbox", superAdminOnly(contactCtrl.GetMessages))
	mux.HandleFunc("/api/admin/inbox/update", superAdminOnly(contactCtrl.UpdateStatus))
	mux.HandleFunc("/api/admin/inbox/delete", superAdminOnly(contactCtrl.DeleteMessage))

	// RBAC Management
	mux.HandleFunc("/api/admin/rbac/permissions", superAdminOnly(rbacCtrl.GetPermissions))
	mux.HandleFunc("/api/admin/rbac/roles", superAdminOnly(rbacCtrl.GetRoles))
	mux.HandleFunc("/api/admin/rbac/roles/upsert", superAdminOnly(rbacCtrl.UpsertRole))
	mux.HandleFunc("/api/admin/rbac/roles/delete", superAdminOnly(rbacCtrl.DeleteRole))
	mux.HandleFunc("/api/admin/rbac/users", superAdminOnly(rbacCtrl.CreateAdminUser))
	mux.HandleFunc("/api/admin/rbac/users/status", superAdminOnly(rbacCtrl.ToggleAdminStatus))
	mux.HandleFunc("/api/admin/rbac/users/delete", superAdminOnly(rbacCtrl.DeleteAdmin))

	// System & Config
	mux.HandleFunc("/api/admin/configs", adminOnly(adminCtrl.GetSettings))
	mux.HandleFunc("/api/admin/configs/upsert", adminOnly(adminCtrl.UpsertSettings))
	mux.HandleFunc("/api/admin/logistics", adminOnly(adminCtrl.GetLogistics))
	mux.HandleFunc("/api/admin/logistics/toggle", adminOnly(adminCtrl.ToggleLogistic))
	mux.HandleFunc("/api/admin/regions", adminOnly(adminCtrl.GetRegions))
	mux.HandleFunc("/api/admin/regions/upsert", adminOnly(adminCtrl.UpsertRegion))
	mux.HandleFunc("/api/admin/audit-logs", adminOnly(adminCtrl.GetAuditLogs))
	mux.HandleFunc("/api/admin/upload", adminOnly(adminCtrl.UploadImage))

	// --- Public Routes (Continued) ---
	mux.HandleFunc("/api/public/categories", adminCtrl.GetPublicCategories)
	mux.HandleFunc("/api/public/blogs", adminCtrl.GetPublicBlogs)
	mux.HandleFunc("/api/public/blogs/detail", adminCtrl.GetPublicBlogDetail)
	mux.HandleFunc("/api/public/banners", adminCtrl.GetPublicBanners)
	mux.HandleFunc("/api/public/vouchers", adminCtrl.GetPublicVouchers)
	mux.HandleFunc("/api/public/checkout", buyerCtrl.PublicCheckout)
	mux.HandleFunc("/api/public/vouchers/check", adminCtrl.CheckVoucher)
	mux.HandleFunc("/api/public/contact/submit", contactCtrl.SubmitMessage)
	mux.HandleFunc("/api/public/configs", adminCtrl.GetPublicConfig) // Alias for public config
	mux.HandleFunc("/api/public/config", adminCtrl.GetPublicConfig)
	mux.HandleFunc("/api/public/products/detail", adminCtrl.GetPublicProductDetail)
	mux.HandleFunc("/api/public/products", adminCtrl.GetPublicProducts)
	mux.HandleFunc("/api/public/products/reviews", productCtrl.GetReviews)
	
	// Real-time Notifications
	mux.HandleFunc("/api/notifications/stream", utils.SSEHandler)

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
