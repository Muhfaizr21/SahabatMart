package controllers

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"encoding/json"
	"net/http"
	"strconv"

	"gorm.io/gorm"
)

type MembershipTierController struct {
	DB *gorm.DB
}

func NewMembershipTierController(db *gorm.DB) *MembershipTierController {
	return &MembershipTierController{DB: db}
}

// GET /api/public/membership-tiers — Semua tier (tanpa auth, untuk Status Mitra frontend)
func (c *MembershipTierController) GetPublicTiers(w http.ResponseWriter, r *http.Request) {
	var tiers []models.MembershipTier
	c.DB.Where("is_active = ?", true).Order("level asc").Find(&tiers)
	utils.JSONResponse(w, http.StatusOK, tiers)
}

// GET /api/admin/membership-tiers — List semua tier (superadmin)
func (c *MembershipTierController) GetTiers(w http.ResponseWriter, r *http.Request) {
	var tiers []models.MembershipTier
	c.DB.Order("level asc").Find(&tiers)
	utils.JSONResponse(w, http.StatusOK, tiers)
}

// POST /api/admin/membership-tiers/upsert — Buat/update tier
func (c *MembershipTierController) UpsertTier(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var tier models.MembershipTier
	if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Input tidak valid: "+err.Error())
		return
	}

	if tier.Name == "" || tier.Level == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Nama dan Level wajib diisi")
		return
	}

	// [Sync Fix] Preserve all existing fields if not sent in payload (avoid 0-overwrite)
	if tier.ID != 0 {
		var existing models.MembershipTier
		if err := c.DB.First(&existing, tier.ID).Error; err == nil {
			if tier.MinCommissionDepth == 0    { tier.MinCommissionDepth = existing.MinCommissionDepth }
			if tier.MaxCommissionDepth == 0    { tier.MaxCommissionDepth = existing.MaxCommissionDepth }
			if tier.MonthlyFee == 0             { tier.MonthlyFee = existing.MonthlyFee }
			if tier.MinWithdrawalAmount == 0   { tier.MinWithdrawalAmount = existing.MinWithdrawalAmount }
			tier.CommissionHoldDays = 0
			if tier.CookieDurationDays == 0    { tier.CookieDurationDays = existing.CookieDurationDays }
			if tier.MinActiveMitra == 0        { tier.MinActiveMitra = existing.MinActiveMitra }
			if tier.MinMonthlyTurnover == 0    { tier.MinMonthlyTurnover = existing.MinMonthlyTurnover }
			if tier.MinTotalTransactions == 0  { tier.MinTotalTransactions = existing.MinTotalTransactions }
			if tier.MinReferrals == 0          { tier.MinReferrals = existing.MinReferrals }
			if tier.MinPerformancePoints == 0  { tier.MinPerformancePoints = existing.MinPerformancePoints }
			if tier.BaseCommissionRate == 0    { tier.BaseCommissionRate = existing.BaseCommissionRate }
			if tier.Color == ""                { tier.Color = existing.Color }
			if tier.Icon == ""                 { tier.Icon = existing.Icon }
		}
	}

	var result *gorm.DB
	if tier.ID == 0 {
		// Create baru
		result = c.DB.Create(&tier)
	} else {
		// Update — hanya field yang ada di payload, preserve yang lain
		// [Sync Fix] Update ALL tier fields, including CommissionHoldDays, CookieDurationDays, MinWithdrawalAmount, etc.
		result = c.DB.Model(&models.MembershipTier{}).Where("id = ?", tier.ID).Updates(map[string]interface{}{
			"name":                    tier.Name,
			"level":                  tier.Level,
			"base_commission_rate":   tier.BaseCommissionRate,
			"min_commission_depth":   tier.MinCommissionDepth,
			"max_commission_depth":   tier.MaxCommissionDepth,
			"monthly_fee":            tier.MonthlyFee,
			"min_withdrawal_amount":  tier.MinWithdrawalAmount,
			"commission_hold_days":   tier.CommissionHoldDays,
			"cookie_duration_days":   tier.CookieDurationDays,
			"min_active_mitra":       tier.MinActiveMitra,
			"min_monthly_turnover":   tier.MinMonthlyTurnover,
			"min_total_transactions": tier.MinTotalTransactions,
			"min_referrals":          tier.MinReferrals,
			"min_performance_points": tier.MinPerformancePoints,
			"color":                  tier.Color,
			"icon":                   tier.Icon,
			"description":            tier.Description,
			"is_active":              tier.IsActive,
		})
		// fetch updated record
		c.DB.First(&tier, tier.ID)
	}

	if result.Error != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan tier: "+result.Error.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, tier)
}

// POST /api/admin/membership-tiers/delete — Hapus tier (hanya yang tidak ada affiliatenya)
func (c *MembershipTierController) DeleteTier(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id == 0 {
		utils.JSONError(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	// Cek jika ada affiliate yang masih pakai tier ini
	var count int64
	c.DB.Model(&models.AffiliateMember{}).Where("membership_tier_id = ?", id).Count(&count)
	if count > 0 {
		utils.JSONError(w, http.StatusConflict, "Tier masih digunakan oleh "+strconv.FormatInt(count, 10)+" mitra. Pindahkan terlebih dahulu.")
		return
	}

	if err := c.DB.Delete(&models.MembershipTier{}, id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Tier berhasil dihapus"})
}
