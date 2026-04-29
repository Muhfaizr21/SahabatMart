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

	var result *gorm.DB
	if tier.ID == 0 {
		// Create baru
		result = c.DB.Create(&tier)
	} else {
		// Update
		result = c.DB.Save(&tier)
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
