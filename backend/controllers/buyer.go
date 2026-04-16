package controllers

import (
	"encoding/json"
	"log"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type BuyerController struct {
	DB           *gorm.DB
	OrderService *services.OrderService
}

func NewBuyerController(db *gorm.DB) *BuyerController {
	return &BuyerController{
		DB:           db,
		OrderService: services.NewOrderService(db),
	}
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
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil keranjang")
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
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
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

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Item berhasil ditambahkan ke keranjang"})
}

// POST /api/buyer/checkout
func (bc *BuyerController) Checkout(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var req struct {
		ShippingInfo models.Order `json:"shipping_info"`
		AffiliateID  *string      `json:"affiliate_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	var cart models.Cart
	if err := bc.DB.Preload("Items").Where("buyer_id = ?", buyerID).First(&cart).Error; err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Keranjang kosong")
		return
	}

	if len(cart.Items) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Keranjang kosong")
		return
	}

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

	order, err := bc.OrderService.CreateOrder(buyerID, orderItems, req.AffiliateID, req.ShippingInfo)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat pesanan: "+err.Error())
		return
	}

	bc.DB.Where("cart_id = ?", cart.ID).Delete(&models.CartItem{})

	utils.JSONResponse(w, http.StatusCreated, order)
}

// GET /api/buyer/wishlist
func (bc *BuyerController) GetWishlist(w http.ResponseWriter, r *http.Request) {
	buyerID, ok := r.Context().Value("user_id").(string)
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}

	log.Printf("[Wishlist] Fetching for Buyer: %s", buyerID)

	var products []models.Product
	
	// Refactored query for better GORM compatibility and field mapping
	// Using Table("products") + Scan to ensure columns match correctly
	err := bc.DB.Table("products").
		Select("products.*").
		Joins("INNER JOIN wishlists ON wishlists.product_id = products.id").
		Where("wishlists.buyer_id = ?", buyerID).
		Scan(&products).Error

	if err != nil {
		log.Printf("[Wishlist] Error: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil wishlist")
		return
	}

	log.Printf("[Wishlist] Found %d items", len(products))
	utils.JSONResponse(w, http.StatusOK, products)
}

// POST /api/buyer/wishlist/add
func (bc *BuyerController) AddToWishlist(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)
	
	log.Printf("[Wishlist] Adding item... Buyer: %s", buyerID)

	var req struct {
		ProductID string `json:"product_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	if req.ProductID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID tidak boleh kosong")
		return
	}

	// Check if already exist
	var exist models.Wishlist
	if err := bc.DB.Where("buyer_id = ? AND product_id = ?", buyerID, req.ProductID).First(&exist).Error; err == nil {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"message": "Produk sudah ada di wishlist",
			"saved": true,
		})
		return
	}

	wish := models.Wishlist{
		BuyerID:   buyerID,
		ProductID: req.ProductID,
	}

	if err := bc.DB.Create(&wish).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menambah ke wishlist")
		return
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message": "Produk ditambahkan ke wishlist",
		"saved": true,
	})
}

// GET /api/buyer/wishlist/check?product_id=...
func (bc *BuyerController) CheckWishlist(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)
	productID := r.URL.Query().Get("product_id")

	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID dibutuhkan")
		return
	}

	var exist models.Wishlist
	err := bc.DB.Where("buyer_id = ? AND product_id = ?", buyerID, productID).First(&exist).Error
	
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"is_wishlisted": err == nil,
	})
}

// DELETE /api/buyer/wishlist/remove
func (bc *BuyerController) RemoveFromWishlist(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)
	productID := r.URL.Query().Get("product_id")

	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID dibutuhkan")
		return
	}

	if err := bc.DB.Where("buyer_id = ? AND product_id = ?", buyerID, productID).Delete(&models.Wishlist{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus dari wishlist")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Produk dihapus dari wishlist",
		"saved": false,
	})
}

// GET /api/buyer/orders
func (bc *BuyerController) GetOrders(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var orders []models.Order
	bc.DB.Preload("MerchantGroups.Items").Where("buyer_id = ?", buyerID).Order("created_at desc").Find(&orders)

	utils.JSONResponse(w, http.StatusOK, orders)
}
