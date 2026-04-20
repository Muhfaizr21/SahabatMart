package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AffiliateController struct {
	Service *services.AffiliateService
	DB      *gorm.DB
}

func NewAffiliateController(db *gorm.DB, notif *services.NotificationService) *AffiliateController {
	return &AffiliateController{
		Service: services.NewAffiliateService(db, notif),
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

	affiliate, err := ac.Service.TrackClick(refCode, productID, r.Referer(), r.RemoteAddr, r.UserAgent(), sub1, sub2, sub3)
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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}

	affiliate, clicks, err := ac.Service.GetDashboardStats(affiliateID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data dashboard")
		return
	}

	// Total commissions
	var totalCommission, pendingCommission, totalWithdrawn float64
	var totalConversions int64
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'approved'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalCommission)
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'pending'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&pendingCommission)
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'paid'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalWithdrawn)
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ?", affiliateID).
		Count(&totalConversions)

	// Monthly commission chart (last 6 months)
	type MonthlyData struct {
		Month      string  `json:"month"`
		Commission float64 `json:"commission"`
		Clicks     int     `json:"clicks"`
	}
	var monthlyData []MonthlyData
	ac.DB.Raw(`
		SELECT TO_CHAR(created_at, 'Mon YY') AS month,
		       COALESCE(SUM(amount), 0) AS commission,
		       0 AS clicks
		FROM affiliate_commissions
		WHERE affiliate_id = ? AND created_at >= NOW() - INTERVAL '6 months'
		GROUP BY TO_CHAR(created_at, 'Mon YY'), DATE_TRUNC('month', created_at)
		ORDER BY DATE_TRUNC('month', created_at) ASC
	`, affiliateID).Scan(&monthlyData)

	// Recent commissions
	var recentCommissions []models.AffiliateCommission
	ac.DB.Where("affiliate_id = ?", affiliateID).
		Order("created_at DESC").Limit(5).
		Find(&recentCommissions)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"affiliate": affiliate,
		"stats": map[string]interface{}{
			"total_clicks":       clicks,
			"total_conversions":  totalConversions,
			"total_commission":   totalCommission,
			"pending_commission": pendingCommission,
			"total_withdrawn":    totalWithdrawn,
			"balance":            totalCommission - totalWithdrawn,
		},
		"monthly_data":        monthlyData,
		"recent_commissions":  recentCommissions,
	})
}

// GET /api/affiliate/commissions
func (ac *AffiliateController) GetCommissions(w http.ResponseWriter, r *http.Request) {
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
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

	var rows []CommRow
	query.Order("ac.created_at DESC").Limit(200).Scan(&rows)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  len(rows),
		"data":   rows,
	})
}

// GET /api/affiliate/links
func (ac *AffiliateController) GetLinks(w http.ResponseWriter, r *http.Request) {
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
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
	ac.DB.Raw(`
		SELECT p.id, p.name, p.price, p.image, p.category, m.store_name,
		       COALESCE(cc.fee_percent, 0.05) AS comm_rate,
		       COALESCE(SUM(oi.quantity), 0) AS total_sold
		FROM products p
		LEFT JOIN merchants m ON m.id = p.merchant_id
		LEFT JOIN category_commissions cc ON LOWER(cc.category_name) = LOWER(p.category)
		LEFT JOIN order_items oi ON oi.product_id = p.id
		WHERE p.status = 'active'
		GROUP BY p.id, p.name, p.price, p.image, p.category, m.store_name, cc.fee_percent
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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	// Get affiliate member for bank info & balance
	var affiliate models.AffiliateMember
	if err := ac.DB.Preload("Tier").Where("id = ?", affiliateID).First(&affiliate).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Affiliate tidak ditemukan")
		return
	}

	// Validate bank info
	if affiliate.BankName == "" || affiliate.BankAccountNumber == "" {
		utils.JSONError(w, http.StatusBadRequest, "Harap lengkapi informasi rekening bank di pengaturan terlebih dahulu")
		return
	}

	// Calculate available balance (approved earnings - withdrawn/in-flight)
	var totalApproved, totalInFlight float64
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'approved'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalApproved)
	ac.DB.Raw(`SELECT COALESCE(SUM(amount), 0) FROM affiliate_withdrawals WHERE affiliate_id = ? AND status IN ('pending','processed')`, affiliateID).Scan(&totalInFlight)

	availableBalance := totalApproved - totalInFlight

	// Minimum withdrawal amount (from tier or default 50000)
	minWithdrawal := 50000.0
	if affiliate.Tier != nil && affiliate.Tier.MinWithdrawalAmount > 0 {
		minWithdrawal = affiliate.Tier.MinWithdrawalAmount
	}

	if req.Amount < minWithdrawal {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("Minimum penarikan adalah Rp %.0f", minWithdrawal))
		return
	}

	if req.Amount > availableBalance {
		utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("Saldo tidak mencukupi. Saldo tersedia: Rp %.0f", availableBalance))
		return
	}

	// Create withdrawal using model
	wd := models.AffiliateWithdrawal{
		AffiliateID:       affiliateID,
		Amount:            req.Amount,
		BankName:          affiliate.BankName,
		BankAccountNumber: affiliate.BankAccountNumber,
		BankAccountName:   affiliate.BankAccountName,
		Status:            "pending",
	}
	if err := ac.DB.Create(&wd).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat permintaan penarikan")
		return
	}

	// Notify admin
	notifSvc := services.NewNotificationService(ac.DB)
	var aff models.User
	ac.DB.Select("email").Where("id = ?", affiliate.UserID).First(&aff)
	msg := fmt.Sprintf("Affiliate '%s' mengajukan penarikan komisi sebesar Rp %.0f.", affiliate.BankAccountName, req.Amount)
	notifSvc.Push("", "admin", "affiliate_withdrawal_request", "Permintaan Penarikan Afiliasi", msg, "/admin/affiliates")

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status":  "success",
		"message": "Permintaan penarikan berhasil dikirim. Tim kami akan memprosesnya dalam 1-3 hari kerja.",
		"data":    wd,
	})
}

// GET /api/affiliate/profile
func (ac *AffiliateController) GetProfile(w http.ResponseWriter, r *http.Request) {
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}
	userID, _ := r.Context().Value("user_id").(string)

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
	affiliateID, ok := r.Context().Value("affiliate_id").(string)
	if !ok || affiliateID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}
	userID, _ := r.Context().Value("user_id").(string)

	var req struct {
		FullName          string `json:"full_name"`
		BankName          string `json:"bank_name"`
		BankAccountNumber string `json:"bank_account_number"`
		BankAccountName   string `json:"bank_account_name"`
		PostbackURL       string `json:"postback_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.FullName != "" {
		ac.DB.Table("user_profiles").Where("user_id = ?", userID).Update("full_name", req.FullName)
	}

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
	if req.PostbackURL != "" {
		updates["postback_url"] = req.PostbackURL
	}

	if len(updates) > 0 {
		ac.DB.Table("affiliate_members").Where("id = ?", affiliateID).Updates(updates)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
