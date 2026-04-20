package controllers

import (
	"encoding/json"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type ProductController struct {
	DB             *gorm.DB
	ProductService *services.ProductService
}

func NewProductController(db *gorm.DB) *ProductController {
	return &ProductController{
		DB:             db,
		ProductService: services.NewProductService(db),
	}
}

// GET /api/public/products/reviews?product_id=...
func (pc *ProductController) GetReviews(w http.ResponseWriter, r *http.Request) {
	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID dibutuhkan")
		return
	}

	reviews, err := pc.ProductService.GetProductReviews(productID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil ulasan")
		return
	}

	utils.JSONResponse(w, http.StatusOK, reviews)
}

// GET /api/buyer/products/can-review?product_id=...
func (pc *ProductController) CheckCanReview(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	productID := r.URL.Query().Get("product_id")

	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID dibutuhkan")
		return
	}

	can, orderID, err := pc.ProductService.CanUserReview(userID, productID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengecek status ulasan")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"can_review": can,
		"order_id":   orderID,
	})
}

// POST /api/buyer/products/review
func (pc *ProductController) SubmitReview(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	var req models.Review
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	req.BuyerID = userID
	if err := pc.ProductService.AddReview(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]string{"message": "Ulasan berhasil dikirim"})
}
