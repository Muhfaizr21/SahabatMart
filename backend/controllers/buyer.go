package controllers

import (
	"encoding/json"
	"log"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"
	"math"
	"os"
	"strings"

	"gorm.io/gorm"
)

type BuyerController struct {
	DB           *gorm.DB
	OrderService *services.OrderService
	BuyerService *services.BuyerService
	AuthService  *services.AuthService
	TripayService *services.TripayService
}
func NewBuyerController(db *gorm.DB) *BuyerController {
	return &BuyerController{
		DB:           db,
		OrderService: services.NewOrderService(db),
		BuyerService: services.NewBuyerService(db),
		AuthService:  services.NewAuthService(db),
		TripayService: services.NewTripayService(),
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
		MerchantID       string `json:"merchant_id"`
		Quantity         int    `json:"quantity"`
		Metadata         string `json:"metadata"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	if req.MerchantID == "" || req.MerchantID == "pusat" {
		req.MerchantID = "00000000-0000-0000-0000-000000000000"
	}
	if req.ProductVariantID == "" {
		req.ProductVariantID = req.ProductID // Fallback if no variant provided
	}

	if err := bc.BuyerService.AddToCart(buyerID, req.ProductID, req.ProductVariantID, req.MerchantID, req.Quantity, req.Metadata); err != nil {
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
		Items         []models.OrderItem `json:"items"`
		ShippingInfo  models.Order       `json:"shipping_info"`
		VoucherCode   string             `json:"voucher_code"`
		AffiliateID   *string            `json:"affiliate_id"`
		PaymentMethod string             `json:"payment_method"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	req.ShippingInfo.VoucherCode = req.VoucherCode
	order, err := bc.OrderService.CreateOrder(buyerID, req.Items, req.AffiliateID, req.ShippingInfo)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat pesanan: "+err.Error())
		return
	}

	// Integrasi TriPay: Jika metode pembayaran dipilih, buat transaksi di TriPay
	var paymentData map[string]interface{}
	if req.PaymentMethod != "" && req.PaymentMethod != "manual" {
		// Ambil data item lengkap untuk TriPay
		bc.DB.Preload("Items").First(order, "id = ?", order.ID)
		
		tripayResult, err := bc.getTripayData(order, req.PaymentMethod)
		if err != nil {
			log.Printf("⚠️ TriPay Request Error: %v", err)
			// Tetap lanjut, biarkan user melihat order tapi mungkin bayar manual nanti
		} else {
			paymentData = tripayResult["data"].(map[string]interface{})
			
			// Save Payment Record to Database
			payment := models.Payment{
				OrderID:              order.ID,
				PaymentMethod:        req.PaymentMethod,
				Status:               models.PaymentPending,
				Gateway:              "tripay",
				GatewayTransactionID: paymentData["reference"].(string),
				GatewayOrderID:      paymentData["merchant_ref"].(string),
				Amount:               order.GrandTotal,
			}
			
			respJson, _ := json.Marshal(paymentData)
			payment.GatewayResponse = string(respJson)
			
			if err := bc.DB.Create(&payment).Error; err != nil {
				log.Printf("⚠️ Failed to save payment record: %v", err)
			}
		}
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"order":   order,
		"payment": paymentData,
	})
}

// GET /api/buyer/orders/payment-instructions?order_id=...
func (bc *BuyerController) GetPaymentInstructions(w http.ResponseWriter, r *http.Request) {
	orderID := r.URL.Query().Get("order_id")
	if orderID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Order ID is required")
		return
	}

	var payment models.Payment
	if err := bc.DB.Where("order_id = ?", orderID).First(&payment).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Payment record not found")
		return
	}

	// Fetch fresh instructions from TriPay
	result, err := bc.TripayService.GetInstructions(payment.PaymentMethod, payment.GatewayTransactionID, payment.Amount)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to fetch instructions: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

// Helper to get TriPay Instructions (Optional, but good for UX)
func (bc *BuyerController) getTripayData(order *models.Order, paymentMethod string) (map[string]interface{}, error) {
	tripay := services.NewTripayService()
	
	// ⚠️ PENTING: TriPay mewajibkan (Sum of Items == Amount)
	// Kita hitung total Amount langsung dari sum item yang sudah dibulatkan
	var totalAmount int64 = 0

	// Convert order items to TriPay format
	var tripayItems []services.TripayItem
	for _, item := range order.Items {
		price := int64(math.Round(item.UnitPrice))
		qty := item.Quantity
		subtotal := price * int64(qty)
		
		tripayItems = append(tripayItems, services.TripayItem{
			SKU:      item.SKU,
			Name:     item.ProductName,
			Price:    price,
			Quantity: qty,
			Subtotal: subtotal,
		})
		totalAmount += subtotal
	}

	if order.TotalShippingCost > 0 {
		price := int64(math.Round(order.TotalShippingCost))
		tripayItems = append(tripayItems, services.TripayItem{
			SKU:      "SHIPPING",
			Name:     "Ongkos Kirim",
			Price:    price,
			Quantity: 1,
			Subtotal: price,
		})
		totalAmount += price
	}
	
	if order.TotalDiscount > 0 {
		price := -int64(math.Round(order.TotalDiscount))
		tripayItems = append(tripayItems, services.TripayItem{
			SKU:      "DISCOUNT",
			Name:     "Potongan Voucher",
			Price:    price,
			Quantity: 1,
			Subtotal: price,
		})
		totalAmount += price
	}

	// Get Customer Info
	var buyer models.User
	bc.DB.Preload("Profile").First(&buyer, "id = ?", *order.BuyerID)
	
	customerName := "Customer"
	if buyer.Profile.FullName != "" { 
		customerName = buyer.Profile.FullName 
	}
	
	customerPhone := ""
	if buyer.Phone != nil {
		customerPhone = *buyer.Phone
	}
	
	appURL := os.Getenv("APP_URL")
	callbackUrl := appURL + "/api/tripay/webhook"
	returnUrl := appURL + "/order-success"

	result, err := tripay.CreateTransaction(paymentMethod, order.OrderNumber, totalAmount, customerName, buyer.Email, customerPhone, tripayItems, callbackUrl, returnUrl, order.ExpiredAt.Unix())
	return result, err
}

// POST /api/public/checkout
func (bc *BuyerController) PublicCheckout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string             `json:"email"`
		Password     string             `json:"password"`
		FullName     string             `json:"full_name"`
		Phone        string             `json:"phone"`
		Items        []models.OrderItem `json:"items"`
		ShippingInfo models.Order       `json:"shipping_info"`
		UplineID     string             `json:"upline_id"`
		VoucherCode  string             `json:"voucher_code"`
		PaymentMethod string             `json:"payment_method"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	// 1. Find or Create User
	var user *models.User
	var token string
	var err error

	// A. Check if already logged in via Token
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := utils.ParseJWT(tokenStr)
		if err == nil {
			var loggedInUser models.User
			if err := bc.DB.First(&loggedInUser, "id = ?", claims.UserID).Error; err == nil {
				user = &loggedInUser
				log.Printf("[PublicCheckout] Using logged-in user: %s", user.Email)
			}
		}
	}

	// B. If not logged in, handle Guest/Registration
	if user == nil {
		var existingUser models.User
		err = bc.DB.Where("email = ?", req.Email).First(&existingUser).Error
		if err == nil {
			// User exists but not logged in as them
			utils.JSONError(w, http.StatusConflict, "Email sudah terdaftar. Silakan masuk terlebih dahulu.")
			return
		}

		// Create new user (Mitra)
		log.Printf("[PublicCheckout] Creating new user for: %s", req.Email)
		user, token, err = bc.AuthService.Register(req.Email, req.Password, req.FullName, req.Phone, "buyer", req.UplineID)
		if err != nil {
			utils.JSONError(w, http.StatusBadRequest, "Gagal membuat akun: "+err.Error())
			return
		}
	}

	// 2. Process Order
	req.ShippingInfo.VoucherCode = req.VoucherCode
	order, err := bc.OrderService.CreateOrder(user.ID, req.Items, &req.UplineID, req.ShippingInfo)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat pesanan: "+err.Error())
		return
	}

	// 3. Integrasi TriPay (Copy-paste logic from standard Checkout)
	var paymentData map[string]interface{}
	if req.PaymentMethod != "" && req.PaymentMethod != "manual" {
		// Ambil data item lengkap untuk TriPay
		bc.DB.Preload("Items").First(order, "id = ?", order.ID)
		
		tripayResult, err := bc.getTripayData(order, req.PaymentMethod)
		if err != nil {
			log.Printf("⚠️ TriPay Request Error: %v", err)
		} else {
			paymentData = tripayResult["data"].(map[string]interface{})
			
			// Save Payment Record
			payment := models.Payment{
				OrderID:              order.ID,
				PaymentMethod:        req.PaymentMethod,
				Status:               models.PaymentPending,
				Gateway:              "tripay",
				GatewayTransactionID: paymentData["reference"].(string),
				GatewayOrderID:       paymentData["merchant_ref"].(string),
				Amount:               order.GrandTotal,
			}
			respJson, _ := json.Marshal(paymentData)
			payment.GatewayResponse = string(respJson)
			
			if err := bc.DB.Create(&payment).Error; err != nil {
				log.Printf("⚠️ Failed to save payment record: %v", err)
			}
		}
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"order":   order,
		"token":   token, // Return token so the frontend can auto-login
		"user":    user,
		"payment": paymentData,
	})
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
		if req.Gender != "" {
			profile.Gender = &req.Gender
		} else {
			profile.Gender = nil
		}
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

// GET /api/buyer/orders/detail?id=...
func (bc *BuyerController) GetOrderDetail(w http.ResponseWriter, r *http.Request) {
	buyerID := r.Context().Value("user_id").(string)
	orderID := r.URL.Query().Get("id")

	log.Printf("[OrderDetail] Request ID: %s for BuyerID: %s", orderID, buyerID)

	if orderID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Order ID dibutuhkan")
		return
	}

	var order models.Order
	// Gunakan CAST agar Postgres tidak bingung dengan tipe data UUID
	err := bc.DB.Preload("MerchantGroups.Items").
		Preload("MerchantGroups.Merchant").
		Where("id = CAST(? AS UUID) AND buyer_id = CAST(? AS UUID)", orderID, buyerID).
		First(&order).Error

	if err != nil {
		log.Printf("[OrderDetail] ERROR FINDING ORDER: %v (OrderID: %s, BuyerID: %s)", err, orderID, buyerID)
		utils.JSONError(w, http.StatusNotFound, "Pesanan tidak ditemukan")
		return
	}

	// Fetch payment data if exists
	var payment models.Payment
	bc.DB.Where("order_id = ?", order.ID).First(&payment)

	// Ekstrak checkout_url dari GatewayResponse (TriPay) jika ada
	var paymentMap map[string]interface{}
	if payment.ID != "" {
		paymentData, _ := json.Marshal(payment)
		json.Unmarshal(paymentData, &paymentMap)
		
		if payment.GatewayResponse != "" {
			var gresp map[string]interface{}
			if err := json.Unmarshal([]byte(payment.GatewayResponse), &gresp); err == nil {
				if curl, ok := gresp["checkout_url"].(string); ok {
					paymentMap["checkout_url"] = curl
				}
				// Juga ambil qr_url atau pay_url jika ada
				if qurl, ok := gresp["qr_url"].(string); ok { paymentMap["qr_url"] = qurl }
				if purl, ok := gresp["pay_url"].(string); ok { paymentMap["pay_url"] = purl }
			}
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"order":   order,
		"payment": paymentMap,
	})
}
