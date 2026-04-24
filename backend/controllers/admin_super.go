package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"regexp"
	"strings"
	"strconv"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
	"golang.org/x/crypto/bcrypt"
)

type AdminController struct {
	DB      *gorm.DB
	Service *services.AdminService
	Audit   *services.AuditService
	Notif   *services.NotificationService
	Storage *services.StorageService
}

func NewAdminController(db *gorm.DB) *AdminController {
	audit := services.NewAuditService(repositories.NewAuditRepository(db))
	return &AdminController{
		DB:      db,
		Service: services.NewAdminService(db, audit),
		Audit:   audit,
		Notif:   services.NewNotificationService(db),
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
	sort := r.URL.Query().Get("sort")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page <= 0 { page = 1 }
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 { limit = 20 }
	offset := (page - 1) * limit

	baseQuery := ac.DB.Model(&models.User{}).Joins("JOIN user_profiles ON user_profiles.user_id = users.id")
	if role != "" {
		baseQuery = baseQuery.Where("users.role::text = ?", role)
	}
	if status != "" {
		baseQuery = baseQuery.Where("users.status::text = ?", status)
	}
	if search != "" {
		baseQuery = baseQuery.Where("users.email ILIKE ? OR users.phone ILIKE ? OR CAST(users.id AS TEXT) = ? OR user_profiles.full_name ILIKE ?", "%"+search+"%", "%"+search+"%", search, "%"+search+"%")
	}

	var totalFiltered int64
	baseQuery.Session(&gorm.Session{}).Count(&totalFiltered)

	if sort == "" {
		sort = "name"
	}

	query := baseQuery.Preload("Profile")
	order := "users.created_at DESC"
	if sort == "oldest" {
		order = "users.created_at ASC"
	} else if sort == "last_login" {
		order = "users.last_login_at DESC"
	} else if sort == "name" {
		order = "user_profiles.full_name ASC"
	}
 
	if order != "" {
		query = query.Order(order)
	}
	
	var users []models.User
	err := query.Limit(limit).Offset(offset).Find(&users).Error
	if err != nil {
		log.Printf("GetUsers Error: %v", err)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  totalFiltered,
		"page":   page,
		"limit":  limit,
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
	ac.Audit.Log(models.AdminID, "update_user", "user", req.UserID,
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
	ac.Audit.Log(models.AdminID, "delete_user", "user", id, "suspended", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/users/stats
func (ac *AdminController) GetUserStats(w http.ResponseWriter, r *http.Request) {
	var total, active, suspended, affiliates, merchants int64
	ac.DB.Model(&models.User{}).Count(&total)
	ac.DB.Model(&models.User{}).Where("status = 'active'").Count(&active)
	ac.DB.Model(&models.User{}).Where("status = 'suspended'").Count(&suspended)
	ac.DB.Model(&models.User{}).Where("role = 'affiliate'").Count(&affiliates)
	ac.DB.Model(&models.User{}).Where("role = 'merchant'").Count(&merchants)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total":      total,
		"active":     active,
		"suspended":  suspended,
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
	var req struct {
		MerchantID  string `json:"merchant_id"`
		Status      string `json:"status"`
		SuspendNote string `json:"suspend_note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	updates := map[string]interface{}{
		"status":       req.Status,
		"suspend_note": req.SuspendNote,
	}

	// Monster Role Sync: Jika status aktif, pastikan role user berubah jadi merchant
	// agar bisa mengakses dashboard merchant di frontend
	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		var merchant models.Merchant
		if err := tx.First(&merchant, "id = ?", req.MerchantID).Error; err != nil {
			return err
		}

		if err := tx.Model(&merchant).Updates(updates).Error; err != nil {
			return err
		}

		if req.Status == "active" {
			if err := tx.Model(&models.User{}).Where("id = ?", merchant.UserID).Update("role", "merchant").Error; err != nil {
				return err
			}
			// Notifikasi ke user
			msg := fmt.Sprintf("Selamat! Permohonan Merchant Anda untuk '%s' telah disetujui. Anda kini adalah Mitra + Merchant SahabatMart. 🎉", merchant.StoreName)
			ac.Notif.Push(merchant.UserID, "merchant", "merchant_approved", "Merchant Anda Aktif! 🏪", msg, "/merchant")
		} else if req.Status == "suspended" {
			msg := fmt.Sprintf("Maaf, status Merchant '%s' Anda ditangguhkan sementara. Alasan: %s", merchant.StoreName, req.SuspendNote)
			ac.Notif.Push(merchant.UserID, "merchant", "merchant_suspended", "Merchant Ditangguhkan", msg, "/merchant")
		}

		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate status merchant")
		return
	}

	ac.Audit.Log(models.AdminID, "update_merchant_status", "merchant", req.MerchantID,
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
	ac.Audit.Log(models.AdminID, "verify_merchant", "merchant", req.MerchantID,
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
	ac.Audit.Log(models.AdminID, action, "category", fmt.Sprintf("%d", cat.ID), cat.Name, r.RemoteAddr)
	
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
	ac.Audit.Log(models.AdminID, "delete_category", "category", id, "deleted", r.RemoteAddr)
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
		ID             string    `gorm:"column:id" json:"id"`
		OrderID        string    `gorm:"column:order_id" json:"order_id"`
		MerchantID     string    `gorm:"column:merchant_id" json:"merchant_id"`
		StoreName      string    `gorm:"column:store_name" json:"store_name"`
		BuyerName      string    `gorm:"column:buyer_name" json:"buyer_name"`
		BuyerEmail     string    `gorm:"column:buyer_email" json:"buyer_email"`
		PaymentStatus  string    `gorm:"column:payment_status" json:"payment_status"`
		ShippingStatus string    `gorm:"column:shipping_status" json:"shipping_status"`
		Subtotal       float64   `gorm:"column:subtotal" json:"subtotal"`
		TotalAmount    float64   `gorm:"column:total_amount" json:"total_amount"`
		TrackingNumber string    `gorm:"column:tracking_number" json:"tracking_number"`
		CourierCode    string    `gorm:"column:courier_code" json:"courier_code"`
		CreatedAt      time.Time `gorm:"column:created_at" json:"created_at"`
	}

	// [FIX] Mengambil o.id agar detail pesanan bisa ditemukan di tabel orders
	query := ac.DB.Table("order_merchant_groups omg").
		Select("o.id, o.id as order_id, omg.merchant_id, m.store_name, up.full_name as buyer_name, u.email as buyer_email, o.status as payment_status, omg.status as shipping_status, omg.subtotal, (omg.subtotal + omg.shipping_cost - omg.discount) as total_amount, omg.tracking_number, omg.courier_code, omg.created_at").
		Joins("JOIN merchants m ON m.id = omg.merchant_id").
		Joins("JOIN orders o ON o.id = omg.order_id").
		Joins("JOIN users u ON u.id = o.buyer_id").
		Joins("JOIN user_profiles up ON up.user_id = u.id")

	if status != "" {
		// Filter berdasarkan status pengiriman (Shipping) atau pembayaran (Payment)
		query = query.Where("omg.status = ? OR o.status = ?", status, status)
	}

	var orders []OrderRow
	query.Order("omg.created_at DESC").Scan(&orders)

	// [DEBUG] Log data to verify fields are populated
	if len(orders) > 0 {
		fmt.Printf("[DEBUG] Order[0]: ID=%s, PayStatus=%s, ShipStatus=%s, Store=%s\n", 
			orders[0].ID, orders[0].PaymentStatus, orders[0].ShippingStatus, orders[0].StoreName)
	}

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
	search := r.URL.Query().Get("search")
	status := r.URL.Query().Get("status")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page <= 0 { page = 1 }
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 { limit = 20 }
	offset := (page - 1) * limit

	type AffRow struct {
		ID               string    `json:"id"`
		Email            string    `json:"email"`
		FullName         string    `json:"full_name"`
		Status           string    `json:"status"`
		RefCode          string    `json:"ref_code"`
		TierName         string    `json:"tier_name"`
		TierLevel        int       `json:"tier_level"`
		CommRate         float64   `json:"comm_rate"`
		TotalEarned      float64   `json:"total_earned"`
		TotalWithdrawn   float64   `json:"total_withdrawn"`
		TotalClicks      int64     `json:"total_clicks"`
		TotalConversions int       `json:"total_conversions"`
		BankName         string    `json:"bank_name"`
		AffStatus        string    `json:"affiliate_status"`
		JoinedAt         time.Time `json:"joined_at"`
		Balance          float64   `json:"balance"`
		TeamTurnover     float64   `json:"team_turnover"`
		MonthlyTurnover  float64   `json:"monthly_turnover"`
		TeamDownlines    int64     `json:"team_downlines"`
		Role             string    `json:"role"`
	}

	whereClause := "u.role IN ('affiliate', 'merchant') AND am.id IS NOT NULL"
	args := []interface{}{}
	if search != "" {
		whereClause += " AND (u.email ILIKE ? OR up.full_name ILIKE ? OR am.ref_code ILIKE ?)"
		like := "%" + search + "%"
		args = append(args, like, like, like)
	}
	if status != "" {
		whereClause += " AND am.status = ?"
		args = append(args, status)
	}

	var totalFiltered int64
	ac.DB.Table("users u").
		Joins("LEFT JOIN affiliate_members am ON am.user_id = u.id").
		Joins("LEFT JOIN user_profiles up ON up.user_id = u.id").
		Where(whereClause, args...).
		Count(&totalFiltered)

	q := `
		SELECT u.id, u.email, u.status, up.full_name, u.role,
		       am.ref_code, mt.name AS tier_name, mt.level AS tier_level,
		       mt.base_commission_rate AS comm_rate,
		       am.total_earned, am.total_withdrawn, am.total_clicks, am.total_conversions,
		       am.bank_name, am.status AS aff_status, am.created_at AS joined_at,
		       GREATEST(am.total_earned - am.total_withdrawn, 0) AS balance,
		       COALESCE(ats.team_turnover, 0) AS team_turnover,
		       COALESCE(ats.monthly_turnover, 0) AS monthly_turnover,
		       COALESCE(ats.team_downlines, 0) AS team_downlines
		FROM users u
		LEFT JOIN user_profiles up ON up.user_id = u.id
		INNER JOIN affiliate_members am ON am.user_id = u.id
		LEFT JOIN membership_tiers mt ON mt.id = am.membership_tier_id
		LEFT JOIN affiliate_turnover_snapshots ats ON ats.affiliate_id = am.id
		WHERE ` + whereClause + `
		ORDER BY am.total_earned DESC
		LIMIT ? OFFSET ?
	`
	args = append(args, limit, offset)

	var rows []AffRow
	ac.DB.Raw(q, args...).Scan(&rows)
	if rows == nil {
		rows = []AffRow{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  totalFiltered,
		"page":   page,
		"limit":  limit,
		"data":   rows,
	})
}

// GET /api/admin/affiliates/configs  → list membership tiers
func (ac *AdminController) GetAffiliateConfigs(w http.ResponseWriter, r *http.Request) {
	var tiers []models.MembershipTier
	ac.DB.Order("level ASC").Find(&tiers)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   tiers,
	})
}

// POST/PUT /api/admin/affiliates/config → upsert membership_tier
func (ac *AdminController) UpsertAffiliateConfig(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID                 uint    `json:"id"`
		Name               string  `json:"tier_name"`
		Level              int     `json:"level"`
		BaseCommissionRate float64 `json:"comm_rate"`
		MinEarningsUpgrade float64 `json:"min_sales"`
		MonthlyFee         float64 `json:"monthly_fee"`
		CommissionHoldDays int     `json:"commission_hold_days"`
		IsActive           bool    `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.Name == "" {
		utils.JSONError(w, http.StatusBadRequest, "Nama tier wajib diisi")
		return
	}
	if req.CommissionHoldDays == 0 {
		req.CommissionHoldDays = 7
	}
	tier := models.MembershipTier{
		ID:                 req.ID,
		Name:               req.Name,
		Level:              req.Level,
		BaseCommissionRate: req.BaseCommissionRate,
		MinEarningsUpgrade: req.MinEarningsUpgrade,
		MonthlyFee:         req.MonthlyFee,
		CommissionHoldDays: req.CommissionHoldDays,
	}
	if tier.ID == 0 {
		ac.DB.Create(&tier)
	} else {
		ac.DB.Save(&tier)
	}
	ac.Audit.Log(models.AdminID, "upsert_membership_tier", "membership_tier",
		fmt.Sprintf("%d", tier.ID), tier.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   tier,
	})
}

// GET /api/admin/affiliates/withdrawals
func (ac *AdminController) GetAffiliateWithdrawals(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	type WRow struct {
		ID            string     `json:"id"`
		AffiliateID   string     `json:"affiliate_id"`
		FullName      string     `json:"full_name"`
		Email         string     `json:"email"`
		RefCode       string     `json:"ref_code"`
		Amount        float64    `json:"amount"`
		BankName      string     `json:"bank_name"`
		AccountNumber string     `json:"account_number"`
		AccountName   string     `json:"account_name"`
		Status        string     `json:"status"`
		Note          string     `json:"note"`
		CreatedAt     time.Time  `json:"created_at"`
		ProcessedAt   *time.Time `json:"processed_at"`
	}

	q := `
		SELECT aw.id, aw.affiliate_id, up.full_name, u.email, am.ref_code,
		       aw.amount, aw.bank_name,
		       aw.bank_account_number AS account_number,
		       aw.bank_account_name AS account_name,
		       aw.status, aw.note, aw.created_at, aw.processed_at
		FROM affiliate_withdrawals aw
		LEFT JOIN affiliate_members am ON am.id = aw.affiliate_id
		LEFT JOIN users u ON u.id = am.user_id
		LEFT JOIN user_profiles up ON up.user_id = u.id
	`
	args := []interface{}{}
	if status != "" {
		q += " WHERE aw.status = ?"
		args = append(args, status)
	}
	q += " ORDER BY aw.created_at DESC"

	var rows []WRow
	ac.DB.Raw(q, args...).Scan(&rows)
	if rows == nil {
		rows = []WRow{}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(rows),
		"data":   rows,
	})
}

// POST /api/admin/affiliates/withdrawals/process
func (ac *AdminController) ProcessAffiliateWithdrawal(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID     string `json:"id"`
		Action string `json:"action"` // "approve" or "reject"
		Note   string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.ID == "" || (req.Action != "approve" && req.Action != "reject") {
		utils.JSONError(w, http.StatusBadRequest, "ID dan action (approve/reject) wajib diisi")
		return
	}

	now := time.Now()
	newStatus := map[string]string{"approve": "completed", "reject": "rejected"}[req.Action]

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		var wd models.AffiliateWithdrawal
		if err := tx.First(&wd, "id = ?", req.ID).Error; err != nil {
			return fmt.Errorf("withdrawal tidak ditemukan")
		}
		if wd.Status != "pending" && wd.Status != "processed" {
			return fmt.Errorf("withdrawal sudah diproses sebelumnya")
		}
		wd.Status = newStatus
		wd.Note = req.Note
		wd.ProcessedAt = &now
		if err := tx.Save(&wd).Error; err != nil {
			return err
		}
		// Update total_withdrawn only on approval
		if newStatus == "completed" {
			tx.Model(&models.AffiliateMember{}).Where("id = ?", wd.AffiliateID).
				Updates(map[string]interface{}{
					"total_withdrawn": gorm.Expr("total_withdrawn + ?", wd.Amount),
				})
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Push notification to affiliate
	if wdID := req.ID; wdID != "" {
		// Re-fetch withdrawal to get AffiliateID (or use from closure if safe)
		var wd models.AffiliateWithdrawal
		ac.DB.First(&wd, "id = ?", req.ID)

		msgMap := map[string]string{
			"completed": "disetujui dan sedang diproses ke rekening Anda",
			"rejected":  "ditolak oleh Admin",
		}
		msg := fmt.Sprintf("Permintaan penarikan komisi Anda telah %s. %s", msgMap[newStatus], req.Note)
		ac.Notif.Push(wd.AffiliateID, "affiliate", "withdrawal_"+newStatus,
			"Update Penarikan Komisi", msg, "/affiliate/withdrawals")
	}

	ac.Audit.Log(models.AdminID, "process_affiliate_withdrawal", "affiliate_withdrawal",
		req.ID, newStatus, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success", "result": newStatus})
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
		OldPrice    float64   `json:"old_price"`
		Category    string    `json:"category"`
		Brand       string    `json:"brand"`
		Stock       int       `json:"stock"`
		Attributes  string    `json:"attributes"`
		Image       string    `json:"image"`
		Images      string    `json:"images"`
		Status      string    `json:"status"`
		MerchantID  string    `json:"merchant_id"`
		StoreName   string    `json:"store_name"`
		CreatedAt   time.Time `json:"created_at"`
	}

	query := ac.DB.Table("products p").
		Select("p.id, p.name, p.description, p.image, p.images, p.slug, p.price, p.old_price, p.stock, p.status, p.merchant_id, m.store_name, p.category, p.brand, p.attributes, p.created_at").
		Joins("LEFT JOIN merchants m ON m.id = p.merchant_id")

	if status != "" {
		if status == "out_of_stock" {
			query = query.Where("p.stock <= 0")
		} else {
			query = query.Where("p.status = ?", status)
		}
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}
	var prod models.Product
	ac.DB.First(&prod, "id = ?", req.ID)
	ac.DB.Table("products").Where("id = ?", req.ID).Update("status", req.Status)
	
	// Notify Merchants who have this in inventory
	statusMsg := fmt.Sprintf("Produk '%s' Anda telah %s oleh tim moderasi.", prod.Name, req.Status)
	if req.Status == "active" {
		statusMsg = fmt.Sprintf("Hore! Produk '%s' Anda telah disetujui dan kini live.", prod.Name)
	}

	var invs []models.Inventory
	ac.DB.Where("product_id = ?", prod.ID).Find(&invs)
	for _, inv := range invs {
		if inv.MerchantID != models.PusatID {
			ac.Notif.Push(inv.MerchantID, "merchant", "product_moderated", "Status Produk Update", statusMsg, "/merchant/products")
		}
	}

	ac.Audit.Log(models.AdminID, "moderate_product", "product", req.ID,
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
	ac.Audit.Log(models.AdminID, "delete_product_permanent", "product", id, "purged from database", r.RemoteAddr)
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

	// [Akuglow Refactor] Product is now Master Product (PUSAT)
	// Initial stock will be handled via Inventories table after creation.

	if p.Slug == "" {
		p.Slug = strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
		// [Complex Sync] Gunakan UnixNano % 1000000 agar probabilitas tabrakan slug hampir nol
		// Terutama penting untuk sistem dengan banyak admin yang mengupload produk serentak
		p.Slug = fmt.Sprintf("%s-%d", p.Slug, time.Now().UnixNano()%1000000)
	}

	if err := ac.DB.Create(&p).Error; err != nil {
		fmt.Printf("❌ Database Error: %v\n", err) 
		utils.JSONError(w, http.StatusInternalServerError, fmt.Sprintf("Database Error: %v", err))
		return
	}

	// [Akuglow] Auto-populate PUSAT inventory with 0 stock
	ac.DB.Create(&models.Inventory{
		ProductID:  p.ID,
		MerchantID: models.PusatID,
		Stock:      0,
	})

	ac.Audit.Log(models.AdminID, "create_product", "product", p.ID, p.Name, r.RemoteAddr)
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
		COGS        float64 `json:"cogs"` // Modal Awal
		Category    string  `json:"category"`
		Brand       string  `json:"brand"`
		Attributes  string  `json:"attributes"`
		Stock       int     `json:"stock"`
		Image       string  `json:"image"`
		Images      string  `json:"images"` // Added missing images field
		Status      string  `json:"status"`
		BaseAffiliateFee          float64 `json:"base_affiliate_fee"`
		BaseAffiliateFeeNominal   float64 `json:"base_affiliate_fee_nominal"`
		BaseDistributionFee        float64 `json:"base_distribution_fee"`
		BaseDistributionFeeNominal float64 `json:"base_distribution_fee_nominal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	updates := map[string]interface{}{
		"name":                          req.Name,
		"description":                   req.Description,
		"price":                         req.Price,
		"old_price":                     req.OldPrice,
		"cogs":                          req.COGS,
		"category":                      req.Category,
		"brand":                         req.Brand,
		"attributes":                    req.Attributes,
		"image":                         req.Image,
		"images":                        req.Images, // Ensuring gallery images are updated
		"status":                        req.Status,
		"base_affiliate_fee":            req.BaseAffiliateFee,
		"base_affiliate_fee_nominal":    req.BaseAffiliateFeeNominal,
		"base_distribution_fee":         req.BaseDistributionFee,
		"base_distribution_fee_nominal": req.BaseDistributionFeeNominal,
	}

	if err := ac.DB.Table("products").Where("id = ?", req.ID).Updates(updates).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to update product")
		return
	}

	// [Akuglow] Sync PUSAT stock
	if req.Stock > 0 {
		ac.DB.Table("inventories").Where("merchant_id = ? AND product_id = ?", models.PusatID, req.ID).Update("stock", req.Stock)
	}

	ac.Audit.Log(models.AdminID, "update_product", "product", req.ID, req.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE & REVENUE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/finance  → overview revenue platform
func (ac *AdminController) GetFinance(w http.ResponseWriter, r *http.Request) {
	var totalRevenue, totalPlatformFee, pendingPayout float64
	var totalCOGS, totalNetProfit float64
	var totalOrders, completedOrders int64

	// [Financial Audit Fix] Calculate Historical Profit (Cumulative)
	// We sum all revenue transactions to system wallets, ignoring withdrawals.
	// This ensures "Total Profit" doesn't drop when you withdraw money to your bank.
	ac.DB.Model(&models.WalletTransaction{}).
		Joins("JOIN wallets ON wallets.id = wallet_transactions.wallet_id").
		Where("wallets.owner_id IN ('system-hq', 'system-platform')").
		Where("wallet_transactions.type IN (?, ?)", models.TxSaleRevenue, models.TxPlatformFee).
		Select("COALESCE(SUM(wallet_transactions.amount), 0)").Scan(&totalRevenue)

	// Platform Fee separately
	ac.DB.Model(&models.WalletTransaction{}).
		Joins("JOIN wallets ON wallets.id = wallet_transactions.wallet_id").
		Where("wallets.owner_id = ?", "system-platform").
		Where("wallet_transactions.type = ?", models.TxPlatformFee).
		Select("COALESCE(SUM(wallet_transactions.amount), 0)").Scan(&totalPlatformFee)

	if ac.hasTable("order_items") {
		// Calculate total COGS from completed/paid sales
		ac.DB.Model(&models.OrderItem{}).
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("orders.status IN ('paid', 'shipped', 'delivered', 'completed')").
			Select("COALESCE(SUM(order_items.cogs * order_items.quantity), 0)").Scan(&totalCOGS)
		
		// Net Profit = Historical Revenue - Historical COGS
		totalNetProfit = totalRevenue - totalCOGS
	}

	if ac.hasTable("wallets") {
		// Other wallets' pending balance represents obligations to merchants/affiliates
		ac.DB.Table("wallets").
			Where("owner_id NOT LIKE 'system-%'").
			Select("COALESCE(SUM(pending_balance), 0)").Scan(&pendingPayout)
	}

	if ac.hasTable("orders") {
		ac.DB.Model(&models.Order{}).Count(&totalOrders)
		ac.DB.Model(&models.Order{}).Where("status = ?", models.OrderCompleted).Count(&completedOrders)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_revenue":      totalRevenue,
		"total_platform_fee": totalPlatformFee,
		"total_cogs":         totalCOGS,
		"net_profit":         totalNetProfit,
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
		Profit  float64 `json:"profit"`
		Fee     float64 `json:"fee"`
		Orders  int     `json:"orders"`
	}

	var rows []MonthRow
	// Profit formula: (subtotal - affiliate_commission - distribution_commission) - (sum of items COGS)
	ac.DB.Raw(`
		WITH monthly_stats AS (
			SELECT TO_CHAR(omg.created_at, 'YYYY-MM') AS month,
			       SUM(omg.subtotal) AS revenue,
			       SUM(omg.platform_fee) AS fee,
			       SUM(omg.subtotal - omg.affiliate_commission - omg.distribution_commission) AS gross_take,
			       COUNT(DISTINCT omg.id) AS orders,
			       SUM(oi.cogs * oi.quantity) AS total_cogs
			FROM order_merchant_groups omg
			LEFT JOIN order_items oi ON oi.order_merchant_group_id = omg.id
			WHERE omg.created_at >= NOW() - INTERVAL '12 months'
			  AND omg.status IN ('completed', 'delivered', 'paid')
			GROUP BY month
		)
		SELECT month, revenue, (gross_take - total_cogs) AS profit, fee, orders
		FROM monthly_stats
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
	fmt.Printf("[DEBUG] Fetching Order Detail. Path: %s, ID: '%s'\n", r.URL.Path, id)
	var order models.Order
	// Gunakan CAST agar Postgres tidak bingung dengan tipe data UUID
	if err := ac.DB.Preload("MerchantGroups.Items").First(&order, "id = CAST(? AS UUID)", id).Error; err != nil {
		fmt.Printf("[ERROR] Order Detail Failed for ID '%s': %v\n", id, err)
		utils.JSONError(w, http.StatusNotFound, "Order not found in database")
		return
	}

	// [HOTFIX] Jika pesanan mandiri (tanpa affiliate), pastikan komisi tampil 0 (bersihkan data lama)
	if order.AffiliateID == nil || *order.AffiliateID == "" {
		order.TotalCommission = 0
		for i := range order.MerchantGroups {
			order.MerchantGroups[i].Commission = 0
			for j := range order.MerchantGroups[i].Items {
				order.MerchantGroups[i].Items[j].CommissionAmount = 0
				order.MerchantGroups[i].Items[j].CommissionRate = 0
			}
		}
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

	// [FIX] Sinkronkan status ke semua Merchant Groups dengan mapping yang benar
	mStatus := string(req.Status)
	if req.Status == models.OrderPaid { mStatus = "confirmed" }
	
	if err := ac.DB.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", order.ID).Update("status", mStatus).Error; err != nil {
		fmt.Printf("[WARNING] Failed to sync status to merchant groups: %v\n", err)
	}

	// Audit Trail (Req 9) - Fix: Split host from port for inet type
	adminID := "00000000-0000-0000-0000-000000000001" 
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if ip == "" { ip = r.RemoteAddr }
	utils.LogAudit(ac.DB, adminID, "update_order_status", "order", order.ID, fmt.Sprintf("Changed status from %s to %s. Note: %s", oldStatus, req.Status, req.Note), string(oldStatus), string(req.Status), ip, r.UserAgent())

	// If status is PAID, trigger background work (Commissions, etc - Req 13)
	if req.Status == models.OrderPaid || req.Status == models.OrderCompleted {
		// Real commission processing
		var commissions []models.AffiliateCommission
		if err := ac.DB.Where("order_id = ? AND status = ?", order.ID, "pending").Find(&commissions).Error; err == nil {
			for _, comm := range commissions {
				// 1. Approve the commission
				ac.DB.Model(&comm).Update("status", "approved")

				// 2. Update Affiliate Member's TotalEarned
				var affiliate models.AffiliateMember
				if err := ac.DB.Where("id = ?", comm.AffiliateID).First(&affiliate).Error; err == nil {
					newTotal := affiliate.TotalEarned + comm.Amount
					ac.DB.Model(&affiliate).Update("total_earned", newTotal)

					// 3. Trigger Tier Upgrade Tracking
					affSvc := services.NewAffiliateService(ac.DB, ac.Notif)
					affSvc.TriggerTierUpgrade(affiliate.ID)
				}
			}
		}
	}

	// [NOTIF] Kirim Notifikasi ke Admin Topbar
	notifTitle := fmt.Sprintf("Pesanan #%s Berubah", order.OrderNumber)
	notifMsg := fmt.Sprintf("Status pesanan kini menjadi %s.", strings.ToUpper(string(req.Status)))
	_ = ac.Notif.Push(adminID, "admin", "status_update", notifTitle, notifMsg, fmt.Sprintf("/admin/orders/%s", order.ID))

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
	
	ac.Audit.Log(models.AdminID, "freeze_order", "order", req.OrderID, req.Reason, r.RemoteAddr)

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
		ac.Audit.Log(models.AdminID, "upsert_commission", "category_commission",
			fmt.Sprintf("%d", comm.ID), fmt.Sprintf("cat=%s fee=%.4f", comm.CategoryName, comm.FeePercent),
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
		ac.Audit.Log(models.AdminID, "upsert_merchant_commission", "merchant_commission",
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
	ac.Audit.Log(models.AdminID, "bulk_update_commissions", "category_commission", "", fmt.Sprintf("updated %d items", len(comms)), r.RemoteAddr)
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

	var payout models.PayoutRequest
	if err := ac.DB.First(&payout, "id = ?", req.PayoutID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Payout request not found")
		return
	}

	if payout.Status != "pending" {
		utils.JSONError(w, http.StatusBadRequest, "Payout is already processed")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		payout.Status = req.Status
		payout.Note = req.Note
		payout.ProcessedAt = &now
		payout.ProcessedBy = req.ProcessedBy

		if err := tx.Save(&payout).Error; err != nil {
			return err
		}

		financeSvc := services.NewFinanceService(tx)
		
		if req.Status == "paid" || req.Status == "approved" {
			desc := fmt.Sprintf("Penarikan Berhasil (Admin: %s)", req.ProcessedBy)
			return financeSvc.ProcessTransaction(tx, payout.MerchantID, models.WalletMerchant, models.TxWithdrawalCompleted, payout.Amount, payout.ID, "payout_request", desc)
		} else if req.Status == "rejected" {
			desc := fmt.Sprintf("Penarikan Ditolak, Dana Dikembalikan: %s", req.Note)
			return financeSvc.ProcessTransaction(tx, payout.MerchantID, models.WalletMerchant, models.TxWithdrawalRejected, payout.Amount, payout.ID, "payout_request", desc)
		}

		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memproses payout: "+err.Error())
		return
	}

	ac.Audit.Log(req.ProcessedBy, "process_payout", "payout", req.PayoutID, fmt.Sprintf("status=%s", req.Status), r.RemoteAddr)
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
	ac.Audit.Log(models.AdminID, "upsert_brand", "brand", fmt.Sprintf("%d", brand.ID), brand.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, brand)
}

func (ac *AdminController) DeleteBrand(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Brand{}, id)
	ac.Audit.Log(models.AdminID, "delete_brand", "brand", id, "", r.RemoteAddr)
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
	ac.Audit.Log(models.AdminID, "upsert_attribute", "attribute", fmt.Sprintf("%d", attr.ID), attr.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, attr)
}

func (ac *AdminController) DeleteAttribute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Attribute{}, id)
	ac.Audit.Log(models.AdminID, "delete_attribute", "attribute", id, "", r.RemoteAddr)
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
	ac.Audit.Log(models.AdminID, "toggle_logistic", "logistic", fmt.Sprintf("%d", req.ID), fmt.Sprintf("active=%v", req.Active), r.RemoteAddr)
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
			
			// [Audit Fix] Batalkan Komisi Affiliate agar tidak terjadi kebocoran dana
			affiliateService := services.NewAffiliateService(ac.DB, ac.Notif)
			if err := affiliateService.CancelCommission(dispute.OrderID); err != nil {
				log.Printf("⚠️ Gagal membatalkan komisi affiliate: %v", err)
				// Tetap lanjut, jangan batalkan refund hanya karena notif/log gagal
			}

			// Update Order status to Refunded
			tx.Table("orders").Where("id = ?", dispute.OrderID).Update("status", "refunded")
		} else if req.Status == "rejected" {
			finance := services.NewFinanceService(ac.DB)
			desc := fmt.Sprintf("Sengketa Ditolak, Dana Diteruskan: %s", dispute.OrderID)
			if err := finance.ReleaseEscrow(tx, dispute.MerchantID, models.WalletMerchant, dispute.Amount, fmt.Sprintf("%d", dispute.ID), desc); err != nil {
				return err
			}
			// Update Order status back to Completed so the funds are no longer heavily contested
			tx.Table("orders").Where("id = ?", dispute.OrderID).Update("status", "completed")
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
	ac.Audit.Log(models.AdminID, "upsert_voucher", "voucher", v.Code, v.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, v)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & AFFILIATE AUDIT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetAffiliateClicks(w http.ResponseWriter, r *http.Request) {
	var clicks []models.AffiliateClick
	ac.DB.Order("created_at DESC").Limit(1000).Find(&clicks)
	ac.Audit.Log(models.AdminID, "get_affiliate_clicks", "security", "", "viewed clicks", r.RemoteAddr)
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
	ac.Audit.Log(models.AdminID, "upsert_region", "region", fmt.Sprintf("%d", reg.ID), reg.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, reg)
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
	ac.Audit.Log(models.AdminID, "upsert_settings", "platform_config", "",
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
	query := ac.DB.Model(&models.Product{}).
		Where("status = 'active'")

	if cat := r.URL.Query().Get("cat"); cat != "" {
		query = query.Where("category = ?", cat)
	}

	// [Akuglow Refactor] Tampilkan total stok dari seluruh gudang
	query.Preload("Inventories").Find(&products)
	
	// Tambahkan informasi stok agregat untuk ditampilkan di card
	type ProductWithStock struct {
		models.Product
		TotalStock int `json:"total_stock"`
	}
	
	result := make([]ProductWithStock, len(products))
	for i, p := range products {
		total := 0
		for _, inv := range p.Inventories {
			total += inv.Stock
		}
		result[i] = ProductWithStock{
			Product:    p,
			TotalStock: total,
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": result})
}

func (ac *AdminController) GetPublicCategories(w http.ResponseWriter, r *http.Request) {
	var cats []models.Category
	// Hanya kembalikan kategori yang memiliki setidaknya satu produk aktif
	ac.DB.Raw(`
		SELECT DISTINCT c.* 
		FROM categories c
		JOIN products p ON p.category = c.name
		WHERE p.status = 'active'
		ORDER BY c.order ASC
	`).Scan(&cats)
	
	if len(cats) == 0 { cats = []models.Category{} }
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

// GetPublicVouchers returns active and valid vouchers for storefront
func (ac *AdminController) GetPublicVouchers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONResponse(w, http.StatusMethodNotAllowed, map[string]interface{}{"message": "Method not allowed"})
		return
	}

	var vouchers []models.Voucher
	now := time.Now()
	// Hanya tampilkan voucher aktif yang belum kedaluwarsa dan masih memiliki kuota
	ac.DB.Where("status = ? AND quota > used AND expiry_date > ?", "active", now).Find(&vouchers)

	if vouchers == nil {
		vouchers = []models.Voucher{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": vouchers})
}

// CheckVoucher validates a voucher code for a specific amount
func (ac *AdminController) CheckVoucher(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	subtotalStr := r.URL.Query().Get("subtotal")
	
	if code == "" {
		utils.JSONError(w, http.StatusBadRequest, "Kode voucher wajib diisi")
		return
	}

	var voucher models.Voucher
	now := time.Now()
	err := ac.DB.Where("code = ? AND status = ? AND expiry_date > ?", code, "active", now).First(&voucher).Error
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Voucher tidak ditemukan, tidak aktif, atau sudah kedaluwarsa")
		return
	}

	if voucher.Quota <= voucher.Used {
		utils.JSONError(w, http.StatusBadRequest, "Kuota voucher sudah habis")
		return
	}

	var subtotal float64
	fmt.Sscanf(subtotalStr, "%f", &subtotal)
	if subtotal < voucher.MinOrder {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("Minimal belanja Rp%.0f belum terpenuhi", voucher.MinOrder))
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   voucher,
	})
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
		
		// [FIX] Gunakan MerchantOrderStatus yang benar agar SUM tidak 0
		activeStats := []string{"confirmed", "processing", "packed", "handed_to_courier", "shipped", "delivered", "completed"}
		
		ac.DB.Table("order_merchant_groups").
			Where("status IN ?", activeStats).
			Select("COALESCE(SUM(subtotal), 0)").Scan(&totalRevenue)
		
		ac.DB.Table("order_merchant_groups").
			Where("status IN ?", activeStats).
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
	ac.Audit.Log(models.AdminID, "upsert_blog", "blog", fmt.Sprintf("%d", post.ID), post.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, post)
}

func (ac *AdminController) DeleteBlog(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.BlogPost{}, id)
	ac.Audit.Log(models.AdminID, "delete_blog", "blog", id, "deleted", r.RemoteAddr)
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
	ac.Audit.Log(models.AdminID, "upsert_banner", "banner", fmt.Sprintf("%d", b.ID), b.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, b)
}

func (ac *AdminController) DeleteBanner(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Banner{}, id)
	ac.Audit.Log(models.AdminID, "delete_banner", "banner", id, "deleted", r.RemoteAddr)
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
	err := ac.DB.Preload("Variants").Preload("Inventories").
		Where("id = ? OR slug = ?", id, id).First(&product).Error

	if err != nil {
		utils.JSONResponse(w, http.StatusNotFound, map[string]interface{}{"message": "Product not found"})
		return
	}

	// [Akuglow Refactor] Ambil daftar Merchant yang punya stok produk ini
	type MerchantStock struct {
		MerchantID string `json:"merchant_id"`
		StoreName  string `json:"store_name"`
		City       string `json:"city"`
		Stock      int    `json:"stock"`
	}
	var sellers []MerchantStock
	ac.DB.Table("inventories inv").
		Select("inv.merchant_id, m.store_name, m.city, inv.stock").
		Joins("JOIN merchants m ON m.id = inv.merchant_id").
		Where("inv.product_id = ? AND inv.stock > 0", product.ID).
		Scan(&sellers)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data": map[string]interface{}{
			"product": product,
			"sellers": sellers,
		},
	})
}

// GET /api/admin/notifications
func (ac *AdminController) GetNotifications(w http.ResponseWriter, r *http.Request) {
	notifs, err := ac.Notif.GetNotifications("", "admin", 20)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": notifs})
}

// PUT /api/admin/notifications/read
func (ac *AdminController) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID uint `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.ID == 0 {
		ac.Notif.MarkAllAsRead("", "admin")
	} else {
		ac.Notif.MarkAsRead(req.ID)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// POINT OF SALE (POS) SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/pos/products?q=...
func (ac *AdminController) POSGetProducts(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("q")
	var products []models.Product

	db := ac.DB.Model(&models.Product{}).Preload("Variants")

	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		db = db.Where(ac.DB.Where("name ILIKE ?", like).
			Or("slug ILIKE ?", like).
			Or("sku ILIKE ?", like).
			Or("id IN (SELECT product_id FROM product_variants WHERE sku ILIKE ?)", like))
		
		// If search looks like a potential ID, add OR condition for it
		if len(search) >= 8 {
			db = db.Or("CAST(id AS TEXT) ILIKE ?", search+"%")
		}
	}

	if err := db.Order("created_at DESC").Limit(40).Find(&products).Error; err != nil {
		log.Printf("[POS] Fetch Error: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "Gagal sinkronisasi produk")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   products,
	})
}

// POST /api/admin/pos/checkout
func (ac *AdminController) POSCheckout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	var req struct {
		Items []struct {
			ProductID        string  `json:"product_id"`
			ProductVariantID *string `json:"product_variant_id"`
			Quantity         int     `json:"quantity"`
			Price           float64 `json:"price"`
		} `json:"items"`
		PaymentMethod string  `json:"payment_method"`
		AmountPaid    float64 `json:"amount_paid"`
		BuyerID       *string `json:"buyer_id"`
		Notes         string  `json:"notes"`
		Discount      float64 `json:"discount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	adminID := r.Context().Value("user_id").(string)

	var order models.Order
	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		// Calculate Number first
		shortCode := strings.ToUpper(utils.GenerateShortCode(6))
		orderNumber := fmt.Sprintf("POS-%s-%d", shortCode, time.Now().Unix()%100000)

		var subtotal float64
		var totalPlatformFee float64
		
		// Temporary storage for items to be created after order
		type itemData struct {
			product models.Product
			variant models.ProductVariant
			qty     int
			price   float64
		}
		var itemsToProcess []itemData

		for _, item := range req.Items {
			var product models.Product
			if err := tx.First(&product, "id = ?", item.ProductID).Error; err != nil {
				return fmt.Errorf("produk tidak ditemukan: %s", item.ProductID)
			}

			var variant models.ProductVariant
			if item.ProductVariantID != nil && *item.ProductVariantID != "" {
				if err := tx.First(&variant, "id = ?", *item.ProductVariantID).Error; err != nil {
					return fmt.Errorf("varian tidak ditemukan: %s", *item.ProductVariantID)
				}
			}

			unitPrice := product.Price
			if variant.ID != "" {
				unitPrice = variant.Price
			}
			if item.Price > 0 {
				unitPrice = item.Price
			}

			subtotal += unitPrice * float64(item.Quantity)
			itemsToProcess = append(itemsToProcess, itemData{product, variant, item.Quantity, unitPrice})

			// Update Stock
			if variant.ID != "" {
				if variant.Stock < item.Quantity {
					return fmt.Errorf("stok tidak mencukupi untuk %s", variant.Name)
				}
				tx.Model(&models.ProductVariant{}).Where("id = ?", variant.ID).Update("stock", gorm.Expr("stock - ?", item.Quantity))
			} else {
				var inv models.Inventory
				if err := tx.Where("merchant_id = ? AND product_id = ?", models.PusatID, product.ID).First(&inv).Error; err != nil {
					return fmt.Errorf("stok pusat tidak ditemukan untuk %s", product.Name)
				}
				if inv.Stock < item.Quantity {
					return fmt.Errorf("stok pusat tidak mencukupi untuk %s (Tersedia: %d)", product.Name, inv.Stock)
				}
				tx.Model(&models.Inventory{}).Where("merchant_id = ? AND product_id = ?", models.PusatID, product.ID).Update("stock", gorm.Expr("stock - ?", item.Quantity))
			}
		}

		grandTotal := subtotal - req.Discount

		order = models.Order{
			OrderNumber:      orderNumber,
			BuyerID:          req.BuyerID,
			CashierID:        &adminID,
			OrderType:        "pos",
			Subtotal:         subtotal,
			TotalDiscount:    req.Discount,
			GrandTotal:       grandTotal,
			Status:           models.OrderCompleted,
			PaidAt:           &[]time.Time{time.Now()}[0],
			Notes:            req.Notes,
		}

		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		// Now we have order.ID
		merchantGroups := make(map[string]*models.OrderMerchantGroup)
		var orderItems []models.OrderItem

		for _, it := range itemsToProcess {
			// Calculate individual fee
			var catComm models.CategoryCommission
			tx.Where("LOWER(category_name) = LOWER(?)", it.product.Category).First(&catComm)
			feeRate := catComm.FeePercent / 100
			if feeRate == 0 { feeRate = 0.01 }
			
			itemSubtotal := it.price * float64(it.qty)
			itemFee := itemSubtotal * feeRate
			totalPlatformFee += itemFee

			// POS order from super admin uses models.PusatID as merchant
			const targetMerchantID = models.PusatID

			if _, ok := merchantGroups[targetMerchantID]; !ok {
				merchantGroups[targetMerchantID] = &models.OrderMerchantGroup{
					OrderID:    order.ID,
					MerchantID: targetMerchantID,
					Status:     models.MOrderCompleted,
					CreatedAt:  time.Now(),
				}
				if err := tx.Create(merchantGroups[targetMerchantID]).Error; err != nil {
					return err
				}
			}

			mg := merchantGroups[targetMerchantID]
			mg.Subtotal += itemSubtotal
			mg.PlatformFee += itemFee
			mg.MerchantPayout += (itemSubtotal - itemFee)

			var variantID *string
			sku := it.product.Slug
			if it.variant.ID != "" { 
				sku = it.variant.SKU 
				vid := it.variant.ID
				variantID = &vid
			}

			orderItems = append(orderItems, models.OrderItem{
				OrderID:              order.ID,
				OrderMerchantGroupID: mg.ID,
				MerchantID:           models.PusatID,
				ProductID:            it.product.ID,
				ProductVariantID:     variantID,
				ProductName:          it.product.Name,
				VariantName:          it.variant.Name,
				SKU:                  sku,
				Quantity:             it.qty,
				UnitPrice:            it.price,
				Subtotal:             itemSubtotal,
				PlatformFeeAmount:    itemFee,
				MerchantAmount:       itemSubtotal - itemFee,
			})
		}

		// Update Merchant Groups and create OrderItems
		for _, mg := range merchantGroups {
			tx.Save(mg)
			
			// Add to Merchant Balance
			tx.Model(&models.Merchant{}).Where("id = ?", mg.MerchantID).
				Updates(map[string]interface{}{
					"balance":      gorm.Expr("balance + ?", mg.MerchantPayout),
					"total_sales":  gorm.Expr("total_sales + ?", mg.Subtotal),
				})
		}

		for _, oi := range orderItems {
			if err := tx.Create(&oi).Error; err != nil {
				return err
			}

			// Decrement Stock - SYNC with inventory
			if oi.ProductVariantID != nil {
				if err := tx.Model(&models.ProductVariant{}).Where("id = ?", *oi.ProductVariantID).
					Update("stock", gorm.Expr("stock - ?", oi.Quantity)).Error; err != nil {
					return err
				}
			}
			// Sync stock in Pusat Inventory
			if err := tx.Model(&models.Inventory{}).Where("merchant_id = ? AND product_id = ?", models.PusatID, oi.ProductID).
				Update("stock", gorm.Expr("stock - ?", oi.Quantity)).Error; err != nil {
				return err
			}
		}

		// Update order with total fee
		tx.Model(&order).Update("total_platform_fee", totalPlatformFee)

		// Record Payment
		payment := models.Payment{
			OrderID:        order.ID,
			PaymentMethod:  req.PaymentMethod,
			Status:         models.PaymentPaid,
			Amount:         grandTotal,
			AmountReceived: req.AmountPaid,
			Gateway:        "cashier",
			PaidAt:         &[]time.Time{time.Now()}[0],
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	ac.Audit.Log(adminID, "pos_checkout", "order", order.ID, fmt.Sprintf("Total: %v", order.GrandTotal), r.RemoteAddr)

	// Preload items and payment for response to receipt
	ac.DB.Preload("Items").Preload("Payment").First(&order, "id = ?", order.ID)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   order,
	})
}

// GetWishlistStats returns aggregated wishlist counts per product
func (ac *AdminController) GetWishlistStats(w http.ResponseWriter, r *http.Request) {
	type Result struct {
		ProductID   string  `json:"product_id"`
		ProductName string  `json:"product_name"`
		ProductSlug string  `json:"product_slug"`
		Image       string  `json:"image"`
		MerchantID  string  `json:"merchant_id"`
		StoreName   string  `json:"store_name"`
		Count       int64   `json:"count"`
		Price       float64 `json:"price"`
	}

	var results []Result
	err := ac.DB.Table("wishlists").
		Select("products.id as product_id, products.name as product_name, products.slug as product_slug, products.image, products.price, inventories.merchant_id as merchant_id, merchants.store_name, count(wishlists.id) as count").
		Joins("join products on products.id = wishlists.product_id").
		Joins("left join inventories on inventories.product_id = products.id AND inventories.merchant_id = '00000000-0000-0000-0000-000000000000'").
		Joins("left join merchants on merchants.id = inventories.merchant_id").
		Group("products.id, inventories.merchant_id, products.name, products.slug, products.image, products.price, merchants.store_name").
		Order("count DESC").
		Scan(&results).Error

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   results,
	})
}

// GET /api/admin/merchants/restock
func (ac *AdminController) GetRestockRequests(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	var requests []models.RestockRequest
	query := ac.DB.Preload("Merchant").Preload("Items.Product").Order("created_at desc")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	query.Find(&requests)
	utils.JSONResponse(w, http.StatusOK, requests)
}

// POST /api/admin/merchants/restock/moderate
func (ac *AdminController) ModerateRestockRequest(w http.ResponseWriter, r *http.Request) {
	adminID := r.Context().Value("user_id").(string)
	
	var req struct {
		RequestID string `json:"request_id"`
		Status    string `json:"status"` // "approved" or "rejected"
		AdminNote string `json:"admin_note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	err := ac.Service.ModerateRestockRequest(adminID, req.RequestID, req.Status, req.AdminNote)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal moderasi: "+err.Error())
		return
	}

	// Notify Merchant
	var restock models.RestockRequest
	ac.DB.First(&restock, "id = ?", req.RequestID)
	ac.Notif.Push(restock.MerchantID, "merchant", "restock_update", "Status Restock Diperbarui", 
		fmt.Sprintf("Permintaan restock Anda statusnya kini: %s.", req.Status), "/merchant/restock")

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// AFFILIATE RESOURCES MANAGEMENT (EDUCATION, EVENTS, PROMO)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/education
func (ac *AdminController) GetEducation(w http.ResponseWriter, r *http.Request) {
	var edus []models.AffiliateEducation
	ac.DB.Order("created_at DESC").Find(&edus)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   edus,
	})
}

// POST /api/admin/education/upsert
func (ac *AdminController) UpsertEducation(w http.ResponseWriter, r *http.Request) {
	var req models.AffiliateEducation
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.Slug == "" {
		req.Slug = utils.Slugify(req.Title)
		// Check for uniqueness
		var count int64
		ac.DB.Model(&models.AffiliateEducation{}).Where("slug = ? AND id <> ?", req.Slug, req.ID).Count(&count)
		if count > 0 {
			req.Slug = fmt.Sprintf("%s-%d", req.Slug, time.Now().Unix()%1000)
		}
	}

	if req.ID != 0 {
		if err := ac.DB.Save(&req).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate edukasi")
			return
		}
	} else {
		if err := ac.DB.Create(&req).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat edukasi")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, req)
}

// DELETE /api/admin/education?id=xxx
func (ac *AdminController) DeleteEducation(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if err := ac.DB.Delete(&models.AffiliateEducation{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus edukasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/events
func (ac *AdminController) GetEvents(w http.ResponseWriter, r *http.Request) {
	var events []models.AffiliateEvent
	ac.DB.Order("start_time DESC").Find(&events)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   events,
	})
}

// POST /api/admin/events/upsert
func (ac *AdminController) UpsertEvent(w http.ResponseWriter, r *http.Request) {
	var req models.AffiliateEvent
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.ID != 0 {
		if err := ac.DB.Save(&req).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate event")
			return
		}
	} else {
		if err := ac.DB.Create(&req).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat event")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, req)
}

// DELETE /api/admin/events?id=xxx
func (ac *AdminController) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if err := ac.DB.Delete(&models.AffiliateEvent{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus event")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/promo
func (ac *AdminController) GetPromoMaterials(w http.ResponseWriter, r *http.Request) {
	var promos []models.PromoMaterial
	ac.DB.Order("created_at DESC").Find(&promos)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   promos,
	})
}

// POST /api/admin/promo/upsert
func (ac *AdminController) UpsertPromoMaterial(w http.ResponseWriter, r *http.Request) {
	var req models.PromoMaterial
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.ID != 0 {
		if err := ac.DB.Save(&req).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate materi promo")
			return
		}
	} else {
		if err := ac.DB.Create(&req).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat materi promo")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, req)
}

// DELETE /api/admin/promo?id=xxx
func (ac *AdminController) DeletePromoMaterial(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if err := ac.DB.Delete(&models.PromoMaterial{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus materi promo")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/users/create
func (ac *AdminController) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.Email == "" || req.Password == "" {
		utils.JSONError(w, http.StatusBadRequest, "Email and Password are required")
		return
	}

	// Check if user exists
	var count int64
	ac.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		utils.JSONError(w, http.StatusConflict, "Email already registered")
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengenkripsi password")
		return
	}

	hashStr := string(hash)
	user := models.User{
		Email:        req.Email,
		PasswordHash: &hashStr,
		Role:         req.Role,
		Status:       "active",
	}

	if user.Role == "" {
		user.Role = "affiliate"
	}

	if err := ac.DB.Create(&user).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat user")
		return
	}

	// Create profile
	profile := models.UserProfile{
		UserID:   user.ID,
		FullName: req.FullName,
	}
	ac.DB.Create(&profile)

	// Create wallet
	wallet := models.Wallet{
		OwnerID:   user.ID,
		OwnerType: models.WalletBuyer,
		Balance:   0,
	}
	ac.DB.Create(&wallet)

	utils.JSONResponse(w, http.StatusCreated, user)
}
