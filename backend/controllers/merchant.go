package controllers

import (
	"encoding/json"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type MerchantController struct {
	DB *gorm.DB
}

// GET /api/merchant/products
func (mc *MerchantController) GetProducts(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	var products []models.Product
	mc.DB.Preload("Variants").Where("merchant_id = ?", merchantID).Find(&products)

	utils.JSONResponse(w, http.StatusOK, products)
}

// POST /api/merchant/products/add
func (mc *MerchantController) AddProduct(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	var product models.Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	product.MerchantID = merchantID
	if err := mc.DB.Create(&product).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create product")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, product)
}

// GET /api/merchant/orders
func (mc *MerchantController) GetOrders(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	var groups []models.OrderMerchantGroup
	mc.DB.Preload("Items").Where("merchant_id = ?", merchantID).Order("created_at desc").Find(&groups)

	utils.JSONResponse(w, http.StatusOK, groups)
}

// POST /api/merchant/orders/status
func (mc *MerchantController) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	var req struct {
		GroupID string `json:"group_id"`
		Status  string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var group models.OrderMerchantGroup
	if err := mc.DB.Where("id = ? AND merchant_id = ?", req.GroupID, merchantID).First(&group).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Order group not found")
		return
	}

	group.Status = models.MerchantOrderStatus(req.Status)
	mc.DB.Save(&group)

	utils.JSONResponse(w, http.StatusOK, group)
}
