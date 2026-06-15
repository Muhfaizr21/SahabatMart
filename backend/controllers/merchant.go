package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"strings"
	"akuglow/backend/models"
	"akuglow/backend/services"
	"akuglow/backend/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MerchantController struct {
	DB      *gorm.DB
	Service *services.MerchantService
	Notif   *services.NotificationService
}

func NewMerchantController(db *gorm.DB) *MerchantController {
	notif := services.NewNotificationService(db)
	return &MerchantController{
		DB:      db,
		Service: services.NewMerchantService(db, notif),
		Notif:   notif,
	}
}

// ─────────────────────────────────────────
// PRODUCT MANAGEMENT
// ─────────────────────────────────────────

// GET /api/merchant/products
func (mc *MerchantController) GetProducts(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	
	search := r.URL.Query().Get("search")
	categoryID := r.URL.Query().Get("category_id")
	stockStatus := r.URL.Query().Get("stock_status")
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 10)

	result, err := mc.Service.GetProducts(merchantID, search, categoryID, stockStatus, page, limit)
	if err != nil {
		utils.JSONErrorInternal(w, err, "Gagal mengambil daftar produk")
		return
	}
	utils.JSONResponse(w, http.StatusOK, result)
}

// GET /api/merchant/catalog
func (mc *MerchantController) GetCatalog(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	products, err := mc.Service.GetCatalog(search)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil katalog")
		return
	}
	utils.JSONResponse(w, http.StatusOK, products)
}

// GET /api/merchant/restock
func (mc *MerchantController) GetRestockRequests(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	requests, err := mc.Service.GetRestockRequests(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data restock")
		return
	}
	utils.JSONResponse(w, http.StatusOK, requests)
}

// POST /api/merchant/restock/request
func (mc *MerchantController) RequestRestock(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	
	var req struct {
		Items         []models.RestockItem `json:"items"`
		PaymentMethod string               `json:"payment_method"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.PaymentMethod == "" {
		req.PaymentMethod = "transfer"
	}

	request, err := mc.Service.CreateRestockRequest(merchantID, req.Items, req.PaymentMethod)
	if err != nil {
		utils.JSONErrorInternal(w, err, "Gagal membuat permintaan restock")
		return
	}

	// Notify Admin
	mc.Notif.Push(models.AdminID, "admin", "restock_new", "Permintaan Restock Baru", 
		fmt.Sprintf("Merchant baru saja mengirimkan permintaan restock untuk %d item.", len(req.Items)), "/admin/merchants/restock")

	utils.JSONResponse(w, http.StatusCreated, request)
}

// GET /api/merchant/restock/{id}/track
func (mc *MerchantController) TrackRestock(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)

	restockID := strings.TrimPrefix(r.URL.Path, "/api/merchant/restock/")
	restockID = strings.TrimSuffix(restockID, "/track")

	var restock models.RestockRequest
	if err := mc.DB.Where("id = ? AND merchant_id = ?", restockID, merchantID).First(&restock).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Restock tidak ditemukan")
		return
	}

	if restock.TrackingNumber == "" || restock.CourierCode == "" {
		utils.JSONError(w, http.StatusBadRequest, "Resi atau kode kurir belum tersedia")
		return
	}

	shippingSvc := services.NewShippingService(mc.DB)
	trackingData, err := shippingSvc.GetPublicTracking(restock.TrackingNumber, restock.CourierCode)
	if err != nil {
		utils.JSONErrorInternal(w, err, "Gagal melacak resi via Biteship")
		return
	}

	utils.JSONResponse(w, http.StatusOK, trackingData)
}

// ─────────────────────────────────────────
// ORDER MANAGEMENT
// ─────────────────────────────────────────

// GET /api/merchant/orders
func (mc *MerchantController) GetOrders(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	status := r.URL.Query().Get("status")
	
	page := utils.QueryInt(r, "page", 1)
	limit := utils.QueryInt(r, "limit", 10)

	result, err := mc.Service.GetOrders(merchantID, status, page, limit)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil daftar pesanan")
		return
	}
	utils.JSONResponse(w, http.StatusOK, result)
}

// POST /api/merchant/orders/status
func (mc *MerchantController) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var req struct {
		GroupID       string `json:"group_id"`
		Status        string `json:"status"`
		TrackingNumber string `json:"tracking_number"`
		CourierCode   string `json:"courier_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	group, err := mc.Service.UpdateOrderStatus(req.GroupID, merchantID, req.Status, req.TrackingNumber, req.CourierCode)
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Pesanan tidak ditemukan atau akses ditolak")
		return
	}
	utils.JSONResponse(w, http.StatusOK, group)
}

// ─────────────────────────────────────────
// WALLET & FINANCE
// ─────────────────────────────────────────

// GET /api/merchant/wallet
func (mc *MerchantController) GetWallet(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	wallet, err := mc.Service.GetWallet(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data wallet")
		return
	}
	utils.JSONResponse(w, http.StatusOK, wallet)
}

// POST /api/merchant/wallet/withdraw
func (mc *MerchantController) RequestPayout(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if _, err := uuid.Parse(merchantID); err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid atau ID merchant tidak dikenali")
		return
	}

	var req struct {
		Amount      float64 `json:"amount"`
		BankName    string  `json:"bank_name"`
		AccountNo   string  `json:"account_no"`
		AccountName string  `json:"account_name"`
		Note        string  `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}
	if req.Amount <= 0 {
		utils.JSONError(w, http.StatusBadRequest, "Jumlah penarikan harus lebih dari 0")
		return
	}

	payout, err := mc.Service.RequestPayout(merchantID, req.Amount, req.Note, req.BankName, req.AccountNo, req.AccountName)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Notify Super Admin
	store, _ := mc.Service.GetStoreProfile(merchantID)
	msg := fmt.Sprintf("Merchant '%s' mengajukan penarikan dana sebesar %.0f.", store.StoreName, req.Amount)
	mc.Notif.Push(models.AdminID, "admin", "payout_request", "Pengajuan Payout Baru", msg, "/admin/payouts")

	utils.JSONResponse(w, http.StatusCreated, payout)
}

// GET /api/merchant/wallet/history
func (mc *MerchantController) GetPayoutHistory(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	history, err := mc.Service.GetPayoutHistory(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil riwayat penarikan")
		return
	}
	utils.JSONResponse(w, http.StatusOK, history)
}

// GET /api/merchant/wallet/transactions
func (mc *MerchantController) GetWalletTransactions(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	limit := utils.QueryInt(r, "limit", 50)
	txs, err := mc.Service.GetWalletTransactions(merchantID, limit)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil riwayat transaksi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, txs)
}

// ─────────────────────────────────────────
// VOUCHER MANAGEMENT
// ─────────────────────────────────────────

// GET /api/merchant/vouchers
func (mc *MerchantController) GetVouchers(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	vouchers, err := mc.Service.GetVouchers(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil voucher")
		return
	}
	utils.JSONResponse(w, http.StatusOK, vouchers)
}

// POST /api/merchant/vouchers/upsert
func (mc *MerchantController) UpsertVoucher(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var voucher models.Voucher
	if err := json.NewDecoder(r.Body).Decode(&voucher); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}
	voucher.MerchantID = &merchantID

	result, err := mc.Service.UpsertVoucher(&voucher)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan voucher")
		return
	}
	utils.JSONResponse(w, http.StatusOK, result)
}

// DELETE /api/merchant/vouchers/delete?id=...
func (mc *MerchantController) DeleteVoucher(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		utils.JSONError(w, http.StatusBadRequest, "Voucher ID dibutuhkan")
		return
	}
	if err := mc.Service.DeleteVoucher(merchantID, idStr); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus voucher")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Voucher berhasil dihapus"})
}

// ─────────────────────────────────────────
// DISPUTE MANAGEMENT
// ─────────────────────────────────────────

// GET /api/merchant/disputes
func (mc *MerchantController) GetDisputes(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	disputes, err := mc.Service.GetDisputes(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil sengketa")
		return
	}
	utils.JSONResponse(w, http.StatusOK, disputes)
}

// POST /api/merchant/disputes/respond
func (mc *MerchantController) RespondDispute(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var req struct {
		DisputeID uint   `json:"dispute_id"`
		Response  string `json:"response"` // "accept" or "reject"
		Note      string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	dispute, err := mc.Service.RespondDispute(merchantID, req.DisputeID, req.Response, req.Note)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal merespons sengketa")
		return
	}
	utils.JSONResponse(w, http.StatusOK, dispute)
}

// ─────────────────────────────────────────
// STORE PROFILE
// ─────────────────────────────────────────

// GET /api/merchant/store
func (mc *MerchantController) GetStoreProfile(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	store, err := mc.Service.GetStoreProfile(merchantID)
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Data toko tidak ditemukan")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   store,
	})
}

// POST /api/merchant/store/update
func (mc *MerchantController) UpdateStoreProfile(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	// Validate store name uniqueness if being changed
	if newName, ok := updates["store_name"].(string); ok && newName != "" {
		var conflict int64
		mc.DB.Model(&models.Merchant{}).
			Where("store_name = ? AND id != ?", newName, merchantID).
			Count(&conflict)
		if conflict > 0 {
			utils.JSONError(w, http.StatusConflict, "Nama toko '"+newName+"' sudah digunakan merchant lain. Silakan gunakan nama lain.")
			return
		}
	}

	store, err := mc.Service.UpdateStoreProfile(merchantID, updates)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update profil toko")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   store,
	})
}

// ─────────────────────────────────────────
// AFFILIATE INSIGHT (Read-only for merchant)
// ─────────────────────────────────────────

// GET /api/merchant/affiliate-stats
func (mc *MerchantController) GetAffiliateStats(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	year := utils.QueryInt(r, "year", time.Now().Year())

	stats, err := mc.Service.GetDetailedAnalytics(merchantID, year)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil statistik")
		return
	}
	utils.JSONResponse(w, http.StatusOK, stats)
}

// GET /api/merchant/notifications
func (mc *MerchantController) GetNotifications(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	userID, _ := r.Context().Value("user_id").(string)

	var notifs []models.Notification
	err := mc.DB.Where("(receiver_id = ? AND receiver_type = ?) OR (receiver_id = ? AND receiver_type = ?)", 
		merchantID, "merchant", userID, "user").
		Order("created_at desc").
		Limit(20).
		Find(&notifs).Error

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": notifs})
}

// PUT /api/merchant/notifications/read
func (mc *MerchantController) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// If body is empty, mark all as read
		mc.Notif.MarkAllAsRead(merchantID, "merchant")
		utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
		return
	}

	if req.ID == "" {
		mc.Notif.MarkAllAsRead(merchantID, "merchant")
	} else {
		mc.Notif.MarkAsRead(req.ID)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/merchant/notifications/read-all
func (mc *MerchantController) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	if err := mc.Notif.MarkAllAsRead(merchantID, "merchant"); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menandai semua notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/merchant/notifications
func (mc *MerchantController) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Notification ID required")
		return
	}
	if err := mc.Notif.Delete(id); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/merchant/notifications/all
func (mc *MerchantController) DeleteAllNotifications(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	if err := mc.Notif.DeleteAll(merchantID, "merchant"); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus semua notifikasi")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/merchant/restock/receive
func (mc *MerchantController) ReceiveRestock(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}
	var req struct {
		RequestID string `json:"request_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	err := mc.Service.ReceiveRestock(merchantID, req.RequestID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal konfirmasi penerimaan: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// ─────────────────────────────────────────
// POS MANAGEMENT
// ─────────────────────────────────────────

// POST /api/merchant/pos/checkout
func (mc *MerchantController) POSCheckout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var req struct {
		Items []struct {
			ProductID        string  `json:"product_id"`
			ProductVariantID *string `json:"product_variant_id"`
			Quantity         int     `json:"quantity"`
			Price           float64 `json:"price"`
		} `json:"items"`
		PaymentMethod string  `json:"payment_method"`
		AmountPaid    float64 `json:"amount_paid"`
		MemberID      *string `json:"member_id"`
		Notes         string  `json:"notes"`
		Discount      float64 `json:"discount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID := r.Context().Value("user_id").(string)

	var order models.Order
	err := mc.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Generate Order Number
		shortCode := strings.ToUpper(utils.GenerateShortCode(6))
		orderNumber := fmt.Sprintf("MPOS-%s-%d", shortCode, time.Now().Unix()%100000)

		var subtotal float64
		
		// [Akuglow] Instantiate Services for Commission Calculation
		orderSvc := services.NewOrderService(tx)
		financeSvc := services.NewFinanceService(tx)

		// [Akuglow] Resolve Affiliate/Member if provided
		var resolvedAffiliateID *string
		if req.MemberID != nil && *req.MemberID != "" {
			var aff models.AffiliateMember
			if err := tx.Where("user_id = ? OR id = ?", *req.MemberID, *req.MemberID).First(&aff).Error; err == nil {
				resolvedAffiliateID = &aff.ID
			}
		}
		
		type itemData struct {
			product               models.Product
			variant               models.ProductVariant
			qty                   int
			price                 float64
			commissionAmount      float64
			commissionRate        float64
			distributionAmount    float64
			platformFeeAmount     float64
			cogs                  float64
		}
		var itemsToProcess []itemData

		for _, item := range req.Items {
			var product models.Product
			if err := tx.First(&product, "id = ?", item.ProductID).Error; err != nil {
				return fmt.Errorf("produk tidak ditemukan: %s", item.ProductID)
			}

			var variant models.ProductVariant
			if item.ProductVariantID != nil && *item.ProductVariantID != "" {
				if err := tx.First(&variant, "id = ?", *item.ProductVariantID).Error; err != nil {
					return fmt.Errorf("varian tidak ditemukan: %s", *item.ProductVariantID)
				}
			}

		// [BUG-M1 Fix] Harga WAJIB dari database (product.Price / variant.Price).
		// Jangan trusted item.Price dari client — merchant bisa jual harga berapapun.
		// Client hanya boleh override harga jika >= product.Price dan >= variant.Price.
		unitPrice := product.Price
		if variant.ID != "" {
			unitPrice = variant.Price
		}
		if item.Price > 0 {
			// Validasi: harga dari client tidak boleh lebih rendah dari harga di database
			if item.Price < unitPrice {
				return fmt.Errorf("harga %s tidak boleh lebih rendah dari harga asli (Rp %.2f)", product.Name, unitPrice)
			}
			unitPrice = item.Price
		}

			subtotal += unitPrice * float64(item.Quantity)
			
			// [Akuglow] Calculate Commissions using centralized logic (Variant-aware)
			tempOI := models.OrderItem{
				ProductID:        product.ID,
				ProductVariantID: item.ProductVariantID,
				Quantity:         item.Quantity,
				UnitPrice:        unitPrice,
			}
			affAmt, affRate, distAmt, platAmt, cogs, _ := orderSvc.CalculateCommissions(tx, tempOI, resolvedAffiliateID, merchantID)

			itemsToProcess = append(itemsToProcess, itemData{
				product:               product,
				variant:               variant,
				qty:                   item.Quantity,
				price:                 unitPrice,
				commissionAmount:      affAmt,
				commissionRate:        affRate,
				distributionAmount:    distAmt,
				platformFeeAmount:     platAmt,
				cogs:                  cogs,
			})

			// 2. Update Merchant Stock
			var inv models.Inventory
			dbInv := tx.Where("merchant_id = ? AND product_id = ?", merchantID, product.ID)
			if item.ProductVariantID != nil && *item.ProductVariantID != "" {
				dbInv = dbInv.Where("product_variant_id = ?", *item.ProductVariantID)
			} else {
				dbInv = dbInv.Where("product_variant_id IS NULL OR product_variant_id = ''")
			}

			// [BUG-M11 Fix] FOR UPDATE untuk cegah race condition stock checkout bersamaan
		if err := dbInv.Set("gorm:query_option", "FOR UPDATE").First(&inv).Error; err != nil {
			msg := product.Name
			if variant.ID != "" { msg += " (" + variant.Name + ")" }
			return fmt.Errorf("stok merchant tidak ditemukan untuk %s", msg)
		}
		if inv.Stock < item.Quantity {
			msg := product.Name
			if variant.ID != "" { msg += " (" + variant.Name + ")" }
			return fmt.Errorf("stok merchant tidak mencukupi untuk %s (Tersedia: %d)", msg, inv.Stock)
		}
			
			stockBefore := inv.Stock
			if err := dbInv.Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
				return err
			}


			
			// LOG MUTATION (Mata Elang)
			tx.Create(&models.StockMutation{
				ProductID:        product.ID,
				ProductVariantID: item.ProductVariantID,
				MerchantID:       merchantID,
				Type:             "POS_SALE",
				Quantity:         item.Quantity,
				Reference:        orderNumber, 
				StockBefore:      stockBefore,
				StockAfter:       stockBefore - item.Quantity,
				Note:             "POS Transaction at Merchant Dashboard",
			})
		}

		grandTotal := subtotal - req.Discount

		// 3. Create Order
		var totalCommission, totalPlatformFee float64
		for _, it := range itemsToProcess {
			totalCommission += it.commissionAmount
			totalPlatformFee += it.platformFeeAmount
		}

		order = models.Order{
			BuyerID:            req.MemberID,
			AffiliateID:        resolvedAffiliateID,
			CashierID:          &userID,
			OrderNumber:        orderNumber,
			OrderType:          "pos",
			Status:             models.OrderCompleted,
			Subtotal:           subtotal,
			TotalDiscount:      req.Discount,
			GrandTotal:         grandTotal,
			TotalAmount:        grandTotal, // backward compatibility
			TotalPlatformFee:   totalPlatformFee,
			TotalCommission:    totalCommission,
			PaymentMethod:      req.PaymentMethod,
			ShippingName:       "POS Customer",
			PaidAt:             &[]time.Time{time.Now()}[0],
			CompletedAt:        &[]time.Time{time.Now()}[0],
			Notes:              req.Notes,
			CreatedAt:          time.Now(),
		}

		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		// 4. Create Payment Record (Manual/Offline)
		payment := models.Payment{
			OrderID:        order.ID,
			PaymentMethod:  req.PaymentMethod,
			Status:         models.PaymentPaid,
			Gateway:        "cashier",
			Amount:         grandTotal,
			AmountReceived: req.AmountPaid,
			PaidAt:         &[]time.Time{time.Now()}[0],
			CreatedAt:      time.Now(),
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		// 4. Create Order Merchant Group (Per-Merchant Group Inisialisasi)
		mg := &models.OrderMerchantGroup{
			OrderID:    order.ID,
			MerchantID: merchantID,
			Status:     models.MOrderCompleted,
			Subtotal:   subtotal,
			CreatedAt:  time.Now(),
		}
		if err := tx.Create(mg).Error; err != nil {
			return err
		}

		// 5. Create Order Items
		for _, it := range itemsToProcess {
			var variantID *string
			sku := it.product.Slug
			if it.variant.ID != "" { 
				sku = it.variant.SKU 
				vid := it.variant.ID
				variantID = &vid
			}

			oi := models.OrderItem{
				OrderID:              order.ID,
				OrderMerchantGroupID: mg.ID,
				MerchantID:           merchantID,
				ProductID:            it.product.ID,
				ProductVariantID:     variantID,
				ProductName:          it.product.Name,
				VariantName:          it.variant.Name,
				SKU:                  sku,
				Quantity:             it.qty,
				UnitPrice:            it.price,
				Subtotal:             it.price * float64(it.qty),
				CommissionRate:       it.commissionRate,
				CommissionAmount:     it.commissionAmount,
				DistributionFeeAmount: it.distributionAmount,
				PlatformFeeAmount:    it.platformFeeAmount,
				MerchantAmount:       it.distributionAmount,
				COGS:                 it.cogs,
			}
			if err := tx.Create(&oi).Error; err != nil {
				return err
			}

			// Update Group Totals
			mg.AffiliateCommission += it.commissionAmount
			mg.MerchantPayout += it.distributionAmount
			mg.PlatformFee += it.platformFeeAmount
		}

		// Update Order Merchant Group with final calculated values
		if err := tx.Save(mg).Error; err != nil {
			return err
		}

		// 6. RECORD REVENUE TO ADMIN (Centralization)
		// Find Primary Financial Location
		var loc models.FinancialLocation
		if err := tx.Where("is_primary = ?", true).First(&loc).Error; err != nil {
			return fmt.Errorf("pusat financial location not found")
		}

		// Update Balance
		if err := tx.Model(&loc).Update("balance", gorm.Expr("balance + ?", grandTotal)).Error; err != nil {
			return err
		}

		// Create Money Mutation Record
		mutation := models.MoneyMutation{
			ToLocationID: &loc.ID,
			Amount:       grandTotal,
			Category:     "POS_REVENUE",
			Description:  fmt.Sprintf("POS Transaction from Merchant %s (Order: %s)", merchantID, orderNumber),
			Type:         "income",
			Status:       "processed",
			ProcessedAt:  &[]time.Time{time.Now()}[0],
			CreatedAt:    time.Now(),
		}
		if err := tx.Create(&mutation).Error; err != nil {
			return err
		}

		if err := financeSvc.DistributeFunds(tx, order.ID); err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   order,
	})
}

// GET /api/merchant/pos/products
func (mc *MerchantController) POSGetProducts(w http.ResponseWriter, r *http.Request) {
	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	search := r.URL.Query().Get("q")
	
	// 1. Fetch merchant inventories first
	var inventories []models.Inventory
	if err := mc.DB.Where("merchant_id = ?", merchantID).Find(&inventories).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data inventori")
		return
	}

	// 2. Build mapping and unique product IDs
	invMap := make(map[string]int)
	var productIDs []string
	productIDMap := make(map[string]bool)

	for _, inv := range inventories {
		key := inv.ProductID
		if inv.ProductVariantID != nil && *inv.ProductVariantID != "" {
			key += "_" + *inv.ProductVariantID
		}
		invMap[key] = inv.Stock
		
		if !productIDMap[inv.ProductID] {
			productIDMap[inv.ProductID] = true
			productIDs = append(productIDs, inv.ProductID)
		}
	}

	if len(productIDs) == 0 {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data":   []models.Product{},
		})
		return
	}

	// 3. Fetch products based on merchant's inventory
	var products []models.Product
	db := mc.DB.Model(&models.Product{}).
		Where("id IN ?", productIDs).
		Preload("Variants")

	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		db = db.Where(mc.DB.Where("name ILIKE ?", like).
			Or("slug ILIKE ?", like).
			Or("sku ILIKE ?", like).
			Or("id IN (SELECT product_id FROM product_variants WHERE sku ILIKE ?)", like))
	}

	if err := db.Order("created_at DESC").Limit(40).Find(&products).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil produk")
		return
	}

	// 4. Override master stocks with merchant's stock
	for i := range products {
		if stock, exists := invMap[products[i].ID]; exists {
			products[i].Stock = stock
		} else {
			products[i].Stock = 0
		}

		if len(products[i].Variants) > 0 {
			totalVariantStock := 0
			for j := range products[i].Variants {
				key := products[i].ID + "_" + products[i].Variants[j].ID
				if stock, exists := invMap[key]; exists {
					products[i].Variants[j].Stock = stock
				} else {
					products[i].Variants[j].Stock = 0
				}
				totalVariantStock += products[i].Variants[j].Stock
			}
			// If it has variants, base stock is total variant stock
			products[i].Stock = totalVariantStock
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   products,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER IDENTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/pos/member/:code
func (mc *MerchantController) GetMemberByCode(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimPrefix(r.URL.Path, "/api/merchant/pos/member/")
	code = strings.TrimSpace(code)
	
	if code == "" {
		utils.JSONError(w, http.StatusBadRequest, "Kode member diperlukan")
		return
	}

	// [Audit Fix] Smart Parsing for QR/URLs
	if strings.Contains(code, "ref=") {
		// Case: ...?ref=CODE
		parts := strings.Split(code, "ref=")
		code = parts[len(parts)-1]
		if strings.Contains(code, "&") {
			code = strings.Split(code, "&")[0]
		}
	} else if strings.Contains(code, "/") {
		// Case: https://domain.com/ref/CODE
		parts := strings.Split(strings.TrimRight(code, "/"), "/")
		code = parts[len(parts)-1]
	}

	// [Audit Fix] Handle common prefixes and clean whitespace
	code = strings.TrimSpace(code)
	if strings.Contains(code, ":") {
		parts := strings.Split(code, ":")
		code = parts[len(parts)-1]
	}

	var user models.User
	query := mc.DB.Preload("Profile").
		Preload("Affiliate.Tier").
		Joins("LEFT JOIN affiliate_members ON affiliate_members.user_id = users.id").
		Joins("LEFT JOIN skin_pre_tests ON skin_pre_tests.user_id = users.id")

	// Comprehensive lookup: UUID, Email, Phone, RefCode, and BarcodeToken
	if _, uuidErr := uuid.Parse(code); uuidErr == nil {
		query = query.Where("(users.id = ? OR LOWER(users.email) = LOWER(?) OR users.phone = ? OR LOWER(affiliate_members.ref_code) = LOWER(?) OR LOWER(skin_pre_tests.barcode_token) = LOWER(?))", 
			code, code, code, code, code)
	} else {
		// Clean phone number variations for search
		phone0 := "0" + strings.TrimPrefix(code, "+62")
		phone62 := "+62" + strings.TrimPrefix(code, "0")
		
		query = query.Where("(LOWER(users.email) = LOWER(?) OR users.phone = ? OR users.phone = ? OR users.phone = ? OR LOWER(affiliate_members.ref_code) = LOWER(?) OR LOWER(skin_pre_tests.barcode_token) = LOWER(?))", 
			code, code, phone0, phone62, code, code)
	}

	err := query.First(&user).Error

	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Member tidak ditemukan atau kode tidak valid")
		return
	}

	actualRefCode := ""
	if user.Affiliate != nil {
		actualRefCode = user.Affiliate.RefCode
	}

	tierName := "Customer"
	if user.Affiliate != nil && user.Affiliate.Tier != nil {
		tierName = user.Affiliate.Tier.Name
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"id":        user.ID,
		"full_name": user.Profile.FullName,
		"email":     user.Email,
		"phone":     user.Phone,
		"tier":      tierName,
		"ref_code":  actualRefCode,
	})
}

// ─────────────────────────────────────────
// SHIPPING LABEL & PACKING SLIP
// ─────────────────────────────────────────

// POST /api/merchant/orders/generate-label
// Generate resi otomatis via Biteship API
func (mc *MerchantController) GenerateShippingLabel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	valRole := r.Context().Value("user_role")
	userRole, _ := valRole.(string)
	isAdmin := userRole == "admin" || userRole == "superadmin"

	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if !isAdmin && merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var req struct {
		GroupID string `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.GroupID == "" {
		utils.JSONError(w, http.StatusBadRequest, "group_id dibutuhkan")
		return
	}

	// Ambil group dan validasi kepemilikan
	var group models.OrderMerchantGroup
	var err error
	if isAdmin {
		err = mc.DB.Preload("Items").First(&group, "id = ?", req.GroupID).Error
	} else {
		err = mc.DB.Preload("Items").First(&group, "id = ? AND merchant_id = ?", req.GroupID, merchantID).Error
	}
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Pesanan tidak ditemukan")
		return
	}

	// Ambil order induk
	var order models.Order
	if err := mc.DB.First(&order, "id = ?", group.OrderID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Order tidak ditemukan")
		return
	}

	shippingSvc := services.NewShippingService(mc.DB)

	// Jika belum ada biteship_order_id, buat order baru
	if group.BiteshipOrderID == "" {
		biteshipOrderID, waybillID, err := shippingSvc.CreateOrder(order, group)
		if err != nil {
			// Jika Biteship gagal (dev mode / no API key), kembalikan error yang informatif
			utils.JSONError(w, http.StatusServiceUnavailable,
				fmt.Sprintf("Gagal generate resi via Biteship: %v. Silakan input resi manual.", err))
			return
		}

		now := time.Now()
		updates := map[string]interface{}{
			"biteship_order_id": biteshipOrderID,
			"tracking_number":   waybillID,
			"status":            string(models.MOrderShipped),
			"shipped_at":        &now,
		}
		if err := mc.DB.Model(&group).Updates(updates).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan data resi")
			return
		}
		group.BiteshipOrderID = biteshipOrderID
		group.TrackingNumber = waybillID
		group.Status = models.MOrderShipped
		group.ShippedAt = &now
	}

	// Ambil label URL dari Biteship (jika tersedia)
	labelURL := ""
	if group.BiteshipOrderID != "" {
		if detail, err := shippingSvc.GetOrderLabel(group.BiteshipOrderID); err == nil {
			if courier, ok := detail["courier"].(map[string]interface{}); ok {
				if url, ok := courier["waybill_url"].(string); ok {
					labelURL = url
				}
			}
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":            "success",
		"tracking_number":   group.TrackingNumber,
		"biteship_order_id": group.BiteshipOrderID,
		"courier_code":      group.CourierCode,
		"label_url":         labelURL,
	})
}

// POST /api/merchant/orders/manual-tracking
// Input nomor resi manual
func (mc *MerchantController) SetManualTracking(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	valRole := r.Context().Value("user_role")
	userRole, _ := valRole.(string)
	isAdmin := userRole == "admin" || userRole == "superadmin"

	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if !isAdmin && merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	var req struct {
		GroupID        string `json:"group_id"`
		TrackingNumber string `json:"tracking_number"`
		CourierCode    string `json:"courier_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}
	if req.GroupID == "" || req.TrackingNumber == "" {
		utils.JSONError(w, http.StatusBadRequest, "group_id dan tracking_number dibutuhkan")
		return
	}

	// Validasi kepemilikan group
	var group models.OrderMerchantGroup
	var err error
	if isAdmin {
		err = mc.DB.First(&group, "id = ?", req.GroupID).Error
	} else {
		err = mc.DB.First(&group, "id = ? AND merchant_id = ?", req.GroupID, merchantID).Error
	}
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Pesanan tidak ditemukan")
		return
	}

	now := time.Now()
	updates := map[string]interface{}{
		"tracking_number": req.TrackingNumber,
		"courier_code":    req.CourierCode,
		"status":          string(models.MOrderShipped),
		"shipped_at":      &now,
	}
	if err := mc.DB.Model(&group).Updates(updates).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan nomor resi")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":          "success",
		"tracking_number": req.TrackingNumber,
		"courier_code":    req.CourierCode,
	})
}

// GET /api/merchant/orders/packing-slip?group_id=...
// Ambil data lengkap untuk cetak packing slip
func (mc *MerchantController) GetPackingSlipData(w http.ResponseWriter, r *http.Request) {
	valRole := r.Context().Value("user_role")
	userRole, _ := valRole.(string)
	isAdmin := userRole == "admin" || userRole == "superadmin"

	val := r.Context().Value("merchant_id")
	merchantID, _ := val.(string)
	if !isAdmin && merchantID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi merchant tidak valid")
		return
	}

	groupID := r.URL.Query().Get("group_id")
	if groupID == "" {
		utils.JSONError(w, http.StatusBadRequest, "group_id dibutuhkan")
		return
	}

	// Ambil group dengan relasi lengkap
	var group models.OrderMerchantGroup
	var err error
	if isAdmin {
		err = mc.DB.
			Preload("Items").
			Preload("Merchant").
			First(&group, "id = ?", groupID).Error
	} else {
		err = mc.DB.
			Preload("Items").
			Preload("Merchant").
			First(&group, "id = ? AND merchant_id = ?", groupID, merchantID).Error
	}
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Pesanan tidak ditemukan")
		return
	}

	// Ambil order induk (data pembeli & alamat)
	var order models.Order
	mc.DB.First(&order, "id = ?", group.OrderID)

	// Ambil info toko merchant (nama & alamat)
	var merchant models.Merchant
	mc.DB.Preload("User.Profile").First(&merchant, "id = ?", group.MerchantID)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"group":    group,
			"order":    order,
			"merchant": merchant,
		},
	})
}

