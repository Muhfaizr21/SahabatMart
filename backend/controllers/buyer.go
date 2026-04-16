package controllers

import (
	"encoding/json"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type BuyerController struct {
	DB *gorm.DB
}

// GET /api/buyer/cart
func (bc *BuyerController) GetCart(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var cart models.Cart
	if err := bc.DB.Preload("Items").Where("buyer_id = ?", buyerID).First(&cart).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			cart = models.Cart{BuyerID: buyerID}
			bc.DB.Create(&cart)
		} else {
			utils.JSONError(w, http.StatusInternalServerError, "Failed to get cart")
			return
		}
	}

	utils.JSONResponse(w, http.StatusOK, cart)
}

// POST /api/buyer/cart/add
func (bc *BuyerController) AddToCart(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var req struct {
		ProductID        string `json:"product_id"`
		ProductVariantID string `json:"product_variant_id"`
		Quantity         int    `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var cart models.Cart
	bc.DB.Where("buyer_id = ?", buyerID).First(&cart)
	if cart.ID == "" {
		cart = models.Cart{BuyerID: buyerID}
		bc.DB.Create(&cart)
	}

	var item models.CartItem
	bc.DB.Where("cart_id = ? AND product_variant_id = ?", cart.ID, req.ProductVariantID).First(&item)

	if item.ID != "" {
		item.Quantity += req.Quantity
		bc.DB.Save(&item)
	} else {
		item = models.CartItem{
			CartID:           cart.ID,
			ProductID:        req.ProductID,
			ProductVariantID: req.ProductVariantID,
			Quantity:         req.Quantity,
		}
		bc.DB.Create(&item)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Item added to cart"})
}

// POST /api/buyer/checkout
func (bc *BuyerController) Checkout(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var req struct {
		ShippingInfo models.Order `json:"shipping_info"`
		AffiliateID  *string      `json:"affiliate_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// 1. Get Cart Items
	var cart models.Cart
	if err := bc.DB.Preload("Items").Where("buyer_id = ?", buyerID).First(&cart).Error; err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Cart is empty")
		return
	}

	if len(cart.Items) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Cart is empty")
		return
	}

	// 2. Convert CartItems to OrderItems (Simplified for logic)
	var orderItems []models.OrderItem
	for _, ci := range cart.Items {
		var variant models.ProductVariant
		if err := bc.DB.First(&variant, "id = ?", ci.ProductVariantID).Error; err != nil {
			continue
		}
		
		var product models.Product
		bc.DB.First(&product, "id = ?", ci.ProductID)

		orderItems = append(orderItems, models.OrderItem{
			MerchantID:       product.MerchantID,
			ProductID:        ci.ProductID,
			ProductVariantID: ci.ProductVariantID,
			ProductName:      product.Name,
			VariantName:      variant.Name,
			SKU:              variant.SKU,
			UnitPrice:        variant.Price,
			Quantity:         ci.Quantity,
			ProductImageURL:  product.Image,
		})
	}

	// 3. Create Order using Split Logic
	order, err := utils.CreateOrder(bc.DB, buyerID, orderItems, req.AffiliateID, req.ShippingInfo)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create order: "+err.Error())
		return
	}

	// 4. Clear Cart
	bc.DB.Where("cart_id = ?", cart.ID).Delete(&models.CartItem{})

	utils.JSONResponse(w, http.StatusCreated, order)
}

// GET /api/buyer/orders
func (bc *BuyerController) GetOrders(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var orders []models.Order
	bc.DB.Preload("MerchantGroups.Items").Where("buyer_id = ?", buyerID).Order("created_at desc").Find(&orders)

	utils.JSONResponse(w, http.StatusOK, orders)
}
