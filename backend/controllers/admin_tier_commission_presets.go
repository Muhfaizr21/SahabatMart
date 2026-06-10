package controllers

import (
	"encoding/json"
	"net/http"
	"akuglow/backend/models"
	"akuglow/backend/utils"
)

func (c *AdminController) GetTierCommissionPresets(w http.ResponseWriter, r *http.Request) {
	presets := []models.TierCommissionPreset{}
	if err := c.DB.Preload("Tiers").Find(&presets).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data preset")
		return
	}
	utils.JSONResponse(w, 200, presets)
}

func (c *AdminController) UpsertTierCommissionPreset(w http.ResponseWriter, r *http.Request) {
	var payload models.TierCommissionPreset
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if payload.ID != "" {
		// hapus item lama agar bersih
		c.DB.Where("preset_id = ?", payload.ID).Delete(&models.TierCommissionPresetItem{})
		
		// Sync Rate to Decimal (Percentage -> Decimal)
		for i := range payload.Tiers {
			payload.Tiers[i].CommissionRate = payload.Tiers[i].CommissionRate / 100.0
		}

		if err := c.DB.Save(&payload).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal update preset")
			return
		}
	} else {
		// New Preset - Sync Rate to Decimal
		for i := range payload.Tiers {
			payload.Tiers[i].CommissionRate = payload.Tiers[i].CommissionRate / 100.0
		}
		if err := c.DB.Create(&payload).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat preset")
			return
		}
	}
	utils.JSONResponse(w, 200, map[string]interface{}{"message": "Sukses", "data": payload})
}

func (c *AdminController) DeleteTierCommissionPreset(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID tidak boleh kosong")
		return
	}
	if err := c.DB.Where("id = ?", id).Delete(&models.TierCommissionPreset{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus preset")
		return
	}
	utils.JSONResponse(w, 200, map[string]interface{}{"message": "Terhapus"})
}
