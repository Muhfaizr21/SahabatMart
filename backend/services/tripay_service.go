package services

import (
	"bytes"
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

// ─── Structs (sesuai dokumentasi Tripay) ─────────────────────────────────────

type TripayFeeDetail struct {
	Flat    interface{} `json:"flat"`
	Percent interface{} `json:"percent"`
}

type TripayChannel struct {
	Group         string          `json:"group"`
	Code          string          `json:"code"`
	Name          string          `json:"name"`
	Type          string          `json:"type"` // "direct" | "redirect"
	FeeMerchant   TripayFeeDetail `json:"fee_merchant"`
	FeeCustomer   TripayFeeDetail `json:"fee_customer"`
	TotalFee      TripayFeeDetail `json:"total_fee"`
	MinimumFee    interface{} `json:"minimum_fee"`
	MaximumFee    interface{} `json:"maximum_fee"`
	MinimumAmount interface{} `json:"minimum_amount"`
	MaximumAmount interface{} `json:"maximum_amount"`
	IconURL       string          `json:"icon_url"`
	Active        bool            `json:"active"`
}

type TripayItem struct {
	SKU        string `json:"sku"`
	Name       string `json:"name"`
	Price      interface{} `json:"price"`
	Quantity   interface{} `json:"quantity"`
	Subtotal   interface{} `json:"subtotal"`
	ProductURL string `json:"product_url,omitempty"`
	ImageURL   string `json:"image_url,omitempty"`
}

type TripayRequest struct {
	Method      string       `json:"method"`
	MerchantRef string       `json:"merchant_ref"`
	Amount      int64        `json:"amount"`
	Customer    string       `json:"customer_name"`
	Email       string       `json:"customer_email"`
	Phone       string       `json:"customer_phone"`
	Items       []TripayItem `json:"order_items"`
	CallbackURL string       `json:"callback_url"`
	ReturnURL   string       `json:"return_url"`
	ExpiredTime int64        `json:"expired_time"`
	Signature   string       `json:"signature"`
}

type TripayTransactionData struct {
	Reference    string      `json:"reference"`
	MerchantRef  string      `json:"merchant_ref"`
	PaymentMethod string     `json:"payment_method"`
	PaymentName  string      `json:"payment_name"`
	CustomerName string      `json:"customer_name"`
	Amount       interface{} `json:"amount"`
	FeeMerchant  interface{} `json:"fee_merchant"`
	FeeCustomer  interface{} `json:"fee_customer"`
	TotalFee     interface{} `json:"total_fee"`
	AmountReceived interface{} `json:"amount_received"`
	PayCode      string      `json:"pay_code"`
	PayURL       *string     `json:"pay_url"`
	CheckoutURL  string      `json:"checkout_url"`
	QRString     *string     `json:"qr_string"`
	QRURL        *string     `json:"qr_url"`
	Status       string      `json:"status"`
	ExpiredTime  int64       `json:"expired_time"`
	Instructions interface{} `json:"instructions"`
}

type TripayFeeCalculatorItem struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Fee      struct {
		Flat    interface{} `json:"flat"`
		Percent interface{} `json:"percent"`
	} `json:"fee"`
	TotalFee struct {
		Merchant interface{} `json:"merchant"`
		Customer interface{} `json:"customer"`
	} `json:"total_fee"`
}

// ─── Service ──────────────────────────────────────────────────────────────────

type TripayService struct {
	MerchantCode string
	ApiKey       string
	PrivateKey   string
	BaseURL      string
}

func NewTripayService(db *gorm.DB) *TripayService {
	configSvc := NewConfigService(db)

	merchantCode := configSvc.Get("payment_tripay_merchant", os.Getenv("TRIPAY_MERCHANT_CODE"))
	apiKey := configSvc.Get("payment_tripay_key", os.Getenv("TRIPAY_API_KEY"))
	privateKey := configSvc.Get("payment_tripay_private", os.Getenv("TRIPAY_PRIVATE_KEY"))
	baseURL := configSvc.Get("payment_tripay_url", "")
	if baseURL == "" {
		if configSvc.Get("payment_sandbox_mode", "true") == "true" {
			baseURL = "https://tripay.co.id/api-sandbox"
		} else {
			baseURL = "https://tripay.co.id/api"
		}
	}

	return &TripayService{
		MerchantCode: merchantCode,
		ApiKey:       apiKey,
		PrivateKey:   privateKey,
		BaseURL:      baseURL,
	}
}

// ─── Signature Helpers (sesuai dokumentasi) ───────────────────────────────────

// GenerateSignature: HMAC-SHA256(merchant_code + merchant_ref + amount, private_key)
func (s *TripayService) GenerateSignature(merchantRef string, amount int64) string {
	msg := s.MerchantCode + merchantRef + fmt.Sprintf("%d", amount)
	h := hmac.New(sha256.New, []byte(s.PrivateKey))
	h.Write([]byte(msg))
	return hex.EncodeToString(h.Sum(nil))
}

// GenerateCallbackSignature: HMAC-SHA256(raw_json_body, private_key)
func (s *TripayService) GenerateCallbackSignature(rawBody string) string {
	h := hmac.New(sha256.New, []byte(s.PrivateKey))
	h.Write([]byte(rawBody))
	return hex.EncodeToString(h.Sum(nil))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func (s *TripayService) doGet(path string) ([]byte, error) {
	req, err := http.NewRequest("GET", s.BaseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", "Bearer "+s.ApiKey)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		var r map[string]interface{}
		json.Unmarshal(body, &r)
		return nil, fmt.Errorf("tripay error (%d): %v", resp.StatusCode, r["message"])
	}
	return body, nil
}

func (s *TripayService) doPost(path string, payload interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", s.BaseURL+path, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+s.ApiKey)
	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		var r map[string]interface{}
		json.Unmarshal(body, &r)
		return nil, fmt.Errorf("tripay error (%d): %v", resp.StatusCode, r["message"])
	}
	return body, nil
}

// ─── API Methods ──────────────────────────────────────────────────────────────

// GetPaymentChannels: GET /merchant/payment-channel → hanya channel active=true
func (s *TripayService) GetPaymentChannels() ([]TripayChannel, error) {
	body, err := s.doGet("/merchant/payment-channel")
	if err != nil {
		return nil, err
	}

	var resp struct {
		Success bool            `json:"success"`
		Message string          `json:"message"`
		Data    []TripayChannel `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, fmt.Errorf("tripay: %s", resp.Message)
	}

	// Filter hanya yang active=true
	var active []TripayChannel
	for _, ch := range resp.Data {
		if ch.Active {
			active = append(active, ch)
		}
	}
	return active, nil
}

// GetPaymentChannelsRaw: return all channels (termasuk non-aktif) untuk admin
func (s *TripayService) GetPaymentChannelsRaw() (map[string]interface{}, error) {
	body, err := s.doGet("/merchant/payment-channel")
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return result, nil
}

// CreateTransaction: POST /transaction/create
func (s *TripayService) CreateTransaction(method, merchantRef string, amount int64, customerName, email, phone string, items []TripayItem, callbackUrl, returnUrl string, expiredTime int64) (*TripayTransactionData, error) {
	signature := s.GenerateSignature(merchantRef, amount)

	reqBody := TripayRequest{
		Method:      method,
		MerchantRef: merchantRef,
		Amount:      amount,
		Customer:    customerName,
		Email:       email,
		Phone:       phone,
		Items:       items,
		CallbackURL: callbackUrl,
		ReturnURL:   returnUrl,
		ExpiredTime: expiredTime,
		Signature:   signature,
	}

	body, err := s.doPost("/transaction/create", reqBody)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Success bool                  `json:"success"`
		Message string                `json:"message"`
		Data    TripayTransactionData `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, fmt.Errorf("tripay: %s", resp.Message)
	}
	return &resp.Data, nil
}

// GetTransactionDetail: GET /transaction/detail?reference=...
func (s *TripayService) GetTransactionDetail(reference string) (*TripayTransactionData, error) {
	body, err := s.doGet("/transaction/detail?reference=" + reference)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Success bool                  `json:"success"`
		Message string                `json:"message"`
		Data    TripayTransactionData `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, fmt.Errorf("tripay: %s", resp.Message)
	}
	return &resp.Data, nil
}

// CalculateFee: GET /merchant/fee-calculator?amount=X&code=Y
func (s *TripayService) CalculateFee(amount int64, code string) ([]TripayFeeCalculatorItem, error) {
	path := fmt.Sprintf("/merchant/fee-calculator?amount=%d", amount)
	if code != "" {
		path += "&code=" + code
	}
	body, err := s.doGet(path)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Success bool                      `json:"success"`
		Message string                    `json:"message"`
		Data    []TripayFeeCalculatorItem `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}
	if !resp.Success {
		return nil, fmt.Errorf("tripay: %s", resp.Message)
	}
	return resp.Data, nil
}

// GetInstructions: GET /payment/instruction?code=...&pay_code=...&amount=...
func (s *TripayService) GetInstructions(code string, payCode string, amount float64) (map[string]interface{}, error) {
	path := fmt.Sprintf("/payment/instruction?code=%s&allow_html=1", code)
	if payCode != "" {
		path += "&pay_code=" + payCode
	}
	if amount > 0 {
		path += fmt.Sprintf("&amount=%.0f", amount)
	}
	body, err := s.doGet(path)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	return result, nil
}
