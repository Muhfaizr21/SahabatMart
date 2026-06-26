package controllers

import (
	"akuglow/backend/models"
	"akuglow/backend/utils"
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

	// [BUG-T2 Fix] Parse raw JSON terlebih dahulu untuk tahu field mana yang dikirim frontend
	var rawBody map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&rawBody); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Input tidak valid: "+err.Error())
		return
	}

	sentFields := make(map[string]bool)
	for k := range rawBody {
		sentFields[k] = true
	}

	name, _ := rawBody["name"].(string)
	levelFloat, _ := rawBody["level"].(float64)
	level := int(levelFloat)
	if name == "" || level == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Nama dan Level wajib diisi")
		return
	}

	tierID := uint(0)
	if idFloat, ok := rawBody["id"].(float64); ok {
		tierID = uint(idFloat)
	}

	// Build updates map — HANYA field yg dikirim frontend
	updates := make(map[string]interface{})
	if sentFields["name"] {
		updates["name"] = name
	}
	if sentFields["level"] {
		updates["level"] = level
	}
	if sentFields["min_commission_depth"] {
		updates["min_commission_depth"] = int(rawBody["min_commission_depth"].(float64))
	}
	if sentFields["max_commission_depth"] {
		updates["max_commission_depth"] = int(rawBody["max_commission_depth"].(float64))
	}
	if sentFields["monthly_fee"] {
		updates["monthly_fee"] = rawBody["monthly_fee"].(float64)
	}
	if sentFields["min_withdrawal_amount"] {
		updates["min_withdrawal_amount"] = rawBody["min_withdrawal_amount"].(float64)
	}
	if sentFields["commission_hold_days"] {
		updates["commission_hold_days"] = int(rawBody["commission_hold_days"].(float64))
	}
	if sentFields["cookie_duration_days"] {
		updates["cookie_duration_days"] = int(rawBody["cookie_duration_days"].(float64))
	}
	if sentFields["min_active_mitra"] {
		updates["min_active_mitra"] = int(rawBody["min_active_mitra"].(float64))
	}
	if sentFields["min_monthly_turnover"] {
		updates["min_monthly_turnover"] = rawBody["min_monthly_turnover"].(float64)
	}
	if sentFields["min_total_transactions"] {
		updates["min_total_transactions"] = int(rawBody["min_total_transactions"].(float64))
	}
	if sentFields["min_referrals"] {
		updates["min_referrals"] = int(rawBody["min_referrals"].(float64))
	}
	if sentFields["min_performance_points"] {
		updates["min_performance_points"] = int(rawBody["min_performance_points"].(float64))
	}
	if sentFields["base_commission_rate"] {
		updates["base_commission_rate"] = rawBody["base_commission_rate"].(float64)
	}
	if sentFields["color"] {
		updates["color"] = rawBody["color"].(string)
	}
	if sentFields["icon"] {
		updates["icon"] = rawBody["icon"].(string)
	}
	if sentFields["description"] {
		updates["description"] = rawBody["description"].(string)
	}
	if isActive, ok := rawBody["is_active"]; ok {
		updates["is_active"] = isActive.(bool)
	}

	var result *gorm.DB
	if tierID == 0 {
		tier := models.MembershipTier{
			Name:                name,
			Level:               level,
			BaseCommissionRate:  0.05,
			MinCommissionDepth:  1,
			MaxCommissionDepth:  1,
			MinWithdrawalAmount: 100000,
			CommissionHoldDays:  7,
			CookieDurationDays:  30,
			IsActive:            true,
		}
		// Override defaults with sent fields
		if v, ok := updates["base_commission_rate"]; ok {
			tier.BaseCommissionRate = v.(float64)
		}
		if v, ok := updates["min_commission_depth"]; ok {
			tier.MinCommissionDepth = v.(int)
		}
		if v, ok := updates["max_commission_depth"]; ok {
			tier.MaxCommissionDepth = v.(int)
		}
		if v, ok := updates["monthly_fee"]; ok {
			tier.MonthlyFee = v.(float64)
		}
		if v, ok := updates["min_withdrawal_amount"]; ok {
			tier.MinWithdrawalAmount = v.(float64)
		}
		if v, ok := updates["commission_hold_days"]; ok {
			tier.CommissionHoldDays = v.(int)
		}
		if v, ok := updates["cookie_duration_days"]; ok {
			tier.CookieDurationDays = v.(int)
		}
		if v, ok := updates["min_active_mitra"]; ok {
			tier.MinActiveMitra = v.(int)
		}
		if v, ok := updates["min_monthly_turnover"]; ok {
			tier.MinMonthlyTurnover = v.(float64)
		}
		if v, ok := updates["min_total_transactions"]; ok {
			tier.MinTotalTransactions = v.(int)
		}
		if v, ok := updates["min_referrals"]; ok {
			tier.MinReferrals = v.(int)
		}
		if v, ok := updates["min_performance_points"]; ok {
			tier.MinPerformancePoints = v.(int)
		}
		if v, ok := updates["color"]; ok {
			tier.Color = v.(string)
		}
		if v, ok := updates["icon"]; ok {
			tier.Icon = v.(string)
		}
		if v, ok := updates["description"]; ok {
			tier.Description = v.(string)
		}
		if v, ok := updates["is_active"]; ok {
			tier.IsActive = v.(bool)
		}

		result = c.DB.Create(&tier)
		if result.Error == nil {
			utils.JSONResponse(w, http.StatusOK, tier)
		}
	} else {
		result = c.DB.Model(&models.MembershipTier{}).Where("id = ?", tierID).Updates(updates)
		if result.Error == nil {
			var updated models.MembershipTier
			c.DB.First(&updated, tierID)
			utils.JSONResponse(w, http.StatusOK, updated)
		}
	}

	if result.Error != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan tier: "+result.Error.Error())
		return
	}
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
