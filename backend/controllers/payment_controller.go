package controllers

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"gorm.io/gorm"
)

type PaymentController struct {
	DB           *gorm.DB
	OrderService *services.OrderService
}

func NewPaymentController(db *gorm.DB) *PaymentController {
	return &PaymentController{
		DB:           db,
		OrderService: services.NewOrderService(db),
	}
}

// ─── Tripay Callback (Webhook) ────────────────────────────────────────────────
// Sesuai dokumentasi: validasi X-Callback-Signature & X-Callback-Event
func (c *PaymentController) TriPayCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Baca raw body (harus sebelum parse, untuk validasi signature)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondCallback(w, false, "Failed to read request body")
		return
	}

	// 2. Ambil header wajib dari Tripay
	callbackSignature := r.Header.Get("X-Callback-Signature")
	callbackEvent := r.Header.Get("X-Callback-Event")

	if callbackSignature == "" {
		respondCallback(w, false, "Missing X-Callback-Signature header")
		return
	}

	// 3. Validasi Event Type (docs: hanya proses "payment_status")
	if callbackEvent != "payment_status" {
		// Event lain (misal: refund) → acknowledge saja, jangan error
		respondCallback(w, true, "Event acknowledged")
		return
	}

	// 4. Verifikasi Signature: HMAC-SHA256(raw_body, private_key)
	configSvc := services.NewConfigService(c.DB)
	privateKey := configSvc.Get("payment_tripay_private", os.Getenv("TRIPAY_PRIVATE_KEY"))
	h := hmac.New(sha256.New, []byte(privateKey))
	h.Write(body)
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if callbackSignature != expectedSignature {
		respondCallback(w, false, "Signature mismatch")
		return
	}

	// 5. Parse payload (lengkap sesuai docs: termasuk fee fields)
	var payload struct {
		Reference         string  `json:"reference"`
		MerchantRef       string  `json:"merchant_ref"`
		PaymentMethod     string  `json:"payment_method"`
		PaymentMethodCode string  `json:"payment_method_code"`
		TotalAmount       int64   `json:"total_amount"`
		FeeMerchant       int64   `json:"fee_merchant"`
		FeeCustomer       int64   `json:"fee_customer"`
		TotalFee          int64   `json:"total_fee"`
		AmountReceived    int64   `json:"amount_received"`
		IsClosedPayment   int     `json:"is_closed_payment"`
		Status            string  `json:"status"`
		PaidAt            *int64  `json:"paid_at"`
		Note              *string `json:"note"`
	}

	if err := json.Unmarshal(body, &payload); err != nil {
		respondCallback(w, false, "Invalid JSON payload")
		return
	}

	// 6. Proses dengan idempotency guard (HandleWebhook = DB Transaction + lock)
	err = utils.HandleWebhook(c.DB, "tripay", payload.Reference, string(body), func(tx *gorm.DB) error {
		// Hanya proses status PAID
		// EXPIRED & FAILED → acknowledge tapi tidak ubah order (sudah dihandle housekeeping)
		if payload.Status != "PAID" {
			return nil
		}

		// Cari order berdasarkan order_number = merchant_ref
		var order models.Order
		if err := tx.Where("order_number = ?", payload.MerchantRef).First(&order).Error; err != nil {
			// Fallback: cari by ID
			if err2 := tx.Where("CAST(id AS TEXT) = ?", payload.MerchantRef).First(&order).Error; err2 != nil {
				return fmt.Errorf("order not found: %s", payload.MerchantRef)
			}
		}

		// Idempotency: skip jika sudah dibayar
		if order.Status == models.OrderPaid {
			return nil
		}

		// Gunakan OrderService dengan DB transaction yang sama
		orderSvc := services.OrderService{
			DB:             tx,
			OrderRepo:      c.OrderService.OrderRepo,
			UserRepo:       c.OrderService.UserRepo,
			FinanceService: c.OrderService.FinanceService,
			Affiliate:      c.OrderService.Affiliate,
			Notification:   c.OrderService.Notification,
			ConfigService:  c.OrderService.ConfigService,
		}

		return orderSvc.CompletePayment(tx, order.ID)
	})

	if err != nil {
		if err == utils.ErrWebhookAlreadyProcessed {
			respondCallback(w, true, "Already processed")
			return
		}
		respondCallback(w, false, err.Error())
		return
	}

	// 7. Docs: response WAJIB {"success": true} agar Tripay tidak retry
	respondCallback(w, true, "OK")
}

// ─── Get Active Payment Channels ─────────────────────────────────────────────
// GET /api/payment/channels → dipakai CheckoutPage.jsx
func (c *PaymentController) GetChannels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tripay := services.NewTripayService(c.DB)
	channels, err := tripay.GetPaymentChannels()
	if err != nil {
		utils.JSONError(w, http.StatusBadGateway, "Gagal mengambil channel pembayaran: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    channels,
	})
}

// ─── Fee Calculator ───────────────────────────────────────────────────────────
// GET /api/payment/fee?amount=X&code=Y → dipakai CheckoutPage untuk tampilkan biaya
func (c *PaymentController) GetFee(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	amountStr := r.URL.Query().Get("amount")
	code := r.URL.Query().Get("code")

	var amount int64
	fmt.Sscan(amountStr, &amount)
	if amount <= 0 {
		utils.JSONError(w, http.StatusBadRequest, "Parameter 'amount' wajib diisi")
		return
	}

	tripay := services.NewTripayService(c.DB)
	fees, err := tripay.CalculateFee(amount, code)
	if err != nil {
		utils.JSONError(w, http.StatusBadGateway, "Gagal kalkulasi fee: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    fees,
	})
}

// ─── Helper ───────────────────────────────────────────────────────────────────

// respondCallback: format response sesuai docs Tripay → {"success": true/false}
func respondCallback(w http.ResponseWriter, success bool, msg string) {
	w.Header().Set("Content-Type", "application/json")
	if success {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusBadRequest)
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": success,
		"message": msg,
	})
}
