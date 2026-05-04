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
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	affiliate, clicks, err := ac.Service.GetDashboardStats(affiliateID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data dashboard")
		return
	}

	// [Sync Fix] Total komisi by status (approved = bisa tarik, pending = dalam hold, paid = sudah cair)
	var approvedCommission, pendingCommission, paidCommission float64
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'approved'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&approvedCommission)
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'pending'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&pendingCommission)
	ac.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status = 'paid'", affiliateID).
		Select("COALESCE(SUM(amount), 0)").Scan(&paidCommission)

	// [Sync Fix] Total order dari orders table (bukan commission count)
	var totalOrders, totalOrdersPending int64
	ac.DB.Model(&models.Order{}).
		Where("affiliate_id = ? AND status NOT IN ?", affiliateID, []string{"cancelled", "expired"}).
		Count(&totalOrders)
	ac.DB.Model(&models.Order{}).
		Where("affiliate_id = ? AND status = 'pending_payment'", affiliateID).
		Count(&totalOrdersPending)

	// Monthly commission chart (last 6 months)
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
		WHERE affiliate_id = ? AND created_at >= NOW() - INTERVAL '6 months'
		GROUP BY DATE_TRUNC('month', created_at)
		ORDER BY DATE_TRUNC('month', created_at) ASC
	`, affiliateID).Scan(&monthlyData)

	// Recent commissions
	type RecentComm struct {
		ID          string    `json:"id"`
		OrderID     string    `json:"order_id"`
		ProductName string    `json:"product_name"`
		Amount      float64   `json:"amount"`
		Status      string    `json:"status"`
		CreatedAt   time.Time `json:"created_at"`
	}
	var recentCommissions []RecentComm
	ac.DB.Raw(`
		SELECT ac.id, ac.order_id, 
		       COALESCE(p.name, 'Produk') AS product_name,
		       ac.amount, ac.status, ac.created_at
		FROM affiliate_commissions ac
		LEFT JOIN products p ON p.id::text = ac.product_id::text
		WHERE ac.affiliate_id = ?
		ORDER BY ac.created_at DESC
		LIMIT 5
	`, affiliateID).Scan(&recentCommissions)

	// [Sync Fix] Use Wallet as Single Source of Truth
	var wallet models.Wallet
	ac.DB.Where("owner_id = ? AND owner_type = ?", affiliateID, models.WalletAffiliate).First(&wallet)

	// Available balance is now directly from Wallet
	availableBalance := wallet.Balance
	pendingCommission = wallet.PendingBalance

	// [Sync Fix] Total downline — cari by id, bukan user_id
	var totalDownline int64
	ac.DB.Model(&models.AffiliateMember{}).Where("upline_id = ?", affiliateID).Count(&totalDownline)

	// Fetch next tier requirements for dynamic progress bar
	var nextTier models.MembershipTier
	reqMitra := 10
	reqTurnover := 0.0
	if affiliate.MembershipTierID > 0 {
		var currentTier models.MembershipTier
		if err := ac.DB.First(&currentTier, "id = ?", affiliate.MembershipTierID).Error; err == nil {
			if err := ac.DB.Where("level > ? AND is_active = true", currentTier.Level).Order("level ASC").First(&nextTier).Error; err == nil {
				reqMitra = nextTier.MinActiveMitra
				reqTurnover = nextTier.MinMonthlyTurnover
			} else {
				// Sudah tier maksimum
				reqMitra = currentTier.MinActiveMitra
				reqTurnover = currentTier.MinMonthlyTurnover
			}
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"affiliate": affiliate,
		"stats": map[string]interface{}{
			"total_clicks":         clicks,
			"total_orders":         totalOrders,
			"total_orders_pending": totalOrdersPending,
			// Komisi
			"total_commission":     approvedCommission + pendingCommission + paidCommission,
			"approved_commission":  approvedCommission,
			"pending_commission":   pendingCommission,
			"paid_commission":      paidCommission,
			"balance":              availableBalance,
			// Tim
			"total_downline":       totalDownline,
			"active_mitra_count":   affiliate.ActiveMitraCount,
			"team_monthly_turnover": affiliate.TeamMonthlyTurnover,
			"next_tier_req_mitra":  reqMitra,
			"next_tier_req_turnover": reqTurnover,
		},
		"monthly_data":       monthlyData,
		"recent_commissions": recentCommissions,
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
	ac.DB.Raw(`
		SELECT p.id, p.name, p.price, p.image, p.category, 
		       'Official Store' as store_name,
		       COALESCE(cc.fee_percent, 0.00) AS comm_rate,
		       COALESCE(SUM(oi.quantity), 0) AS total_sold
		FROM products p
		LEFT JOIN category_commissions cc ON LOWER(cc.category_name) = LOWER(p.category)
		LEFT JOIN order_items oi ON oi.product_id = p.id
		WHERE p.status = 'active'
		GROUP BY p.id, p.name, p.price, p.image, p.category, cc.fee_percent
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

	// Minimum withdrawal amount (from config, tier or default 50000)
	configSvc := services.NewConfigService(ac.DB)
	minWithdrawal := configSvc.GetFloat("payout_min_amount", 50000.0)
	
	if affiliate.Tier != nil && affiliate.Tier.MinWithdrawalAmount > 0 {
		// Tier setting takes precedence if it's stricter? 
		// Actually usually config is global, let's take the higher one.
		if affiliate.Tier.MinWithdrawalAmount > minWithdrawal {
			minWithdrawal = affiliate.Tier.MinWithdrawalAmount
		}
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
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
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
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
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

	// Get downlines list
	type DownlineRow struct {
		UserID    string    `json:"user_id"`
		FullName  string    `json:"full_name"`
		Status    string    `json:"status"`
		JoinedAt  time.Time `json:"joined_at"`
		Turnover  float64   `json:"turnover"`
	}
	var downlines []DownlineRow
	ac.DB.Raw(`
		SELECT am.user_id, up.full_name, am.status, am.created_at as joined_at,
		       COALESCE(SUM(o.subtotal), 0) as turnover
		FROM affiliate_members am
		LEFT JOIN user_profiles up ON up.user_id = am.user_id
		LEFT JOIN orders o ON o.affiliate_id = am.id AND o.status IN ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed')
		WHERE am.upline_id = ?
		GROUP BY am.user_id, up.full_name, am.status, am.created_at
		ORDER BY am.created_at DESC
	`, affiliateID).Scan(&downlines)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_downlines": totalDownlines,
		"team_turnover":   teamTurnover,
		"downlines":       downlines,
	})
}

// GET /api/affiliate/merchant-eligibility
func (ac *AffiliateController) CheckMerchantEligibility(w http.ResponseWriter, r *http.Request) {
	affiliateID, _ := r.Context().Value("affiliate_id").(string)
	if _, err := uuid.Parse(affiliateID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi affiliate tidak valid")
		return
	}

	isEligible, activeMitra, monthlyTurnover, reqMitra, reqTurnover := ac.Service.CheckMerchantEligibility(affiliateID)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"is_eligible":      isEligible,
		"active_mitra":     activeMitra,
		"monthly_turnover": monthlyTurnover,
		"requirements": map[string]interface{}{
			"min_mitra":    reqMitra,
			"min_turnover": reqTurnover,
		},
	})
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
		WHERE am.status = 'active'
		GROUP BY am.id, up.full_name, mt.name
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
	isEligible, activeMitra, monthlyTurnover, reqMitra, reqTurnover := ac.Service.CheckMerchantEligibility(affiliateID)
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

