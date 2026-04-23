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

// TriPayCallback handles incoming notification from TriPay
func (c *PaymentController) TriPayCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Get Signature from Header
	callbackSignature := r.Header.Get("X-Callback-Signature")
	if callbackSignature == "" {
		utils.JSONError(w, http.StatusBadRequest, "Invalid signature")
		return
	}

	// 2. Read Body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to read request body")
		return
	}

	// 3. Verify Signature
	privateKey := os.Getenv("TRIPAY_PRIVATE_KEY")
	h := hmac.New(sha256.New, []byte(privateKey))
	h.Write(body)
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if callbackSignature != expectedSignature {
		utils.JSONError(w, http.StatusForbidden, "Signature mismatch")
		return
	}

	// 4. Parse JSON Payload
	var payload struct {
		Reference      string `json:"reference"`
		MerchantRef    string `json:"merchant_ref"`
		Status         string `json:"status"`
		AmountReceived float64 `json:"amount_received"`
	}

	if err := json.Unmarshal(body, &payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	// 5. Process using HandleWebhook (Idempotency)
	err = utils.HandleWebhook(c.DB, "tripay", payload.Reference, string(body), func(tx *gorm.DB) error {
		// Only process PAID status
		if payload.Status != "PAID" {
			return nil // Don't error, just acknowledge (TriPay expects 200 OK)
		}

		// Find order by merchant_ref
		var order models.Order
		// Kita gunakan pengecekan spesifik agar tidak memicu error tipe UUID di PostgreSQL
		if err := tx.Where("order_number = ?", payload.MerchantRef).First(&order).Error; err != nil {
			// Jika tidak ketemu lewat order_number, coba lewat ID (tapi pastikan formatnya UUID agar tidak error)
			if err := tx.Where("CAST(id AS TEXT) = ?", payload.MerchantRef).First(&order).Error; err != nil {
				return fmt.Errorf("order not found: %s", payload.MerchantRef)
			}
		}

		// Check if already paid
		if order.Status == models.OrderPaid {
			return nil // Already processed
		}

		// Use OrderService to complete payment (this handles all distributions)
		orderService := services.OrderService{
			DB:             tx,
			OrderRepo:      c.OrderService.OrderRepo,
			UserRepo:       c.OrderService.UserRepo,
			FinanceService: c.OrderService.FinanceService,
			Affiliate:      c.OrderService.Affiliate,
			Notification:   c.OrderService.Notification,
			ConfigService:  c.OrderService.ConfigService,
		}

		if err := orderService.CompletePayment(order.ID); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == utils.ErrWebhookAlreadyProcessed {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Already processed"})
			return
		}
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Success response for TriPay
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}
