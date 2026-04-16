package controllers

import (
	"net/http"

	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AffiliateController struct {
	Service *services.AffiliateService
}

func NewAffiliateController(db *gorm.DB) *AffiliateController {
	return &AffiliateController{
		Service: services.NewAffiliateService(db),
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

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"affiliate": affiliate,
		"stats": map[string]interface{}{
			"total_clicks": clicks,
		},
	})
}
