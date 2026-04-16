package controllers

import (
	"encoding/json"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type MerchantController struct {
	Service *services.MerchantService
}

func NewMerchantController(db *gorm.DB) *MerchantController {
	return &MerchantController{
		Service: services.NewMerchantService(db),
	}
}

// GET /api/merchant/products
func (mc *MerchantController) GetProducts(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	products, err := mc.Service.GetProducts(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil daftar produk")
		return
	}

	utils.JSONResponse(w, http.StatusOK, products)
}

// POST /api/merchant/products/add
func (mc *MerchantController) AddProduct(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	var product models.Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	product.MerchantID = merchantID
	if err := mc.Service.AddProduct(&product); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menambahkan produk")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, product)
}

// GET /api/merchant/orders
func (mc *MerchantController) GetOrders(w http.ResponseWriter, r *http.Request) {
	merchantID := r.Context().Value("merchant_id").(string)

	groups, err := mc.Service.GetOrders(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil daftar pesanan")
		return
	}

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
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	group, err := mc.Service.UpdateOrderStatus(req.GroupID, merchantID, req.Status)
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Pesanan tidak ditemukan")
		return
	}

	utils.JSONResponse(w, http.StatusOK, group)
}
