package controllers

import (
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AffiliateController struct {
	DB *gorm.DB
}

// GET /api/public/affiliate/track?ref=CODE
func (ac *AffiliateController) TrackClick(w http.ResponseWriter, r *http.Request) {
	refCode := r.URL.Query().Get("ref")
	productID := r.URL.Query().Get("product_id")

	var affiliate models.AffiliateMember
	if err := ac.DB.Where("ref_code = ?", refCode).First(&affiliate).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Affiliate not found")
		return
	}

	click := models.AffiliateClick{
		AffiliateID: affiliate.ID,
		ProductID:   productID,
		Referrer:    r.Referer(),
		IPAddress:   r.RemoteAddr,
		UserAgent:   r.UserAgent(),
	}
	ac.DB.Create(&click)

	// In real app, we would set a cookie here for attribution
	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Click tracked",
		"affiliate_id": affiliate.ID,
	})
}

// GET /api/affiliate/dashboard
func (ac *AffiliateController) GetDashboard(w http.ResponseWriter, r *http.Request) {
	affiliateID := r.Context().Value("affiliate_id").(string)

	var affiliate models.AffiliateMember
	ac.DB.Preload("Tier").First(&affiliate, "id = ?", affiliateID)

	var totalClicks int64
	ac.DB.Model(&models.AffiliateClick{}).Where("affiliate_id = ?", affiliateID).Count(&totalClicks)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"affiliate": affiliate,
		"stats": map[string]interface{}{
			"total_clicks": totalClicks,
		},
	})
}
