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
	"time"

	"gorm.io/gorm"
)

type ShippingService struct {
	DB     *gorm.DB
	ApiKey string
	BaseURL string
}

func NewShippingService(db *gorm.DB) *ShippingService {
	apiKey := os.Getenv("BITESHIP_API_KEY")
	baseURL := os.Getenv("BITESHIP_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.biteship.com"
	}
	
	return &ShippingService{
		DB:      db,
		ApiKey:  apiKey,
		BaseURL: baseURL,
	}
}

// SearchArea mencari ID Wilayah Biteship berdasarkan input teks
func (s *ShippingService) SearchArea(input string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/maps/areas?countries=ID&input=%s", s.BaseURL, url.QueryEscape(input))
	
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
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

	client := &http.Client{Timeout: 10 * time.Second}
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
		var activeCodes []string
		s.DB.Model(&models.LogisticChannel{}).Where("is_active = ?", true).Pluck("code", &activeCodes)
		if len(activeCodes) > 0 {
			couriers = strings.ToLower(strings.Join(activeCodes, ","))
		} else {
			// Fallback jika tabel masih kosong
			couriers = "jne,sicepat,jnt,anteraja,tiki,pos"
		}
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
	log.Printf("📦 [Biteship Request Payload]: %s", string(body))

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		var errBody map[string]interface{}
		json.Unmarshal(respBody, &errBody)
		errorMessage, _ := errBody["error"].(string)
		log.Printf("⚠️ [Biteship API Error] Status %d: %s", resp.StatusCode, errorMessage)

		if os.Getenv("GO_ENV") != "production" {
			log.Printf("💡 [Dev Mode] Biteship API error — generating estimated rates from DB channels...")
			return s.generateMockRates(items), nil
		}

		return nil, fmt.Errorf("biteship api returned status %d: %s", resp.StatusCode, errorMessage)
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

// generateMockRates membuat estimasi ongkir berdasarkan kurir aktif di DB
// Digunakan sebagai fallback saat Biteship API tidak tersedia (mode dev / sandbox belum setup)
func (s *ShippingService) generateMockRates(items []models.OrderItem) []map[string]interface{} {
	// Hitung total berat
	totalWeight := 0
	for _, item := range items {
		w := item.Weight
		if w <= 0 {
			w = 200
		}
		totalWeight += w * item.Quantity
	}
	if totalWeight <= 0 {
		totalWeight = 200
	}

	// Ambil kurir aktif dari DB
	type CourierRow struct {
		Code string
		Name string
	}
	var channels []models.LogisticChannel
	s.DB.Where("is_active = ?", true).Find(&channels)

	// Tabel layanan tiap kurir: code -> [{service, duration, basePrice, pricePerKg}]
	serviceMap := map[string][]struct {
		service   string
		name      string
		duration  string
		basePrice int
		perKg     int
	}{
		"jne":          {{"REG", "Reguler", "2-3 hari", 8000, 7000}, {"YES", "Yakin Esok Sampai", "1-2 hari", 20000, 12000}},
		"sicepat":      {{"REG", "Reguler", "2-3 hari", 7000, 6500}, {"BEST", "Best", "1-2 hari", 18000, 11000}},
		"jnt":          {{"EZ", "Reguler", "2-3 hari", 7500, 7000}},
		"anteraja":     {{"REG", "Reguler", "2-4 hari", 7000, 6000}},
		"pos":          {{"Biasa", "Pos Reguler", "3-5 hari", 6000, 5500}},
		"wahana":       {{"REG", "Reguler", "3-5 hari", 6500, 5000}},
		"lion":         {{"REG", "Reguler", "2-4 hari", 7500, 7500}},
		"ninja":        {{"STD", "Standard", "2-4 hari", 8000, 7000}},
		"idexpress":    {{"STD", "Standard", "3-5 hari", 6000, 5500}},
		"tiki":         {{"REG", "Reguler", "2-4 hari", 7000, 6500}},
		"rpx":          {{"RGP", "Reguler", "3-5 hari", 8000, 7000}},
		"sentralcargo": {{"REG", "Reguler", "4-7 hari", 5000, 4000}},
	}

	weightKg := float64(totalWeight) / 1000.0
	if weightKg < 1 {
		weightKg = 1 // minimum 1 kg
	}

	var result []map[string]interface{}
	for _, ch := range channels {
		services, ok := serviceMap[strings.ToLower(ch.Code)]
		if !ok {
			// Kurir tidak ada di tabel, generate generic
			price := int(8000 + weightKg*7000)
			result = append(result, map[string]interface{}{
				"courier_name":            ch.Name,
				"courier_code":            strings.ToLower(ch.Code),
				"courier_service":         "REG",
				"courier_service_name":    "Reguler",
				"courier_service_code":    "reg",
				"price":                   price,
				"duration":                "2-5 hari",
				"shipment_duration_range": "2-5",
				"shipment_duration_unit":  "days",
				"is_estimated":            true,
			})
			continue
		}
		for _, svc := range services {
			price := int(float64(svc.basePrice) + weightKg*float64(svc.perKg))
			result = append(result, map[string]interface{}{
				"courier_name":            ch.Name,
				"courier_code":            strings.ToLower(ch.Code),
				"courier_service":         svc.service,
				"courier_service_name":    svc.name,
				"courier_service_code":    strings.ToLower(svc.service),
				"price":                   price,
				"duration":                svc.duration,
				"shipment_duration_range": strings.Split(svc.duration, " ")[0],
				"shipment_duration_unit":  "days",
				"is_estimated":            true,
			})
		}
	}

	if len(result) == 0 {
		// Absolute fallback jika DB kosong
		result = []map[string]interface{}{
			{"courier_name": "JNE", "courier_code": "jne", "courier_service": "REG", "courier_service_name": "Reguler", "courier_service_code": "reg", "price": int(8000 + weightKg*7000), "duration": "2-3 hari", "shipment_duration_range": "2-3", "shipment_duration_unit": "days", "is_estimated": true},
			{"courier_name": "SiCepat", "courier_code": "sicepat", "courier_service": "REG", "courier_service_name": "Reguler", "courier_service_code": "reg", "price": int(7000 + weightKg*6500), "duration": "2-3 hari", "shipment_duration_range": "2-3", "shipment_duration_unit": "days", "is_estimated": true},
		}
	}

	log.Printf("📦 [Dev Fallback] Generated %d estimated rates for weight %.2fkg", len(result), weightKg)
	return result
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

	client := &http.Client{Timeout: 10 * time.Second}
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

	client := &http.Client{Timeout: 10 * time.Second}
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
	log.Printf("[Biteship Webhook] Incoming payload: %+v", payload)

	event, ok := payload["event"].(string)
	if !ok || event != "order.status_updated" {
		log.Printf("[Biteship Webhook] Skipping event: %s", event)
		return nil
	}

	biteshipOrderID, _ := payload["order_id"].(string)
	status, _ := payload["status"].(string)

	if biteshipOrderID == "" {
		log.Println("[Biteship Webhook] Missing order_id, skipping.")
		return nil
	}

	var group models.OrderMerchantGroup
	if err := s.DB.First(&group, "biteship_order_id = ?", biteshipOrderID).Error; err != nil {
		log.Printf("[Biteship Webhook] Group not found for biteship_order_id=%s: %v", biteshipOrderID, err)
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

	if newStatus == group.Status {
		log.Printf("[Biteship Webhook] No status change for group %s (status: %s)", group.ID, group.Status)
		return nil
	}

	group.Status = newStatus

	// Set timestamps
	now := time.Now()
	if newStatus == models.MOrderShipped {
		group.ShippedAt = &now
	} else if newStatus == models.MOrderDelivered {
		group.DeliveredAt = &now
	}

	if err := s.DB.Save(&group).Error; err != nil {
		return err
	}

	log.Printf("[Biteship Webhook] Group %s updated to status: %s", group.ID, newStatus)

	// Trigger settlement countdown when delivered (same as manual update flow)
	if newStatus == models.MOrderDelivered {
		financeService := NewFinanceService(s.DB)
		if err := financeService.UpdateSettlementDatesOnDelivery(s.DB, group.OrderID); err != nil {
			log.Printf("⚠️ [Biteship Webhook] Failed to update settlement dates for order %s: %v", group.OrderID, err)
		}
	}

	// Sync parent Order status from all groups
	orderService := NewOrderService(s.DB)
	if err := orderService.SyncOrderStatusFromGroups(s.DB, group.OrderID); err != nil {
		log.Printf("⚠️ [Biteship Webhook] Failed to sync parent order status for %s: %v", group.OrderID, err)
	}

	return nil
}
