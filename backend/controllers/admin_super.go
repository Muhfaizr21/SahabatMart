package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AdminController struct {
	DB       *gorm.DB
	Service  *services.AdminService
	Audit    *services.AuditService
	Storage  *services.StorageService
}

func NewAdminController(db *gorm.DB) *AdminController {
	audit := services.NewAuditService(repositories.NewAuditRepository(db))
	return &AdminController{
		DB:      db,
		Service: services.NewAdminService(db, audit),
		Audit:   audit,
		Storage: services.NewStorageService("http://localhost:8080", "uploads"),
	}
}

func (ac *AdminController) hasTable(name string) bool {
	return ac.DB != nil && ac.DB.Migrator().HasTable(name)
}

// POST /api/admin/upload
func (ac *AdminController) UploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	r.ParseMultipartForm(10 << 20)
	file, header, err := r.FormFile("image")
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Gagal mengambil gambar")
		return
	}
	defer file.Close()

	url, err := ac.Storage.SaveImage(file, header)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan file")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"url": url})
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS & MEMBERS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/admin/users          → list semua user
// POST /api/admin/users/filter   → filter by role/status
func (ac *AdminController) GetUsers(w http.ResponseWriter, r *http.Request) {
	role := r.URL.Query().Get("role")
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	query := ac.DB.Preload("Profile")
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		// Kita tambahkan pencarian berdasarkan ID juga agar fitur Edit bisa memanggil data lewat ID
		query = query.Where("email ILIKE ? OR phone ILIKE ? OR CAST(id AS TEXT) = ?", "%"+search+"%", "%"+search+"%", search)
	}

	var users []models.User
	query.Find(&users)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(users),
		"data":   users,
	})
}

// PUT /api/admin/users/update
func (ac *AdminController) UpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		UserID           string `json:"user_id"`
		Status           string `json:"status"` // active, suspended, banned
		Role             string `json:"role"`
		AdminRole        string `json:"admin_role"`
		AdminPermissions string `json:"admin_permissions"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	updates := map[string]interface{}{}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.AdminRole != "" {
		updates["admin_role"] = req.AdminRole
	}
	if req.AdminPermissions != "" {
		updates["admin_permissions"] = req.AdminPermissions
	}

	ac.DB.Model(&models.User{}).Where("id = ?", req.UserID).Updates(updates)
	ac.Audit.Log("admin", "update_user", "user", req.UserID,
		fmt.Sprintf("status=%s role=%s admin_role=%s", req.Status, req.Role, req.AdminRole),
		r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/users/delete?id=xxx  (soft delete)
func (ac *AdminController) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	if err := ac.DB.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus user")
		return
	}
	ac.Audit.Log("admin", "delete_user", "user", id, "suspended", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/users/stats
func (ac *AdminController) GetUserStats(w http.ResponseWriter, r *http.Request) {
	var total, active, suspended, buyers, affiliates, merchants int64
	ac.DB.Model(&models.User{}).Count(&total)
	ac.DB.Model(&models.User{}).Where("status = 'active'").Count(&active)
	ac.DB.Model(&models.User{}).Where("status = 'suspended'").Count(&suspended)
	ac.DB.Model(&models.User{}).Where("role = 'buyer'").Count(&buyers)
	ac.DB.Model(&models.User{}).Where("role = 'affiliate'").Count(&affiliates)
	ac.DB.Model(&models.User{}).Where("role = 'merchant'").Count(&merchants)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total":      total,
		"active":     active,
		"suspended":  suspended,
		"buyers":     buyers,
		"affiliates": affiliates,
		"merchants":  merchants,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// MERCHANTS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/merchants
func (ac *AdminController) GetMerchants(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	query := ac.DB.Model(&models.Merchant{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where("store_name ILIKE ? OR slug ILIKE ?", like, like)
	}

	var merchants []models.Merchant
	query.Order("created_at DESC").Find(&merchants)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(merchants),
		"data":   merchants,
	})
}

// PUT /api/admin/merchants/status
func (ac *AdminController) UpdateMerchantStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		MerchantID  string `json:"merchant_id"`
		Status      string `json:"status"` // active, suspended, banned, pending
		SuspendNote string `json:"suspend_note"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	updates := map[string]interface{}{"status": req.Status}
	if req.Status == "suspended" {
		now := time.Now()
		updates["suspended_at"] = &now
		updates["suspend_note"] = req.SuspendNote
	}

	ac.DB.Model(&models.Merchant{}).Where("id = ?", req.MerchantID).Updates(updates)
	ac.Audit.Log("admin", "update_merchant_status", "merchant", req.MerchantID,
		fmt.Sprintf("status=%s note=%s", req.Status, req.SuspendNote),
		r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// PUT /api/admin/merchants/verify
func (ac *AdminController) VerifyMerchant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		MerchantID string `json:"merchant_id"`
		Verified   bool   `json:"verified"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	ac.DB.Model(&models.Merchant{}).Where("id = ?", req.MerchantID).Update("is_verified", req.Verified)
	ac.Audit.Log("admin", "verify_merchant", "merchant", req.MerchantID,
		fmt.Sprintf("verified=%v", req.Verified), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/merchants/stats
func (ac *AdminController) GetMerchantStats(w http.ResponseWriter, r *http.Request) {
	var total, active, pending, suspended, verified int64
	ac.DB.Model(&models.Merchant{}).Count(&total)
	ac.DB.Model(&models.Merchant{}).Where("status = 'active'").Count(&active)
	ac.DB.Model(&models.Merchant{}).Where("status = 'pending'").Count(&pending)
	ac.DB.Model(&models.Merchant{}).Where("status = 'suspended'").Count(&suspended)
	ac.DB.Model(&models.Merchant{}).Where("is_verified = true").Count(&verified)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total":     total,
		"active":    active,
		"pending":   pending,
		"suspended": suspended,
		"verified":  verified,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/categories
func (ac *AdminController) GetCategories(w http.ResponseWriter, r *http.Request) {
	var categories []models.Category
	ac.DB.Order("categories.order ASC").Find(&categories)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   categories,
	})
}

// POST /api/admin/categories
func (ac *AdminController) AddCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var cat models.Category
	if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// Monster Integrity: Ensure name uniqueness (case-insensitive)
	var existing models.Category
	query := ac.DB.Where("LOWER(name) = LOWER(?)", cat.Name)
	if cat.ID > 0 {
		query = query.Where("id <> ?", cat.ID) // Exclude self if editing
	}
	if err := query.First(&existing).Error; err == nil {
		utils.JSONError(w, http.StatusConflict, fmt.Sprintf("Kategori dangan nama '%s' sudah terdaftar. Gunakan nama unik.", cat.Name))
		return
	}

	var err error
	if cat.ID == 0 {
		err = ac.DB.Create(&cat).Error
	} else {
		err = ac.DB.Save(&cat).Error
	}

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memproses kategori")
		return
	}

	action := "create_category"
	if cat.ID > 0 { action = "update_category" }
	ac.Audit.Log("admin", action, "category", fmt.Sprintf("%d", cat.ID), cat.Name, r.RemoteAddr)
	
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   cat,
	})
}

// DELETE /api/admin/categories/delete?id=xxx
func (ac *AdminController) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	ac.DB.Where("id = ?", id).Delete(&models.Category{})
	ac.Audit.Log("admin", "delete_category", "category", id, "deleted", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS MANAGEMENT (GLOBAL)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/orders
func (ac *AdminController) GetAllOrders(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	if !ac.hasTable("order_merchant_groups") || !ac.hasTable("orders") {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   []interface{}{},
		})
		return
	}

	type OrderRow struct {
		ID          string    `json:"id"`
		MerchantID  string    `json:"merchant_id"`
		StoreName   string    `json:"store_name"`
		BuyerName   string    `json:"buyer_name"`
		BuyerEmail  string    `json:"buyer_email"`
		Status      string    `json:"status"`
		Subtotal    float64   `json:"subtotal"`
		TotalAmount float64   `json:"total_amount"`
		CreatedAt   time.Time `json:"created_at"`
	}

	query := ac.DB.Table("order_merchant_groups omg").
		Select("omg.id, omg.merchant_id, m.store_name, up.full_name as buyer_name, u.email as buyer_email, omg.status, omg.subtotal, (omg.subtotal + omg.shipping_cost - omg.discount) as total_amount, omg.created_at").
		Joins("JOIN merchants m ON m.id = omg.merchant_id").
		Joins("JOIN orders o ON o.id = omg.order_id").
		Joins("JOIN users u ON u.id = o.buyer_id").
		Joins("JOIN user_profiles up ON up.user_id = u.id")

	if status != "" {
		query = query.Where("omg.status = ?", status)
	}

	var orders []OrderRow
	query.Order("omg.created_at DESC").Scan(&orders)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   orders,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS MANAGEMENT (GLOBAL)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// AFFILIATE / MEMBER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/affiliates
func (ac *AdminController) GetAffiliates(w http.ResponseWriter, r *http.Request) {
	var affiliates []models.User
	ac.DB.Preload("Profile").Where("role = 'affiliate'").Find(&affiliates)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(affiliates),
		"data":   affiliates,
	})
}

// GET /api/admin/affiliates/configs  → list tier komisi afiliasi
func (ac *AdminController) GetAffiliateConfigs(w http.ResponseWriter, r *http.Request) {
	var configs []models.AffiliateConfig
	ac.DB.Find(&configs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   configs,
	})
}

// POST/PUT /api/admin/affiliates/config
func (ac *AdminController) UpsertAffiliateConfig(w http.ResponseWriter, r *http.Request) {
	var cfg models.AffiliateConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if cfg.ID == 0 {
		ac.DB.Create(&cfg)
	} else {
		ac.DB.Save(&cfg)
	}
	ac.Audit.Log("admin", "upsert_affiliate_config", "affiliate_config",
		fmt.Sprintf("%d", cfg.ID), cfg.TierName, r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   cfg,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT MODERATION
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/products?status=active&search=xxx
func (ac *AdminController) GetProducts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	merchantID := r.URL.Query().Get("merchant_id")

	type ProductRow struct {
		ID          string    `json:"id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		Slug        string    `json:"slug"`
		Price       float64   `json:"price"`
		Status      string    `json:"status"`
		MerchantID  string    `json:"merchant_id"`
		StoreName   string    `json:"store_name"`
		Category    string    `json:"category"`
		Attributes  string    `json:"attributes"`
		Image       string    `json:"image"`
		CreatedAt   time.Time `json:"created_at"`
	}

	query := ac.DB.Table("products p").
		Select("p.id, p.name, p.description, p.image, p.slug, p.price, p.status, p.merchant_id, m.store_name, p.category, p.attributes, p.created_at").
		Joins("LEFT JOIN merchants m ON m.id = p.merchant_id")

	if status != "" {
		query = query.Where("p.status = ?", status)
	}
	if merchantID != "" {
		query = query.Where("p.merchant_id = ?", merchantID)
	}
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		// Cari berdasarkan Nama, Deskripsi, ATAU ID (dengan CAST ke text)
		query = query.Where("p.name ILIKE ? OR p.description ILIKE ? OR CAST(p.id AS TEXT) = ?", like, like, search)
	}

	var rows []ProductRow
	query.Order("p.created_at DESC").Scan(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(rows),
		"data":   rows,
	})
}

// PUT /api/admin/products/moderate
func (ac *AdminController) ModerateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		ID     string `json:"id"`
		Status string `json:"status"` // active, taken_down
		Note   string `json:"note"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	ac.DB.Table("products").Where("id = ?", req.ID).Update("status", req.Status)
	ac.Audit.Log("admin", "moderate_product", "product", req.ID,
		fmt.Sprintf("status=%s note=%s", req.Status, req.Note), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/products/delete?id=xxx
func (ac *AdminController) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	// HAPUS PERMANEN (Hard Delete) - Data benar-benar hilang dari database
	if err := ac.DB.Unscoped().Delete(&models.Product{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus produk secara permanen")
		return
	}
	ac.Audit.Log("admin", "delete_product_permanent", "product", id, "purged from database", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/products/add
func (ac *AdminController) AddProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// Default to SahabatMart Official if no merchant selected (for super admin)
	if p.MerchantID == "" {
		var m models.Merchant
		err := ac.DB.Where("store_name = ?", "SahabatMart Official").First(&m).Error
		if err != nil {
			// Find first admin to link the merchant
			var admin models.User
			ac.DB.Where("role IN ?", []string{"admin", "superadmin"}).First(&admin)
			
			// Benar-benar tidak ada merchant, buatkan satu official terkait admin
			m = models.Merchant{
				UserID:    admin.ID,
				StoreName: "SahabatMart Official",
				Slug:      "sahabatmart-official",
				Status:    "active",
			}
			ac.DB.Create(&m)
		}
		p.MerchantID = m.ID
	}

	if p.Slug == "" {
		p.Slug = strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
		// Tambahkan suffix timestamp agar slug unik
		p.Slug = fmt.Sprintf("%s-%d", p.Slug, time.Now().Unix()%1000)
	}

	if err := ac.DB.Create(&p).Error; err != nil {
		fmt.Printf("❌ Database Error: %v\n", err) // Log ke terminal backend untuk debug
		utils.JSONError(w, http.StatusInternalServerError, fmt.Sprintf("Database Error: %v", err))
		return
	}

	ac.Audit.Log("admin", "create_product", "product", p.ID, p.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{"status": "success", "data": p})
}

// PUT /api/admin/products/update
func (ac *AdminController) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Price       float64 `json:"price"`
		OldPrice    float64 `json:"old_price"`
		Category    string  `json:"category"`
		Brand       string  `json:"brand"`
		Attributes  string  `json:"attributes"`
		Stock       int     `json:"stock"`
		Image       string  `json:"image"`
		Status      string  `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	updates := map[string]interface{}{
		"name":        req.Name,
		"description": req.Description,
		"price":       req.Price,
		"old_price":   req.OldPrice,
		"category":    req.Category,
		"brand":       req.Brand,
		"attributes":  req.Attributes,
		"stock":       req.Stock,
		"image":       req.Image,
		"status":      req.Status,
	}

	if err := ac.DB.Table("products").Where("id = ?", req.ID).Updates(updates).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to update product")
		return
	}

	ac.Audit.Log("admin", "update_product", "product", req.ID, req.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE & REVENUE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/finance  → overview revenue platform
func (ac *AdminController) GetFinance(w http.ResponseWriter, r *http.Request) {
	var totalRevenue, totalPlatformFee, pendingPayout, totalInsurance float64
	var totalOrders, completedOrders int64

	if ac.hasTable("wallets") {
		ac.DB.Table("wallets").Select("COALESCE(SUM(balance), 0)").Scan(&totalRevenue)
		ac.DB.Table("wallets").Select("COALESCE(SUM(pending_balance), 0)").Scan(&pendingPayout)
	}

	if ac.hasTable("wallet_transactions") {
		ac.DB.Table("wallet_transactions").
			Where("type = ?", models.TxPlatformFee).
			Select("COALESCE(SUM(amount), 0)").Scan(&totalPlatformFee)
	}

	if ac.hasTable("orders") {
		ac.DB.Model(&models.Order{}).Count(&totalOrders)
		ac.DB.Model(&models.Order{}).Where("status = ?", models.OrderCompleted).Count(&completedOrders)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_revenue":      totalRevenue,
		"total_platform_fee": totalPlatformFee,
		"total_insurance":    totalInsurance,
		"pending_payout":     pendingPayout,
		"total_orders":       totalOrders,
		"completed_orders":   completedOrders,
	})
}

// GET /api/admin/finance/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD
func (ac *AdminController) GetTransactions(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if !ac.hasTable("order_merchant_groups") {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"total":  0,
			"data":   []interface{}{},
		})
		return
	}

	type TxRow struct {
		ID          string  `json:"id"`
		MerchantID  string  `json:"merchant_id"`
		StoreName   string  `json:"store_name"`
		Subtotal    float64 `json:"subtotal"`
		PlatformFee float64 `json:"platform_fee"`
		Status      string  `json:"status"`
		CreatedAt   string  `json:"created_at"`
	}

	query := ac.DB.Table("order_merchant_groups omg").
		Select("omg.id, omg.merchant_id, m.store_name, omg.subtotal, omg.platform_fee, omg.status, omg.created_at").
		Joins("LEFT JOIN merchants m ON m.id = omg.merchant_id")

	if from != "" {
		query = query.Where("omg.created_at >= ?", from)
	}
	if to != "" {
		query = query.Where("omg.created_at <= ?", to+" 23:59:59")
	}

	var rows []TxRow
	query.Order("omg.created_at DESC").Limit(200).Scan(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(rows),
		"data":   rows,
	})
}

// GET /api/admin/finance/monthly  → revenue per bulan (chart)
func (ac *AdminController) GetMonthlyRevenue(w http.ResponseWriter, r *http.Request) {
	if !ac.hasTable("order_merchant_groups") {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   []interface{}{},
		})
		return
	}

	type MonthRow struct {
		Month   string  `json:"month"`
		Revenue float64 `json:"revenue"`
		Fee     float64 `json:"fee"`
		Orders  int     `json:"orders"`
	}

	var rows []MonthRow
	ac.DB.Raw(`
		SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
		       COALESCE(SUM(subtotal), 0) AS revenue,
		       COALESCE(SUM(platform_fee), 0) AS fee,
		       COUNT(*) AS orders
		FROM order_merchant_groups
		WHERE created_at >= NOW() - INTERVAL '12 months'
		GROUP BY month
		ORDER BY month ASC
	`).Scan(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   rows,
	})
}

// GET /api/admin/finance/ledger  → list mutasi saldo finansial (Audit Trail)
func (ac *AdminController) GetFinanceLedger(w http.ResponseWriter, r *http.Request) {
	if !ac.hasTable("wallet_transactions") {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   []interface{}{},
		})
		return
	}

	var rows []models.WalletTransaction
	ac.DB.Order("created_at DESC").Limit(500).Find(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   rows,
	})
}

// GET /api/admin/orders/:id  → Detail pesanan lengkap (Req 1, 6)
func (ac *AdminController) GetOrderDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
	var order models.Order
	if err := ac.DB.Preload("MerchantGroups.Items").First(&order, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Order not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   order,
	})
}

// POST /api/admin/orders/status → Update status dengan State Machine (Req 1)
func (ac *AdminController) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OrderID string            `json:"order_id"`
		Status  models.OrderStatus `json:"status"`
		Note    string            `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	var order models.Order
	if err := ac.DB.First(&order, "id = ?", req.OrderID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Order not found")
		return
	}

	// Validate Transition (Req 1)
	if err := utils.ValidateOrderTransition(order.Status, req.Status); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Update Status
	oldStatus := order.Status
	order.Status = req.Status
	if req.Status == models.OrderCompleted {
		now := time.Now()
		order.CompletedAt = &now
	}

	if err := ac.DB.Save(&order).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to update status")
		return
	}

	// Audit Trail (Req 9)
	adminID := "admin-system"
	utils.LogAudit(ac.DB, adminID, "update_order_status", "order", order.ID, fmt.Sprintf("Changed status from %s to %s. Note: %s", oldStatus, req.Status, req.Note), oldStatus, req.Status, r.RemoteAddr, r.UserAgent())

	// If status is PAID, trigger background work (Commissions, etc - Req 13)
	if req.Status == models.OrderPaid {
		// Mock triggering commission approval/processing
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Order status updated successfully",
	})
}

// POST /api/admin/orders/freeze
func (ac *AdminController) FreezeOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		OrderID string `json:"order_id"`
		Reason  string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if err := ac.DB.Model(&models.Order{}).Where("id = ?", req.OrderID).Update("status", models.OrderFrozen).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to freeze order")
		return
	}
	
	ac.Audit.Log("admin", "freeze_order", "order", req.OrderID, req.Reason, r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status": "success", 
		"message": "Order has been frozen for mediation",
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMISSION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/admin/commissions/category
// POST /api/admin/commissions/category
func (ac *AdminController) ManageCommissions(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		var comms []models.CategoryCommission
		ac.DB.Find(&comms)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   comms,
		})
		return
	}
	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var comm models.CategoryCommission
		json.NewDecoder(r.Body).Decode(&comm)
		ac.DB.Save(&comm)
		ac.Audit.Log("admin", "upsert_commission", "category_commission",
			fmt.Sprintf("%d", comm.ID), fmt.Sprintf("cat=%d fee=%.4f", comm.CategoryID, comm.FeePercent),
			r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   comm,
		})
	}
}

// GET  /api/admin/commissions/merchant
// POST /api/admin/commissions/merchant
func (ac *AdminController) ManageMerchantCommissions(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		merchantID := r.URL.Query().Get("merchant_id")
		query := ac.DB.Model(&models.MerchantCommission{})
		if merchantID != "" {
			query = query.Where("merchant_id = ?", merchantID)
		}
		var comms []models.MerchantCommission
		query.Find(&comms)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   comms,
		})
		return
	}
	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var comm models.MerchantCommission
		json.NewDecoder(r.Body).Decode(&comm)
		ac.DB.Save(&comm)
		ac.Audit.Log("admin", "upsert_merchant_commission", "merchant_commission",
			comm.MerchantID, fmt.Sprintf("fee=%.4f", comm.FeePercent), r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   comm,
		})
	}
}

// POST /api/admin/commissions/bulk
func (ac *AdminController) BulkUpdateCommissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var comms []models.CategoryCommission
	if err := json.NewDecoder(r.Body).Decode(&comms); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	for _, comm := range comms {
		ac.DB.Save(&comm)
	}
	ac.Audit.Log("admin", "bulk_update_commissions", "category_commission", "", fmt.Sprintf("updated %d items", len(comms)), r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOUT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/payouts
func (ac *AdminController) GetPayouts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	query := ac.DB.Model(&models.PayoutRequest{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var payouts []models.PayoutRequest
	query.Order("requested_at DESC").Find(&payouts)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(payouts),
		"data":   payouts,
	})
}

// PUT /api/admin/payouts/process
func (ac *AdminController) ProcessPayout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		PayoutID    string `json:"payout_id"`
		Status      string `json:"status"` // approved, rejected, paid
		Note        string `json:"note"`
		ProcessedBy string `json:"processed_by"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	now := time.Now()
	ac.DB.Model(&models.PayoutRequest{}).Where("id = ?", req.PayoutID).Updates(map[string]interface{}{
		"status":       req.Status,
		"note":         req.Note,
		"processed_at": &now,
		"processed_by": req.ProcessedBy,
	})
	ac.Audit.Log(req.ProcessedBy, "process_payout", "payout", req.PayoutID,
		fmt.Sprintf("status=%s", req.Status), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetBrands(w http.ResponseWriter, r *http.Request) {
	var brands []models.Brand
	ac.DB.Order("name ASC").Find(&brands)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": brands})
}

func (ac *AdminController) UpsertBrand(w http.ResponseWriter, r *http.Request) {
	var brand models.Brand
	json.NewDecoder(r.Body).Decode(&brand)

	// Monster Integrity: Cek apakah nama sudah ada (Case-Insensitive Auto-Merge)
	if brand.ID == 0 {
		var existing models.Brand
		if err := ac.DB.Where("LOWER(name) = LOWER(?)", brand.Name).First(&existing).Error; err == nil {
			brand.ID = existing.ID
		}
	}

	if brand.ID == 0 {
		ac.DB.Create(&brand)
	} else {
		ac.DB.Save(&brand)
	}
	ac.Audit.Log("admin", "upsert_brand", "brand", fmt.Sprintf("%d", brand.ID), brand.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, brand)
}

func (ac *AdminController) DeleteBrand(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Brand{}, id)
	ac.Audit.Log("admin", "delete_brand", "brand", id, "", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetAttributes(w http.ResponseWriter, r *http.Request) {
	var attrs []models.Attribute
	ac.DB.Find(&attrs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": attrs})
}

func (ac *AdminController) UpsertAttribute(w http.ResponseWriter, r *http.Request) {
	var attr models.Attribute
	json.NewDecoder(r.Body).Decode(&attr)
	if attr.ID == 0 {
		ac.DB.Create(&attr)
	} else {
		ac.DB.Save(&attr)
	}
	ac.Audit.Log("admin", "upsert_attribute", "attribute", fmt.Sprintf("%d", attr.ID), attr.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, attr)
}

func (ac *AdminController) DeleteAttribute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Attribute{}, id)
	ac.Audit.Log("admin", "delete_attribute", "attribute", id, "", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGISTIC MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetLogistics(w http.ResponseWriter, r *http.Request) {
	var channels []models.LogisticChannel
	ac.DB.Find(&channels)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": channels})
}

func (ac *AdminController) ToggleLogistic(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID     uint `json:"id"`
		Active bool `json:"active"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	ac.DB.Model(&models.LogisticChannel{}).Where("id = ?", req.ID).Update("is_active", req.Active)
	ac.Audit.Log("admin", "toggle_logistic", "logistic", fmt.Sprintf("%d", req.ID), fmt.Sprintf("active=%v", req.Active), r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE & ARBITRATION
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetDisputes(w http.ResponseWriter, r *http.Request) {
	var disputes []models.Dispute
	ac.DB.Order("created_at DESC").Find(&disputes)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": disputes})
}

func (ac *AdminController) ArbitrateDispute(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID           uint   `json:"id"`
		Status       string `json:"status"` // refund_approved, rejected
		DecisionNote string `json:"decision_note"`
		DecidedBy    string `json:"decided_by"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		var dispute models.Dispute
		if err := tx.First(&dispute, req.ID).Error; err != nil {
			return err
		}

		// Update Dispute status
		dispute.Status = req.Status
		dispute.DecisionNote = req.DecisionNote
		dispute.DecidedBy = req.DecidedBy
		dispute.UpdatedAt = time.Now()
		if err := tx.Save(&dispute).Error; err != nil {
			return err
		}

		// Jika Refund Disetujui, tarik uang dari Merchant
		if req.Status == "refund_approved" {
			finance := services.NewFinanceService(ac.DB)
			desc := fmt.Sprintf("Refund Sengketa: %s", dispute.OrderID)
			// Deduct from merchant pending/balance
			if err := finance.ProcessTransaction(tx, dispute.MerchantID, models.WalletMerchant, models.TxRefundDeduction, dispute.Amount, fmt.Sprintf("%d", dispute.ID), "dispute", desc); err != nil {
				return err
			}
			
			// Update Order status to Refunded
			tx.Table("orders").Where("id = ?", dispute.OrderID).Update("status", "refunded")
		}

		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memproses arbitrase")
		return
	}

	ac.Audit.Log(req.DecidedBy, "arbitrate_dispute", "dispute", fmt.Sprintf("%d", req.ID), req.Status, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM VOUCHERS
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetVouchers(w http.ResponseWriter, r *http.Request) {
	var vouchers []models.Voucher
	ac.DB.Find(&vouchers)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": vouchers})
}

func (ac *AdminController) UpsertVoucher(w http.ResponseWriter, r *http.Request) {
	var v models.Voucher
	json.NewDecoder(r.Body).Decode(&v)
	if v.ID == 0 {
		ac.DB.Create(&v)
	} else {
		ac.DB.Save(&v)
	}
	ac.Audit.Log("admin", "upsert_voucher", "voucher", v.Code, v.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, v)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & AFFILIATE AUDIT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetAffiliateClicks(w http.ResponseWriter, r *http.Request) {
	var clicks []models.AffiliateClick
	ac.DB.Order("created_at DESC").Limit(1000).Find(&clicks)
	ac.Audit.Log("admin", "get_affiliate_clicks", "security", "", "viewed clicks", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": clicks})
}

// ─────────────────────────────────────────────────────────────────────────────
// REGION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetRegions(w http.ResponseWriter, r *http.Request) {
	parent := r.URL.Query().Get("parent_id")
	var regions []models.Region
	query := ac.DB.Model(&models.Region{})
	if parent != "" {
		query = query.Where("parent_id = ?", parent)
	} else {
		query = query.Where("parent_id = 0") // default province
	}
	query.Find(&regions)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": regions})
}

func (ac *AdminController) UpsertRegion(w http.ResponseWriter, r *http.Request) {
	var reg models.Region
	json.NewDecoder(r.Body).Decode(&reg)
	ac.DB.Save(&reg)
	ac.Audit.Log("admin", "upsert_region", "region", fmt.Sprintf("%d", reg.ID), reg.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, reg)
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetNotifications(w http.ResponseWriter, r *http.Request) {
	var notifs []models.AdminNotification
	ac.DB.Order("created_at DESC").Limit(20).Find(&notifs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": notifs})
}

func (ac *AdminController) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Model(&models.AdminNotification{}).Where("id = ?", id).Update("is_read", true)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/settings
func (ac *AdminController) GetSettings(w http.ResponseWriter, r *http.Request) {
	group := r.URL.Query().Get("group") // payout, payment, platform, notification
	query := ac.DB.Model(&models.PlatformConfig{})
	if group != "" {
		query = query.Where("key LIKE ?", group+"_%")
	}

	var configs []models.PlatformConfig
	query.Order("key ASC").Find(&configs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   configs,
	})
}

// POST /api/admin/settings  → bulk upsert configs
func (ac *AdminController) UpsertSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var configs []models.PlatformConfig
	if err := json.NewDecoder(r.Body).Decode(&configs); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	for _, cfg := range configs {
		ac.DB.Where("key = ?", cfg.Key).
			Assign(models.PlatformConfig{Value: cfg.Value, Description: cfg.Description}).
			FirstOrCreate(&models.PlatformConfig{})
	}
	ac.Audit.Log("admin", "upsert_settings", "platform_config", "",
		fmt.Sprintf("updated %d keys", len(configs)), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/settings/payout
func (ac *AdminController) PayoutSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		var configs []models.PlatformConfig
		ac.DB.Where("key LIKE ?", "payout_%").Find(&configs)
		utils.JSONResponse(w, http.StatusOK, configs)
		return
	}
	if r.Method == http.MethodPost {
		var configs []models.PlatformConfig
		json.NewDecoder(r.Body).Decode(&configs)
		for _, cfg := range configs {
			ac.DB.Where("key = ?", cfg.Key).
				Assign(models.PlatformConfig{Value: cfg.Value}).
				FirstOrCreate(&models.PlatformConfig{})
		}
		utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs
func (ac *AdminController) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	adminID := r.URL.Query().Get("admin_id")
	action := r.URL.Query().Get("action")
	targetType := r.URL.Query().Get("target_type")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	query := ac.DB.Model(&models.AuditLog{})
	if adminID != "" {
		query = query.Where("admin_id = ?", adminID)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if targetType != "" {
		query = query.Where("target_type = ?", targetType)
	}
	if from != "" {
		query = query.Where("created_at >= ?", from)
	}
	if to != "" {
		query = query.Where("created_at <= ?", to+" 23:59:59")
	}

	var logs []models.AuditLog
	query.Order("created_at DESC").Limit(500).Find(&logs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(logs),
		"data":   logs,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC STOREFRONT APIs (SahabatMart Sync)
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetPublicProducts(w http.ResponseWriter, r *http.Request) {
	type ProductInfo struct {
		models.Product
		StoreName string `json:"store_name"`
	}
	var products []ProductInfo
	query := ac.DB.Table("products").
		Select("products.*, m.store_name").
		Joins("LEFT JOIN merchants m ON m.id = products.merchant_id").
		Where("products.status = 'active'")

	if cat := r.URL.Query().Get("cat"); cat != "" {
		query = query.Where("category = ?", cat)
	}
	query.Find(&products)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": products})
}

func (ac *AdminController) GetPublicCategories(w http.ResponseWriter, r *http.Request) {
	var cats []models.Category
	ac.DB.Order("categories.order ASC").Find(&cats)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": cats})
}

func (ac *AdminController) GetPublicBlogs(w http.ResponseWriter, r *http.Request) {
	var blogs []models.BlogPost
	ac.DB.Where("status = 'published'").Order("created_at DESC").Find(&blogs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": blogs})
}

func (ac *AdminController) GetPublicBanners(w http.ResponseWriter, r *http.Request) {
	var banners []models.Banner
	ac.DB.Where("is_active = true").Order("banners.order ASC").Find(&banners)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": banners})
}

// GetPublicVouchers returns active vouchers for storefront
func (ac *AdminController) GetPublicVouchers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONResponse(w, http.StatusMethodNotAllowed, map[string]interface{}{"message": "Method not allowed"})
		return
	}

	var vouchers []models.Voucher
	ac.DB.Where("status = ?", "active").Find(&vouchers)

	if vouchers == nil {
		vouchers = []models.Voucher{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": vouchers})
}

func (ac *AdminController) GetPublicConfig(w http.ResponseWriter, r *http.Request) {
	var cfgs []models.PlatformConfig
	ac.DB.Find(&cfgs)
	res := make(map[string]string)
	for _, c := range cfgs {
		res[c.Key] = c.Value
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": res})
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/analytics/overview
func (ac *AdminController) GetOverview(w http.ResponseWriter, r *http.Request) {
	var totalUsers, totalMerchants, totalAffiliates int64
	var totalRevenue, totalFee float64
	var totalOrders, pendingPayouts int64

	ac.DB.Model(&models.User{}).Count(&totalUsers)
	ac.DB.Model(&models.Merchant{}).Where("status = 'active'").Count(&totalMerchants)
	ac.DB.Model(&models.User{}).Where("role = 'affiliate'").Count(&totalAffiliates)
	if ac.hasTable("order_merchant_groups") {
		ac.DB.Table("order_merchant_groups").Count(&totalOrders)
		ac.DB.Table("order_merchant_groups").
			Where("status = 'completed'").
			Select("COALESCE(SUM(subtotal), 0)").Scan(&totalRevenue)
		ac.DB.Table("order_merchant_groups").
			Where("status = 'completed'").
			Select("COALESCE(SUM(platform_fee), 0)").Scan(&totalFee)
	}
	if ac.hasTable("payout_requests") {
		ac.DB.Table("payout_requests").
			Where("status = 'pending'").Count(&pendingPayouts)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_users":      totalUsers,
		"total_merchants":  totalMerchants,
		"total_affiliates": totalAffiliates,
		"total_revenue":    totalRevenue,
		"total_fee":        totalFee,
		"total_orders":     totalOrders,
		"pending_payouts":  pendingPayouts,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG CMS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetBlogs(w http.ResponseWriter, r *http.Request) {
	var blogs []models.BlogPost
	status := r.URL.Query().Get("status")
	query := ac.DB.Order("created_at DESC")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	query.Find(&blogs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": blogs})
}

func (ac *AdminController) GetPublicBlogDetail(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		utils.JSONError(w, http.StatusBadRequest, "Slug is required")
		return
	}
	var blog models.BlogPost
	if err := ac.DB.Where("slug = ? AND status = 'published'", slug).First(&blog).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Article not found")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": blog})
}

func (ac *AdminController) UpsertBlog(w http.ResponseWriter, r *http.Request) {
	var post models.BlogPost
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	// Robust slug generator for SEO
	if post.Slug == "" {
		reg, _ := regexp.Compile("[^a-zA-Z0-9]+")
		post.Slug = strings.ToLower(reg.ReplaceAllString(post.Title, "-"))
		post.Slug = strings.Trim(post.Slug, "-")
	}
	ac.DB.Save(&post)
	ac.Audit.Log("admin", "upsert_blog", "blog", fmt.Sprintf("%d", post.ID), post.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, post)
}

func (ac *AdminController) DeleteBlog(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.BlogPost{}, id)
	ac.Audit.Log("admin", "delete_blog", "blog", id, "deleted", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

func (ac *AdminController) ManageBanners(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		var banners []models.Banner
		ac.DB.Order("banners.order ASC").Find(&banners)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": banners})
		return
	}
	var b models.Banner
	json.NewDecoder(r.Body).Decode(&b)
	ac.DB.Save(&b)
	ac.Audit.Log("admin", "upsert_banner", "banner", fmt.Sprintf("%d", b.ID), b.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, b)
}

func (ac *AdminController) DeleteBanner(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Banner{}, id)
	ac.Audit.Log("admin", "delete_banner", "banner", id, "deleted", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// END
// ─────────────────────────────────────────────────────────────────────────────
// GetPublicProductDetail returns detailed product info by ID
func (ac *AdminController) GetPublicProductDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONResponse(w, http.StatusMethodNotAllowed, map[string]interface{}{"message": "Method not allowed"})
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONResponse(w, http.StatusBadRequest, map[string]interface{}{"message": "Product ID is required"})
		return
	}

	type ProductInfo struct {
		models.Product
		StoreName    string `json:"store_name"`
		StoreSlug    string `json:"store_slug"`
		StoreVerified bool   `json:"store_verified"`
	}

	var product ProductInfo
	err := ac.DB.Table("products").
		Select("products.*, m.store_name, m.slug as store_slug, m.is_verified as store_verified").
		Joins("LEFT JOIN merchants m ON m.id = products.merchant_id").
		Where("products.id = ?", id).
		Scan(&product).Error

	if err != nil || product.ID == "" {
		utils.JSONResponse(w, http.StatusNotFound, map[string]interface{}{"message": "Product not found"})
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": product})
}
