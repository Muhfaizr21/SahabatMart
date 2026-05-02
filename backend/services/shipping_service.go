package services

import (
	"SahabatMart/backend/models"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"gorm.io/gorm"
)

type ShippingService struct {
	DB     *gorm.DB
	ApiKey string
	BaseURL string
}

func NewShippingService(db *gorm.DB) *ShippingService {
	apiKey := os.Getenv("BITESHIP_API_KEY")
	baseURL := "https://api.biteship.com" // Default to live, can be overridden by env
	if os.Getenv("GO_ENV") == "development" {
		// BaseURL for test could be different if Biteship uses a separate one, 
		// but usually it's the same URL with different API Key prefix.
	}
	
	return &ShippingService{
		DB:     db,
		ApiKey: apiKey,
		BaseURL: baseURL,
	}
}

// SearchArea mencari ID Wilayah Biteship berdasarkan input teks
func (s *ShippingService) SearchArea(input string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/maps/areas?countries=ID&input=%s", s.BaseURL, url.QueryEscape(input))
	
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	log.Printf("[Biteship] Searching area for: %s", input)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		var errBody interface{}
		json.Unmarshal(body, &errBody)
		log.Printf("⚠️ Biteship SearchArea Error (Status %d): %+v", resp.StatusCode, errBody)
		return nil, fmt.Errorf("biteship api error: %d", resp.StatusCode)
	}

	var result struct {
		Success bool                     `json:"success"`
		Areas   []map[string]interface{} `json:"areas"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	log.Printf("[Biteship] Found %d areas for '%s'", len(result.Areas), input)
	return result.Areas, nil
}

// FetchCouriers mengambil daftar kurir yang didukung dari Biteship
func (s *ShippingService) FetchCouriers() ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/couriers", s.BaseURL)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Success  bool                     `json:"success"`
		Couriers []map[string]interface{} `json:"couriers"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Couriers, nil
}

// GetRates mendapatkan estimasi harga ongkir dari Biteship
func (s *ShippingService) GetRates(originAreaID, destinationAreaID string, items []models.OrderItem, couriers string) ([]map[string]interface{}, error) {
	if couriers == "" {
		couriers = "jne,sicepat,jnt,anteraja,tiki,pos"
	}
	url := fmt.Sprintf("%s/v1/rates/couriers", s.BaseURL)

	type BiteshipItem struct {
		Name     string `json:"name"`
		Value    int64  `json:"value"`
		Weight   int    `json:"weight"` // in grams
		Quantity int    `json:"quantity"`
	}

	biteshipItems := []BiteshipItem{}
	for _, item := range items {
		weight := item.Weight
		if weight <= 0 {
			weight = 200 // Default 200g
		}
		biteshipItems = append(biteshipItems, BiteshipItem{
			Name:     item.ProductName,
			Value:    int64(item.UnitPrice),
			Weight:   weight,
			Quantity: item.Quantity,
		})
	}

	payload := map[string]interface{}{
		"origin_area_id":      originAreaID,
		"destination_area_id": destinationAreaID,
		"couriers":            couriers,
		"items":               biteshipItems,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		var errBody map[string]interface{}
		json.Unmarshal(respBody, &errBody)
		log.Printf("⚠️ Biteship API Error (Status %d): %+v", resp.StatusCode, errBody)

		// Fallback untuk mode development jika saldo habis
		errorMessage, _ := errBody["error"].(string)
		if strings.Contains(strings.ToLower(errorMessage), "balance") {
			log.Println("💡 Insufficient balance detected. Returning mock rates for development...")
			return []map[string]interface{}{
				{
					"courier_name":            "JNE (Simulasi)",
					"courier_code":            "jne",
					"courier_service":         "REG",
					"courier_service_name":    "Reguler",
					"courier_service_code":    "reg",
					"price":                   12000,
					"duration":                "2-3 Hari",
					"shipment_duration_range": "2-3",
					"shipment_duration_unit":  "days",
				},
				{
					"courier_name":            "SiCepat (Simulasi)",
					"courier_code":            "sicepat",
					"courier_service":         "HALU",
					"courier_service_name":    "Halu",
					"courier_service_code":    "halu",
					"price":                   9000,
					"duration":                "3-5 Hari",
					"shipment_duration_range": "3-5",
					"shipment_duration_unit":  "days",
				},
			}, nil
		}

		return nil, fmt.Errorf("biteship api returned status %d", resp.StatusCode)
	}

	var result struct {
		Success bool                     `json:"success"`
		Pricing []map[string]interface{} `json:"pricing"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Pricing, nil
}

// CreateOrder membuat pesanan pengiriman di Biteship
func (s *ShippingService) CreateOrder(order models.Order, group models.OrderMerchantGroup) (string, string, error) {
	url := fmt.Sprintf("%s/v1/orders", s.BaseURL)

	// Ambil data merchant dan user profile untuk alamat asal
	var merchant models.Merchant
	if err := s.DB.First(&merchant, "id = ?", group.MerchantID).Error; err != nil {
		return "", "", err
	}

	var user models.User
	if err := s.DB.Preload("Profile").First(&user, "id = ?", merchant.UserID).Error; err != nil {
		return "", "", err
	}

	if merchant.BiteshipAreaID == "" {
		return "", "", fmt.Errorf("merchant origin area id not set")
	}

	type BiteshipItem struct {
		Name     string `json:"name"`
		Value    int64  `json:"value"`
		Weight   int    `json:"weight"`
		Quantity int    `json:"quantity"`
	}

	items := []BiteshipItem{}
	for _, item := range group.Items {
		weight := item.Weight
		if weight <= 0 {
			weight = 200 // Default 200g
		}
		items = append(items, BiteshipItem{
			Name:     item.ProductName,
			Value:    int64(item.UnitPrice),
			Weight:   weight,
			Quantity: item.Quantity,
		})
	}

	shipperPhone := ""
	if user.Phone != nil {
		shipperPhone = *user.Phone
	} else {
		shipperPhone = "08123456789" // Fallback
	}

	payload := map[string]interface{}{
		"order_note":      fmt.Sprintf("Order #%s", order.OrderNumber),
		"callback_url":    os.Getenv("BITESHIP_CALLBACK_URL"),
		
		// Origin (Pick-up) Details
		"origin_contact_name":  merchant.StoreName,
		"origin_contact_phone": shipperPhone,
		"origin_address":       user.Profile.Address + ", " + user.Profile.City,
		"origin_area_id":       merchant.BiteshipAreaID,
		
		// Destination (Recipient) Details
		"destination_contact_name":  order.ShippingName,
		"destination_contact_phone": order.ShippingPhone,
		"destination_address":       order.ShippingAddress,
		"destination_area_id":       order.DestinationAreaID,
		
		"courier_company": group.CourierCode,
		"courier_type":    group.ServiceCode,
		"delivery_type":   "now",
		"items":           items,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		var errBody interface{}
		json.NewDecoder(resp.Body).Decode(&errBody)
		fmt.Printf("⚠️ Biteship CreateOrder Error (Status %d): %+v\n", resp.StatusCode, errBody)
		return "", "", fmt.Errorf("biteship api returned status %d", resp.StatusCode)
	}

	var result struct {
		Success bool   `json:"success"`
		ID      string `json:"id"`
		Courier struct {
			WaybillID string `json:"waybill_id"`
		} `json:"courier"`
		Error string `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}

	if !result.Success {
		return "", "", fmt.Errorf("biteship error: %s", result.Error)
	}

	return result.ID, result.Courier.WaybillID, nil
}

// GetTracking mendapatkan status tracking terbaru
func (s *ShippingService) GetTracking(biteshipOrderID string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/trackings/%s", s.BaseURL, biteshipOrderID)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result, nil
}

// HandleWebhook memproses update status dari Biteship
func (s *ShippingService) HandleWebhook(payload map[string]interface{}) error {
	event, ok := payload["event"].(string)
	if !ok || event != "order.status_updated" {
		return nil
	}

	biteshipOrderID, _ := payload["order_id"].(string)
	status, _ := payload["status"].(string)

	var group models.OrderMerchantGroup
	if err := s.DB.First(&group, "biteship_order_id = ?", biteshipOrderID).Error; err != nil {
		return err
	}

	// Map Biteship status to our internal status
	// Biteship statuses: allocated, picking_up, picked, dropping_off, delivered, cancelled, etc.
	newStatus := group.Status
	switch status {
	case "picked", "dropping_off":
		newStatus = models.MOrderShipped
	case "delivered":
		newStatus = models.MOrderDelivered
	case "cancelled":
		newStatus = models.MOrderCancelled
	}

	if newStatus != group.Status {
		group.Status = newStatus
		if err := s.DB.Save(&group).Error; err != nil {
			return err
		}
		
		// Logic to update parent Order status if all groups are completed...
	}

	return nil
}
