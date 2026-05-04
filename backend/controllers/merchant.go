package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

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
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil daftar produk: "+err.Error())
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
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat permintaan restock: "+err.Error())
		return
	}

	// Notify Admin
	mc.Notif.Push(models.AdminID, "admin", "restock_new", "Permintaan Restock Baru", 
		fmt.Sprintf("Merchant baru saja mengirimkan permintaan restock untuk %d item.", len(req.Items)), "/admin/merchants/restock")

	utils.JSONResponse(w, http.StatusCreated, request)
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
	notifs, err := mc.Notif.GetNotifications(merchantID, "merchant", 20)
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
