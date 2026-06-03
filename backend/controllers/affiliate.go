package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"
	"math"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AffiliateController struct {
	Service *services.AffiliateService
	Notif   *services.NotificationService
	DB      *gorm.DB
}

func NewAffiliateController(db *gorm.DB, notif *services.NotificationService) *AffiliateController {
	return &AffiliateController{
		Service: services.NewAffiliateService(db, notif),
		Notif:   notif,
		DB:      db,
	}
}

// GET /api/public/affiliate/track?ref=CODE
func (ac *AffiliateController) TrackClick(w http.ResponseWriter, r *http.Request) {
	refCode := r.URL.Query().Get("ref")
	productID := r.URL.Query().Get("product_id")
	sub1 := r.URL.Query().Get("sub1")
	sub2 := r.URL.Query().Get("sub2")
	sub3 := r.URL.Query().Get("sub3")
	lc := r.URL.Query().Get("lc")

	affiliate, err := ac.Service.TrackClick(services.TrackClickRequest{
		RefCode:   refCode,
		ProductID: productID,
		Referrer:  r.Referer(),
		IP:        r.RemoteAddr,
		UA:        r.UserAgent(),
		SubID1:    sub1,
		SubID2:    sub2,
		SubID3:    sub3,
		LinkCode:  lc,
	})
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Affiliate tidak ditemukan")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":      "Klik berhasil dilacak",
		"affiliate_id": affiliate.ID,
	})
}

// GET /api/affiliate/dashboard
func (ac *AffiliateController) GetDashboard(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	// 1. Ambil data affiliate dan user id
	var affiliateMember models.AffiliateMember
	if err := ac.DB.Preload("Tier").First(&affiliateMember, "id = ?", affiliateID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Data affiliate tidak ditemukan")
		return
	}
	userID := affiliateMember.UserID

	// 2. Ambil data Wallet sebagai source of truth finansial
	var wallet models.Wallet
	if err := ac.DB.Where("owner_id = ? AND owner_type = ?", userID, models.WalletAffiliate).FirstOrCreate(&wallet, models.Wallet{
		OwnerID:   userID,
		OwnerType: models.WalletAffiliate,
		Balance:   0,
		IsActive:  true,
	}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data dompet")
		return
	}

	// 3. Unify Counts dengan logic Eligibility Service (Real-time)
	isEligible, activeMitraCount, teamTurnover, reqMitra, reqTurnover, qualifiedMitraCount := ac.Service.CheckMerchantEligibility(affiliateID)

	// 4. Hitung Order Stats (Total & Pending)
	var totalOrders, pendingOrders int64
	ac.DB.Model(&models.Order{}).Where("affiliate_id = ? AND status NOT IN ('cancelled', 'expired')", affiliateID).Count(&totalOrders)
	ac.DB.Model(&models.Order{}).Where("affiliate_id = ? AND status = 'pending_payment'", affiliateID).Count(&pendingOrders)

	// 5. Total Downline (Seluruh Kedalaman Jaringan)
	totalDownline, _, _ := ac.Service.GetTeamStats(affiliateID)

	// 6. Data Grafik Bulanan (6 bulan terakhir)
	type MonthlyData struct {
		Month      string  `json:"month"`
		Commission float64 `json:"commission"`
		Clicks     int     `json:"clicks"`
		Orders     int     `json:"orders"`
	}
	var monthlyData []MonthlyData
	ac.DB.Raw(`
		SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
		       COALESCE(SUM(amount), 0) AS commission,
		       0 AS clicks,
		       COUNT(*) AS orders
		FROM affiliate_commissions
		WHERE affiliate_id = ? AND status NOT IN ('cancelled', 'rejected') AND created_at >= NOW() - INTERVAL '6 months'
		GROUP BY DATE_TRUNC('month', created_at)
		ORDER BY DATE_TRUNC('month', created_at) ASC
	`, affiliateID).Scan(&monthlyData)

	// 7. Komisi Terbaru
	var recentCommissions []map[string]interface{}
	ac.DB.Raw(`
		SELECT ac.id, ac.amount, ac.status, ac.created_at, p.name as product_name, ac.order_id
		FROM affiliate_commissions ac
		LEFT JOIN products p ON p.id = ac.product_id
		WHERE ac.affiliate_id = ?
		ORDER BY ac.created_at DESC
		LIMIT 5
	`, affiliateID).Scan(&recentCommissions)

	// 8. Final Response
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":    "success",
		"affiliate": affiliateMember,
		"stats": map[string]interface{}{
			"balance":              wallet.Balance,
			"shopping_balance":     wallet.ShoppingBalance,
			"pending_commission":   wallet.PendingBalance,
			"total_commission":     wallet.TotalEarned,
			"paid_commission":      wallet.TotalWithdrawn,
			// [Sync Fix] approved_commission = Balance - Pending (ShoppingBalance is a separate column and not included in Balance)
			"approved_commission":  wallet.Balance - wallet.PendingBalance,
			"total_clicks":         affiliateMember.TotalClicks,
			"total_orders":         totalOrders,
			"total_orders_pending": pendingOrders,
			"total_downline":       totalDownline,
			"active_mitra_count":   activeMitraCount,
			"active_mitra":         activeMitraCount, // Alias for Stats.jsx
			"qualified_mitra_count": qualifiedMitraCount,
			"team_monthly_turnover": teamTurnover,
			"monthly_turnover":      teamTurnover,    // Alias for Stats.jsx
			"next_tier_req_mitra":    reqMitra,
			"next_tier_req_turnover": reqTurnover,
			"is_eligible":          isEligible,
		},
		"recent_commissions": recentCommissions,
		"monthly_data":       monthlyData,
	})
}


// GET /api/affiliate/commissions
func (ac *AffiliateController) GetCommissions(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	status := r.URL.Query().Get("status")

	type CommRow struct {
		ID          string    `json:"id"`
		OrderID     string    `json:"order_id"`
		ProductID   string    `json:"product_id"`
		ProductName string    `json:"product_name"`
		GrossAmount float64   `json:"gross_amount"`
		RateApplied float64   `json:"rate_applied"`
		Amount      float64   `json:"amount"`
		Status      string    `json:"status"`
		CreatedAt   time.Time `json:"created_at"`
		HoldUntil   *time.Time `json:"hold_until"`
		PaidAt      *time.Time `json:"paid_at"`
	}

	query := ac.DB.Table("affiliate_commissions ac").
		Select("ac.id, ac.order_id, ac.product_id, COALESCE(p.name, 'Produk Dihapus') AS product_name, ac.gross_amount, ac.rate_applied, ac.amount, ac.status, ac.created_at, ac.hold_until, ac.paid_at").
		Joins("LEFT JOIN products p ON p.id::text = ac.product_id::text").
		Where("ac.affiliate_id = ?", affiliateID)

	if status != "" {
		query = query.Where("ac.status = ?", status)
	}

	rows := []CommRow{}
	if err := query.Order("ac.created_at DESC").Limit(200).Scan(&rows).Error; err != nil {
		fmt.Printf("[GetCommissions Error] %v\n", err)
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data komisi dari database")
		return
	}

	// [Sync Fix] Calculate Summary for UI
	var summary struct {
		Total    float64 `json:"total"`
		Pending  float64 `json:"pending"`
		Approved float64 `json:"approved"`
		Paid     float64 `json:"paid"`
	}
	ac.DB.Table("affiliate_commissions").
		Where("affiliate_id = ? AND status NOT IN ('cancelled', 'rejected')", affiliateID).
		Select("COALESCE(SUM(amount), 0) as total").Scan(&summary.Total)
	ac.DB.Table("affiliate_commissions").
		Where("affiliate_id = ? AND status = 'pending'", affiliateID).
		Select("COALESCE(SUM(amount), 0) as pending").Scan(&summary.Pending)
	ac.DB.Table("affiliate_commissions").
		Where("affiliate_id = ? AND status = 'approved'", affiliateID).
		Select("COALESCE(SUM(amount), 0) as approved").Scan(&summary.Approved)
	ac.DB.Table("affiliate_commissions").
		Where("affiliate_id = ? AND status = 'paid'", affiliateID).
		Select("COALESCE(SUM(amount), 0) as paid").Scan(&summary.Paid)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"total":   len(rows),
		"data":    rows,
		"summary": summary,
	})
}

// GET /api/affiliate/links
func (ac *AffiliateController) GetLinks(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	var links []models.AffiliateLink
	ac.DB.Where("affiliate_id = ?", affiliateID).
		Order("created_at DESC").Find(&links)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(links),
		"data":   links,
	})
}

// POST /api/affiliate/links/create
func (ac *AffiliateController) CreateLink(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	var req struct {
		TargetURL  string  `json:"target_url"`
		Title      string  `json:"title"`
		ProductID  *string `json:"product_id"`
		MerchantID *string `json:"merchant_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// Get affiliate to get ref code
	var affiliate models.AffiliateMember
	if err := ac.DB.Where("id = ?", affiliateID).First(&affiliate).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Affiliate tidak ditemukan")
		return
	}

	// Generate short code
	shortCode := utils.GenerateShortCode(6)

	link := models.AffiliateLink{
		AffiliateID: affiliateID,
		TargetURL:   req.TargetURL,
		ShortCode:   shortCode,
		Title:       req.Title,
		ProductID:   req.ProductID,
		MerchantID:  req.MerchantID,
		IsActive:    true,
	}

	if err := ac.DB.Create(&link).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat link")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data":   link,
	})
}

// DELETE /api/affiliate/links/delete?id=xxx
func (ac *AffiliateController) DeleteLink(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	id := r.URL.Query().Get("id")
	if err := ac.DB.Where("id = ? AND affiliate_id = ?", id, affiliateID).Delete(&models.AffiliateLink{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus link")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/affiliate/products - Top products for affiliate to promote
func (ac *AffiliateController) GetTopProducts(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}
	_ = affiliateID

	type ProductRow struct {
		ID           string  `json:"id"`
		Name         string  `json:"name"`
		Price        float64 `json:"price"`
		Image        string  `json:"image"`
		Category     string  `json:"category"`
		StoreName    string  `json:"store_name"`
		CommRate     float64 `json:"commission_rate"`
		TotalSold    int     `json:"total_sold"`
	}

	var rows []ProductRow
	// [BUG-M2 Fix] Filter order_items hanya dari order yang valid (tidak cancelled/expired)
	ac.DB.Raw(`
		SELECT p.id, p.name, p.price, p.image, p.category, 
		       COALESCE(m.store_name, 'Official Store') as store_name,
		       COALESCE(NULLIF(p.base_affiliate_fee, 0), cc.fee_percent, 0.00) AS comm_rate,
		       COALESCE(SUM(oi.quantity), 0) AS total_sold
		FROM products p
		LEFT JOIN merchants m ON m.id = p.merchant_id
		LEFT JOIN category_commissions cc ON LOWER(cc.category_name) = LOWER(p.category)
		LEFT JOIN order_items oi ON oi.product_id = p.id
		LEFT JOIN orders o ON o.id = oi.order_id AND o.status NOT IN ('cancelled', 'expired', 'refunded')
		WHERE p.status = 'active'
		GROUP BY p.id, p.name, p.price, p.image, p.category, m.store_name, p.base_affiliate_fee, cc.fee_percent
		ORDER BY total_sold DESC
		LIMIT 50
	`).Scan(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   rows,
	})
}

// GET /api/affiliate/withdrawals
func (ac *AffiliateController) GetWithdrawals(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	type WithdrawRow struct {
		ID          string     `json:"id"`
		Amount      float64    `json:"amount"`
		BankName    string     `json:"bank_name"`
		AccountNum  string     `json:"account_number"`
		AccountName string     `json:"account_name"`
		Status      string     `json:"status"`
		Note        string     `json:"note"`
		CreatedAt   time.Time  `json:"created_at"`
		ProcessedAt *time.Time `json:"processed_at"`
	}

	var rows []WithdrawRow
	ac.DB.Raw(`
		SELECT id, amount, bank_name, bank_account_number AS account_number,
		       bank_account_name AS account_name, status, note, created_at, processed_at
		FROM affiliate_withdrawals
		WHERE affiliate_id = ?
		ORDER BY created_at DESC
	`, affiliateID).Scan(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(rows),
		"data":   rows,
	})
}

// POST /api/affiliate/withdrawals/request
func (ac *AffiliateController) RequestWithdrawal(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	wd, err := ac.Service.RequestWithdrawal(affiliateID, req.Amount)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Notify admin
	notifSvc := services.NewNotificationService(ac.DB)
	var affMember models.AffiliateMember
	if err := ac.DB.First(&affMember, "id = ?", affiliateID).Error; err == nil {
		var affUser models.User
		ac.DB.Select("email").Where("id = ?", affMember.UserID).First(&affUser)
		msg := fmt.Sprintf("Affiliate '%s' mengajukan penarikan komisi sebesar Rp %.0f.", affMember.BankAccountName, req.Amount)
		notifSvc.Push("", "admin", "affiliate_withdrawal_request", "Permintaan Penarikan Afiliasi", msg, "/admin/affiliates")
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status":  "success",
		"message": "Permintaan penarikan berhasil dikirim. Tim kami akan memprosesnya dalam 1-3 hari kerja.",
		"data":    wd,
	})
}

// GET /api/affiliate/profile
func (ac *AffiliateController) GetProfile(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	userID, _ := r.Context().Value("user_id").(string)
	role, _ := r.Context().Value("user_role").(string)

	// [Admin/Superadmin] Jika tidak punya affiliate_id, cari berdasarkan user_id.
	// Ini memungkinkan superadmin melihat profile affiliate mereka sendiri di panel.
	if _, err := uuid.Parse(affiliateID); err != nil {
		// Coba cari affiliate dari user_id
		if err2 := ac.DB.Where("user_id = ?", userID).First(&models.AffiliateMember{}).Error; err2 != nil {
			// Bukan affiliate juga — kembalikan data user saja
			var user models.User
			ac.DB.Preload("Profile").Where("id = ?", userID).First(&user)
			utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
				"status": "success",
				"user":   user,
			})
			return
		}
		// Validasi ulang untuk superadmin — inject affiliate_id ke context lookup
		var aff models.AffiliateMember
		ac.DB.Where("user_id = ?", userID).First(&aff)
		affiliateID = aff.ID
		_ = role
	}

	var affiliate models.AffiliateMember
	if err := ac.DB.Preload("Tier").Where("id = ?", affiliateID).First(&affiliate).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Affiliate tidak ditemukan")
		return
	}

	var user models.User
	ac.DB.Preload("Profile").Where("id = ?", userID).First(&user)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":    "success",
		"affiliate": affiliate,
		"user":      user,
	})
}

// PUT /api/affiliate/profile/update
func (ac *AffiliateController) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	userID, _ := r.Context().Value("user_id").(string)
	role, _ := r.Context().Value("user_role").(string)

	// [Admin/Superadmin] Fallback ke user_id jika affiliate_id kosong
	if _, err := uuid.Parse(affiliateID); err != nil {
		var aff models.AffiliateMember
		if err2 := ac.DB.Where("user_id = ?", userID).First(&aff).Error; err2 != nil {
			utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
			return
		}
		affiliateID = aff.ID
		_ = role
	}

	var req struct {
		Email             string `json:"email"`
		FullName          string `json:"full_name"`
		AvatarUrl         string `json:"avatar_url"`
		BankName          string `json:"bank_name"`
		BankAccountNumber string `json:"bank_account_number"`
		BankAccountName   string `json:"bank_account_name"`
		PostbackURL       string `json:"postback_url"`
		KTPNumber         string `json:"ktp_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// Update email in users table if provided and different
	if req.Email != "" {
		var u models.User
		if err := ac.DB.First(&u, "id = ?", userID).Error; err == nil {
			if u.Email != req.Email {
				var existingUser models.User
				if err := ac.DB.Where("email = ? AND id != ?", req.Email, userID).First(&existingUser).Error; err == nil {
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

	// Update user_profiles (nama + foto)
	profileUpdates := map[string]interface{}{}
	if req.FullName != "" {
		profileUpdates["full_name"] = req.FullName
	}
	if req.AvatarUrl != "" {
		profileUpdates["avatar_url"] = req.AvatarUrl
	}
	if len(profileUpdates) > 0 {
		ac.DB.Table("user_profiles").Where("user_id = ?", userID).Updates(profileUpdates)
	}

	// Update affiliate_members (data bank)
	// [BUG-S1 Fix] Hanya update field yang dikirim — jangan overwrite dengan string kosong.
	// postback_url diatur oleh admin via panel, tidak dari form affiliate.
	updates := map[string]interface{}{}
	if req.BankName != "" {
		updates["bank_name"] = req.BankName
	}
	if req.BankAccountNumber != "" {
		updates["bank_account_number"] = req.BankAccountNumber
	}
	if req.BankAccountName != "" {
		updates["bank_account_name"] = req.BankAccountName
	}
	if req.KTPNumber != "" {
		updates["ktp_number"] = req.KTPNumber
	}

	if len(updates) > 0 {
		ac.DB.Table("affiliate_members").Where("id = ?", affiliateID).Updates(updates)

		// [Sync to Merchant] If merchant exists, update merchant bank info as well!
		var merchant models.Merchant
		if err := ac.DB.Where("user_id = ?", userID).First(&merchant).Error; err == nil {
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

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/affiliate/team-stats
func (ac *AffiliateController) GetTeamStats(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	totalDownlines, teamTurnover, err := ac.Service.GetTeamStats(affiliateID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data tim")
		return
	}

	// Drill-down support: Get stats for a specific member in the network
	rootID := r.URL.Query().Get("root_id")
	targetID := affiliateID // Default to self
	isDrillDown := false

	if rootID != "" && rootID != affiliateID {
		// Security check: Ensure rootID is indeed a descendant of affiliateID
		var isDescendant bool
		ac.DB.Raw(`
			WITH RECURSIVE subordinates AS (
				SELECT id FROM affiliate_members WHERE upline_id = ?
				UNION ALL
				SELECT am.id FROM affiliate_members am
				JOIN subordinates s ON am.upline_id = s.id
			)
			SELECT EXISTS(SELECT 1 FROM subordinates WHERE id = ?)
		`, affiliateID, rootID).Scan(&isDescendant)

		if !isDescendant {
			utils.JSONError(w, http.StatusForbidden, "Anda tidak memiliki akses ke data jaringan ini")
			return
		}
		targetID = rootID
		isDrillDown = true

		// If drill-down, recalculate summary for this specific root
		totalDownlines, teamTurnover, _ = ac.Service.GetTeamStats(targetID)
	}

	// Pagination & Search params
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 10)
	search := r.URL.Query().Get("search")
	levelFilter := r.URL.Query().Get("level") // "all", "1", "2" (2 means 2+)
	offset := (page - 1) * limit

	// [BUG-C2 Fix] Validasi levelFilter: hanya izinkan nilai yang dikenal.
	// Jangan pernah langsung inject user input ke SQL.
	allowedLevels := map[string]bool{"1": true, "2": true, "3": true, "4": true, "5": true}
	switch levelFilter {
	case "1":
		levelFilter = "1"
	case "2plus":
		levelFilter = "2plus"
	case "", "all":
		levelFilter = ""
	default:
		if !allowedLevels[levelFilter] {
			levelFilter = ""
		}
	}

	// Get full downlines list using Recursive CTE
	type DownlineRow struct {
		AffiliateID  string    `json:"affiliate_id"`
		UserID       string    `json:"user_id"`
		UplineID     string    `json:"upline_id"`
		FullName     string    `json:"full_name"`
		Status       string    `json:"status"`
		JoinedAt     time.Time `json:"joined_at"`
		Turnover     float64   `json:"turnover"`
		Level        int       `json:"level"`
		ReferrerName string    `json:"referrer_name"`
		AvatarUrl    string    `json:"avatar_url"`
	}
	var downlines []DownlineRow
	
	searchQuery := "%" + search + "%"
	
	// Query with Recursive CTE to get all levels + Filter + Pagination
	if levelFilter == "2plus" {
		ac.DB.Raw(`
		WITH RECURSIVE team AS (
			SELECT am.id, am.user_id, am.upline_id, up.full_name, up.avatar_url, am.status, am.created_at, 
			       1 as level, CAST('Anda' AS VARCHAR(150)) as referrer_name
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			WHERE am.upline_id = ?
			
			UNION ALL
			
			SELECT am.id, am.user_id, am.upline_id, up.full_name, up.avatar_url, am.status, am.created_at, 
			       t.level + 1, CAST(t.full_name AS VARCHAR(150)) as referrer_name
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			JOIN team t ON am.upline_id = t.id
			WHERE t.level < 100
		)
		SELECT t.id as affiliate_id, t.user_id, t.upline_id, t.full_name, t.avatar_url, t.status, t.created_at as joined_at,
		       t.level, t.referrer_name,
		       COALESCE(SUM(o.subtotal), 0) as turnover
		FROM team t
		LEFT JOIN orders o ON o.affiliate_id = t.id AND o.status IN ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed')
		WHERE (t.full_name ILIKE ? OR t.user_id::text ILIKE ?) AND t.level >= 2
		GROUP BY t.id, t.user_id, t.upline_id, t.full_name, t.avatar_url, t.status, t.created_at, t.level, t.referrer_name
		ORDER BY t.level ASC, t.created_at DESC
		LIMIT ? OFFSET ?
	`, targetID, searchQuery, searchQuery, limit, offset).Scan(&downlines)
	} else if levelFilter != "" {
		ac.DB.Raw(`
		WITH RECURSIVE team AS (
			SELECT am.id, am.user_id, am.upline_id, up.full_name, up.avatar_url, am.status, am.created_at, 
			       1 as level, CAST('Anda' AS VARCHAR(150)) as referrer_name
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			WHERE am.upline_id = ?
			
			UNION ALL
			
			SELECT am.id, am.user_id, am.upline_id, up.full_name, up.avatar_url, am.status, am.created_at, 
			       t.level + 1, CAST(t.full_name AS VARCHAR(150)) as referrer_name
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			JOIN team t ON am.upline_id = t.id
			WHERE t.level < 100
		)
		SELECT t.id as affiliate_id, t.user_id, t.upline_id, t.full_name, t.avatar_url, t.status, t.created_at as joined_at,
		       t.level, t.referrer_name,
		       COALESCE(SUM(o.subtotal), 0) as turnover
		FROM team t
		LEFT JOIN orders o ON o.affiliate_id = t.id AND o.status IN ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed')
		WHERE (t.full_name ILIKE ? OR t.user_id::text ILIKE ?) AND t.level = ?
		GROUP BY t.id, t.user_id, t.upline_id, t.full_name, t.avatar_url, t.status, t.created_at, t.level, t.referrer_name
		ORDER BY t.level ASC, t.created_at DESC
		LIMIT ? OFFSET ?
	`, targetID, searchQuery, searchQuery, levelFilter, limit, offset).Scan(&downlines)
	} else {
		ac.DB.Raw(`
		WITH RECURSIVE team AS (
			SELECT am.id, am.user_id, am.upline_id, up.full_name, up.avatar_url, am.status, am.created_at, 
			       1 as level, CAST('Anda' AS VARCHAR(150)) as referrer_name
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			WHERE am.upline_id = ?
			
			UNION ALL
			
			SELECT am.id, am.user_id, am.upline_id, up.full_name, up.avatar_url, am.status, am.created_at, 
			       t.level + 1, CAST(t.full_name AS VARCHAR(150)) as referrer_name
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			JOIN team t ON am.upline_id = t.id
			WHERE t.level < 100
		)
		SELECT t.id as affiliate_id, t.user_id, t.upline_id, t.full_name, t.avatar_url, t.status, t.created_at as joined_at,
		       t.level, t.referrer_name,
		       COALESCE(SUM(o.subtotal), 0) as turnover
		FROM team t
		LEFT JOIN orders o ON o.affiliate_id = t.id AND o.status IN ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed')
		WHERE (t.full_name ILIKE ? OR t.user_id::text ILIKE ?)
		GROUP BY t.id, t.user_id, t.upline_id, t.full_name, t.avatar_url, t.status, t.created_at, t.level, t.referrer_name
		ORDER BY t.level ASC, t.created_at DESC
		LIMIT ? OFFSET ?
	`, targetID, searchQuery, searchQuery, limit, offset).Scan(&downlines)
	}

	// Count total filtered
	var totalFiltered int64
	if levelFilter == "2plus" {
		ac.DB.Raw(`
		WITH RECURSIVE team AS (
			SELECT am.id, am.user_id, am.upline_id, up.full_name, 1 as level
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			WHERE am.upline_id = ?
			UNION ALL
			SELECT am.id, am.user_id, am.upline_id, up.full_name, t.level + 1
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			JOIN team t ON am.upline_id = t.id
			WHERE t.level < 100
		)
		SELECT COUNT(*) FROM team WHERE (full_name ILIKE ? OR user_id::text ILIKE ?) AND level >= 2
	`, targetID, searchQuery, searchQuery).Scan(&totalFiltered)
	} else if levelFilter != "" {
		ac.DB.Raw(`
		WITH RECURSIVE team AS (
			SELECT am.id, am.user_id, am.upline_id, up.full_name, 1 as level
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			WHERE am.upline_id = ?
			UNION ALL
			SELECT am.id, am.user_id, am.upline_id, up.full_name, t.level + 1
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			JOIN team t ON am.upline_id = t.id
			WHERE t.level < 100
		)
		SELECT COUNT(*) FROM team WHERE (full_name ILIKE ? OR user_id::text ILIKE ?) AND level = ?
	`, targetID, searchQuery, searchQuery, levelFilter).Scan(&totalFiltered)
	} else {
		ac.DB.Raw(`
		WITH RECURSIVE team AS (
			SELECT am.id, am.user_id, am.upline_id, up.full_name, 1 as level
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			WHERE am.upline_id = ?
			UNION ALL
			SELECT am.id, am.user_id, am.upline_id, up.full_name, t.level + 1
			FROM affiliate_members am
			LEFT JOIN user_profiles up ON up.user_id = am.user_id
			JOIN team t ON am.upline_id = t.id
			WHERE t.level < 100
		)
		SELECT COUNT(*) FROM team WHERE (full_name ILIKE ? OR user_id::text ILIKE ?)
	`, targetID, searchQuery, searchQuery).Scan(&totalFiltered)
	}

	totalPages := (totalFiltered + int64(limit) - 1) / int64(limit)

	// Get info about current root (if drilldown)
	var rootMember map[string]interface{}
	if isDrillDown {
		ac.DB.Raw(`
			SELECT am.id, up.full_name, up.avatar_url 
			FROM affiliate_members am 
			JOIN user_profiles up ON up.user_id = am.user_id 
			WHERE am.id = ?
		`, targetID).Scan(&rootMember)
	}

	// Count active downlines in the last 30 days
	var activeMitra int64
	var descendantIDs []string
	ac.DB.Raw(`
		WITH RECURSIVE subordinates AS (
			SELECT id FROM affiliate_members WHERE upline_id = ?
			UNION ALL
			SELECT a.id FROM affiliate_members a INNER JOIN subordinates s ON a.upline_id = s.id
		)
		SELECT id FROM subordinates
	`, targetID).Scan(&descendantIDs)

	if len(descendantIDs) > 0 {
		ac.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed') AND created_at >= NOW() - INTERVAL '30 days'", descendantIDs).
			Select("COUNT(DISTINCT affiliate_id)").
			Scan(&activeMitra)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_downlines": totalDownlines,
		"team_turnover":   teamTurnover,
		"active_mitra":    activeMitra,
		"downlines":       downlines,
		"is_drill_down":   isDrillDown,
		"root_member":     rootMember,
		"pagination": map[string]interface{}{
			"current_page":   page,
			"limit":          limit,
			"total_items":    totalFiltered,
			"total_pages":    totalPages,
		},
	})
}

// GET /api/affiliate/merchant-eligibility
func (ac *AffiliateController) CheckMerchantEligibility(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	isEligible, activeMitra, monthlyTurnover, reqMitra, reqTurnover, qualifiedMitra, directMitra, totalTransactions, performancePoints, nextTier := ac.Service.GetFullEligibility(affiliateID)

	userID, _ := r.Context().Value("user_id").(string)
	var userRole string
	ac.DB.Table("users").Select("role").Where("id = ?", userID).Scan(&userRole)
	isMerchant := userRole == "merchant"

	if isMerchant {
		isEligible = false
	}

	resp := map[string]interface{}{
		"is_eligible":      isEligible,
		"is_merchant":      isMerchant,
		"active_mitra":     activeMitra,
		"qualified_mitra":  qualifiedMitra,
		"direct_mitra":     directMitra,
		"total_transactions": totalTransactions,
		"performance_points": performancePoints,
		"monthly_turnover": monthlyTurnover,
		"requirements": map[string]interface{}{
			"min_mitra":              reqMitra,
			"min_turnover":           reqTurnover,
			"min_referrals":          0,
			"min_total_transactions": 0,
			"min_performance_points": 0,
		},
	}

	// [Sync Fix] If there's a next tier, include ALL 5 upgrade requirements from it
	if nextTier != nil {
		resp["next_tier"] = map[string]interface{}{
			"id":   nextTier.ID,
			"name": nextTier.Name,
		}
		resp["requirements"] = map[string]interface{}{
			"min_mitra":              nextTier.MinActiveMitra,
			"min_turnover":           nextTier.MinMonthlyTurnover,
			"min_referrals":          nextTier.MinReferrals,
			"min_total_transactions": nextTier.MinTotalTransactions,
			"min_performance_points": nextTier.MinPerformancePoints,
		}
	}

	utils.JSONResponse(w, http.StatusOK, resp)
}

// GET /api/affiliate/leaderboard — sanitized, no bank data exposed
func (ac *AffiliateController) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	type LeaderboardEntry struct {
		Rank        int     `json:"rank"`
		RefCode     string  `json:"ref_code"`
		FullName    string  `json:"full_name"`
		TierName    string  `json:"tier_name"`
		TotalEarned float64 `json:"total_earned"`
		TotalSales  int64   `json:"total_sales"`
	}

	var entries []LeaderboardEntry
	ac.DB.Raw(`
		SELECT
			ROW_NUMBER() OVER (ORDER BY am.total_earned DESC) AS rank,
			am.ref_code,
			COALESCE(up.full_name, 'Mitra AkuGlow') AS full_name,
			COALESCE(mt.name, 'Mitra') AS tier_name,
			COALESCE(mt.color, '#94a3b8') AS tier_color,
			am.total_earned,
			COUNT(DISTINCT o.id) AS total_sales
		FROM affiliate_members am
		LEFT JOIN user_profiles up ON up.user_id = am.user_id
		LEFT JOIN membership_tiers mt ON mt.id = am.membership_tier_id
		LEFT JOIN orders o ON o.affiliate_id = am.id AND o.status IN ('paid','shipped','completed')
		WHERE am.status = 'active' AND am.total_earned > 0
		GROUP BY am.id, up.full_name, mt.name, mt.color
		ORDER BY am.total_earned DESC
		LIMIT 10
	`).Scan(&entries)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   entries,
	})
}

// GET /api/affiliate/events
func (ac *AffiliateController) GetEvents(w http.ResponseWriter, r *http.Request) {
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 6) // Default 6 events per page
	offset := (page - 1) * limit

	var events []models.AffiliateEvent
	var total int64

	query := ac.DB.Model(&models.AffiliateEvent{}).Where("is_active = ? AND status != ?", true, "cancelled")
	query.Count(&total)

	err := query.Order("start_time ASC").Offset(offset).Limit(limit).Find(&events).Error
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data event")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":      "success",
		"data":        events,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

// GET /api/affiliate/educations
func (ac *AffiliateController) GetEducations(w http.ResponseWriter, r *http.Request) {
	var educations []models.AffiliateEducation
	ac.DB.Where("is_active = ?", true).Order("is_featured DESC, created_at DESC").Find(&educations)
	
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   educations,
	})
}

// GET /api/affiliate/promo-materials
func (ac *AffiliateController) GetPromoMaterials(w http.ResponseWriter, r *http.Request) {
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 9) // Default 9 materials per page
	offset := (page - 1) * limit
	category := r.URL.Query().Get("category")

	var materials []models.PromoMaterial
	var total int64

	query := ac.DB.Model(&models.PromoMaterial{}).Where("is_active = ?", true)
	if category != "" {
		query = query.Where("LOWER(category) = ?", strings.ToLower(category))
	}

	query.Count(&total)

	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&materials).Error
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil materi promo")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":      "success",
		"data":        materials,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

// POST /api/affiliate/apply-merchant
// Alur: Mitra eligible → submit aplikasi → Admin menerima notif → Admin approve/reject via /api/admin/merchants/verify
func (ac *AffiliateController) ApplyForMerchant(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}
	userID, _ := r.Context().Value("user_id").(string)

	// 1. Cek apakah sudah jadi merchant
	var existingMerchant models.Merchant
	if err := ac.DB.Where("user_id = ?", userID).First(&existingMerchant).Error; err == nil {
		if existingMerchant.Status == "active" {
			utils.JSONError(w, http.StatusConflict, "Anda sudah menjadi Merchant aktif")
			return
		}
		if existingMerchant.Status == "pending" {
			utils.JSONError(w, http.StatusConflict, "Pengajuan Merchant Anda sedang dalam review")
			return
		}
	}

	// 2. Cek eligibility
	isEligible, activeMitra, monthlyTurnover, reqMitra, reqTurnover, _ := ac.Service.CheckMerchantEligibility(affiliateID)
	if !isEligible {
		utils.JSONError(w, http.StatusForbidden,
			fmt.Sprintf("Belum memenuhi syarat. Mitra aktif: %d/%d, Omset tim: Rp %.0f/%.0f", 
				activeMitra, reqMitra, monthlyTurnover, reqTurnover))
		return
	}

	// 3. Parse request body
	var req struct {
		StoreName string `json:"store_name"`
		City      string `json:"city"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.StoreName == "" {
		// Fallback: pakai nama mitra sebagai nama toko sementara
		var profile struct{ FullName string }
		ac.DB.Table("user_profiles").Select("full_name").Where("user_id = ?", userID).Scan(&profile)
		req.StoreName = profile.FullName + " Store"
	}

	// 4. Buat merchant record dengan status pending
	newMerchant := models.Merchant{
		UserID:    userID,
		StoreName: req.StoreName,
		City:      req.City,
		Status:    "pending",
	}
	if err := ac.DB.Create(&newMerchant).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengajukan permohonan Merchant")
		return
	}

	// 5. Notifikasi ke admin
	notifSvc := services.NewNotificationService(ac.DB)
	var aff models.AffiliateMember
	ac.DB.Select("user_id").Where("id = ?", affiliateID).First(&aff)
	msg := fmt.Sprintf("Mitra mengajukan upgrade menjadi Merchant. Omset Tim: Rp %.0f | Mitra Aktif: %d. Toko: '%s'",
		monthlyTurnover, activeMitra, req.StoreName)
	notifSvc.Push("", "admin", "merchant_application", "Pengajuan Merchant Baru 🏪", msg, "/admin/merchants")

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status":  "success",
		"message": "Pengajuan Merchant berhasil dikirim! Tim kami akan meninjau dan menghubungi Anda dalam 3-5 hari kerja.",
		"data": map[string]interface{}{
			"merchant_id": newMerchant.ID,
			"store_name":  newMerchant.StoreName,
			"status":      "pending",
		},
	})
}

// POST /api/affiliate/link-upline
func (ac *AffiliateController) LinkUpline(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}

	var req struct {
		RefCode string `json:"ref_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := ac.Service.LinkUpline(userID, req.RefCode); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Notify Upline
	var upline models.AffiliateMember
	if err := ac.DB.Select("id, user_id").Where("ref_code = ?", req.RefCode).First(&upline).Error; err == nil {
		var memberName struct{ FullName string }
		ac.DB.Table("user_profiles").Select("full_name").Where("user_id = ?", userID).Scan(&memberName)
		
		msg := fmt.Sprintf("%s baru saja bergabung ke tim Anda menggunakan kode referral Anda! 🚀", memberName.FullName)
		ac.Notif.Push(upline.ID, "affiliate", "new_downline", "Mitra Tim Baru", msg, "/affiliate/team")
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "Berhasil bergabung ke jaringan!",
	})
}
func (ac *AffiliateController) GetNotifications(w http.ResponseWriter, r *http.Request) {
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "ID Affiliate tidak ditemukan")
		return
	}

	// [Audit Fix] Get associated UserID to fetch BOTH personal and business notifications
	var affiliate models.AffiliateMember
	if err := ac.DB.Select("user_id").First(&affiliate, "id = ?", affiliateID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Data affiliate tidak ditemukan")
		return
	}

	var notifs []models.Notification
	// Fetch Combined Notifications: (AffiliateID as 'affiliate') OR (UserID as 'user')
	err := ac.DB.Where("(receiver_id = ? AND receiver_type = ?) OR (receiver_id = ? AND receiver_type = ?)", 
		affiliateID, "affiliate", affiliate.UserID, "user").
		Order("created_at desc").
		Limit(30).
		Find(&notifs).Error

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil notifikasi")
		return
	}

	utils.JSONResponse(w, http.StatusOK, notifs)
}

func (ac *AffiliateController) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	notifID := r.URL.Query().Get("id")
	if notifID == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID notifikasi diperlukan")
		return
	}

	if err := ac.Notif.MarkAsRead(notifID); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memperbarui status notifikasi")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Notifikasi ditandai telah dibaca"})
}

func (ac *AffiliateController) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "ID Affiliate tidak ditemukan")
		return
	}

	if err := ac.Notif.MarkAllAsRead(affiliateID, "affiliate"); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menandai semua notifikasi")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Semua notifikasi ditandai telah dibaca"})
}

// DELETE /api/affiliate/notifications?id=...
func (ac *AffiliateController) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID Notifikasi diperlukan")
		return
	}
	if err := ac.Notif.Delete(id); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/affiliate/notifications/all
func (ac *AffiliateController) DeleteAllNotifications(w http.ResponseWriter, r *http.Request) {
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "ID Affiliate tidak ditemukan")
		return
	}
	if err := ac.Notif.DeleteAll(affiliateID, "affiliate"); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus semua notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

