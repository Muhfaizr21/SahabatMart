package services

import (
	"akuglow/backend/models"
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

	// Auto-append IDZ suffix with postal code from area.name
	for _, area := range result.Areas {
		if id, ok := area["id"].(string); ok && !strings.Contains(id, "IDZ") {
			if name, ok := area["name"].(string); ok {
				parts := strings.Split(name, ".")
				if len(parts) > 0 {
					postalCode := strings.TrimSpace(parts[len(parts)-1])
					if postalCode != "" {
						area["id"] = id + "IDZ" + postalCode
					}
				}
			}
		}
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

	// Sanitize Area IDs by automatically appending IDZ suffix for Gambir/origin if missing
	if originAreaID == "IDNP6IDNC147IDND829" {
		originAreaID = "IDNP6IDNC147IDND829IDZ10110"
	}
	if destinationAreaID == "IDNP6IDNC147IDND829" {
		destinationAreaID = "IDNP6IDNC147IDND829IDZ10110"
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

	// Enforce courier_service is populated with courier_service_code for frontend selection compatibility
	for _, p := range result.Pricing {
		if p["courier_service"] == nil || p["courier_service"] == "" {
			if sCode, ok := p["courier_service_code"].(string); ok && sCode != "" {
				p["courier_service"] = sCode
			} else if sType, ok := p["type"].(string); ok && sType != "" {
				p["courier_service"] = sType
			}
		}
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
	apiURL := fmt.Sprintf("%s/v1/orders", s.BaseURL)

	// Ambil data merchant dan user profile untuk alamat asal
	var merchant models.Merchant
	if err := s.DB.First(&merchant, "id = ?", group.MerchantID).Error; err != nil {
		return "", "", fmt.Errorf("merchant not found: %v", err)
	}

	var user models.User
	if err := s.DB.Preload("Profile").First(&user, "id = ?", merchant.UserID).Error; err != nil {
		return "", "", fmt.Errorf("merchant user not found: %v", err)
	}

	if merchant.BiteshipAreaID == "" {
		return "", "", fmt.Errorf("merchant origin area id not set — silakan set BiteshipAreaID di profil merchant")
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

	// Shipper phone
	shipperPhone := "08123456789" // Fallback
	if user.Phone != nil && *user.Phone != "" {
		shipperPhone = *user.Phone
	}

	// Origin address — pakai profile jika ada, fallback ke store name + merchant city
	originAddress := ""
	if user.Profile.Address != "" {
		originAddress = user.Profile.Address
		if user.Profile.City != "" {
			originAddress += ", " + user.Profile.City
		}
	} else if merchant.City != "" {
		originAddress = merchant.StoreName + ", " + merchant.City
	} else {
		originAddress = merchant.StoreName // Minimal storename
	}

	// Origin area ID — pastikan ada IDZ suffix
	originArea := merchant.BiteshipAreaID
	if originArea != "" && !strings.Contains(originArea, "IDZ") {
		originArea = originArea + "IDZ10110"
	}

	// Destination area ID
	destArea := order.DestinationAreaID
	if destArea != "" && !strings.Contains(destArea, "IDZ") && order.ShippingPostalCode != "" {
		destArea = destArea + "IDZ" + order.ShippingPostalCode
	}
	if destArea == "" {
		return "", "", fmt.Errorf("destination area id kosong — pelanggan belum memilih area pengiriman")
	}

	// Courier type — gunakan service_code dari group
	courierType := group.ServiceCode
	if courierType == "" {
		courierType = group.CourierService
	}
	if courierType == "" {
		courierType = "reguler"
	}

	payload := map[string]interface{}{
		"order_note":   fmt.Sprintf("Order #%s", order.OrderNumber),
		"callback_url": os.Getenv("BITESHIP_CALLBACK_URL"),

		// Origin (Pick-up) Details
		"origin_contact_name":  merchant.StoreName,
		"origin_contact_phone": shipperPhone,
		"origin_address":       originAddress,
		"origin_area_id":       originArea,

		// Destination (Recipient) Details
		"destination_contact_name":  order.ShippingName,
		"destination_contact_phone": order.ShippingPhone,
		"destination_address":       order.ShippingAddress,
		"destination_area_id":       destArea,

		"courier_company": group.CourierCode,
		"courier_type":    courierType,
		"delivery_type":   "now",
		"items":           items,
	}

	bodyBytes, _ := json.Marshal(payload)
	log.Printf("📦 [Biteship CreateOrder] Payload:\n%s", string(bodyBytes))

	req, _ := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("📦 [Biteship CreateOrder] Response (status %d):\n%s", resp.StatusCode, string(respBody))

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		var errBody map[string]interface{}
		json.Unmarshal(respBody, &errBody)
		errorMsg, _ := errBody["error"].(string)
		if errorMsg == "" {
			errorMsg = string(respBody)
		}
		return "", "", fmt.Errorf("biteship api returned status %d: %s", resp.StatusCode, errorMsg)
	}

	var result struct {
		Success bool   `json:"success"`
		ID      string `json:"id"`
		Courier struct {
			WaybillID string `json:"waybill_id"`
		} `json:"courier"`
		Error string `json:"error"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", "", fmt.Errorf("failed to parse biteship response: %v", err)
	}

	if !result.Success {
		return "", "", fmt.Errorf("biteship error: %s", result.Error)
	}

	return result.ID, result.Courier.WaybillID, nil
}

// CreateBiteshipOrderForRestock membuat pesanan pengiriman otomatis ke Biteship untuk Restock B2B
func (s *ShippingService) CreateBiteshipOrderForRestock(restock models.RestockRequest, courierCode string) (string, string, string, error) {
	apiURL := fmt.Sprintf("%s/v1/orders", s.BaseURL)

	// Admin Warehouse (Origin) - Dummy/Hardcoded untuk simulasi karena tidak ada tabel khusus
	originName := "Gudang Pusat AkuGlow"
	originPhone := "081234567890"
	originAddress := "Jl. Jenderal Sudirman No.1, Jakarta Pusat"
	originArea := "IDNP6IDNC147IDND829IDZ10110" // Gambir, Jakarta Pusat

	// Destination (Merchant)
	destName := restock.Merchant.StoreName
	destPhone := "08123456789" // Fallback

	var user models.User
	if err := s.DB.Preload("Profile").First(&user, "id = ?", restock.Merchant.UserID).Error; err == nil {
		if user.Phone != nil && *user.Phone != "" {
			destPhone = *user.Phone
		}
	}

	destAddress := restock.Merchant.StoreName
	if user.Profile.Address != "" {
		destAddress = user.Profile.Address
		if user.Profile.City != "" {
			destAddress += ", " + user.Profile.City
		}
	} else if restock.Merchant.City != "" {
		destAddress += ", " + restock.Merchant.City
	}

	destArea := restock.Merchant.BiteshipAreaID
	if destArea != "" && !strings.Contains(destArea, "IDZ") {
		destArea = destArea + "IDZ10110" // Fallback IDZ if missing
	}
	if destArea == "" {
		return "", "", "", fmt.Errorf("area_id merchant kosong — merchant belum mengatur BiteshipAreaID di profil tokonya")
	}

	type BiteshipItem struct {
		Name     string `json:"name"`
		Value    int64  `json:"value"`
		Weight   int    `json:"weight"`
		Quantity int    `json:"quantity"`
	}

	items := []BiteshipItem{}
	for _, item := range restock.Items {
		weight := 1000 // Asumsi 1000g / 1kg per item bulk restock (karena tidak ada data berat restock item spesifik saat ini)
		items = append(items, BiteshipItem{
			Name:     "Produk Restock",
			Value:    10000, // Nominal asuransi dummy
			Weight:   weight,
			Quantity: item.Quantity,
		})
	}

	// Map courierCode ke courier_type Biteship yang valid
	courierType := "reg"
	cCode := strings.ToLower(courierCode)
	if cCode == "gojek" || cCode == "grab" {
		courierType = "instant"
	}

	payload := map[string]interface{}{
		"order_note":   fmt.Sprintf("Restock B2B #%s", restock.ID),
		
		// Origin (Pick-up) Details
		"origin_contact_name":  originName,
		"origin_contact_phone": originPhone,
		"origin_address":       originAddress,
		"origin_area_id":       originArea,

		// Destination (Recipient) Details
		"destination_contact_name":  destName,
		"destination_contact_phone": destPhone,
		"destination_address":       destAddress,
		"destination_area_id":       destArea,

		"courier_company": strings.ToLower(courierCode),
		"courier_type":    courierType,
		"delivery_type":   "now",
		"items":           items,
	}

	bodyBytes, _ := json.Marshal(payload)
	log.Printf("📦 [Biteship CreateRestockOrder] Payload:\n%s", string(bodyBytes))

	req, _ := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", "", fmt.Errorf("network error: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("📦 [Biteship CreateRestockOrder] Response (status %d):\n%s", resp.StatusCode, string(respBody))

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		var errBody map[string]interface{}
		json.Unmarshal(respBody, &errBody)
		errorMsg, _ := errBody["error"].(string)
		if errorMsg == "" {
			errorMsg = string(respBody)
		}
		
		if os.Getenv("GO_ENV") != "production" {
			// Dev Mode Fallback: Kalau gagal di Sandbox, generate resi dummy untuk keperluan testing.
			log.Printf("💡 [Dev Mode] Biteship API error — generating DUMMY waybill for testing...")
			dummyResi := "DUMMY-" + strings.ToUpper(courierCode) + "-" + restock.ID[:8]
			dummyLink := "https://track.biteship.com/dummy-track-link"
			return "biteship-dummy-" + restock.ID[:8], dummyResi, dummyLink, nil
		}
		
		return "", "", "", fmt.Errorf("biteship api returned status %d: %s", resp.StatusCode, errorMsg)
	}

	var result struct {
		Success bool   `json:"success"`
		ID      string `json:"id"`
		Courier struct {
			WaybillID string `json:"waybill_id"`
			Link      string `json:"link"`
		} `json:"courier"`
		Error string `json:"error"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", "", "", fmt.Errorf("failed to parse biteship response: %v", err)
	}

	if !result.Success {
		return "", "", "", fmt.Errorf("biteship error: %s", result.Error)
	}

	return result.ID, result.Courier.WaybillID, result.Courier.Link, nil
}



// GetPublicTracking melacak resi manual via Public API Biteship
func (s *ShippingService) GetPublicTracking(waybillID, courierCode string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/trackings/%s/couriers/%s", s.BaseURL, waybillID, courierCode)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to reach biteship: %v", err)
	}
	defer res.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse biteship response: %v", err)
	}

	return result, nil
}

// GetTracking mendapatkan status tracking terbaru dari internal Biteship Order ID
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

// GetOrderLabel mengambil detail order dari Biteship, termasuk waybill_url untuk print label
func (s *ShippingService) GetOrderLabel(biteshipOrderID string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/orders/%s", s.BaseURL, biteshipOrderID)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("authorization", s.ApiKey)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		log.Printf("⚠️ [Biteship GetOrderLabel] Status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("biteship api returned status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
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
