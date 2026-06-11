package controllers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"regexp"
	"strconv"
	"strings"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/repositories"
	"akuglow/backend/services"
	"akuglow/backend/utils"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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
	notif := services.NewNotificationService(db)
	return &AdminController{
		DB:      db,
		Service: services.NewAdminService(db, audit, notif),
		Audit:   audit,
		Notif:   notif,
		Storage: services.NewStorageService("", "uploads"),
	}
}

func (ac *AdminController) hasTable(name string) bool {
	return ac.DB != nil && ac.DB.Migrator().HasTable(name)
}

func (ac *AdminController) getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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

	// [Media Library Sync] Automatically register newly uploaded admin image into Media Library
	adminID, _ := r.Context().Value("user_id").(string)
	userRole, _ := r.Context().Value("user_role").(string)
	if adminID != "" && (userRole == "admin" || userRole == "superadmin") {
		media := models.Media{
			Filename:   header.Filename,
			URL:        url,
			Size:       header.Size,
			MimeType:   header.Header.Get("Content-Type"),
			UploadedBy: adminID,
			CreatedAt:  time.Now(),
		}
		ac.DB.Create(&media)
		ac.Audit.Log(adminID, "upload_media_auto", "media", media.ID, media.Filename, r.RemoteAddr)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"url":      url,
		"imageUrl": url, // Alias for frontend compatibility
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
	sort := r.URL.Query().Get("sort")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
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

// GET /api/admin/users/downlines?user_id=...
func (ac *AdminController) GetUserDownlines(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		utils.JSONError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Get Affiliate Member ID for this user
	var aff models.AffiliateMember
	if err := ac.DB.Where("user_id = ?", userID).First(&aff).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User is not an affiliate member")
		return
	}

	// Recursive fetch downlines
	tree := ac.fetchDownlineTree(aff.ID, 1, 100) // Max 100 levels

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   tree,
	})
}

func (ac *AdminController) fetchDownlineTree(uplineID string, currentLevel, maxLevel int) []map[string]interface{} {
	if currentLevel > maxLevel {
		return nil
	}

	type DownlineData struct {
		ID       string    `json:"id"`
		UserID   string    `json:"user_id"`
		RefCode  string    `json:"ref_code"`
		Status   string    `json:"status"`
		FullName string    `json:"full_name"`
		Email    string    `json:"email"`
		Avatar   *string   `json:"avatar_url"`
		JoinedAt time.Time `json:"joined_at"`
		TierName string    `json:"tier_name"`
		Earnings float64   `json:"total_earned"`
	}
	var downlines []DownlineData

	ac.DB.Raw(`
		SELECT am.id, am.user_id, am.ref_code, am.status, up.full_name, u.email, up.avatar_url, am.created_at as joined_at, mt.name as tier_name, am.total_earned as earnings
		FROM affiliate_members am
		JOIN users u ON u.id = am.user_id
		JOIN user_profiles up ON up.user_id = u.id
		LEFT JOIN membership_tiers mt ON mt.id = am.membership_tier_id
		WHERE am.upline_id = ?
	`, uplineID).Scan(&downlines)

	result := []map[string]interface{}{}
	for _, d := range downlines {
		node := map[string]interface{}{
			"id":           d.ID,
			"user_id":      d.UserID,
			"ref_code":     d.RefCode,
			"status":       d.Status,
			"full_name":    d.FullName,
			"email":        d.Email,
			"avatar_url":   d.Avatar,
			"joined_at":    d.JoinedAt,
			"tier_name":    d.TierName,
			"total_earned": d.Earnings,
			"level":        currentLevel,
		}

		children := ac.fetchDownlineTree(d.ID, currentLevel+1, maxLevel)
		if children != nil {
			node["downlines"] = children
			node["downline_count"] = len(children)
		} else {
			node["downline_count"] = 0
		}
		result = append(result, node)
	}

	return result
}

// PUT /api/admin/users/update
func (ac *AdminController) UpdateUser(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		UserID           string `json:"user_id"`
		Status           string `json:"status"` // active, suspended, banned
		Role             string `json:"role"`
		Phone            string `json:"phone"`
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
	if req.Phone != "" {
		updates["phone"] = &req.Phone
	} else if req.Phone == "" {
		// If phone is explicitly passed as empty, update to nil/null to prevent empty strings unique index issues
		var nilStr *string
		updates["phone"] = nilStr
	}
	if req.AdminRole != "" {
		updates["admin_role"] = req.AdminRole
	}
	if req.AdminPermissions != "" {
		updates["admin_permissions"] = req.AdminPermissions
	}

	ac.DB.Model(&models.User{}).Where("id = ?", req.UserID).Updates(updates)

	// [Auto-Bootstrap] Buatkan record terkait jika role berubah
	var user models.User
	ac.DB.Preload("Profile").First(&user, "id = ?", req.UserID)
	userName := "User"
	if user.Profile.FullName != "" {
		userName = user.Profile.FullName
	}

	if req.Role == "merchant" {
		var count int64
		ac.DB.Model(&models.Merchant{}).Where("user_id = ?", req.UserID).Count(&count)
		if count == 0 {
			err := ac.DB.Create(&models.Merchant{
				UserID:    req.UserID,
				StoreName: "Toko " + userName,
				Status:    "active",
			}).Error
			if err != nil {
				fmt.Println("[BOOTSTRAP ERROR] Failed creating Merchant:", err)
			} else {
				ac.DB.Create(&models.Wallet{
					OwnerID:   req.UserID,
					OwnerType: models.WalletMerchant,
					Balance:   0,
				})
			}
		}
	} else if req.Role == "affiliate" {
		var count int64
		ac.DB.Model(&models.AffiliateMember{}).Where("user_id = ?", req.UserID).Count(&count)
		if count == 0 {
			var tier models.MembershipTier
			ac.DB.Order("level ASC").First(&tier)
			err := ac.DB.Create(&models.AffiliateMember{
				UserID:           req.UserID,
				MembershipTierID: tier.ID,
				Status:           models.AffiliateActive,
				RefCode:          utils.GenerateRefCode(userName),
			}).Error
			if err != nil {
				fmt.Println("[BOOTSTRAP ERROR] Failed creating Affiliate:", err)
			} else {
				ac.DB.Create(&models.Wallet{
					OwnerID:   req.UserID,
					OwnerType: models.WalletAffiliate,
					Balance:   0,
				})
			}
		}
	}

	ac.Audit.Log(adminID, "update_user", "user", req.UserID,
		fmt.Sprintf("status=%s role=%s admin_role=%s", req.Status, req.Role, req.AdminRole),
		r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/users/reset-password
func (ac *AdminController) ResetUserPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		UserID      string `json:"user_id"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	adminID := r.Context().Value("user_id").(string)
	clientIP := ac.getClientIP(r)

	if err := ac.Service.ResetUserPassword(adminID, req.UserID, req.NewPassword, clientIP); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal meriset password: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Password user berhasil diubah secara manual",
	})
}

// DELETE /api/admin/users/delete?id=xxx  (soft delete)
func (ac *AdminController) DeleteUser(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	if r.Method != http.MethodDelete {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	if err := ac.DB.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus user")
		return
	}
	ac.Audit.Log(adminID, "delete_user", "user", id, "suspended", r.RemoteAddr)
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
	adminID, _ := r.Context().Value("user_id").(string)
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

		// [Akuglow Sync] Jika merchant diblokir/nonaktif, sembunyikan semua produknya
		if req.Status != "active" {
			tx.Model(&models.Product{}).Where("merchant_id = ?", merchant.ID).Update("status", "hidden")
		} else {
			// Jika diaktifkan kembali, tampilkan produknya (optional, tergantung kebijakan bisnis)
			tx.Model(&models.Product{}).Where("merchant_id = ?", merchant.ID).Update("status", "active")
		}

		if req.Status == "active" {
			if err := tx.Model(&models.User{}).Where("id = ?", merchant.UserID).Update("role", "merchant").Error; err != nil {
				return err
			}
			// Notifikasi ke user
			msg := fmt.Sprintf("Selamat! Permohonan Merchant Anda untuk '%s' telah disetujui. Anda kini adalah Mitra + Merchant AkuGlow. 🎉", merchant.StoreName)
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

	ac.Audit.Log(adminID, "update_merchant_status", "merchant", req.MerchantID,
		fmt.Sprintf("status=%s note=%s", req.Status, req.SuspendNote),
		r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// PUT /api/admin/merchants/update
func (ac *AdminController) UpdateMerchant(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MerchantID      string `json:"merchant_id"`
		StoreName       string `json:"store_name"`
		BiteshipAreaID  string `json:"biteship_area_id"`
		AreaName        string `json:"area_name"`
		City            string `json:"city"`
		Province        string `json:"province"`
		EnabledCouriers string `json:"enabled_couriers"`
		Status          string `json:"status"`
		IsVerified      bool   `json:"is_verified"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	updates := map[string]interface{}{}
	if req.StoreName != "" {
		updates["store_name"] = req.StoreName
	}
	if req.BiteshipAreaID != "" {
		updates["biteship_area_id"] = req.BiteshipAreaID
	}
	if req.AreaName != "" {
		updates["area_name"] = req.AreaName
	}
	if req.City != "" {
		updates["city"] = req.City
	}
	if req.Province != "" {
		updates["province"] = req.Province
	}
	if req.EnabledCouriers != "" {
		updates["enabled_couriers"] = req.EnabledCouriers
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	updates["is_verified"] = req.IsVerified

	if err := ac.DB.Model(&models.Merchant{}).Where("id = ?", req.MerchantID).Updates(updates).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate merchant")
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "update_merchant", "merchant", req.MerchantID,
		fmt.Sprintf("updates=%v", updates), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// PUT /api/admin/merchants/verify
func (ac *AdminController) VerifyMerchant(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
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
	ac.Audit.Log(adminID, "verify_merchant", "merchant", req.MerchantID,
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
	adminID, _ := r.Context().Value("user_id").(string)
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
		// [Akuglow Sync] Sinkronkan Nama Kategori ke Produk
		err = ac.DB.Transaction(func(tx *gorm.DB) error {
			var oldCat models.Category
			if err := tx.First(&oldCat, "id = ?", cat.ID).Error; err == nil && oldCat.Name != cat.Name {
				// Jika nama berubah, update semua produk yang pakai kategori ini
				if err := tx.Model(&models.Product{}).Where("category = ?", oldCat.Name).Update("category", cat.Name).Error; err != nil {
					return err
				}
			}
			return tx.Save(&cat).Error
		})
	}

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memproses kategori & sinkronisasi produk")
		return
	}

	action := "create_category"
	if cat.ID > 0 {
		action = "update_category"
	}
	ac.Audit.Log(adminID, action, "category", fmt.Sprintf("%d", cat.ID), cat.Name, r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   cat,
	})
}

// DELETE /api/admin/categories/delete?id=xxx
func (ac *AdminController) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	if r.Method != http.MethodDelete {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	ac.DB.Where("id = ?", id).Delete(&models.Category{})
	ac.Audit.Log(adminID, "delete_category", "category", id, "deleted", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

func (ac *AdminController) BulkDeleteCategories(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada kategori yang dipilih")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range req.IDs {
			if err := tx.Where("id = ?", id).Delete(&models.Category{}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus beberapa kategori: "+err.Error())
		return
	}

	ac.Audit.Log(adminID, "bulk_delete_categories", "category", fmt.Sprintf("%d items", len(req.IDs)), "bulk purged", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS MANAGEMENT (GLOBAL)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/orders
func (ac *AdminController) GetAllOrders(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, _ := strconv.Atoi(pageStr)
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	if !ac.hasTable("order_merchant_groups") || !ac.hasTable("orders") {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   []interface{}{},
			"total":  0,
		})
		return
	}

	type OrderRow struct {
		ID             string    `gorm:"column:id" json:"id"`
		OrderID        string    `gorm:"column:order_id" json:"order_id"`
		OrderNumber    string    `gorm:"column:order_number" json:"order_number"`
		OrderType      string    `gorm:"column:order_type" json:"order_type"`
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

	query := ac.DB.Table("order_merchant_groups omg").
		Joins("LEFT JOIN merchants m ON m.id = omg.merchant_id").
		Joins("JOIN orders o ON o.id = omg.order_id").
		Joins("LEFT JOIN users u ON u.id = o.buyer_id").
		Joins("LEFT JOIN user_profiles up ON up.user_id = u.id")

	if status != "" {
		if status == "paid" {
			// Jika filter 'Dibayar', cari yang status pembayarannya 'paid' atau merchant sudah konfirmasi
			query = query.Where("(o.status = 'paid' OR omg.status = 'confirmed')")
		} else if status == "pending_payment" {
			// Jika filter 'Belum Bayar', cari yang statusnya masih awal
			query = query.Where("(o.status = 'pending_payment' OR omg.status = 'new')")
		} else {
			query = query.Where("(omg.status = ? OR o.status = ?)", status, status)
		}
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Where("(CAST(o.id AS TEXT) ILIKE ? OR up.full_name ILIKE ? OR m.store_name ILIKE ?)", s, s, s)
	}

	if from != "" {
		query = query.Where("omg.created_at >= ?", from)
	}
	if to != "" {
		query = query.Where("omg.created_at <= ?", to+" 23:59:59")
	}

	var total int64
	query.Count(&total)

	var orders []OrderRow
	query.Select("o.id, o.id as order_id, o.order_number, o.order_type, omg.merchant_id, COALESCE(m.store_name, 'AkuGlow Pusat') as store_name, COALESCE(up.full_name, u.email, 'Pembeli Umum') as buyer_name, COALESCE(u.email, 'Guest') as buyer_email, o.status as payment_status, omg.status as shipping_status, omg.subtotal, (omg.subtotal + omg.shipping_cost - omg.discount) as total_amount, omg.tracking_number, omg.courier_code, omg.created_at").
		Order("omg.created_at DESC").
		Limit(limit).
		Offset(offset).
		Scan(&orders)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  total,
		"page":   page,
		"limit":  limit,
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
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit

	type AffRow struct {
		ID               string    `json:"id"`
		Email            string    `json:"email"`
		FullName         string    `json:"full_name"`
		Status           string    `json:"status"`
		RefCode          string    `json:"ref_code"`
		TierName         string    `json:"tier_name"`
		TierColor        string    `json:"tier_color"`
		TierLevel        int       `json:"tier_level"`
		CommRate         float64   `json:"comm_rate"`
		TotalEarned      float64   `json:"total_earned"`
		TotalWithdrawn   float64   `json:"total_withdrawn"`
		TotalClicks      int64     `json:"total_clicks"`
		TotalConversions int       `json:"total_conversions"`
		BankName          string    `gorm:"column:bank_name" json:"bank_name"`
		BankAccountNumber string    `gorm:"column:bank_account_number" json:"bank_account_number"`
		BankAccountName   string    `gorm:"column:bank_account_name" json:"bank_account_name"`
		AffStatus        string    `json:"affiliate_status"`
		JoinedAt         time.Time `json:"joined_at"`
		Balance          float64   `json:"balance"`
		TeamTurnover     float64   `json:"team_turnover"`
		MonthlyTurnover  float64   `json:"monthly_turnover"`
		TeamDownlines    int64     `json:"team_downlines"`
		Role             string    `json:"role"`
		MembershipTierID uint      `json:"membership_tier_id"`
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
		       am.ref_code, mt.name AS tier_name, mt.color AS tier_color, mt.level AS tier_level,
		       mt.base_commission_rate AS comm_rate, mt.id AS membership_tier_id,
		       w.total_earned, w.total_withdrawn, am.total_clicks, am.total_conversions,
		am.bank_name, am.bank_account_number, am.bank_account_name, am.status AS aff_status, am.created_at AS joined_at,
		       w.balance,
		       COALESCE(ats.team_turnover, 0) AS team_turnover,
		       COALESCE(ats.monthly_turnover, 0) AS monthly_turnover,
		       COALESCE(ats.team_downlines, 0) AS team_downlines
		FROM users u
		LEFT JOIN user_profiles up ON up.user_id = u.id
		LEFT JOIN affiliate_members am ON am.user_id = u.id
		LEFT JOIN wallets w ON w.owner_id = u.id AND w.owner_type = 'affiliate'
		LEFT JOIN membership_tiers mt ON mt.id = am.membership_tier_id
		LEFT JOIN affiliate_turnover_snapshots ats ON ats.affiliate_id = am.id
		WHERE ` + whereClause + `
		ORDER BY w.total_earned DESC
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

// POST /api/admin/affiliates/member/update-info
func (ac *AdminController) UpdateMemberInfo(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		UserID             string `json:"user_id"`
		Email              string `json:"email"`
		FullName           string `json:"full_name"`
		MembershipTierID   uint   `json:"membership_tier_id"`
		Status             string `json:"status"`
		BankName           string `json:"bank_name"`
		BankAccountNumber  string `json:"bank_account_number"`
		BankAccountName    string `json:"bank_account_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.UserID == "" {
		utils.JSONError(w, http.StatusBadRequest, "UserID wajib diisi")
		return
	}

	// Update email in users table if provided and changed
	if req.Email != "" {
		var u models.User
		if err := ac.DB.First(&u, "id = ?", req.UserID).Error; err == nil {
			if u.Email != req.Email {
				var existingUser models.User
				if err := ac.DB.Where("email = ? AND id != ?", req.Email, req.UserID).First(&existingUser).Error; err == nil {
					utils.JSONError(w, http.StatusConflict, "Email sudah terdaftar")
					return
				}
				if err := ac.DB.Model(&u).Update("email", req.Email).Error; err != nil {
					utils.JSONError(w, http.StatusInternalServerError, "Gagal memperbarui email")
					return
				}
			}
		}
	}

	// Update full_name in user_profiles if provided
	if req.FullName != "" {
		if err := ac.DB.Table("user_profiles").Where("user_id = ?", req.UserID).Update("full_name", req.FullName).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal memperbarui nama lengkap: "+err.Error())
			return
		}
	}

	updates := map[string]interface{}{}
	if req.MembershipTierID > 0 {
		updates["membership_tier_id"] = req.MembershipTierID
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.BankName != "" {
		updates["bank_name"] = req.BankName
	}
	if req.BankAccountNumber != "" {
		updates["bank_account_number"] = req.BankAccountNumber
	}
	if req.BankAccountName != "" {
		updates["bank_account_name"] = req.BankAccountName
	}

	if len(updates) > 0 {
		// Update the AffiliateMember record associated with this user
		if err := ac.DB.Model(&models.AffiliateMember{}).
			Where("user_id = ?", req.UserID).
			Updates(updates).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate data member: "+err.Error())
			return
		}

		// [Sync to Merchant] If merchant exists, update merchant bank info as well!
		var merchant models.Merchant
		if err := ac.DB.Where("user_id = ?", req.UserID).First(&merchant).Error; err == nil {
			merchantUpdates := map[string]interface{}{}
			if req.BankName != "" {
				merchantUpdates["bank_name"] = req.BankName
			}
			if req.BankAccountNumber != "" {
				merchantUpdates["bank_account_number"] = req.BankAccountNumber
			}
			if req.BankAccountName != "" {
				merchantUpdates["bank_account_name"] = req.BankAccountName
			}
			ac.DB.Model(&merchant).Updates(merchantUpdates)
		}
	}

	// Log audit
	ac.Audit.Log(adminID, "update_member_info", "affiliate_member", req.UserID,
		fmt.Sprintf("UserID: %s, Email: %s, FullName: %s, Updates: %v", req.UserID, req.Email, req.FullName, updates), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "message": "Data member berhasil diperbarui"})
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
	adminID, _ := r.Context().Value("user_id").(string)
	var req struct {
		ID                 uint    `json:"id"`
		Name               string  `json:"tier_name"`
		Level              int     `json:"level"`
		BaseCommissionRate float64 `json:"comm_rate"`
		MinEarningsUpgrade float64 `json:"min_sales"`
		MonthlyFee         float64 `json:"monthly_fee"`
		CommissionHoldDays int     `json:"commission_hold_days"`
		IsActive           bool    `json:"is_active"`
		// Requirements
		MinActiveMitra       int     `json:"min_active_mitra"`
		MinMonthlyTurnover   float64 `json:"min_monthly_turnover"`
		MinTotalTransactions int     `json:"min_total_transactions"`
		MinReferrals         int     `json:"min_referrals"`
		MinPerformancePoints int     `json:"min_performance_points"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.Name == "" {
		utils.JSONError(w, http.StatusBadRequest, "Nama tier wajib diisi")
		return
	}
	req.CommissionHoldDays = 0
	tier := models.MembershipTier{
		ID:                 req.ID,
		Name:               req.Name,
		Level:              req.Level,
		BaseCommissionRate: req.BaseCommissionRate,
		MinEarningsUpgrade: req.MinEarningsUpgrade,
		MonthlyFee:         req.MonthlyFee,
		CommissionHoldDays: req.CommissionHoldDays,
		// New Requirements (Req 4)
		MinActiveMitra:       req.MinActiveMitra,
		MinMonthlyTurnover:   req.MinMonthlyTurnover,
		MinTotalTransactions: req.MinTotalTransactions,
		MinReferrals:         req.MinReferrals,
		MinPerformancePoints: req.MinPerformancePoints,
	}
	if tier.ID == 0 {
		ac.DB.Create(&tier)
	} else {
		ac.DB.Save(&tier)
	}
	ac.Audit.Log(adminID, "upsert_membership_tier", "membership_tier",
		fmt.Sprintf("%d", tier.ID), tier.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   tier,
	})
}

// DELETE /api/admin/affiliates/configs/delete?id=1
func (ac *AdminController) DeleteAffiliateTier(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID tier wajib diisi")
		return
	}

	// [Sync Fix] Migrasi member ke Tier Standard (Level 1) daripada memblokir penghapusan
	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		var standardTier models.MembershipTier
		if err := tx.Where("level = 1").First(&standardTier).Error; err != nil {
			return fmt.Errorf("tier Standard (Level 1) tidak ditemukan sebagai fallback")
		}

		// Pindahkan semua member dari tier yang akan dihapus ke tier standard
		if err := tx.Model(&models.AffiliateMember{}).
			Where("membership_tier_id = ?", id).
			Update("membership_tier_id", standardTier.ID).Error; err != nil {
			return err
		}

		// Hapus tier tersebut
		return tx.Delete(&models.MembershipTier{}, id).Error
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus dan migrasi tier: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_membership_tier", "membership_tier", id, "Hapus Tier ID "+id, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success"})
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

	ac.Audit.Log(r.Context().Value("user_id").(string), "process_affiliate_withdrawal", "affiliate_withdrawal",
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
		ID             string  `json:"id"`
		Name           string  `json:"name"`
		Description    string  `json:"description"`
		SKU            string  `json:"sku"`
		Slug           string  `json:"slug"`
		Price          float64 `json:"price"`
		MaxPrice       float64 `json:"max_price"`
		OldPrice       float64 `json:"old_price"`
		WholesalePrice float64 `json:"wholesale_price"`
		COGS           float64 `json:"cogs"`
		Category       string  `json:"category"`
		Brand          string  `json:"brand"`
		Stock          int     `json:"stock"`
		Attributes     string  `json:"attributes"`
		Image          string  `json:"image"`
		Images         string  `json:"images"`
		Status         string  `json:"status"`
		Weight         int     `json:"weight"`
		MerchantID     string  `json:"merchant_id"`
		StoreName      string  `json:"store_name"`

		BaseAffiliateFee           float64 `json:"base_affiliate_fee"`
		BaseAffiliateFeeNominal    float64 `json:"base_affiliate_fee_nominal"`
		BaseDistributionFee        float64 `json:"base_distribution_fee"`
		BaseDistributionFeeNominal float64 `json:"base_distribution_fee_nominal"`
		MerchantCommissionPercent  float64 `json:"merchant_commission_percent"`
		CommissionPresetID         *string `json:"commission_preset_id"`

		ProductType    string `json:"product_type"`
		IsVirtual      bool   `json:"is_virtual"`
		IsDownloadable bool   `json:"is_downloadable"`
		IsFeatured     bool   `json:"is_featured"`

		CreatedAt time.Time `json:"created_at"`
	}

	query := ac.DB.Table("products p").
		Select("p.id, p.name, p.description, p.sku, p.image, p.images, p.slug, p.price, p.old_price, p.wholesale_price, p.cogs, p.stock, p.status, p.weight, p.merchant_id, m.store_name, p.category, p.brand, p.attributes, p.base_affiliate_fee, p.base_affiliate_fee_nominal, p.base_distribution_fee, p.base_distribution_fee_nominal, p.merchant_commission_percent, p.commission_preset_id, p.product_type, p.is_virtual, p.is_downloadable, p.is_featured, p.created_at").
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
	err := query.Order("p.created_at DESC").Scan(&rows).Error
	if err != nil {
		fmt.Printf("DATABASE ERROR in GetProducts: %v\n", err)
	}

	// [Sync Fix] Calculate aggregated stock and minimum price for products with variants
	for i := range rows {
		var variantCount int64
		ac.DB.Table("product_variants").Where("product_id = ?", rows[i].ID).Count(&variantCount)
		if variantCount > 0 {
			var totalStock int64
			var minPrice float64
			ac.DB.Table("product_variants").Where("product_id = ?", rows[i].ID).Select("COALESCE(SUM(stock), 0)").Scan(&totalStock)
			
			rows[i].Stock = int(totalStock)
			
			if rows[i].ProductType == "variable" {
				var maxPrice float64
				ac.DB.Table("product_variants").Where("product_id = ? AND price > 0", rows[i].ID).Select("COALESCE(MIN(price), 0), COALESCE(MAX(price), 0)").Row().Scan(&minPrice, &maxPrice)
				if minPrice > 0 {
					rows[i].Price = minPrice
				}
				if maxPrice > 0 {
					rows[i].MaxPrice = maxPrice
				}
			}
		}
	}

	fmt.Printf("DEBUG: GetProducts found %d products\n", len(rows))

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(rows),
		"data":   rows,
	})
}

// GET /api/admin/products/detail?id=xxx — Fetch single product by exact ID
func (ac *AdminController) GetProductDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID required")
		return
	}

	type ProductRow struct {
		ID                         string    `json:"id"`
		Name                       string    `json:"name"`
		Description                string    `json:"description"`
		ShortDescription           string    `gorm:"column:short_description" json:"short_description"`
		SKU                        string    `json:"sku"`
		Slug                       string    `json:"slug"`
		Price                      float64   `json:"price"`
		OldPrice                   float64   `json:"old_price"`
		WholesalePrice             float64   `json:"wholesale_price"`
		COGS                       float64   `json:"cogs"`
		Category                   string    `json:"category"`
		Brand                      string    `json:"brand"`
		Stock                      int       `json:"stock"`
		Attributes                 string    `json:"attributes"`
		Image                      string    `json:"image"`
		Images                     string    `json:"images"`
		Status                     string    `json:"status"`
		Weight                     int       `json:"weight"`
		MerchantID                 string    `json:"merchant_id"`
		StoreName                  string    `json:"store_name"`
		BaseAffiliateFee           float64   `json:"base_affiliate_fee"`
		BaseAffiliateFeeNominal    float64   `json:"base_affiliate_fee_nominal"`
		BaseDistributionFee        float64   `json:"base_distribution_fee"`
		BaseDistributionFeeNominal float64   `json:"base_distribution_fee_nominal"`
		MerchantCommissionPercent  float64   `json:"merchant_commission_percent"`
		CommissionPresetID         *string   `json:"commission_preset_id"`
		TierCommissionPresetID     *string   `json:"tier_commission_preset_id"`
		MerchantCommissionPresetID *string   `json:"merchant_commission_preset_id"`
		ProductType                string    `json:"product_type"`
		IsVirtual                  bool      `json:"is_virtual"`
		IsDownloadable             bool      `json:"is_downloadable"`
		DownloadLimit              int       `json:"download_limit"`
		DownloadExpiry             int       `json:"download_expiry"`
		DownloadableFiles          string    `json:"downloadable_files"`
		Upsells                    string    `gorm:"column:upsells" json:"upsells"`
		CrossSells                 string    `gorm:"column:crosssells" json:"crosssells"`
		PurchaseNote               string    `gorm:"column:purchase_note" json:"purchase_note"`
		MenuOrder                  int       `gorm:"column:menu_order" json:"menu_order"`
		EnableReviews              bool      `gorm:"column:enable_reviews" json:"enable_reviews"`
		TaxStatus                  string    `gorm:"column:tax_status" json:"tax_status"`
		TaxClass                   string    `gorm:"column:tax_class" json:"tax_class"`
		ProductURL                 string    `gorm:"column:product_url" json:"product_url"`
		ButtonText                 string    `gorm:"column:button_text" json:"button_text"`
		Backorders                 string    `gorm:"column:backorders" json:"backorders"`
		SoldIndividually           bool      `gorm:"column:sold_individually" json:"sold_individually"`
		Length                     int       `gorm:"column:length" json:"length"`
		Width                      int       `gorm:"column:width" json:"width"`
		Height                     int       `gorm:"column:height" json:"height"`
		SaleStart                  string    `gorm:"column:sale_start" json:"sale_start"`
		SaleEnd                    string    `gorm:"column:sale_end" json:"sale_end"`
		LowStockThreshold          int       `gorm:"column:low_stock_threshold" json:"low_stock_threshold"`
		Visibility                 string    `gorm:"column:visibility" json:"visibility"`
		SEOTitle                   string    `gorm:"column:seo_title" json:"seo_title"`
		SEODescription             string    `gorm:"column:seo_description" json:"seo_description"`
		SEOKeywords                string    `gorm:"column:seo_keywords" json:"seo_keywords"`
		IsFeatured                 bool      `gorm:"column:is_featured" json:"is_featured"`
		ShippingClassID            *uint     `gorm:"column:shipping_class_id" json:"shipping_class_id"`
		DefaultVariantID           *string   `gorm:"column:default_variant_id" json:"default_variant_id"`
		CanonicalURL               string    `gorm:"column:canonical_url" json:"canonical_url"`
		OGImage                    string    `gorm:"column:og_image" json:"og_image"`
		NoIndex                    bool      `gorm:"column:no_index" json:"no_index"`
		CreatedAt                  time.Time `json:"created_at"`
	}

	var row ProductRow
	err := ac.DB.Table("products p").
		Select("p.id, p.name, p.description, p.short_description, p.sku, p.image, p.images, p.slug, p.price, p.old_price, p.wholesale_price, p.cogs, p.stock, p.status, p.weight, p.merchant_id, m.store_name, p.category, p.brand, p.attributes, p.base_affiliate_fee, p.base_affiliate_fee_nominal, p.base_distribution_fee, p.base_distribution_fee_nominal, p.merchant_commission_percent, p.commission_preset_id, p.tier_commission_preset_id, p.merchant_commission_preset_id, p.product_type, p.is_virtual, p.is_downloadable, p.download_limit, p.download_expiry, p.downloadable_files, p.upsells, p.crosssells, p.purchase_note, p.menu_order, p.enable_reviews, p.tax_status, p.tax_class, p.product_url, p.button_text, p.backorders, p.sold_individually, p.length, p.width, p.height, p.sale_start, p.sale_end, p.low_stock_threshold, p.visibility, p.seo_title, p.seo_description, p.seo_keywords, p.is_featured, p.shipping_class_id, p.default_variant_id, p.canonical_url, p.og_image, p.no_index, p.created_at").
		Joins("LEFT JOIN merchants m ON m.id = p.merchant_id").
		Where("p.id::text = ?", id).
		Scan(&row).Error
	if err != nil || row.ID == "" {
		utils.JSONError(w, http.StatusNotFound, "Product not found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   row,
	})
}

// GET /api/admin/products/barcodes — Fetch all barcodes (flattening variable products)
func (ac *AdminController) GetAllBarcodes(w http.ResponseWriter, r *http.Request) {
	type BarcodeItem struct {
		Name string `json:"name"`
		SKU  string `json:"sku"`
	}
	var items []BarcodeItem

	// 1. Get Simple, Grouped, Digital, External (anything not variable)
	type SimpleResult struct {
		ID   string
		Name string
		SKU  string
	}
	var simpleProds []SimpleResult
	ac.DB.Table("products").Where("product_type != 'variable'").Select("id, name, sku").Scan(&simpleProds)
	for _, p := range simpleProds {
		sku := p.SKU
		if sku == "" {
			sku = p.ID
		}
		items = append(items, BarcodeItem{Name: p.Name, SKU: sku})
	}

	// 2. Get variants for Variable products
	type VariantResult struct {
		ID          string
		ProductName string
		VariantName string
		SKU         string
	}
	var variantProds []VariantResult
	ac.DB.Table("product_variants pv").
		Select("pv.id, p.name as product_name, pv.name as variant_name, pv.sku").
		Joins("LEFT JOIN products p ON p.id = pv.product_id").
		Scan(&variantProds)

	for _, v := range variantProds {
		sku := v.SKU
		if sku == "" {
			sku = v.ID
		}
		name := v.ProductName
		if v.VariantName != "" {
			name += " (" + v.VariantName + ")"
		}
		items = append(items, BarcodeItem{Name: name, SKU: sku})
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   items,
	})
}

// GET /api/admin/finance/cashflow — Laporan Arus Kas & Alokasi
func (ac *AdminController) GetCashFlow(w http.ResponseWriter, r *http.Request) {
	month := r.URL.Query().Get("month") // format: 2025-05

	type AllocationItem struct {
		Key   string  `json:"key"`
		Label string  `json:"label"`
		Rate  float64 `json:"rate"`
		Value float64 `json:"value"`
	}

	type CashFlowData struct {
		TotalRevenue        float64 `json:"total_revenue"`
		TotalCOGS           float64 `json:"total_cogs"`
		TotalAffiliateBonus float64 `json:"total_affiliate_bonus"`
		TotalMerchantBonus  float64 `json:"total_merchant_bonus"`
		GrossProfit         float64 `json:"gross_profit"`

		Allocations []AllocationItem `json:"allocations"`

		NetProfit         float64 `json:"net_profit"`
		NetAplikasiDagang float64 `json:"net_aplikasi_dagang"`
		NetAkuglow        float64 `json:"net_akuglow"`

		SplitAplikasiDagang float64 `json:"split_aplikasi_dagang"`
		SplitAkuglow        float64 `json:"split_akuglow"`

		CashBalance          float64 `json:"cash_balance"`
		TotalEscrowLiability float64 `json:"total_escrow_liability"`
	}

	// Load all allocation configs from DB
	var allConfigs []models.PlatformConfig
	ac.DB.Find(&allConfigs)

	getConfig := func(key string, def float64) float64 {
		for _, c := range allConfigs {
			if c.Key == key {
				var v float64
				fmt.Sscanf(c.Value, "%f", &v)
				return v
			}
		}
		return def
	}

	var totalRevenue, totalCOGS, totalAffBonus, totalMerchBonus float64

	// Helper to apply month filter
	withMonth := func(db *gorm.DB, table string) *gorm.DB {
		if month == "" {
			return db
		}
		return db.Where(fmt.Sprintf("TO_CHAR(%s.created_at, 'YYYY-MM') = ?", table), month)
	}

	// Total revenue = SUM(unit_price * quantity)
	qRev := ac.DB.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status IN ('paid', 'shipped', 'delivered', 'completed')")
	withMonth(qRev, "orders").Select("COALESCE(SUM(order_items.unit_price * order_items.quantity), 0)").Scan(&totalRevenue)

	// Total COGS = SUM(cogs * quantity)
	qCogs := ac.DB.Model(&models.OrderItem{}).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status IN ('paid', 'shipped', 'delivered', 'completed')")
	withMonth(qCogs, "orders").Select("COALESCE(SUM(order_items.cogs * order_items.quantity), 0)").Scan(&totalCOGS)

	// Total affiliate commissions paid out
	qAff := ac.DB.Table("wallet_transactions wt").
		Joins("JOIN wallets w ON w.id = wt.wallet_id").
		Where("w.owner_type = 'affiliate' AND wt.type = 'commission_earned' AND wt.amount > 0")
	withMonth(qAff, "wt").Select("COALESCE(SUM(wt.amount), 0)").Scan(&totalAffBonus)

	// Total merchant commissions paid out
	qMerch := ac.DB.Table("wallet_transactions wt").
		Joins("JOIN wallets w ON w.id = wt.wallet_id").
		Where("w.owner_type = 'merchant' AND wt.type = 'sale_revenue' AND wt.amount > 0")
	withMonth(qMerch, "wt").Select("COALESCE(SUM(wt.amount), 0)").Scan(&totalMerchBonus)

	grossProfit := totalRevenue - totalCOGS - totalAffBonus - totalMerchBonus

	allocations := []AllocationItem{}
	totalAllocValue := 0.0

	// Dynamic allocations based on 'alloc_' prefix
	for _, c := range allConfigs {
		if strings.HasPrefix(c.Key, "alloc_") {
			var rate float64
			fmt.Sscanf(c.Value, "%f", &rate)

			label := c.Description
			if label == "" || label == "Cash flow allocation config" {
				label = strings.Title(strings.Replace(strings.TrimPrefix(c.Key, "alloc_"), "_", " ", -1))
			}

			val := grossProfit * rate
			allocations = append(allocations, AllocationItem{
				Key:   c.Key,
				Label: label,
				Rate:  rate,
				Value: val,
			})
			totalAllocValue += val
		}
	}

	splitAppDagang := getConfig("split_aplikasi_dagang", 0.50)
	splitAkuglow := getConfig("split_akuglow", 0.50)

	netProfit := grossProfit - totalAllocValue

	var cashBalance, totalEscrow float64
	ac.DB.Model(&models.Wallet{}).Where("owner_id = ?", models.PusatID).Select("COALESCE(balance, 0)").Scan(&cashBalance)

	// Global Escrow Liability (All wallets' balance + pending)
	ac.DB.Model(&models.Wallet{}).
		Where("owner_type IN (?, ?)", models.WalletMerchant, models.WalletAffiliate).
		Select("COALESCE(SUM(balance + pending_balance), 0)").Scan(&totalEscrow)

	data := CashFlowData{
		TotalRevenue:         totalRevenue,
		TotalCOGS:            totalCOGS,
		TotalAffiliateBonus:  totalAffBonus,
		TotalMerchantBonus:   totalMerchBonus,
		GrossProfit:          grossProfit,
		Allocations:          allocations,
		NetProfit:            netProfit,
		NetAplikasiDagang:    netProfit * splitAppDagang,
		NetAkuglow:           netProfit * splitAkuglow,
		SplitAplikasiDagang:  splitAppDagang,
		SplitAkuglow:         splitAkuglow,
		CashBalance:          cashBalance,
		TotalEscrowLiability: totalEscrow,
	}

	utils.JSONResponse(w, http.StatusOK, data)
}

// POST /api/admin/finance/cashflow/config — Update alokasi rates
func (ac *AdminController) UpdateCashFlowConfig(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Allocations []struct {
			Key   string  `json:"key"`
			Value float64 `json:"value"`
			Label string  `json:"label"`
		} `json:"allocations"`
		SplitAplikasiDagang float64 `json:"split_aplikasi_dagang"`
		SplitAkuglow        float64 `json:"split_akuglow"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// 1. Delete all existing allocations starting with 'alloc_' that are NOT in the request
	var currentKeys []string
	for _, a := range req.Allocations {
		currentKeys = append(currentKeys, a.Key)
	}

	delQuery := ac.DB.Table("platform_configs").Where("key LIKE 'alloc_%'")
	if len(currentKeys) > 0 {
		delQuery = delQuery.Where("key NOT IN ?", currentKeys)
	}
	delQuery.Delete(&models.PlatformConfig{})

	// 2. Save/Update current allocations
	for _, a := range req.Allocations {
		var cfg models.PlatformConfig
		ac.DB.Where("key = ?", a.Key).First(&cfg)
		cfg.Key = a.Key
		cfg.Value = fmt.Sprintf("%.4f", a.Value)
		if a.Label != "" {
			cfg.Description = a.Label
		}
		ac.DB.Save(&cfg)
	}

	// 3. Update core splits
	splits := []struct {
		K string
		V float64
	}{
		{"split_aplikasi_dagang", req.SplitAplikasiDagang},
		{"split_akuglow", req.SplitAkuglow},
	}
	for _, s := range splits {
		var cfg models.PlatformConfig
		ac.DB.Where("key = ?", s.K).First(&cfg)
		cfg.Key = s.K
		cfg.Value = fmt.Sprintf("%.4f", s.V)
		cfg.Description = "Profit share ratio"
		ac.DB.Save(&cfg)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
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

	ac.Audit.Log(r.Context().Value("user_id").(string), "moderate_product", "product", req.ID,
		fmt.Sprintf("status=%s note=%s", req.Status, req.Note), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// PUT /api/admin/products/toggle-featured
func (ac *AdminController) ToggleProductFeatured(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}
	
	var prod models.Product
	if err := ac.DB.First(&prod, "id = ?", req.ID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Product not found")
		return
	}
	
	newStatus := !prod.IsFeatured
	ac.DB.Model(&prod).Update("is_featured", newStatus)

	ac.Audit.Log(r.Context().Value("user_id").(string), "toggle_featured_product", "product", req.ID,
		fmt.Sprintf("is_featured=%v", newStatus), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "is_featured": newStatus})
}

// DELETE /api/admin/products/delete?id=xxx
func (ac *AdminController) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID produk wajib diisi")
		return
	}

	// HAPUS PERMANEN dengan pembersihan data terkait (Cascading Delete Manual)
	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Hapus Varian
		if err := tx.Unscoped().Where("product_id = ?", id).Delete(&models.ProductVariant{}).Error; err != nil {
			return err
		}
		// 2. Hapus Inventori/Stok
		if err := tx.Unscoped().Where("product_id = ?", id).Delete(&models.Inventory{}).Error; err != nil {
			return err
		}
		// 3. Hapus Komisi Tier
		if err := tx.Unscoped().Where("product_id = ?", id).Delete(&models.ProductTierCommission{}).Error; err != nil {
			return err
		}
		// 4. Hapus Produk Utama
		if err := tx.Unscoped().Delete(&models.Product{}, "id = ?", id).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		fmt.Printf("❌ Delete Error: %v\n", err)
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus produk: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_product_permanent", "product", id, "purged from database with all relations", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/products/bulk-delete
func (ac *AdminController) BulkDeleteProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada ID yang dipilih")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range req.IDs {
			// Clean relations
			tx.Unscoped().Where("product_id = ?", id).Delete(&models.ProductVariant{})
			tx.Unscoped().Where("product_id = ?", id).Delete(&models.Inventory{})
			tx.Unscoped().Where("product_id = ?", id).Delete(&models.ProductTierCommission{})
			// Delete main product
			if err := tx.Unscoped().Delete(&models.Product{}, "id = ?", id).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus beberapa produk: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "bulk_delete_products", "product", fmt.Sprintf("%d items", len(req.IDs)), "bulk purged", r.RemoteAddr)
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

	if p.CommissionPresetID != nil && *p.CommissionPresetID == "" {
		p.CommissionPresetID = nil
	}
	if p.TierCommissionPresetID != nil && *p.TierCommissionPresetID == "" {
		p.TierCommissionPresetID = nil
	}
	if p.MerchantCommissionPresetID != nil && *p.MerchantCommissionPresetID == "" {
		p.MerchantCommissionPresetID = nil
	}
	if p.ShippingClassID != nil && *p.ShippingClassID == 0 {
		p.ShippingClassID = nil
	}
	if p.DefaultVariantID != nil && *p.DefaultVariantID == "" {
		p.DefaultVariantID = nil
	}

	// Set default values for WooCommerce parity
	if p.ProductType == "" {
		p.ProductType = "simple"
	}
	if p.Visibility == "" {
		p.Visibility = "public"
	}
	if p.TaxStatus == "" {
		p.TaxStatus = "taxable"
	}
	if p.TaxClass == "" {
		p.TaxClass = "standard"
	}
	if p.Backorders == "" {
		p.Backorders = "no"
	}
	if p.LowStockThreshold == 0 {
		p.LowStockThreshold = 5
	}

	// WooCommerce Sale Price Validation
	if p.OldPrice > 0 && p.OldPrice <= p.Price {
		utils.JSONError(w, http.StatusBadRequest, "Harga sale harus lebih kecil dari harga normal")
		return
	}
	// Validate sale date range
	if p.SaleStart != "" && p.SaleEnd != "" {
		startDate, _ := time.Parse("2006-01-02", p.SaleStart)
		endDate, _ := time.Parse("2006-01-02", p.SaleEnd)
		if endDate.Before(startDate) {
			utils.JSONError(w, http.StatusBadRequest, "Tanggal berakhir sale harus setelah tanggal mulai")
			return
		}
	}

	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	if p.MerchantID == "" {
		p.MerchantID = models.PusatID
	}

	// [Akuglow Refactor] Product is now Master Product (PUSAT)
	// Initial stock will be handled via Inventories table after creation.

	if p.SKU != "" {
		var otherP models.Product
		ac.DB.Where("sku = ?", p.SKU).First(&otherP)
		if otherP.ID != "" {
			utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh produk: %s", p.SKU, otherP.Name))
			return
		}

		var otherV models.ProductVariant
		ac.DB.Where("sku = ?", p.SKU).First(&otherV)
		if otherV.ID != "" {
			utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh varian produk lain (ID: %s)", p.SKU, otherV.ProductID))
			return
		}
	}

	if p.Slug == "" {
		p.Slug = strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
		// [Complex Sync] Gunakan UnixNano % 1000000 agar probabilitas tabrakan slug hampir nol
		// Terutama penting untuk sistem dengan banyak admin yang mengupload produk serentak
		p.Slug = fmt.Sprintf("%s-%d", p.Slug, time.Now().UnixNano()%1000000)
	}

	db := ac.DB
	if p.SupplierID == "" {
		db = db.Omit("supplier_id")
	}

	if err := db.Create(&p).Error; err != nil {
		fmt.Printf("❌ Database Error: %v\n", err)
		utils.JSONError(w, http.StatusInternalServerError, fmt.Sprintf("Database Error: %v", err))
		return
	}

	// [Akuglow] Auto-populate PUSAT inventory with provided stock
	ac.DB.Create(&models.Inventory{
		ProductID:  p.ID,
		MerchantID: models.PusatID,
		Stock:      p.Stock,
		BasePrice:  p.COGS, // Set initial modal
	})

	ac.Audit.Log(r.Context().Value("user_id").(string), "create_product", "product", p.ID, p.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{"status": "success", "data": p})
}

// PUT /api/admin/products/update
func (ac *AdminController) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		ID                         string  `json:"id"`
		Name                       string  `json:"name"`
		Description                string  `json:"description"`
		ShortDescription           string  `json:"short_description"`
		SKU                        string  `json:"sku"`
		Price                      float64 `json:"price"`
		OldPrice                   float64 `json:"old_price"`
		COGS                       float64 `json:"cogs"` // Modal Awal
		Category                   string  `json:"category"`
		Brand                      string  `json:"brand"`
		Attributes                 string  `json:"attributes"`
		Stock                      int     `json:"stock"`
		Image                      string  `json:"image"`
		Images                     string  `json:"images"` // Added missing images field
		Status                     string  `json:"status"`
		Weight                     int     `json:"weight"`
		BaseAffiliateFee           float64 `json:"base_affiliate_fee"`
		BaseAffiliateFeeNominal    float64 `json:"base_affiliate_fee_nominal"`
		BaseDistributionFee        float64 `json:"base_distribution_fee"`
		BaseDistributionFeeNominal float64 `json:"base_distribution_fee_nominal"`
		MerchantCommissionPercent  float64 `json:"merchant_commission_percent"`
		CommissionPresetID         *string `json:"commission_preset_id"`
		TierCommissionPresetID     *string `json:"tier_commission_preset_id"`
		MerchantCommissionPresetID *string `json:"merchant_commission_preset_id"`
		IsVirtual                  bool    `json:"is_virtual"`
		IsDownloadable             bool    `json:"is_downloadable"`
		DownloadLimit              int     `json:"download_limit"`
		DownloadExpiry             int     `json:"download_expiry"`
		DownloadableFiles          string  `json:"downloadable_files"`
		TaxStatus                  string  `json:"tax_status"`
		TaxClass                   string  `json:"tax_class"`
		ProductURL                 string  `json:"product_url"`
		ButtonText                 string  `json:"button_text"`
		Backorders                 string  `json:"backorders"`
		SoldIndividually           bool    `json:"sold_individually"`
		Length                     int     `json:"length"`
		Width                      int     `json:"width"`
		Height                     int     `json:"height"`
		PurchaseNote               string  `json:"purchase_note"`
		MenuOrder                  int     `json:"menu_order"`
		EnableReviews              bool    `json:"enable_reviews"`
		SaleStart                  string  `json:"sale_start"`
		SaleEnd                    string  `json:"sale_end"`

		// WooCommerce Full Parity - New Fields
		IsFeatured         bool    `json:"is_featured"`          // Star icon for featured
		LowStockThreshold  int     `json:"low_stock_threshold"`  // Alert threshold
		ShippingClassID    *uint   `json:"shipping_class_id"`    // Shipping class grouping
		DefaultVariantID   *string `json:"default_variant_id"`   // Default variation for variable products
		CanonicalURL       string  `json:"canonical_url"`       // Canonical URL
		OGImage            string  `json:"og_image"`            // Open Graph image for social
		NoIndex            bool    `json:"no_index"`           // robots noindex
		ProductType        string  `json:"product_type"`       // Product type
		Visibility         string  `json:"visibility"`         // Visibility
		SEODescription     string  `json:"seo_description"`    // SEO description
		SEOKeywords        string  `json:"seo_keywords"`      // SEO keywords
		SEOTitle           string  `json:"seo_title"`          // SEO title
		WholesalePrice     float64 `json:"wholesale_price"`    // Wholesale price
		Upsells            string  `json:"upsells"`            // Upsell product IDs in JSON
		CrossSells         string  `json:"crosssells"`         // Cross-sell product IDs in JSON
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.CommissionPresetID != nil && *req.CommissionPresetID == "" {
		req.CommissionPresetID = nil
	}
	if req.TierCommissionPresetID != nil && *req.TierCommissionPresetID == "" {
		req.TierCommissionPresetID = nil
	}
	if req.MerchantCommissionPresetID != nil && *req.MerchantCommissionPresetID == "" {
		req.MerchantCommissionPresetID = nil
	}

	updates := map[string]interface{}{
		"name":                          req.Name,
		"description":                   req.Description,
		"short_description":             req.ShortDescription,
		"sku":                           req.SKU,
		"price":                         req.Price,
		"old_price":                     req.OldPrice,
		"cogs":                          req.COGS,
		"category":                      req.Category,
		"brand":                         req.Brand,
		"attributes":                    req.Attributes,
		"stock":                         req.Stock,
		"image":                         req.Image,
		"images":                        req.Images,
		"status":                        req.Status,
		"weight":                        req.Weight,
		"base_affiliate_fee":            req.BaseAffiliateFee,
		"base_affiliate_fee_nominal":    req.BaseAffiliateFeeNominal,
		"base_distribution_fee":         req.BaseDistributionFee,
		"base_distribution_fee_nominal": req.BaseDistributionFeeNominal,
		"merchant_commission_percent":   req.MerchantCommissionPercent,
		"commission_preset_id":          req.CommissionPresetID,
		"tier_commission_preset_id":     req.TierCommissionPresetID,
		"merchant_commission_preset_id": req.MerchantCommissionPresetID,
		"is_virtual":                    req.IsVirtual,
		"is_downloadable":               req.IsDownloadable,
		"download_limit":                req.DownloadLimit,
		"download_expiry":               req.DownloadExpiry,
		"downloadable_files":            req.DownloadableFiles,
		"tax_status":                    req.TaxStatus,
		"tax_class":                     req.TaxClass,
		"product_url":                   req.ProductURL,
		"button_text":                   req.ButtonText,
		"backorders":                    req.Backorders,
		"sold_individually":             req.SoldIndividually,
		"length":                        req.Length,
		"width":                         req.Width,
		"height":                        req.Height,
		"purchase_note":                 req.PurchaseNote,
		"menu_order":                    req.MenuOrder,
		"enable_reviews":                req.EnableReviews,
		"sale_start":                    req.SaleStart,
		"sale_end":                      req.SaleEnd,

		// WooCommerce Full Parity - New Fields
		"is_featured":          req.IsFeatured,
		"low_stock_threshold":  req.LowStockThreshold,
		"shipping_class_id":    req.ShippingClassID,
		"default_variant_id":   req.DefaultVariantID,
		"canonical_url":        req.CanonicalURL,
		"og_image":             req.OGImage,
		"no_index":             req.NoIndex,
		"product_type":         req.ProductType,
		"visibility":           req.Visibility,
		"seo_title":           req.SEOTitle,
		"seo_description":     req.SEODescription,
		"seo_keywords":        req.SEOKeywords,
		"wholesale_price":      req.WholesalePrice,
		"upsells":              req.Upsells,
		"crosssells":           req.CrossSells,
	}

	// 1. Check SKU conflicts (Cross-table)
	if req.SKU != "" {
		var otherP models.Product
		ac.DB.Where("sku = ? AND id <> ?", req.SKU, req.ID).First(&otherP)
		if otherP.ID != "" {
			utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh produk lain: %s", req.SKU, otherP.Name))
			return
		}

		var otherV models.ProductVariant
		ac.DB.Where("sku = ?", req.SKU).First(&otherV)
		if otherV.ID != "" && otherV.ProductID != req.ID {
			utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh varian produk lain (ID: %s)", req.SKU, otherV.ProductID))
			return
		}
	}

	// Use Transaction for atomic sync
	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("products").Where("id = ?", req.ID).Updates(updates).Error; err != nil {
			return err
		}

		// [Akuglow Sync] Sinkronkan ke Gudang Pusat (Inventory)
		var inv models.Inventory
		var variant models.ProductVariant
		tx.Where("product_id = ? AND name = ?", req.ID, "Standard").First(&variant)
		if variant.ID == "" {
			tx.Where("product_id = ?", req.ID).First(&variant)
		}

		var err error
		if variant.ID != "" {
			err = tx.Where("merchant_id = ? AND product_id = ? AND product_variant_id = ?", models.PusatID, req.ID, variant.ID).First(&inv).Error
		} else {
			err = tx.Where("merchant_id = ? AND product_id = ? AND product_variant_id IS NULL", models.PusatID, req.ID).First(&inv).Error
		}

		if err != nil {
			// Jika belum ada record di inventory, buat baru
			inv = models.Inventory{
				MerchantID: models.PusatID,
				ProductID:  req.ID,
				Stock:      req.Stock,
				BasePrice:  req.COGS, // Sync Modal (COGS)
			}
			if variant.ID != "" {
				inv.ProductVariantID = &variant.ID
			}
			if err := tx.Create(&inv).Error; err != nil {
				return err
			}
		} else {
			// Jika sudah ada, update Stok & COGS (BasePrice)
			if err := tx.Model(&inv).Updates(map[string]interface{}{
				"stock":      req.Stock,
				"base_price": req.COGS,
			}).Error; err != nil {
				return err
			}
		}

		// If product is simple/non-variable, also update its variant stock if exists
		if req.ProductType != "variable" && variant.ID != "" {
			if err := tx.Model(&models.ProductVariant{}).Where("id = ?", variant.ID).Update("stock", req.Stock).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal sinkronisasi produk & stok: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "update_product", "product", req.ID, req.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/products/tier-commissions?product_id=...
func (ac *AdminController) GetProductTierCommissions(w http.ResponseWriter, r *http.Request) {
	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID required")
		return
	}
	var configs []models.ProductTierCommission
	ac.DB.Where("product_id = ?", productID).Find(&configs)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": configs})
}

// POST /api/admin/products/tier-commissions
func (ac *AdminController) UpdateProductTierCommission(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProductID      string  `json:"product_id"`
		TierID         uint    `json:"membership_tier_id"`
		CommissionRate float64 `json:"commission_rate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	var config models.ProductTierCommission
	err := ac.DB.Where("product_id = ? AND membership_tier_id = ?", req.ProductID, req.TierID).First(&config).Error

	config.ProductID = req.ProductID
	config.MembershipTierID = req.TierID
	config.CommissionRate = req.CommissionRate / 100.0

	if err == gorm.ErrRecordNotFound {
		ac.DB.Create(&config)
	} else {
		ac.DB.Save(&config)
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "update_product_tier_commission", "product", req.ProductID, fmt.Sprintf("Tier %d Rate %f", req.TierID, req.CommissionRate), r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": config})
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE & REVENUE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/finance  → overview revenue platform
func (ac *AdminController) GetFinance(w http.ResponseWriter, r *http.Request) {
	var totalRevenue, totalPlatformFee, pendingPayout, cashBalance float64
	var totalCOGS, totalNetProfit float64
	var totalOrders, completedOrders int64

	// [Financial Audit Fix] Centralized Cash Model
	// 1. Gross Revenue (Total Money received from buyers)
	ac.DB.Model(&models.WalletTransaction{}).
		Joins("JOIN wallets ON wallets.id = wallet_transactions.wallet_id").
		Where("wallets.owner_id IN (?, ?)", models.PusatID, models.AdminID).
		Where("wallet_transactions.type = ?", models.TxSaleRevenue).
		Select("COALESCE(SUM(wallet_transactions.amount), 0)").Scan(&totalRevenue)

	// 2. Cash on Hand (Actual balance in HQ wallet after Payouts)
	ac.DB.Model(&models.Wallet{}).
		Where("owner_id = ?", models.PusatID).
		Select("COALESCE(balance, 0)").Scan(&cashBalance)

	// 3. Platform Fee Profit
	ac.DB.Model(&models.WalletTransaction{}).
		Joins("JOIN wallets ON wallets.id = wallet_transactions.wallet_id").
		Where("wallets.owner_id = ?", models.AdminID).
		Where("wallet_transactions.type = ?", models.TxPlatformFee).
		Select("COALESCE(SUM(wallet_transactions.amount), 0)").Scan(&totalPlatformFee)

	// 4. Distribution Liabilities (Money promised to others)
	var merchantLiability, affiliateLiability float64
	ac.DB.Model(&models.Wallet{}).Where("owner_type = ?", models.WalletMerchant).Select("SUM(balance + pending_balance)").Scan(&merchantLiability)
	ac.DB.Model(&models.Wallet{}).Where("owner_type = ?", models.WalletAffiliate).Select("SUM(balance + pending_balance)").Scan(&affiliateLiability)

	if ac.hasTable("order_items") {
		// Calculate total COGS from completed/paid sales
		ac.DB.Model(&models.OrderItem{}).
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("orders.status IN ('paid', 'shipped', 'delivered', 'completed')").
			Select("COALESCE(SUM(order_items.cogs * order_items.quantity), 0)").Scan(&totalCOGS)

		// Net Profit = Gross Revenue - COGS - Distributions
		totalNetProfit = totalRevenue - totalCOGS - merchantLiability - affiliateLiability
	}

	if ac.hasTable("wallets") {
		// Other wallets' pending balance represents obligations to merchants/affiliates
		ac.DB.Table("wallets").
			Where("owner_id NOT IN (?, ?)", models.PusatID, models.AdminID).
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
		"cash_balance":       cashBalance,
		"pending_payout":     pendingPayout,
		"total_orders":       totalOrders,
		"completed_orders":   completedOrders,
	})
}

// GET /api/admin/finance/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD
func (ac *AdminController) GetTransactions(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if !ac.hasTable("wallet_transactions") {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"total":  0,
			"data":   []interface{}{},
		})
		return
	}

	type TxRow struct {
		ID          string    `json:"id"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		Description string    `json:"description"`
		CreatedAt   time.Time `json:"created_at"`
	}

	query := ac.DB.Table("wallet_transactions").
		Select("id, type, amount, description, created_at")

	if from != "" {
		query = query.Where("created_at >= ?", from)
	}
	if to != "" {
		query = query.Where("created_at <= ?", to+" 23:59:59")
	}

	var rows []TxRow
	query.Order("created_at DESC").Limit(200).Scan(&rows)

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

	yearStr := r.URL.Query().Get("year")
	if yearStr == "" {
		yearStr = time.Now().Format("2006")
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
			SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
			       SUM(grand_total) AS revenue,
			       0 AS fee,
			       SUM(grand_total) AS gross_take,
			       COUNT(DISTINCT id) AS orders,
			       0 AS total_cogs
			FROM orders
			WHERE TO_CHAR(created_at, 'YYYY') = ?
			  AND status IN ('completed', 'delivered', 'shipped', 'ready_to_ship', 'paid', 'processing')
			GROUP BY month
		)
		SELECT month, revenue, COALESCE(gross_take, 0) - COALESCE(total_cogs, 0) AS profit, fee, orders
		FROM monthly_stats
		ORDER BY month ASC
	`, yearStr).Scan(&rows)

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

	// [New Feature] Fetch Exact Financial Breakdown (Pembagian Uang)
	type FinanceBreakdown struct {
		ID          string    `json:"id"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		Description string    `json:"description"`
		OwnerType   string    `json:"owner_type"`
		OwnerName   string    `json:"owner_name"`
		CreatedAt   time.Time `json:"created_at"`
	}
	var breakdown []FinanceBreakdown

	// We use LEFT JOIN to match wallet transactions either directly via order ID or indirectly via commission records
	ac.DB.Raw(`
		SELECT t.id, t.type, t.amount, t.description, w.owner_type, 
		       COALESCE(up.full_name, m.store_name, 'Platform Admin') as owner_name, 
		       t.created_at
		FROM wallet_transactions t
		JOIN wallets w ON t.wallet_id = w.id
		LEFT JOIN users u ON w.owner_id = u.id AND w.owner_type IN ('affiliate', 'buyer', 'admin')
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN merchants m ON w.owner_id = m.id AND w.owner_type = 'merchant'
		LEFT JOIN affiliate_commissions ac ON t.reference_id = ac.id AND t.reference_type = 'affiliate_commission'
		WHERE t.reference_id::text = ? OR ac.order_id::text = ?
		ORDER BY t.created_at ASC
	`, order.ID, order.ID).Scan(&breakdown)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   order,
		"finance_breakdown": breakdown,
		"total": 1, // Prevent frontend fetchJson unwrapper from discarding finance_breakdown
	})
}

// POST /api/admin/orders/status → Update status dengan State Machine (Req 1)
func (ac *AdminController) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OrderID string             `json:"order_id"`
		Status  models.OrderStatus `json:"status"`
		Note    string             `json:"note"`
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
	
	if req.Status == models.OrderPaid && oldStatus == models.OrderPendingPayment {
		// Use OrderService.CompletePayment to trigger all ledger, merchant, and affiliate payouts!
		orderSvc := services.OrderService{
			DB:             ac.DB,
			FinanceService: services.NewFinanceService(ac.DB),
			Affiliate:      services.NewAffiliateService(ac.DB, ac.Notif),
			Notification:   ac.Notif,
			ConfigService:  services.NewConfigService(ac.DB),
		}
		
		tx := ac.DB.Begin()
		if err := orderSvc.CompletePayment(tx, order.ID); err != nil {
			tx.Rollback()
			utils.JSONError(w, http.StatusInternalServerError, "Failed to complete payment: "+err.Error())
			return
		}
		tx.Commit()
		
		// Reload order data to continue with updated status
		ac.DB.First(&order, "id = ?", order.ID)
	} else {
		order.Status = req.Status
		if req.Status == models.OrderCompleted {
			now := time.Now()
			order.CompletedAt = &now
		}

		if err := ac.DB.Save(&order).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Failed to update status")
			return
		}
	}

	// [FIX] Sinkronkan status ke semua Merchant Groups dengan mapping yang benar
	mStatus := string(req.Status)
	if req.Status == models.OrderPaid {
		mStatus = "confirmed"
	}

	if err := ac.DB.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", order.ID).Update("status", mStatus).Error; err != nil {
		fmt.Printf("[WARNING] Failed to sync status to merchant groups: %v\n", err)
	}

	// [Akuglow Sync] Jika pesanan dibatalkan atau direfund, batalkan komisi affiliate
	if req.Status == models.OrderCancelled || req.Status == "refunded" {
		affSvc := services.NewAffiliateService(ac.DB, ac.Notif)
		if err := affSvc.CancelCommission(order.ID); err != nil {
			fmt.Printf("[WARNING] Gagal membatalkan komisi affiliate: %v\n", err)
		}
	}

	// Audit Trail (Req 9) - Fix: Split host from port for inet type
	adminID := "00000000-0000-0000-0000-000000000001"
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if ip == "" {
		ip = r.RemoteAddr
	}
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

					// 3. Trigger Tier Upgrade Tracking (Run asynchronously to prevent deadlock)
					go func(affID string) {
						affSvc := services.NewAffiliateService(ac.DB, ac.Notif)
						_ = affSvc.TriggerTierUpgrade(affID)
					}(affiliate.ID)
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

	ac.Audit.Log(r.Context().Value("user_id").(string), "freeze_order", "order", req.OrderID, req.Reason, r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status":  "success",
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
		ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_commission", "category_commission",
			fmt.Sprintf("%d", comm.ID), fmt.Sprintf("cat=%s fee=%.4f", comm.CategoryName, comm.FeePercent),
			r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   comm,
		})
		return
	}
	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			utils.JSONError(w, http.StatusBadRequest, "ID is required")
			return
		}
		var comm models.CategoryCommission
		if err := ac.DB.First(&comm, id).Error; err != nil {
			utils.JSONError(w, http.StatusNotFound, "Commission not found")
			return
		}
		ac.DB.Delete(&comm)
		ac.Audit.Log(r.Context().Value("user_id").(string), "delete_commission", "category_commission", id, comm.CategoryName, r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success"})
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
		ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_merchant_commission", "merchant_commission",
			comm.MerchantID, fmt.Sprintf("fee=%.4f", comm.FeePercent), r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   comm,
		})
		return
	}
	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			utils.JSONError(w, http.StatusBadRequest, "ID is required")
			return
		}
		var comm models.MerchantCommission
		if err := ac.DB.First(&comm, id).Error; err != nil {
			utils.JSONError(w, http.StatusNotFound, "Commission not found")
			return
		}
		ac.DB.Delete(&comm)
		ac.Audit.Log(r.Context().Value("user_id").(string), "delete_merchant_commission", "merchant_commission", id, comm.MerchantID, r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success"})
	}
}

// POST /api/admin/commissions/product
func (ac *AdminController) ManageProductCommissions(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var req struct {
			ProductID           string  `json:"product_id"`
			BaseAffiliateFee    float64 `json:"base_affiliate_fee"`
			BaseDistFee         float64 `json:"base_distribution_fee"`
			AffiliateFeeNominal float64 `json:"base_affiliate_fee_nominal"`
			DistFeeNominal      float64 `json:"base_distribution_fee_nominal"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.ProductID == "" {
			utils.JSONError(w, http.StatusBadRequest, "Product ID is required")
			return
		}

		err := ac.DB.Model(&models.Product{}).Where("id = ?", req.ProductID).Updates(map[string]interface{}{
			"base_affiliate_fee":            req.BaseAffiliateFee,
			"base_distribution_fee":         req.BaseDistFee,
			"base_affiliate_fee_nominal":    req.AffiliateFeeNominal,
			"base_distribution_fee_nominal": req.DistFeeNominal,
		}).Error

		if err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Failed to update product commission")
			return
		}

		ac.Audit.Log(r.Context().Value("user_id").(string), "update_product_commission", "product", req.ProductID,
			fmt.Sprintf("Aff=%.2f%% Dist=%.2f%%", req.BaseAffiliateFee, req.BaseDistFee), r.RemoteAddr)

		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status":  "success",
			"message": "Product commission updated successfully",
		})
		return
	}
	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			utils.JSONError(w, http.StatusBadRequest, "Product ID is required")
			return
		}
		err := ac.DB.Model(&models.Product{}).Where("id = ?", id).Updates(map[string]interface{}{
			"base_affiliate_fee":            0,
			"base_distribution_fee":         0,
			"base_affiliate_fee_nominal":    0,
			"base_distribution_fee_nominal": 0,
		}).Error
		if err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Failed to reset product commission")
			return
		}
		ac.Audit.Log(r.Context().Value("user_id").(string), "reset_product_commission", "product", id, "Reset to 0", r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success"})
	}
}

// GET  /api/admin/commissions/presets
// POST /api/admin/commissions/presets
// DELETE /api/admin/commissions/presets
func (ac *AdminController) ManageCommissionPresets(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		presets := []models.CommissionPreset{}
		ac.DB.Order("name asc").Find(&presets)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   presets,
		})
		return
	}
	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var preset models.CommissionPreset
		json.NewDecoder(r.Body).Decode(&preset)
		ac.DB.Save(&preset)
		ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_commission_preset", "commission_preset",
			preset.ID, preset.Name, r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   preset,
		})
		return
	}
	if r.Method == http.MethodDelete {
		id := r.URL.Query().Get("id")
		if id == "" {
			utils.JSONError(w, http.StatusBadRequest, "ID is required")
			return
		}
		ac.DB.Delete(&models.CommissionPreset{}, id)
		ac.Audit.Log(r.Context().Value("user_id").(string), "delete_commission_preset", "commission_preset", id, "", r.RemoteAddr)
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success"})
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
	ac.Audit.Log(r.Context().Value("user_id").(string), "bulk_update_commissions", "category_commission", "", fmt.Sprintf("updated %d items", len(comms)), r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOUT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
// PAYOUT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/payouts
func (ac *AdminController) GetPayouts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	type PayoutRow struct {
		ID            string     `json:"id"`
		TargetID      string     `json:"target_id"` // merchant_id or affiliate_id
		Type          string     `json:"type"`      // 'merchant' or 'affiliate'
		Name          string     `json:"name"`      // store_name or full_name
		SubName       string     `json:"sub_name"`  // owner_name or email/ref_code
		Amount        float64    `json:"amount"`
		BankName      string     `json:"bank_name"`
		AccountNumber string     `json:"account_number"`
		AccountName   string     `json:"account_name"`
		Status        string     `json:"status"`
		Note          string     `json:"note"`
		RequestedAt   time.Time  `json:"requested_at"`
		ProcessedAt   *time.Time `json:"processed_at"`
		ProcessedBy   *string    `json:"processed_by"`
	}

	query := `
		SELECT * FROM (
			-- Merchant Payouts
			SELECT pr.id, pr.merchant_id as target_id, 'merchant' as type, 
			       m.store_name as name, up.full_name as sub_name,
			       pr.amount, pr.bank_name, pr.bank_account_number as account_number, pr.bank_account_name as account_name,
			       pr.status, pr.note, pr.requested_at, pr.processed_at, pr.processed_by
			FROM payout_requests pr
			LEFT JOIN merchants m ON m.id = pr.merchant_id
			LEFT JOIN user_profiles up ON up.user_id = m.user_id
			
			UNION ALL
			
			-- Affiliate Payouts
			SELECT aw.id, aw.affiliate_id as target_id, 'affiliate' as type,
			       up_aff.full_name as name, u.email as sub_name,
			       aw.amount, aw.bank_name, aw.bank_account_number as account_number, aw.bank_account_name as account_name,
			       aw.status, aw.note, aw.created_at as requested_at, aw.processed_at, NULL as processed_by
			FROM affiliate_withdrawals aw
			LEFT JOIN affiliate_members am ON am.id = aw.affiliate_id
			LEFT JOIN users u ON u.id = am.user_id
			LEFT JOIN user_profiles up_aff ON up_aff.user_id = u.id
		) AS unified_payouts
	`

	args := []interface{}{}
	if status != "" {
		if status == "approved" {
			query += " WHERE status IN ('approved', 'processed')"
		} else if status == "paid" {
			query += " WHERE status IN ('paid', 'completed')"
		} else {
			query += " WHERE status = ?"
			args = append(args, status)
		}
	}
	query += " ORDER BY requested_at DESC"

	var results []PayoutRow
	ac.DB.Raw(query, args...).Scan(&results)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(results),
		"data":   results,
	})
}

// PUT /api/admin/payouts/process
func (ac *AdminController) ProcessPayout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		PayoutID string `json:"payout_id"`
		Type     string `json:"type"` // merchant or affiliate
		Status   string `json:"status"`
		Note     string `json:"note"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	adminID, _ := r.Context().Value("user_id").(string)
	if adminID == "" {
		adminID = models.AdminID
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		financeSvc := services.NewFinanceService(tx)

		if req.Type == "affiliate" {
			var wd models.AffiliateWithdrawal
			if err := tx.First(&wd, "id = ?", req.PayoutID).Error; err != nil {
				return fmt.Errorf("affiliate withdrawal not found")
			}

			// [CRITICAL FIX] Get UserID from AffiliateMember
			var member models.AffiliateMember
			if err := tx.First(&member, "id = ?", wd.AffiliateID).Error; err != nil {
				return fmt.Errorf("affiliate member not found")
			}

			newStatus := req.Status
			if newStatus == "paid" {
				newStatus = "completed"
			} else if newStatus == "approved" {
				newStatus = "processed"
			}

			wd.Status = newStatus
			wd.Note = req.Note
			wd.ProcessedAt = &now
			if err := tx.Save(&wd).Error; err != nil {
				return err
			}

			if newStatus == "completed" {
				// Record audit/history transaction for user (already deducted in Request)
				desc := fmt.Sprintf("Penarikan Komisi Berhasil (Final): %s", req.Note)
				if err := financeSvc.ProcessTransaction(tx, member.UserID, models.WalletAffiliate, models.TxWithdrawalCompleted, 0, wd.ID, "affiliate_withdrawal", desc, nil); err != nil {
					return err
				}
				tx.Model(&models.AffiliateMember{}).Where("id = ?", wd.AffiliateID).
					Update("total_withdrawn", gorm.Expr("total_withdrawn + ?", wd.Amount))

				// [Financial Sync] Record Outflow from Platform (HQ) Wallet
				platformDesc := fmt.Sprintf("Pembayaran Payout Affiliate %s: %s", wd.AffiliateID, wd.ID)
				if err := financeSvc.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxPayoutOutflow, -wd.Amount, wd.ID, "payout_outflow", platformDesc, nil); err != nil {
					return err
				}
			} else if newStatus == "rejected" {
				// [CRITICAL FIX] Refund the money to user wallet
				desc := fmt.Sprintf("Penarikan Komisi Ditolak (Refund): %s", req.Note)
				if err := financeSvc.ProcessTransaction(tx, member.UserID, models.WalletAffiliate, models.TxWithdrawalRejected, wd.Amount, wd.ID, "affiliate_withdrawal", desc, nil); err != nil {
					return err
				}
			}
		} else {
			var payout models.PayoutRequest
			if err := tx.First(&payout, "id = ?", req.PayoutID).Error; err != nil {
				return fmt.Errorf("payout request not found")
			}

			// [CRITICAL FIX] Get UserID from Merchant
			var merchant models.Merchant
			if err := tx.First(&merchant, "id = ?", payout.MerchantID).Error; err != nil {
				return fmt.Errorf("merchant not found")
			}

			payout.Status = req.Status
			payout.Note = req.Note
			payout.ProcessedAt = &now
			payout.ProcessedBy = &adminID
			if err := tx.Save(&payout).Error; err != nil {
				return err
			}

			if req.Status == "paid" {
				desc := fmt.Sprintf("Penarikan Merchant Berhasil (Final): %s", req.Note)
				if err := financeSvc.ProcessTransaction(tx, merchant.UserID, models.WalletMerchant, models.TxWithdrawalCompleted, 0, payout.ID, "payout_request", desc, nil); err != nil {
					return err
				}

				// [Financial Sync] Record Outflow from Platform (HQ) Wallet
				platformDesc := fmt.Sprintf("Pembayaran Payout Merchant %s: %s", payout.MerchantID, payout.ID)
				if err := financeSvc.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxPayoutOutflow, -payout.Amount, payout.ID, "payout_outflow", platformDesc, nil); err != nil {
					return err
				}
			} else if req.Status == "rejected" {
				// [CRITICAL FIX] Refund the money to user wallet
				desc := fmt.Sprintf("Penarikan Merchant Ditolak (Refund): %s", req.Note)
				if err := financeSvc.ProcessTransaction(tx, merchant.UserID, models.WalletMerchant, models.TxWithdrawalRejected, payout.Amount, payout.ID, "payout_request", desc, nil); err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	ac.Audit.Log(adminID, "process_payout", "payout", req.PayoutID, fmt.Sprintf("type=%s, status=%s", req.Type, req.Status), r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetBrands(w http.ResponseWriter, r *http.Request) {
	var brands []models.Brand

	// Gunakan query yang paling aman: Scan ke map dulu baru pindah ke struct
	var results []map[string]interface{}
	ac.DB.Table("brands").
		Select("brands.*, (SELECT COUNT(*) FROM products WHERE LOWER(TRIM(products.brand)) = LOWER(TRIM(brands.name)) AND deleted_at IS NULL) as product_count").
		Order("name ASC").
		Scan(&results)

	// Konversi dari map ke struct secara manual agar field ProductCount terisi
	for _, res := range results {
		var b models.Brand
		b.ID = uint(res["id"].(int64))
		b.Name = res["name"].(string)
		if res["logo_url"] != nil {
			b.LogoURL = res["logo_url"].(string)
		}
		if res["is_featured"] != nil {
			b.IsFeatured = res["is_featured"].(bool)
		}
		if res["product_count"] != nil {
			b.ProductCount = res["product_count"].(int64)
		}
		brands = append(brands, b)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": brands})
}

func (ac *AdminController) UpsertBrand(w http.ResponseWriter, r *http.Request) {
	var brand models.Brand
	if err := json.NewDecoder(r.Body).Decode(&brand); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Monster Integrity: Cek apakah nama sudah ada (Case-Insensitive Auto-Merge)
	if brand.ID == 0 {
		var existing models.Brand
		if err := ac.DB.Where("LOWER(name) = LOWER(?)", brand.Name).First(&existing).Error; err == nil {
			brand.ID = existing.ID
		}
	}

	var err error
	if brand.ID == 0 {
		err = ac.DB.Create(&brand).Error
	} else {
		// Gunakan Select("*") atau Omit("product_count") untuk memastikan GORM tidak bingung
		err = ac.DB.Save(&brand).Error
	}

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan brand: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_brand", "brand", fmt.Sprintf("%d", brand.ID), brand.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, brand)
}

func (ac *AdminController) DeleteBrand(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Brand{}, id)
	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_brand", "brand", id, "", r.RemoteAddr)
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
	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_attribute", "attribute", fmt.Sprintf("%d", attr.ID), attr.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, attr)
}

func (ac *AdminController) DeleteAttribute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Attribute{}, id)
	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_attribute", "attribute", id, "", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING CLASSES (WooCommerce parity)
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetShippingClasses(w http.ResponseWriter, r *http.Request) {
	var classes []models.ShippingClass
	ac.DB.Order("name ASC").Find(&classes)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": classes})
}

func (ac *AdminController) UpsertShippingClass(w http.ResponseWriter, r *http.Request) {
	var sc models.ShippingClass
	if err := json.NewDecoder(r.Body).Decode(&sc); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	// Auto-generate slug if empty
	if sc.Slug == "" {
		sc.Slug = strings.ToLower(strings.ReplaceAll(sc.Name, " ", "-"))
	}
	if sc.ID == 0 {
		ac.DB.Create(&sc)
	} else {
		ac.DB.Save(&sc)
	}
	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_shipping_class", "shipping_class", fmt.Sprintf("%d", sc.ID), sc.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, sc)
}

func (ac *AdminController) DeleteShippingClass(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.ShippingClass{}, id)
	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_shipping_class", "shipping_class", id, "", r.RemoteAddr)
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
	ac.Audit.Log(r.Context().Value("user_id").(string), "toggle_logistic", "logistic", fmt.Sprintf("%d", req.ID), fmt.Sprintf("active=%v", req.Active), r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

func (ac *AdminController) SyncCouriers(w http.ResponseWriter, r *http.Request) {
	shippingService := services.NewShippingService(ac.DB)
	couriers, err := shippingService.FetchCouriers()
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal ambil data dari Biteship: "+err.Error())
		return
	}

	for _, c := range couriers {
		code := fmt.Sprintf("%v", c["courier_code"])
		name := fmt.Sprintf("%v", c["courier_name"])

		var channel models.LogisticChannel
		if err := ac.DB.Where("code = ?", code).First(&channel).Error; err != nil {
			// Create new - Default to Inactive
			ac.DB.Create(&models.LogisticChannel{
				Code:     code,
				Name:     name,
				IsActive: false,
			})
		} else {
			// Update name if changed
			ac.DB.Model(&channel).Update("name", name)
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success", "message": "Berhasil sinkronisasi kurir"})
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

			// [CRITICAL FIX] Get UserID from Merchant
			var merchant models.Merchant
			if err := tx.First(&merchant, "id = ?", dispute.MerchantID).Error; err != nil {
				return err
			}

			// Deduct from merchant pending/balance
			if err := finance.ProcessTransaction(tx, merchant.UserID, models.WalletMerchant, models.TxRefundDeduction, dispute.Amount, fmt.Sprintf("%d", dispute.ID), "dispute", desc, nil); err != nil {
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

			// [CRITICAL FIX] Get UserID from Merchant
			var merchant models.Merchant
			if err := tx.First(&merchant, "id = ?", dispute.MerchantID).Error; err != nil {
				return err
			}

			if err := finance.ReleaseEscrow(tx, merchant.UserID, models.WalletMerchant, dispute.Amount, fmt.Sprintf("%d", dispute.ID), desc); err != nil {
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
	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_voucher", "voucher", v.Code, v.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, v)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & AFFILIATE AUDIT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetAffiliateClicks(w http.ResponseWriter, r *http.Request) {
	var clicks []models.AffiliateClickLog
	ac.DB.Order("clicked_at DESC").Limit(1000).Find(&clicks)
	ac.Audit.Log(r.Context().Value("user_id").(string), "get_affiliate_clicks", "security", "", "viewed clicks", r.RemoteAddr)
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
	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_region", "region", fmt.Sprintf("%d", reg.ID), reg.Name, r.RemoteAddr)
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
		if cfg.Key == "" {
			continue
		}
		ac.DB.Where(models.PlatformConfig{Key: cfg.Key}).
			Assign(models.PlatformConfig{Value: cfg.Value, Description: cfg.Description}).
			FirstOrCreate(&models.PlatformConfig{Key: cfg.Key})
	}
	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_settings", "platform_config", "",
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

// POST /api/admin/configs/test-email
func (ac *AdminController) TestEmailSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req struct {
		To string `json:"to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.To == "" {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload. 'to' email is required.")
		return
	}

	configSvc := services.NewConfigService(ac.DB)
	host := configSvc.Get("notif_smtp_host", "")
	user := configSvc.Get("notif_smtp_user", "")
	pass := configSvc.Get("notif_smtp_pass", "")
	port := configSvc.Get("notif_smtp_port", "587")

	if host == "" || user == "" {
		utils.JSONError(w, http.StatusBadRequest, "Konfigurasi SMTP tidak lengkap di database. Pastikan Host dan Username telah disimpan.")
		return
	}

	auth := smtp.PlainAuth("", user, pass, host)
	msg := []byte("To: " + req.To + "\r\n" +
		"Subject: Test Koneksi SMTP AkuGlow\r\n" +
		"\r\n" +
		"Halo! Ini adalah email uji coba untuk memverifikasi bahwa konfigurasi SMTP Anda di AkuGlow sudah berjalan dengan sukses.\r\n")

	addr := host + ":" + port
	err := smtp.SendMail(addr, auth, user, []string{req.To}, msg)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, fmt.Sprintf("Gagal mengirim email: %v", err))
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "Email uji coba sukses dikirim ke " + req.To,
	})
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

	// [Feature] Pagination
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

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

	var total int64
	query.Count(&total)

	var logs []models.AuditLog
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":      "success",
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": (total + int64(limit) - 1) / int64(limit),
		"data":        logs,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC STOREFRONT APIs (AkuGlow Sync)
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetPublicProducts(w http.ResponseWriter, r *http.Request) {
	var products []models.Product
	query := ac.DB.Model(&models.Product{}).
		Where("status = 'active'")

	if idsStr := r.URL.Query().Get("ids"); idsStr != "" {
		var ids []string
		if err := json.Unmarshal([]byte(idsStr), &ids); err == nil && len(ids) > 0 {
			query = query.Where("id IN ?", ids)
		}
	}

	if cat := r.URL.Query().Get("cat"); cat != "" {
		query = query.Where("category = ?", cat)
	}

	sort := r.URL.Query().Get("sort")
	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)

	// [Akuglow Refactor] Tampilkan total stok dari seluruh gudang
	// Jika sort popular, kita perlu hitung sold count
	if sort == "popular" {
		// Sort by sold count from order_items
		query = query.Select("products.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE product_id = products.id) as sold_count_hidden").
			Order("sold_count_hidden DESC")
	} else {
		query = query.Order("menu_order ASC, created_at DESC")
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	query.Preload("Inventories").Find(&products)

	// Tambahkan informasi stok agregat untuk ditampilkan di card
	type ProductWithStock struct {
		models.Product
		MaxPrice   float64 `json:"max_price"`
		TotalStock int     `json:"total_stock"`
		Sold       int     `json:"sold"`
	}

	result := make([]ProductWithStock, len(products))
	for i, p := range products {
		total := 0
		for _, inv := range p.Inventories {
			total += inv.Stock
		}

		// Hitung sold count untuk ditampilkan
		var sold int
		ac.DB.Table("order_items").Where("product_id = ?", p.ID).Select("COALESCE(SUM(quantity), 0)").Scan(&sold)

		// [Akuglow] Fix variable product price limits (ignore 0)
		var maxPrice float64 = 0
		if p.ProductType == "variable" {
			var minPrice float64
			ac.DB.Table("product_variants").
				Where("product_id = ? AND status = 'active' AND price > 0", p.ID).
				Select("COALESCE(MIN(price), 0)").Scan(&minPrice)

			ac.DB.Table("product_variants").
				Where("product_id = ? AND status = 'active'", p.ID).
				Select("COALESCE(MAX(price), 0)").Scan(&maxPrice)

			if minPrice > 0 {
				p.Price = minPrice
			}
		}

		result[i] = ProductWithStock{
			Product:    p,
			MaxPrice:   maxPrice,
			TotalStock: total,
			Sold:       sold,
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

	if len(cats) == 0 {
		cats = []models.Category{}
	}
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

// CheckVoucher validates a voucher code with full type-based logic
func (ac *AdminController) CheckVoucher(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	subtotalStr := r.URL.Query().Get("subtotal")
	buyerID := r.URL.Query().Get("buyer_id")
	productIDsStr := r.URL.Query().Get("product_ids")
	categoriesStr := r.URL.Query().Get("categories")

	if code == "" {
		utils.JSONError(w, http.StatusBadRequest, "Kode voucher wajib diisi")
		return
	}

	// Try to get buyer_id from JWT token (more secure than query param)
	if authHeader := r.Header.Get("Authorization"); authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := utils.ParseJWT(tokenStr); err == nil {
			buyerID = claims.UserID
		}
	}

	var subtotal float64
	fmt.Sscanf(subtotalStr, "%f", &subtotal)

	// Parse product_ids and categories from query
	var productIDs, categories []string
	if productIDsStr != "" {
		for _, id := range strings.Split(productIDsStr, ",") {
			if id = strings.TrimSpace(id); id != "" {
				productIDs = append(productIDs, id)
			}
		}
	}
	if categoriesStr != "" {
		for _, c := range strings.Split(categoriesStr, ",") {
			if c = strings.TrimSpace(c); c != "" {
				categories = append(categories, c)
			}
		}
	}

	voucherSvc := services.NewVoucherService(ac.DB)
	result, err := voucherSvc.Validate(services.VoucherValidateRequest{
		Code:       code,
		BuyerID:    buyerID,
		Subtotal:   subtotal,
		ProductIDs: productIDs,
		Categories: categories,
	})
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":          "success",
		"data":            result.Voucher,
		"discount_amount": result.DiscountAmount,
		"message":         result.Message,
	})
}

func (ac *AdminController) GetPublicConfig(w http.ResponseWriter, r *http.Request) {
	var cfgs []models.PlatformConfig
	ac.DB.Find(&cfgs)
	res := make(map[string]string)
	sensitiveKeys := map[string]bool{
		"payment_midtrans_key": true,
		"notif_smtp_pass":      true,
		"payment_xendit_key":   true,
	}
	for _, c := range cfgs {
		if !sensitiveKeys[c.Key] && !strings.Contains(strings.ToLower(c.Key), "secret") && !strings.Contains(strings.ToLower(c.Key), "key") && !strings.Contains(strings.ToLower(c.Key), "pass") {
			res[c.Key] = c.Value
		}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": res})
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/analytics/overview
func (ac *AdminController) GetOverview(w http.ResponseWriter, r *http.Request) {
	var totalUsers, totalMerchants, totalAffiliates int64
	var totalOrders, pendingPayouts int64

	ac.DB.Model(&models.User{}).Count(&totalUsers)
	ac.DB.Model(&models.Merchant{}).Where("status = 'active'").Count(&totalMerchants)
	ac.DB.Model(&models.User{}).Where("role = 'affiliate'").Count(&totalAffiliates)

	var dsCfg models.PlatformConfig
	var dsList []map[string]interface{}
	if err := ac.DB.Where("key = ?", "finance_data_saving_list").First(&dsCfg).Error; err == nil {
		json.Unmarshal([]byte(dsCfg.Value), &dsList)
	}

	response := map[string]interface{}{
		"total_users":      totalUsers,
		"total_merchants":  totalMerchants,
		"total_affiliates": totalAffiliates,
	}

	if ac.hasTable("orders") {
		ac.DB.Model(&models.Order{}).Where("status != ?", models.OrderCancelled).Count(&totalOrders)
		response["total_orders"] = totalOrders

		activeStats := []string{
			string(models.OrderCompleted), string(models.OrderDelivered), 
			string(models.OrderShipped), string(models.OrderReadyToShip), 
			string(models.OrderPaid), string(models.OrderProcessing),
		}

		// 1. WHY (Financial Ledger & Allocations)
		var totalRevenue, totalFee, totalDiscount, totalCommission float64
		ac.DB.Model(&models.Order{}).Where("status IN ?", activeStats).
			Select("COALESCE(SUM(grand_total), 0), COALESCE(SUM(total_platform_fee), 0), COALESCE(SUM(total_discount), 0), COALESCE(SUM(total_commission), 0)").
			Row().Scan(&totalRevenue, &totalFee, &totalDiscount, &totalCommission)

		var manualIncome float64
		ac.DB.Table("money_mutations").
			Select("COALESCE(SUM(amount), 0)").
			Where("type = 'income' AND (description LIKE 'Auto-Sync:%' OR description = '' OR description IS NULL) = false").
			Scan(&manualIncome)
		totalRevenue = totalRevenue + manualIncome

		var capitalCost float64
		ac.DB.Table("order_items").
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("orders.status NOT IN ?", []string{string(models.OrderCancelled), string(models.OrderRefunded)}).
			Select("COALESCE(SUM(order_items.cogs), 0)").Scan(&capitalCost)

		var totalMerchantPayout float64
		ac.DB.Table("order_merchant_groups").
			Joins("JOIN orders ON orders.id = order_merchant_groups.order_id").
			Where("orders.status IN ?", activeStats).
			Select("COALESCE(SUM(merchant_payout), 0)").Scan(&totalMerchantPayout)

		grossProfit := totalRevenue - capitalCost
		totalSaving := 0.0
		for _, it := range dsList {
			if pct, ok := it["percent"].(float64); ok {
				totalSaving += grossProfit * pct / 100.0
			}
		}
		netProfit := grossProfit - totalSaving

		// Calculate AOV (Average Order Value)
		aov := 0.0
		var activeCount int64
		ac.DB.Model(&models.Order{}).Where("status IN ?", activeStats).Count(&activeCount)
		if activeCount > 0 {
			aov = totalRevenue / float64(activeCount)
		}

		// Backward compatibility root keys
		response["total_revenue"] = totalRevenue
		response["net_profit"] = netProfit
		response["total_fee"] = totalFee

		response["finance"] = map[string]interface{}{
			"total_revenue":   totalRevenue,
			"cogs":            capitalCost,
			"net_profit":      netProfit,
			"merchant_payout": totalMerchantPayout,
			"affiliates":      totalCommission,
			"savings":         totalSaving,
			"platform_fee":    totalFee,
			"discounts":       totalDiscount,
			"aov":             aov,
			"active_orders":   activeCount,
		}

		// 2. HOW (Payments & Logistics & Funnel)
		type PaymentStat struct {
			Method string  `json:"method"`
			Count  int64   `json:"count"`
			Amount float64 `json:"amount"`
		}
		var payments []PaymentStat
		ac.DB.Model(&models.Order{}).Where("status IN ?", activeStats).
			Select("payment_method as method, COUNT(id) as count, COALESCE(SUM(grand_total), 0) as amount").
			Group("payment_method").Scan(&payments)

		type LogisticStat struct {
			Courier string `json:"courier"`
			Count   int64  `json:"count"`
		}
		var logistics []LogisticStat
		ac.DB.Table("order_merchant_groups").
			Joins("JOIN orders ON orders.id = order_merchant_groups.order_id").
			Where("orders.status IN ?", activeStats).
			Select("COALESCE(NULLIF(order_merchant_groups.courier_code, ''), 'others') as courier, COUNT(order_merchant_groups.id) as count").
			Group("COALESCE(NULLIF(order_merchant_groups.courier_code, ''), 'others')").Scan(&logistics)

		type FunnelStat struct {
			Status string `json:"status"`
			Count  int64  `json:"count"`
		}
		var funnel []FunnelStat
		ac.DB.Model(&models.Order{}).
			Select("status, COUNT(id) as count").
			Group("status").Scan(&funnel)

		response["how"] = map[string]interface{}{
			"payments":  payments,
			"logistics": logistics,
			"funnel":    funnel,
		}

		// 3. WHO (Top Actors)
		type CustomerStat struct {
			ID         string  `json:"id"`
			Name       string  `json:"name"`
			TotalSpent float64 `json:"total_spent"`
			OrderCount int64   `json:"order_count"`
		}
		var topCustomers []CustomerStat
		ac.DB.Table("orders").
			Joins("JOIN user_profiles ON user_profiles.user_id = orders.buyer_id").
			Where("orders.status NOT IN ?", []string{string(models.OrderCancelled), string(models.OrderRefunded)}).
			Select("orders.buyer_id as id, user_profiles.full_name as name, COALESCE(SUM(orders.grand_total), 0) as total_spent, COUNT(orders.id) as order_count").
			Group("orders.buyer_id, user_profiles.full_name").
			Order("total_spent DESC").Limit(5).Scan(&topCustomers)

		type AffiliateStat struct {
			ID        string  `json:"id"`
			Name      string  `json:"name"`
			Earned    float64 `json:"earned"`
			Downlines int64   `json:"downlines"`
		}
		var topAffiliates []AffiliateStat
		ac.DB.Table("affiliate_members").
			Joins("JOIN user_profiles ON user_profiles.user_id = affiliate_members.user_id").
			Select("affiliate_members.id as id, user_profiles.full_name as name, affiliate_members.total_earned as earned, (SELECT COUNT(id) FROM affiliate_members d WHERE d.upline_id = affiliate_members.id) as downlines").
			Order("affiliate_members.total_earned DESC").Limit(5).Scan(&topAffiliates)

		type MerchantStat struct {
			ID      string  `json:"id"`
			Name    string  `json:"name"`
			Revenue float64 `json:"revenue"`
			Orders  int64   `json:"orders"`
		}
		var topMerchants []MerchantStat
		ac.DB.Table("order_merchant_groups").
			Joins("JOIN merchants ON merchants.id = order_merchant_groups.merchant_id").
			Joins("JOIN orders ON orders.id = order_merchant_groups.order_id").
			Where("orders.status NOT IN ?", []string{string(models.OrderCancelled), string(models.OrderRefunded)}).
			Select("merchants.id as id, merchants.store_name as name, COALESCE(SUM(order_merchant_groups.subtotal), 0) as revenue, COUNT(order_merchant_groups.id) as orders").
			Group("merchants.id, merchants.store_name").
			Order("revenue DESC").Limit(5).Scan(&topMerchants)

		response["who"] = map[string]interface{}{
			"customers":  topCustomers,
			"affiliates": topAffiliates,
			"merchants":  topMerchants,
		}

		// 4. WHAT (Products & Inventory)
		type ProductStat struct {
			ID       string  `json:"id"`
			Name     string  `json:"name"`
			Qty      int64   `json:"qty"`
			Revenue  float64 `json:"revenue"`
		}
		var topProducts []ProductStat
		ac.DB.Table("order_items").
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("orders.status NOT IN ?", []string{string(models.OrderCancelled), string(models.OrderRefunded)}).
			Select("order_items.product_id as id, MAX(order_items.product_name) as name, COALESCE(SUM(order_items.quantity), 0) as qty, COALESCE(SUM(order_items.subtotal), 0) as revenue").
			Group("order_items.product_id").
			Order("qty DESC").Limit(5).Scan(&topProducts)

		var outOfStock, lowStock, healthyStock int64
		ac.DB.Table("inventories").
			Select("COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock, COUNT(CASE WHEN stock BETWEEN 1 AND 4 THEN 1 END) as low_stock, COUNT(CASE WHEN stock > 4 THEN 1 END) as healthy_stock").
			Row().Scan(&outOfStock, &lowStock, &healthyStock)

		response["what"] = map[string]interface{}{
			"products": topProducts,
			"inventory": map[string]int64{
				"out_of_stock": outOfStock,
				"low_stock":    lowStock,
				"healthy":      healthyStock,
			},
		}

		// 5. WHERE & WHEN (Geographics & Peak Hours)
		type CityStat struct {
			City  string `json:"city"`
			Count int64  `json:"count"`
		}
		var topCities []CityStat
		ac.DB.Model(&models.Order{}).
			Where("status IN ? AND shipping_city != '' AND shipping_city IS NOT NULL", activeStats).
			Select("shipping_city as city, COUNT(id) as count").
			Group("shipping_city").Order("count DESC").Limit(5).Scan(&topCities)

		type HourStat struct {
			Hour  int   `json:"hour"`
			Count int64 `json:"count"`
		}
		var peakHours []HourStat
		ac.DB.Model(&models.Order{}).
			Where("status IN ?", activeStats).
			Select("CAST(EXTRACT(HOUR FROM created_at) AS INTEGER) as hour, COUNT(id) as count").
			Group("EXTRACT(HOUR FROM created_at)").Order("count DESC").Scan(&peakHours)

		response["where_when"] = map[string]interface{}{
			"cities":     topCities,
			"peak_hours": peakHours,
		}
	}

	if ac.hasTable("payout_requests") {
		ac.DB.Table("payout_requests").Where("status = 'pending'").Count(&pendingPayouts)
		response["pending_payouts"] = pendingPayouts
	}

	var recentActivity []map[string]interface{}
	if ac.hasTable("audit_logs") {
		type Log struct {
			TargetType string
			Detail     string
			CreatedAt  time.Time
		}
		var logs []Log
		ac.DB.Table("audit_logs").Select("target_type", "detail", "created_at").Order("created_at DESC").Limit(10).Scan(&logs)
		for _, l := range logs {
			status := "SUCCESS"
			logType := "system"
			if l.TargetType == "order" { logType = "order"; status = "UPDATED" } else if l.TargetType == "user" || l.TargetType == "merchant" { logType = "user" }
			recentActivity = append(recentActivity, map[string]interface{}{
				"title":  l.Detail,
				"type":   logType,
				"time":   l.CreatedAt.Format(time.RFC3339),
				"status": status,
			})
		}
	}
	response["recent_activity"] = recentActivity

	utils.JSONResponse(w, http.StatusOK, response)
}


func (ac *AdminController) ExportReport(w http.ResponseWriter, r *http.Request) {
	var totalUsers, totalMerchants, totalAffiliates int64
	var totalRevenue, totalFee float64
	var totalOrders, pendingPayouts int64

	ac.DB.Model(&models.User{}).Count(&totalUsers)
	ac.DB.Model(&models.Merchant{}).Where("status = 'active'").Count(&totalMerchants)
	ac.DB.Model(&models.User{}).Where("role = 'affiliate'").Count(&totalAffiliates)

	if ac.hasTable("orders") {
		activeStats := []string{
			string(models.OrderCompleted), string(models.OrderDelivered), 
			string(models.OrderShipped), string(models.OrderReadyToShip), 
			string(models.OrderPaid), string(models.OrderProcessing),
		}
		ac.DB.Model(&models.Order{}).Where("status != ?", models.OrderCancelled).Count(&totalOrders)
		ac.DB.Model(&models.Order{}).
			Where("status IN ?", activeStats).
			Select("COALESCE(SUM(grand_total), 0)").Scan(&totalRevenue)
	}

	if ac.hasTable("wallet_transactions") {
		ac.DB.Table("wallet_transactions").
			Where("type = ? AND amount > 0", string(models.TxPlatformFee)).
			Select("COALESCE(SUM(amount), 0)").Scan(&totalFee)
	}

	if ac.hasTable("payout_requests") {
		ac.DB.Table("payout_requests").
			Where("status = 'pending'").Count(&pendingPayouts)
	}

	// Fetch Monthly Stats for current year
	yearStr := time.Now().Format("2006")
	type MonthRow struct {
		Month   string  `json:"month"`
		Revenue float64 `json:"revenue"`
		Profit  float64 `json:"profit"`
		Fee     float64 `json:"fee"`
		Orders  int     `json:"orders"`
	}
	var monthlyRows []MonthRow
	if ac.hasTable("order_merchant_groups") {
		ac.DB.Raw(`
			WITH monthly_stats AS (
				SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
				       SUM(grand_total) AS revenue,
				       0 AS fee,
				       SUM(grand_total) AS gross_take,
				       COUNT(DISTINCT id) AS orders,
				       0 AS total_cogs
				FROM orders
				WHERE TO_CHAR(created_at, 'YYYY') = ?
				  AND status IN ('completed', 'delivered', 'shipped', 'ready_to_ship', 'paid', 'processing')
				GROUP BY month
			)
			SELECT month, revenue, COALESCE(gross_take, 0) - COALESCE(total_cogs, 0) AS profit, fee, orders
			FROM monthly_stats
			ORDER BY month ASC
		`, yearStr).Scan(&monthlyRows)
	}

	// Fetch Pending Payouts
	var payouts []models.PayoutRequest
	if ac.hasTable("payout_requests") {
		ac.DB.Where("status = 'pending'").Limit(50).Find(&payouts)
	}

	// Fetch Recent Orders
	type OrderInfo struct {
		ID         string
		GrandTotal float64
		Status     string
		CreatedAt  time.Time
	}
	var recentOrders []OrderInfo
	if ac.hasTable("orders") {
		ac.DB.Table("orders").Select("id", "grand_total", "status", "created_at").Order("created_at DESC").Limit(50).Scan(&recentOrders)
	}

	// Write CSV response
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=akuglow_report_%s.csv", time.Now().Format("20060102_150405")))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Title / Metadata
	writer.Write([]string{"AKUGLOW - PLATFORM FINANCIAL & DASHBOARD REPORT"})
	writer.Write([]string{"Exported At", time.Now().Format(time.RFC1123)})
	writer.Write([]string{"Target Year", yearStr})
	writer.Write([]string{""})

	// Section 1: Dashboard Overview Summary
	writer.Write([]string{"SECTION 1: DASHBOARD OVERVIEW SUMMARY"})
	writer.Write([]string{"Metric", "Value"})
	writer.Write([]string{"Platform Revenue (GMV)", fmt.Sprintf("Rp %.2f", totalRevenue)})
	writer.Write([]string{"Total Platform Fees", fmt.Sprintf("Rp %.2f", totalFee)})
	writer.Write([]string{"Active Affiliates", fmt.Sprintf("%d", totalAffiliates)})
	writer.Write([]string{"Total Merchants", fmt.Sprintf("%d", totalMerchants)})
	writer.Write([]string{"Total Orders", fmt.Sprintf("%d", totalOrders)})
	writer.Write([]string{"Pending Payout Requests", fmt.Sprintf("%d", pendingPayouts)})
	writer.Write([]string{""})

	// Section 2: Monthly Revenue Performance
	writer.Write([]string{"SECTION 2: MONTHLY REVENUE PERFORMANCE (" + yearStr + ")"})
	writer.Write([]string{"Month", "Revenue (GMV)", "Est. Profit", "Orders Count"})
	for _, row := range monthlyRows {
		writer.Write([]string{row.Month, fmt.Sprintf("Rp %.2f", row.Revenue), fmt.Sprintf("Rp %.2f", row.Profit), fmt.Sprintf("%d", row.Orders)})
	}
	writer.Write([]string{""})

	// Section 3: Pending Payout Requests Details
	writer.Write([]string{"SECTION 3: PENDING PAYOUT REQUESTS"})
	writer.Write([]string{"Payout ID", "Merchant ID", "Amount", "Bank Name", "Account Number", "Account Name", "Requested At"})
	for _, p := range payouts {
		writer.Write([]string{
			p.ID,
			p.MerchantID,
			fmt.Sprintf("Rp %.2f", p.Amount),
			p.BankName,
			p.BankAccountNumber,
			p.BankAccountName,
			p.RequestedAt.Format("2006-01-02 15:04:05"),
		})
	}
	if len(payouts) == 0 {
		writer.Write([]string{"No pending payout requests."})
	}
	writer.Write([]string{""})

	// Section 4: Recent 50 Orders
	writer.Write([]string{"SECTION 4: RECENT 50 ORDERS"})
	writer.Write([]string{"Order ID", "Grand Total", "Status", "Created At"})
	for _, o := range recentOrders {
		writer.Write([]string{
			o.ID,
			fmt.Sprintf("Rp %.2f", o.GrandTotal),
			o.Status,
			o.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}
	if len(recentOrders) == 0 {
		writer.Write([]string{"No orders found."})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG CMS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

func (ac *AdminController) GetBlogs(w http.ResponseWriter, r *http.Request) {
	var blogs []models.BlogPost
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	category := r.URL.Query().Get("category")
	
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 10)
	offset := (page - 1) * limit

	query := ac.DB.Model(&models.BlogPost{})
	
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		likeSearch := "%" + search + "%"
		query = query.Where("title ILIKE ? OR summary ILIKE ? OR content ILIKE ?", likeSearch, likeSearch, likeSearch)
	}

	var total int64
	query.Count(&total)

	sortField := r.URL.Query().Get("sort")
	order := r.URL.Query().Get("order")
	if sortField != "" {
		if order == "" {
			order = "asc"
		}
		// Basic sanitization
		sortField = strings.ReplaceAll(sortField, ";", "")
		order = strings.ReplaceAll(order, ";", "")
		query = query.Order(sortField + " " + order)
	} else {
		query = query.Order("created_at DESC")
	}

	query.Limit(limit).Offset(offset).Find(&blogs)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data":  blogs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (ac *AdminController) GetPublicBlogDetail(w http.ResponseWriter, r *http.Request) {
	identifier := r.URL.Query().Get("slug")
	if identifier == "" {
		identifier = r.URL.Query().Get("id")
	}

	if identifier == "" {
		utils.JSONError(w, http.StatusBadRequest, "Slug or ID is required")
		return
	}

	var blog models.BlogPost
	// Query both slug and ID (cast to text) for maximum compatibility
	if err := ac.DB.Where("(slug = ? OR CAST(id AS TEXT) = ?) AND status = 'published'", identifier, identifier).First(&blog).Error; err != nil {
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
	// Check slug collision
	var existing models.BlogPost
	if err := ac.DB.Where("slug = ? AND id != ?", post.Slug, post.ID).First(&existing).Error; err == nil {
		// Collision found, append random suffix or timestamp
		post.Slug = fmt.Sprintf("%s-%d", post.Slug, time.Now().Unix()%1000)
	}

	if err := ac.DB.Save(&post).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan artikel: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_blog", "blog", fmt.Sprintf("%d", post.ID), post.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, post)
}

func (ac *AdminController) DeleteBlog(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.BlogPost{}, id)
	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_blog", "blog", id, "deleted", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

func (ac *AdminController) BulkDeleteBlogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada artikel yang dipilih")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range req.IDs {
			if err := tx.Delete(&models.BlogPost{}, id).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus beberapa artikel: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "bulk_delete_blogs", "blog", fmt.Sprintf("%d items", len(req.IDs)), "bulk purged", r.RemoteAddr)
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
	ac.Audit.Log(r.Context().Value("user_id").(string), "upsert_banner", "banner", fmt.Sprintf("%d", b.ID), b.Title, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, b)
}

func (ac *AdminController) DeleteBanner(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	ac.DB.Delete(&models.Banner{}, id)
	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_banner", "banner", id, "deleted", r.RemoteAddr)
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
	var err error
	if _, uuidErr := uuid.Parse(id); uuidErr == nil {
		err = ac.DB.Preload("Variants").Preload("Inventories").
			Where("id = ? OR slug = ?", id, id).First(&product).Error
	} else {
		err = ac.DB.Preload("Variants").Preload("Inventories").
			Where("slug = ?", id).First(&product).Error
	}

	if err == nil {
		// Calculate real sold count
		var totalSold int64
		ac.DB.Table("order_items").
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("order_items.product_id = ? AND orders.status = ?", product.ID, models.OrderCompleted).
			Select("COALESCE(SUM(order_items.quantity), 0)").
			Scan(&totalSold)

		// If real sold is 0, maybe we want a base offset to look better, but the user asked for sync.
		// Let's provide the real count. If the user wants a fake offset, they can add it later.
		product.SoldCount = totalSold

		// [Akuglow] Fix variable product price limits (ignore 0)
		if product.ProductType == "variable" {
			var minPrice float64
			var maxPrice float64
			ac.DB.Table("product_variants").
				Where("product_id = ? AND status = 'active' AND price > 0", product.ID).
				Select("COALESCE(MIN(price), 0)").Scan(&minPrice)

			ac.DB.Table("product_variants").
				Where("product_id = ? AND status = 'active'", product.ID).
				Select("COALESCE(MAX(price), 0)").Scan(&maxPrice)

			if minPrice > 0 {
				product.Price = minPrice
			}
			product.MaxPrice = maxPrice
		}
	}

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
		Select("inv.merchant_id, m.store_name, m.city, SUM(inv.stock) as stock").
		Joins("JOIN merchants m ON m.id = inv.merchant_id").
		Where("inv.product_id = ? AND m.status = 'active'", product.ID).
		Group("inv.merchant_id, m.store_name, m.city").
		Having("SUM(inv.stock) > 0").
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
		ID string `json:"id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.ID == "" {
		ac.Notif.MarkAllAsRead("", "admin")
	} else {
		ac.Notif.MarkAsRead(req.ID)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/notifications/read-all
func (ac *AdminController) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	if err := ac.Notif.MarkAllAsRead("", "admin"); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menandai semua notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/notifications
func (ac *AdminController) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID notifikasi diperlukan")
		return
	}
	if err := ac.Notif.Delete(id); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/notifications/all
func (ac *AdminController) DeleteAllNotifications(w http.ResponseWriter, r *http.Request) {
	if err := ac.Notif.DeleteAll("", "admin"); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus semua notifikasi")
		return
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
			Price            float64 `json:"price"`
		} `json:"items"`
		PaymentMethod string  `json:"payment_method"`
		AmountPaid    float64 `json:"amount_paid"`
		MemberID      *string `json:"member_id"`
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

			// Update Stock (Variant-Aware, locked for concurrent safety)
			var inv models.Inventory
			dbInv := tx.Where("merchant_id = ? AND product_id = ?", models.PusatID, product.ID)
			if variant.ID != "" {
				dbInv = dbInv.Where("product_variant_id = ?", variant.ID)
			} else {
				dbInv = dbInv.Where("product_variant_id IS NULL OR product_variant_id = ''")
			}

			if err := dbInv.Set("gorm:query_option", "FOR UPDATE").First(&inv).Error; err != nil {
				msg := product.Name
				if variant.ID != "" {
					msg += " (" + variant.Name + ")"
				}
				return fmt.Errorf("stok pusat tidak ditemukan untuk %s", msg)
			}

			if inv.Stock < item.Quantity {
				msg := product.Name
				if variant.ID != "" {
					msg += " (" + variant.Name + ")"
				}
				return fmt.Errorf("stok pusat tidak mencukupi untuk %s (Tersedia: %d)", msg, inv.Stock)
			}

			// Deduct inventory stock
			if err := dbInv.Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
				return err
			}

			// Sync master catalog stock
			if variant.ID != "" {
				if err := tx.Model(&models.ProductVariant{}).Where("id = ?", variant.ID).
					Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
					return err
				}
				// Sync parent product stock if not variable
				if product.ProductType != "variable" {
					if err := tx.Model(&models.Product{}).Where("id = ?", product.ID).
						Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
						return err
					}
				}
			} else {
				if err := tx.Model(&models.Product{}).Where("id = ?", product.ID).
					Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
					return err
				}
			}
		}

		grandTotal := subtotal - req.Discount

		order = models.Order{
			OrderNumber:   orderNumber,
			BuyerID:       req.MemberID,
			CashierID:     &adminID,
			OrderType:     "pos",
			Subtotal:      subtotal,
			TotalDiscount: req.Discount,
			GrandTotal:    grandTotal,
			Status:        models.OrderCompleted,
			PaidAt:        &[]time.Time{time.Now()}[0],
			Notes:         req.Notes,
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
			if feeRate == 0 {
				feeRate = 0.01
			}

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
					"balance":     gorm.Expr("balance + ?", mg.MerchantPayout),
					"total_sales": gorm.Expr("total_sales + ?", mg.Subtotal),
				})
		}

		for _, oi := range orderItems {
			if err := tx.Create(&oi).Error; err != nil {
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
	fmt.Println("🔍 [WISH-SYNC] Mengambil data wishlist terbaru...")
	type Result struct {
		ProductID   string  `json:"product_id"`
		ProductName string  `json:"product_name"`
		ProductSlug string  `json:"product_slug"`
		Image       string  `json:"image"`
		MerchantID  string  `json:"merchant_id"`
		StoreName   string  `json:"store_name"`
		Count       int64   `json:"count"`
		Price       float64 `json:"price"`
		UserNames   string  `json:"user_names"` // Daftar nama user
	}

	var results []Result
	err := ac.DB.Table("wishlists").
		Select("products.id as product_id, products.name as product_name, products.slug as product_slug, products.image, products.price, inventories.merchant_id as merchant_id, merchants.store_name, count(wishlists.id) as count, string_agg(user_profiles.full_name, ', ') as user_names").
		Joins("join products on products.id = wishlists.product_id").
		Joins("join user_profiles on user_profiles.user_id = wishlists.buyer_id").
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
		RequestID      string `json:"request_id"`
		Status         string `json:"status"`
		AdminNote      string `json:"admin_note"`
		TrackingNumber string `json:"tracking_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	err := ac.Service.ModerateRestockRequest(adminID, req.RequestID, req.Status, req.AdminNote, req.TrackingNumber)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal moderasi: "+err.Error())
		return
	}

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

func (ac *AdminController) BulkDeleteEducation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada materi yang dipilih")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range req.IDs {
			if err := tx.Delete(&models.AffiliateEducation{}, "id = ?", id).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus beberapa materi: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "bulk_delete_education", "education", fmt.Sprintf("%d items", len(req.IDs)), "bulk purged", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/events
func (ac *AdminController) GetEvents(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := ac.DB.Model(&models.AffiliateEvent{})

	// Filter by search
	search := r.URL.Query().Get("search")
	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(location) LIKE ? OR LOWER(description) LIKE ?", s, s, s)
	}

	// Filter by type
	evType := r.URL.Query().Get("type")
	if evType != "" && evType != "all" {
		query = query.Where("type = ?", evType)
	}

	// Filter by status
	status := r.URL.Query().Get("status")
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var events []models.AffiliateEvent
	query.Order("start_time DESC").Limit(limit).Offset(offset).Find(&events)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   events,
		"total":  total,
		"page":   page,
		"limit":  limit,
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

func (ac *AdminController) BulkDeletePromoMaterials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada materi promo yang dipilih")
		return
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range req.IDs {
			if err := tx.Delete(&models.PromoMaterial{}, "id = ?", id).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus beberapa materi promo: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "bulk_delete_promo_materials", "promo", fmt.Sprintf("%d items", len(req.IDs)), "bulk purged", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/users/create
func (ac *AdminController) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
		Phone    string `json:"phone"`
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
	if req.Phone != "" {
		user.Phone = &req.Phone
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

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/reviews
func (ac *AdminController) GetAllReviews(w http.ResponseWriter, r *http.Request) {
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 20)
	offset := (page - 1) * limit

	var total int64
	ac.DB.Model(&models.Review{}).Count(&total)

	// Format to include Product data efficiently using Join
	type ReviewResponse struct {
		models.Review
		ProductName string `json:"product_name"`
	}

	res := []ReviewResponse{}
	ac.DB.Table("reviews").
		Select("reviews.*, products.name as product_name").
		Joins("LEFT JOIN products ON products.id = reviews.product_id").
		Order("reviews.created_at DESC").
		Offset(offset).
		Limit(limit).
		Scan(&res)

	// Preload manually for Buyer because Scan doesn't support Preload automatically for joined records
	// but since we want Buyer.Profile, we need to load them
	for i := range res {
		ac.DB.Preload("Profile").First(&res[i].Buyer, "id = ?", res[i].BuyerID)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"data":        res,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": (total + int64(limit) - 1) / int64(limit),
	})
}

// DELETE /api/admin/reviews/delete?id=...
func (ac *AdminController) DeleteReview(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID diperlukan")
		return
	}

	var review models.Review
	if err := ac.DB.First(&review, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Review tidak ditemukan")
		return
	}

	ac.DB.Delete(&review)

	// Resync product rating
	productService := services.NewProductService(ac.DB)
	productService.SyncProductRating(review.ProductID)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success", "message": "Review berhasil dihapus"})
}

// =============================================================================
// COMMISSION PRESET MANAGEMENT
// =============================================================================

func (ac *AdminController) GetCommissionPresets(w http.ResponseWriter, r *http.Request) {
	var presets []models.CommissionPreset
	if err := ac.DB.Preload("Levels", func(db *gorm.DB) *gorm.DB {
		return db.Order("level ASC")
	}).Order("created_at DESC").Find(&presets).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data preset")
		return
	}
	utils.JSONResponse(w, http.StatusOK, presets)
}

func (ac *AdminController) UpsertCommissionPreset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	type LevelInput struct {
		Level int     `json:"level"`
		Rate  float64 `json:"rate"`
	}
	var req struct {
		ID          string       `json:"id"`
		Name        string       `json:"name"`
		Description string       `json:"description"`
		IsActive    bool         `json:"is_active"`
		Levels      []LevelInput `json:"levels"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	if req.Name == "" {
		utils.JSONError(w, http.StatusBadRequest, "Nama preset wajib diisi")
		return
	}

	presetID := req.ID
	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		if presetID != "" {
			if err := tx.Model(&models.CommissionPreset{}).Where("id = ?", presetID).Updates(map[string]interface{}{
				"name":        req.Name,
				"description": req.Description,
				"is_active":   req.IsActive,
			}).Error; err != nil {
				return err
			}
			tx.Where("preset_id = ?", presetID).Delete(&models.CommissionPresetLevel{})
		} else {
			preset := models.CommissionPreset{
				Name:        req.Name,
				Description: req.Description,
				IsActive:    req.IsActive,
			}
			if err := tx.Create(&preset).Error; err != nil {
				return err
			}
			presetID = preset.ID
		}

		for _, lv := range req.Levels {
			if lv.Level < 1 {
				continue
			}
			record := models.CommissionPresetLevel{
				PresetID: presetID,
				Level:    lv.Level,
				Rate:     lv.Rate / 100.0,
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan preset: "+err.Error())
		return
	}

	var result models.CommissionPreset
	ac.DB.Preload("Levels", func(db *gorm.DB) *gorm.DB {
		return db.Order("level ASC")
	}).Where("id = ?", presetID).First(&result)

	utils.JSONResponse(w, http.StatusOK, result)
}

func (ac *AdminController) DeleteCommissionPreset(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID preset diperlukan")
		return
	}

	var count int64
	ac.DB.Model(&models.Product{}).Where("commission_preset_id = ?", id).Count(&count)
	if count > 0 {
		utils.JSONError(w, http.StatusConflict, fmt.Sprintf("Preset digunakan oleh %d produk. Lepas preset dari produk terlebih dahulu.", count))
		return
	}

	if err := ac.DB.Where("id = ?", id).Delete(&models.CommissionPreset{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus preset")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT VARIANTS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/products/variants?product_id=...
func (ac *AdminController) GetProductVariants(w http.ResponseWriter, r *http.Request) {
	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID required")
		return
	}
	var variants []models.ProductVariant
	ac.DB.Where("product_id = ?", productID).Order("created_at ASC").Find(&variants)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": variants})
}

// POST /api/admin/products/variants/add
func (ac *AdminController) AddProductVariant(w http.ResponseWriter, r *http.Request) {
	var v models.ProductVariant
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	// 1. Check Product table
	// We allow a variant to have the same SKU as its OWN parent product
	var parent models.Product
	ac.DB.Where("id = ?", v.ProductID).First(&parent)
	
	var otherProduct models.Product
	ac.DB.Where("sku = ? AND id <> ?", v.SKU, v.ProductID).First(&otherProduct)
	if otherProduct.ID != "" {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh produk lain: %s", v.SKU, otherProduct.Name))
		return
	}

	// 2. Check Other Variants
	var otherVariant models.ProductVariant
	ac.DB.Where("sku = ?", v.SKU).First(&otherVariant)
	if otherVariant.ID != "" {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh varian lain di produk ID: %s", v.SKU, otherVariant.ProductID))
		return
	}

	if v.CommissionPresetID != nil && *v.CommissionPresetID == "" {
		v.CommissionPresetID = nil
	}
	if v.MerchantCommissionPresetID != nil && *v.MerchantCommissionPresetID == "" {
		v.MerchantCommissionPresetID = nil
	}

	if err := ac.DB.Create(&v).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat varian: "+err.Error())
		return
	}

	// [Sync Fix] Auto-populate PUSAT inventory with variant stock & COGS
	ac.DB.Create(&models.Inventory{
		ProductID:        v.ProductID,
		ProductVariantID: &v.ID,
		MerchantID:       models.PusatID,
		Stock:            v.Stock,
		BasePrice:        v.COGS,
	})

	ac.Audit.Log(r.Context().Value("user_id").(string), "add_variant", "product_variant", v.ID, v.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": v})
}

// PUT /api/admin/products/variants/update
func (ac *AdminController) UpdateProductVariant(w http.ResponseWriter, r *http.Request) {
	var req models.ProductVariant
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.ID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Variant ID required")
		return
	}

	// 1. Check Products Table
	// Allow sharing SKU with OWN parent product, but not others
	var otherProduct models.Product
	ac.DB.Where("sku = ? AND id <> ?", req.SKU, req.ProductID).First(&otherProduct)
	if otherProduct.ID != "" {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh produk lain: %s", req.SKU, otherProduct.Name))
		return
	}

	// 2. Check ProductVariants Table
	// Exclude the record we are currently updating
	var otherVariant models.ProductVariant
	ac.DB.Where("sku = ? AND id <> ?", req.SKU, req.ID).First(&otherVariant)
	if otherVariant.ID != "" {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("SKU '%s' sudah digunakan oleh varian lain di produk ID: %s", req.SKU, otherVariant.ProductID))
		return
	}

	if req.CommissionPresetID != nil && *req.CommissionPresetID == "" {
		req.CommissionPresetID = nil
	}
	if req.MerchantCommissionPresetID != nil && *req.MerchantCommissionPresetID == "" {
		req.MerchantCommissionPresetID = nil
	}

	updates := map[string]interface{}{
		"name":                          req.Name,
		"sku":                           req.SKU,
		"price":                         req.Price,
		"old_price":                     req.OldPrice,
		"wholesale_price":               req.WholesalePrice,
		"cogs":                          req.COGS,
		"stock":                         req.Stock,
		"weight":                        req.Weight,
		"length":                        req.Length,
		"width":                         req.Width,
		"height":                        req.Height,
		"image":                         req.Image,
		"status":                        req.Status,
		"is_virtual":                    req.IsVirtual,
		"is_downloadable":               req.IsDownloadable,
		"download_limit":                req.DownloadLimit,
		"download_expiry":               req.DownloadExpiry,
		"downloadable_files":            req.DownloadableFiles,
		"description":                   req.Description,
		"sale_start":                    req.SaleStart,
		"sale_end":                      req.SaleEnd,
		"tax_status":                    req.TaxStatus,
		"tax_class":                     req.TaxClass,
		"manage_stock":                  req.ManageStock,
		"commission_preset_id":          req.CommissionPresetID,
		"merchant_commission_preset_id": req.MerchantCommissionPresetID,
	}

	err := ac.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.ProductVariant{}).Where("id = ?", req.ID).Updates(updates).Error; err != nil {
			return err
		}

		// [Sync Fix] Sinkronkan ke Gudang Pusat (Inventory) untuk Varian ini
		var inv models.Inventory
		err := tx.Where("merchant_id = ? AND product_id = ? AND product_variant_id = ?", models.PusatID, req.ProductID, req.ID).First(&inv).Error
		if err != nil {
			// Jika belum ada record di inventory, buat baru
			inv = models.Inventory{
				MerchantID:       models.PusatID,
				ProductID:        req.ProductID,
				ProductVariantID: &req.ID,
				Stock:            req.Stock,
				BasePrice:        req.COGS,
			}
			return tx.Create(&inv).Error
		}
		// Jika sudah ada, update Stok & COGS (BasePrice)
		return tx.Model(&inv).Updates(map[string]interface{}{
			"stock":      req.Stock,
			"base_price": req.COGS,
		}).Error
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update varian & inventory: "+err.Error())
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "update_variant", "product_variant", req.ID, req.Name, r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/products/variants/delete?id=...
func (ac *AdminController) DeleteProductVariant(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Variant ID required")
		return
	}

	if err := ac.DB.Where("id = ?", id).Delete(&models.ProductVariant{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus varian")
		return
	}

	ac.Audit.Log(r.Context().Value("user_id").(string), "delete_variant", "product_variant", id, "", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// STUBS FOR MISSING FUNCTIONS
func (ac *AdminController) GetEligibleUplines(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"data": []interface{}{}})
}
func (ac *AdminController) GetMerchantStockOverview(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	filter := r.URL.Query().Get("filter")

	var merchants []models.Merchant
	query := ac.DB.Model(&models.Merchant{}).Where("id <> ?", "00000000-0000-0000-0000-000000000000")
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where("store_name ILIKE ?", like)
	}
	if err := query.Order("store_name ASC").Find(&merchants).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data merchant: "+err.Error())
		return
	}

	type MerchantProductStock struct {
		ProductID   string  `json:"product_id"`
		ProductName string  `json:"product_name"`
		SKU         string  `json:"sku"`
		Image       string  `json:"image"`
		Category    string  `json:"category"`
		Stock       int     `json:"stock"`
		Price       float64 `json:"price"`
		Status      string  `json:"status"` // "available", "low", "out"
	}

	type MerchantStockOverview struct {
		MerchantID    string                 `json:"merchant_id"`
		StoreName     string                 `json:"store_name"`
		LogoURL       string                 `json:"logo_url"`
		City          string                 `json:"city"`
		Province      string                 `json:"province"`
		InStock       int                    `json:"in_stock"`       // Stock > 0
		LowStock      int                    `json:"low_stock"`      // 0 < Stock <= threshold
		OutOfStock    int                    `json:"out_of_stock"`   // Stock == 0
		TotalProducts int                    `json:"total_products"` // Total
		Products      []MerchantProductStock `json:"products"`
	}

	var data []MerchantStockOverview

	for _, m := range merchants {
		var items []struct {
			ProductID         string
			ProductName       string
			VariantID         *string
			VariantName       string
			SKU               string
			Image             string
			Category          string
			Stock             int
			Price             float64
			LowStockThreshold int
		}

		err := ac.DB.Raw(`
			SELECT 
				i.product_id,
				p.name AS product_name,
				i.product_variant_id AS variant_id,
				pv.name AS variant_name,
				COALESCE(pv.sku, p.sku) AS sku,
				COALESCE(pv.image, p.image) AS image,
				p.category,
				i.stock,
				COALESCE(pv.price, p.price) AS price,
				p.low_stock_threshold
			FROM inventories i
			JOIN products p ON p.id = i.product_id
			LEFT JOIN product_variants pv ON pv.id = i.product_variant_id
			WHERE i.merchant_id = ?
		`, m.ID).Scan(&items).Error

		if err != nil {
			continue
		}

		var inStockCount int
		var lowStockCount int
		var outOfStockCount int
		var productsList []MerchantProductStock

		for _, item := range items {
			status := "available"
			if item.Stock == 0 {
				status = "out"
				outOfStockCount++
			} else {
				inStockCount++
				threshold := item.LowStockThreshold
				if threshold <= 0 {
					threshold = 5
				}
				if item.Stock <= threshold {
					status = "low"
					lowStockCount++
				}
			}

			displayName := item.ProductName
			if item.VariantName != "" && item.VariantName != "Standard" {
				displayName = fmt.Sprintf("%s — %s", item.ProductName, item.VariantName)
			}

			productsList = append(productsList, MerchantProductStock{
				ProductID:   item.ProductID,
				ProductName: displayName,
				SKU:         item.SKU,
				Image:       item.Image,
				Category:    item.Category,
				Stock:       item.Stock,
				Price:       item.Price,
				Status:      status,
			})
		}

		overview := MerchantStockOverview{
			MerchantID:    m.ID,
			StoreName:     m.StoreName,
			LogoURL:       m.LogoURL,
			City:          m.City,
			Province:      m.Province,
			InStock:       inStockCount,
			LowStock:      lowStockCount,
			OutOfStock:    outOfStockCount,
			TotalProducts: len(items),
			Products:      productsList,
		}

		// Apply filter
		if filter == "low" && overview.LowStock == 0 {
			continue
		}
		if filter == "out" && overview.OutOfStock == 0 {
			continue
		}

		data = append(data, overview)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   data,
	})
}
// AddFakeReview handles creating a fake review
func (ac *AdminController) AddFakeReview(w http.ResponseWriter, r *http.Request) {
	type FakeReviewRequest struct {
		ProductID string `json:"product_id"`
		Rating    int    `json:"rating"`
		Comment   string `json:"comment"`
		BuyerName string `json:"buyer_name"`
	}

	var req FakeReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.ProductID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID is required")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		utils.JSONError(w, http.StatusBadRequest, "Rating must be between 1 and 5")
		return
	}

	// 1. Fetch Product to get MerchantID
	var product models.Product
	if err := ac.DB.First(&product, "id = ?", req.ProductID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Product not found")
		return
	}

	merchantID := product.MerchantID
	if merchantID == "" {
		merchantID = models.PusatID
	}

	// 2. Resolve Buyer ID
	var buyerID string
	if req.BuyerName != "" {
		var profile models.UserProfile
		err := ac.DB.Where("full_name = ?", req.BuyerName).First(&profile).Error
		if err == nil {
			buyerID = profile.UserID
		} else {
			// Create a new dummy user
			timestamp := time.Now().UnixNano()
			email := fmt.Sprintf("fake.reviewer.%d@akuglow.com", timestamp)
			user := models.User{
				Email:  email,
				Role:   "buyer",
				Status: "active",
			}
			if err := ac.DB.Create(&user).Error; err != nil {
				utils.JSONError(w, http.StatusInternalServerError, "Failed to create fake buyer user: "+err.Error())
				return
			}
			buyerProfile := models.UserProfile{
				UserID:   user.ID,
				FullName: req.BuyerName,
			}
			if err := ac.DB.Create(&buyerProfile).Error; err != nil {
				utils.JSONError(w, http.StatusInternalServerError, "Failed to create fake buyer profile: "+err.Error())
				return
			}
			// Create wallet
			wallet := models.Wallet{
				OwnerID:   user.ID,
				OwnerType: models.WalletBuyer,
				Balance:   0,
			}
			ac.DB.Create(&wallet)

			buyerID = user.ID
		}
	} else {
		adminUserID, ok := r.Context().Value("user_id").(string)
		if !ok || adminUserID == "" {
			utils.JSONError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		buyerID = adminUserID
	}

	// 3. Create dummy Order and OrderItem (due to NOT NULL constraints in DB)
	orderID := uuid.New().String()
	orderItemID := uuid.New().String()

	// 4. Create the Review
	review := models.Review{
		ID:          uuid.New().String(),
		ProductID:   req.ProductID,
		MerchantID:  merchantID,
		BuyerID:     buyerID,
		OrderID:     orderID,
		OrderItemID: orderItemID,
		Rating:      req.Rating,
		Comment:     req.Comment,
		Status:      "approved", // fake reviews should be approved by default
	}

	if err := ac.DB.Create(&review).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan ulasan: "+err.Error())
		return
	}

	// 5. Sync product rating using productService
	productService := services.NewProductService(ac.DB)
	productService.SyncProductRating(review.ProductID)

	ac.Audit.Log(r.Context().Value("user_id").(string), "add_fake_review", "review", review.ID, fmt.Sprintf("Fake review for product: %s", product.Name), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": review})
}

// UpdateReview handles updating an existing review (fake or real)
func (ac *AdminController) UpdateReview(w http.ResponseWriter, r *http.Request) {
	type UpdateReviewRequest struct {
		ID        string `json:"id"`
		Rating    int    `json:"rating"`
		Comment   string `json:"comment"`
		BuyerName string `json:"buyer_name"`
	}

	var req UpdateReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.ID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Review ID is required")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		utils.JSONError(w, http.StatusBadRequest, "Rating must be between 1 and 5")
		return
	}

	var review models.Review
	if err := ac.DB.First(&review, "id = ?", req.ID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Review not found")
		return
	}

	updates := map[string]interface{}{
		"rating":  req.Rating,
		"comment": req.Comment,
	}

	if req.BuyerName != "" {
		var profile models.UserProfile
		err := ac.DB.Where("full_name = ?", req.BuyerName).First(&profile).Error
		if err == nil {
			updates["buyer_id"] = profile.UserID
		} else {
			// Create a new dummy user
			timestamp := time.Now().UnixNano()
			email := fmt.Sprintf("fake.reviewer.%d@akuglow.com", timestamp)
			user := models.User{
				Email:  email,
				Role:   "buyer",
				Status: "active",
			}
			if err := ac.DB.Create(&user).Error; err != nil {
				utils.JSONError(w, http.StatusInternalServerError, "Failed to create fake buyer user: "+err.Error())
				return
			}
			buyerProfile := models.UserProfile{
				UserID:   user.ID,
				FullName: req.BuyerName,
			}
			if err := ac.DB.Create(&buyerProfile).Error; err != nil {
				utils.JSONError(w, http.StatusInternalServerError, "Failed to create fake buyer profile: "+err.Error())
				return
			}
			// Create wallet
			wallet := models.Wallet{
				OwnerID:   user.ID,
				OwnerType: models.WalletBuyer,
				Balance:   0,
			}
			ac.DB.Create(&wallet)

			updates["buyer_id"] = user.ID
		}
	}

	if err := ac.DB.Model(&review).Updates(updates).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to update review: "+err.Error())
		return
	}

	// Sync product rating
	productService := services.NewProductService(ac.DB)
	productService.SyncProductRating(review.ProductID)

	ac.Audit.Log(r.Context().Value("user_id").(string), "update_review", "review", review.ID, "Updated review details", r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": review})
}
func (ac *AdminController) ConfirmManualPayment(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
func (ac *AdminController) NotifyWishlistUsers(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
func (ac *AdminController) BulkToggleLogistics(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
func (ac *AdminController) UpdateLogistic(w http.ResponseWriter, r *http.Request) {
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
