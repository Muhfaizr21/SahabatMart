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
	BuyerService *services.BuyerService
}

func NewBuyerController(db *gorm.DB) *BuyerController {
	return &BuyerController{
		DB:           db,
		OrderService: services.NewOrderService(db),
		BuyerService: services.NewBuyerService(db),
	}
}

// GET /api/buyer/cart
func (bc *BuyerController) GetCart(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var cart models.Cart
	// Deep Preload: Mengambil cart -> items -> product & variant sekaligus
	err := bc.DB.Preload("Items.Product").Preload("Items.ProductVariant").Where("buyer_id = ?", buyerID).First(&cart).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("[Cart] No cart found for buyer %s, creating empty cart", buyerID)
			cart = models.Cart{BuyerID: buyerID}
			bc.DB.Create(&cart)
		} else {
			log.Printf("[Cart] ERROR fetching cart for %s: %v", buyerID, err)
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil keranjang: "+err.Error())
			return
		}
	}

	log.Printf("[Cart] Found cart %s for buyer %s with %d items", cart.ID, buyerID, len(cart.Items))
	utils.JSONResponse(w, http.StatusOK, cart)
}

// POST /api/buyer/cart/add
func (bc *BuyerController) AddToCart(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var req struct {
		ProductID        string `json:"product_id"`
		ProductVariantID string `json:"product_variant_id"`
		Quantity         int    `json:"quantity"`
		Metadata         string `json:"metadata"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	if err := bc.BuyerService.AddToCart(buyerID, req.ProductID, req.ProductVariantID, req.Quantity, req.Metadata); err != nil {
		log.Printf("Add to Cart error (BuyerID: %s, ProductID: %s): %v", buyerID, req.ProductID, err)
		utils.JSONError(w, http.StatusBadRequest, "Gagal menambah ke keranjang: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Item berhasil ditambahkan ke keranjang"})
}

// POST /api/buyer/cart/move-from-wishlist
func (bc *BuyerController) MoveToCart(w http.ResponseWriter, r *http.Request) {
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

	if err := bc.BuyerService.MoveFromWishlistToCart(buyerID, req.ProductID, req.ProductVariantID, req.Quantity); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Produk berhasil dipindahkan ke keranjang"})
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
			Metadata:         ci.Metadata, // Propagate metadata from cart to order
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
	
	// Standard GORM query with Preload to get all needed associations (variants, etc)
	err := bc.DB.Model(&models.Product{}).
		Joins("INNER JOIN wishlists ON wishlists.product_id = products.id").
		Where("wishlists.buyer_id = ?", buyerID).
		Preload("Variants").
		Find(&products).Error

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

	var req struct {
		ProductID string `json:"product_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	saved, err := bc.BuyerService.ToggleWishlist(buyerID, req.ProductID)
	if err != nil {
		log.Printf("Wishlist error (BuyerID: %s, ProductID: %s): %v", buyerID, req.ProductID, err)
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengelola wishlist: "+err.Error())
		return
	}

	message := "Produk ditambahkan ke wishlist"
	if !saved {
		message = "Produk dihapus dari wishlist"
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": message,
		"saved":   saved,
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
 
 	_, err := bc.BuyerService.ToggleWishlist(buyerID, productID)
	if err != nil {
		log.Printf("Remove from Wishlist error (BuyerID: %s, ProductID: %s): %v", buyerID, productID, err)
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus dari wishlist: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Produk dihapus dari wishlist",
		"saved":   false,
	})
}

// GET /api/buyer/orders
func (bc *BuyerController) GetOrders(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)

	var orders []models.Order
	bc.DB.Preload("MerchantGroups.Items").Where("buyer_id = ?", buyerID).Order("created_at desc").Find(&orders)

	utils.JSONResponse(w, http.StatusOK, orders)
}

// DELETE /api/buyer/cart/item?product_id=...&variant_id=...
func (bc *BuyerController) RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)
	productID := r.URL.Query().Get("product_id")
	variantID := r.URL.Query().Get("variant_id")

	if productID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Product ID dibutuhkan")
		return
	}

	var cart models.Cart
	if err := bc.DB.Where("buyer_id = ?", buyerID).First(&cart).Error; err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Keranjang tidak ditemukan")
		return
	}

	query := bc.DB.Where("cart_id = ? AND product_id = ?", cart.ID, productID)
	if variantID != "" {
		query = query.Where("product_variant_id = ?", variantID)
	}

	if err := query.Delete(&models.CartItem{}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus item dari keranjang")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Item dihapus dari keranjang"})
}

// GET /api/buyer/profile
func (bc *BuyerController) GetProfile(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)
	var user models.User

	err := bc.DB.Preload("Profile").Where("id = ?", buyerID).First(&user).Error
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Profil tidak ditemukan")
		return
	}

	var orders []models.Order
	bc.DB.Preload("MerchantGroups.Items").Where("buyer_id = ?", buyerID).Order("created_at desc").Find(&orders)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"user":   user,
		"orders": orders,
	})
}

func (bc *BuyerController) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	buyerID := r.Context().Value("user_id").(string)

	var req struct {
		FullName    string `json:"full_name"`
		Gender      string `json:"gender"`
		DateOfBirth string `json:"date_of_birth"`
		Phone       string `json:"phone"`
		Address     string `json:"address"`
		City        string `json:"city"`
		Province    string `json:"province"`
		ZipCode     string `json:"zip_code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	err := bc.DB.Transaction(func(tx *gorm.DB) error {
		// Update User Phone
		if err := tx.Model(&models.User{}).Where("id = ?", buyerID).Update("phone", req.Phone).Error; err != nil {
			return err
		}

		// Update Profile
		var profile models.UserProfile
		if err := tx.Where("user_id = ?", buyerID).First(&profile).Error; err != nil {
			return err
		}

		profile.FullName = req.FullName
		profile.Gender = &req.Gender
		profile.Address = req.Address
		profile.City = req.City
		profile.Province = req.Province
		profile.ZipCode = req.ZipCode

		if req.DateOfBirth != "" {
			profile.DateOfBirth = &req.DateOfBirth
		}

		if err := tx.Save(&profile).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memperbarui profil: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Profil berhasil diperbarui",
	})
}
