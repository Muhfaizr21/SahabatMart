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
)

type TripayService struct {
	MerchantCode string
	ApiKey       string
	PrivateKey   string
	BaseURL      string
}

func NewTripayService() *TripayService {
	return &TripayService{
		MerchantCode: os.Getenv("TRIPAY_MERCHANT_CODE"),
		ApiKey:       os.Getenv("TRIPAY_API_KEY"),
		PrivateKey:   os.Getenv("TRIPAY_PRIVATE_KEY"),
		BaseURL:      os.Getenv("TRIPAY_BASE_URL"),
	}
}

type TripayItem struct {
	SKU      string `json:"sku"`
	Name     string `json:"name"`
	Price    int64  `json:"price"`
	Quantity int    `json:"quantity"`
	Subtotal int64  `json:"subtotal"`
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

func (s *TripayService) CreateTransaction(method string, merchantRef string, amount int64, customerName, email, phone string, items []TripayItem, callbackUrl, returnUrl string, expiredTime int64) (map[string]interface{}, error) {
	// 1. Generate Signature
	payload := s.MerchantCode + merchantRef + fmt.Sprintf("%d", amount)
	h := hmac.New(sha256.New, []byte(s.PrivateKey))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	// 2. Prepare Request
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

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", s.BaseURL+"/transaction/create", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+s.ApiKey)

	// 3. Execute Request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tripay error (%d): %v", resp.StatusCode, result["message"])
	}

	return result, nil
}

func (s *TripayService) GetInstructions(code string, payCode string, amount float64) (map[string]interface{}, error) {
	params := fmt.Sprintf("?code=%s&allow_html=1", code)
	if payCode != "" {
		params += "&pay_code=" + payCode
	}
	if amount > 0 {
		params += fmt.Sprintf("&amount=%.0f", amount)
	}

	req, err := http.NewRequest("GET", s.BaseURL+"/payment/instruction"+params, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Add("Authorization", "Bearer "+s.ApiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return result, nil
}
