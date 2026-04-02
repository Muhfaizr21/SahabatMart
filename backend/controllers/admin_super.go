package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AdminController struct {
	DB *gorm.DB
}

func (ac *AdminController) hasTable(name string) bool {
	return ac.DB != nil && ac.DB.Migrator().HasTable(name)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: log audit action
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) logAudit(adminID, action, targetType, targetID, detail, ip string) {
	if adminID == "" {
		adminID = "system"
	}
	ac.DB.Create(&models.AuditLog{
		AdminID:    adminID,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Detail:     detail,
		IPAddress:  ip,
	})
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
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where("email ILIKE ? OR phone ILIKE ?", like, like)
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
	ac.logAudit("admin", "update_user", "user", req.UserID,
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
	ac.DB.Where("id = ?", id).Delete(&models.User{})
	ac.logAudit("admin", "delete_user", "user", id, "soft deleted", r.RemoteAddr)
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
	ac.logAudit("admin", "update_merchant_status", "merchant", req.MerchantID,
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
	ac.logAudit("admin", "verify_merchant", "merchant", req.MerchantID,
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
	if err := ac.DB.Create(&cat).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create category")
		return
	}
	ac.logAudit("admin", "create_category", "category", fmt.Sprintf("%d", cat.ID), cat.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
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
	ac.logAudit("admin", "delete_category", "category", id, "deleted", r.RemoteAddr)
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
		Select("omg.id, omg.merchant_id, m.store_name, up.full_name as buyer_name, u.email as buyer_email, omg.status, omg.subtotal, omg.total_amount, omg.created_at").
		Joins("JOIN merchants m ON m.id = omg.merchant_id").
		Joins("JOIN orders o ON o.id = omg.order_id").
		Joins("JOIN users u ON u.id = o.user_id").
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
	ac.logAudit("admin", "upsert_affiliate_config", "affiliate_config",
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
		ID         string    `json:"id"`
		Name       string    `json:"name"`
		Slug       string    `json:"slug"`
		Price      float64   `json:"price"`
		Status     string    `json:"status"`
		MerchantID string    `json:"merchant_id"`
		StoreName  string    `json:"store_name"`
		Category   string    `json:"category"`
		CreatedAt  time.Time `json:"created_at"`
	}

	query := ac.DB.Table("products p").
		Select("p.id, p.name, p.slug, p.price, p.status, p.merchant_id, m.store_name, p.category, p.created_at").
		Joins("LEFT JOIN merchants m ON m.id = p.merchant_id").
		Where("p.deleted_at IS NULL")

	if status != "" {
		query = query.Where("p.status = ?", status)
	}
	if merchantID != "" {
		query = query.Where("p.merchant_id = ?", merchantID)
	}
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where("p.name ILIKE ?", like)
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
	ac.logAudit("admin", "moderate_product", "product", req.ID,
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
	// Soft delete using DB.Table if the model has DeletedAt
	ac.DB.Table("products").Where("id = ?", id).Update("deleted_at", time.Now())
	ac.logAudit("admin", "delete_product", "product", id, "soft deleted", r.RemoteAddr)
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
		ac.DB.Where("store_name = ?", "SahabatMart Official").First(&m)
		p.MerchantID = m.ID
	}

	if p.Slug == "" {
		p.Slug = strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
	}

	if err := ac.DB.Create(&p).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create product")
		return
	}

	ac.logAudit("admin", "create_product", "product", p.ID, p.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{"status": "success", "data": p})
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE & REVENUE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/finance  → overview revenue platform
func (ac *AdminController) GetFinance(w http.ResponseWriter, r *http.Request) {
	var totalRevenue, totalPlatformFee, pendingPayout, totalInsurance float64
	var totalOrders, completedOrders int64

	if ac.hasTable("order_merchant_groups") {
		ac.DB.Table("order_merchant_groups").
			Where("status = 'completed'").
			Select("COALESCE(SUM(platform_fee), 0)").Scan(&totalPlatformFee)

		ac.DB.Table("order_merchant_groups").
			Where("status = 'completed'").
			Select("COALESCE(SUM(insurance_fee), 0)").Scan(&totalInsurance)

		ac.DB.Table("order_merchant_groups").
			Select("COALESCE(SUM(subtotal), 0)").Scan(&totalRevenue)

		ac.DB.Table("order_merchant_groups").Count(&totalOrders)
		ac.DB.Table("order_merchant_groups").Where("status = 'completed'").Count(&completedOrders)
	}

	if ac.hasTable("payout_requests") {
		ac.DB.Table("payout_requests").
			Where("status = 'pending'").
			Select("COALESCE(SUM(amount), 0)").Scan(&pendingPayout)
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
		ac.logAudit("admin", "upsert_commission", "category_commission",
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
		ac.logAudit("admin", "upsert_merchant_commission", "merchant_commission",
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
	ac.logAudit("admin", "bulk_update_commissions", "category_commission", "", fmt.Sprintf("updated %d items", len(comms)), r.RemoteAddr)
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
	ac.logAudit(req.ProcessedBy, "process_payout", "payout", req.PayoutID,
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
	if brand.ID == 0 {
		ac.DB.Create(&brand)
	} else {
		ac.DB.Save(&brand)
	}
	ac.logAudit("admin", "upsert_brand", "brand", fmt.Sprintf("%d", brand.ID), brand.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, brand)
}

func (ac *AdminController) DeleteBrand(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Brand{}, id)
	ac.logAudit("admin", "delete_brand", "brand", id, "", r.RemoteAddr)
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
	ac.logAudit("admin", "upsert_attribute", "attribute", fmt.Sprintf("%d", attr.ID), attr.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, attr)
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
	ac.logAudit("admin", "toggle_logistic", "logistic", fmt.Sprintf("%d", req.ID), fmt.Sprintf("active=%v", req.Active), r.RemoteAddr)
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
	json.NewDecoder(r.Body).Decode(&req)
	ac.DB.Model(&models.Dispute{}).Where("id = ?", req.ID).Updates(models.Dispute{
		Status:       req.Status,
		DecisionNote: req.DecisionNote,
		DecidedBy:    req.DecidedBy,
		UpdatedAt:    time.Now(),
	})
	ac.logAudit(req.DecidedBy, "arbitrate_dispute", "dispute", fmt.Sprintf("%d", req.ID), req.Status, r.RemoteAddr)
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
	ac.logAudit("admin", "upsert_voucher", "voucher", v.Code, v.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, v)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & AFFILIATE AUDIT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetAffiliateClicks(w http.ResponseWriter, r *http.Request) {
	var clicks []models.AffiliateClick
	ac.DB.Order("created_at DESC").Limit(1000).Find(&clicks)
	ac.logAudit("admin", "get_affiliate_clicks", "security", "", "viewed clicks", r.RemoteAddr)
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
	ac.logAudit("admin", "upsert_region", "region", fmt.Sprintf("%d", reg.ID), reg.Name, r.RemoteAddr)
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
	ac.logAudit("admin", "upsert_settings", "platform_config", "",
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
	var products []models.Product
	query := ac.DB.Where("status = 'active'") // Sync: Takedown logic
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
	ac.DB.Where("is_active = ?", true).Find(&vouchers)

	if vouchers == nil {
		vouchers = []models.Voucher{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": vouchers})
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

func (ac *AdminController) UpsertBlog(w http.ResponseWriter, r *http.Request) {
	var post models.BlogPost
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	// Simple slug generator for demo
	if post.Slug == "" {
		post.Slug = strings.ToLower(strings.ReplaceAll(post.Title, " ", "-"))
	}
	ac.DB.Save(&post)
	ac.logAudit("admin", "upsert_blog", "blog", fmt.Sprintf("%d", post.ID), post.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, post)
}

func (ac *AdminController) DeleteBlog(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.BlogPost{}, id)
	ac.logAudit("admin", "delete_blog", "blog", id, "deleted", r.RemoteAddr)
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
	ac.logAudit("admin", "upsert_banner", "banner", fmt.Sprintf("%d", b.ID), b.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, b)
}

func (ac *AdminController) DeleteBanner(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Banner{}, id)
	ac.logAudit("admin", "delete_banner", "banner", id, "deleted", r.RemoteAddr)
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

	var product models.Product
	if err := ac.DB.First(&product, "id = ?", id).Error; err != nil {
		utils.JSONResponse(w, http.StatusNotFound, map[string]interface{}{"message": "Product not found"})
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": product})
}
