package controllers

import (
	"encoding/json"
	"net/http"
	"akuglow/backend/models"
	"akuglow/backend/utils"
)

// GetMerchantCommissionPresets returns all merchant commission presets
func (c *AdminController) GetMerchantCommissionPresets(w http.ResponseWriter, r *http.Request) {
	presets := []models.MerchantCommissionPreset{}
	if err := c.DB.Order("name asc").Find(&presets).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data preset")
		return
	}
	utils.JSONResponse(w, 200, presets)
}

// UpsertMerchantCommissionPreset creates or updates a merchant commission preset
func (c *AdminController) UpsertMerchantCommissionPreset(w http.ResponseWriter, r *http.Request) {
	var payload models.MerchantCommissionPreset
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if payload.Name == "" {
		utils.JSONError(w, http.StatusBadRequest, "Nama preset wajib diisi")
		return
	}

	// Sync Rate to Decimal (UI sends 10 for 10%, we store 0.1)
	payload.Rate = payload.Rate / 100.0

	if payload.ID != "" {
		if err := c.DB.Save(&payload).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal update preset")
			return
		}
	} else {
		if err := c.DB.Create(&payload).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat preset")
			return
		}
	}

	utils.JSONResponse(w, 200, map[string]interface{}{"message": "Sukses", "data": payload})
}

// DeleteMerchantCommissionPreset deletes a merchant commission preset
func (c *AdminController) DeleteMerchantCommissionPreset(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID tidak boleh kosong")
		return
	}

	if err := c.DB.Where("id = ?", id).Delete(&models.MerchantCommissionPreset{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus preset")
		return
	}
	utils.JSONResponse(w, 200, map[string]interface{}{"message": "Terhapus"})
}
