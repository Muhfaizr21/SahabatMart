# Dokumentasi Integrasi Biteship untuk Backend Golang

**Panduan Lengkap & Praktis | v1.0**

---

## 📋 Daftar Isi

1. [Persiapan Awal](#persiapan-awal)
2. [Setup Project](#setup-project)
3. [Konfigurasi API Key](#konfigurasi-api-key)
4. [Core Integration](#core-integration)
5. [Implementasi Fitur Utama](#implementasi-fitur-utama)
6. [Error Handling](#error-handling)
7. [Testing & Sandbox](#testing--sandbox)
8. [Production Best Practices](#production-best-practices)

---

## 1. Persiapan Awal

### A. Apa itu Biteship?

Biteship adalah platform shipping API terpadu yang menghubungkan Anda dengan multiple carriers (JNE, J&T, SiCepat, Pos Indonesia, DHL, FedEx, dll) melalui satu API endpoint.

**Key Features:**
- ✅ Multi-carrier Integration
- ✅ Real-time Rate Calculation
- ✅ Shipment Creation & Management
- ✅ Real-time Package Tracking
- ✅ Flexible & Easy to Integrate

### B. Syarat Minimal

**Golang Version:** 1.16+  
**Dependencies:** 
- `net/http` (built-in)
- `encoding/json` (built-in)
- `crypto/base64` (built-in)

**Recommended Libraries:**
```bash
go get github.com/go-resty/resty/v2          # HTTP Client
go get github.com/joho/godotenv               # Environment Variables
go get github.com/google/uuid                 # UUID Generation
```

---

## 2. Setup Project

### A. Struktur Folder Project

```
myshipping-app/
├── main.go
├── .env
├── .env.example
├── go.mod
├── go.sum
├── config/
│   └── config.go
├── models/
│   └── biteship.go
├── services/
│   ├── biteship_service.go
│   ├── rates_service.go
│   ├── orders_service.go
│   ├── tracking_service.go
│   └── couriers_service.go
├── handlers/
│   ├── shipping_handler.go
│   └── tracking_handler.go
├── utils/
│   ├── error_handler.go
│   └── response.go
└── tests/
    └── biteship_test.go
```

### B. Inisialisasi Project

```bash
# Buat direktori project
mkdir myshipping-app && cd myshipping-app

# Inisialisasi Go module
go mod init myshipping-app

# Install dependencies
go get github.com/go-resty/resty/v2
go get github.com/joho/godotenv
go get github.com/google/uuid
```

### C. File go.mod (Contoh)

```go
module myshipping-app

go 1.21

require (
    github.com/go-resty/resty/v2 v2.10.0
    github.com/joho/godotenv v1.5.1
    github.com/google/uuid v1.5.0
)
```

---

## 3. Konfigurasi API Key

### A. Generate API Key di Biteship Dashboard

1. Login ke https://dashboard.biteship.com
2. Pergi ke **Integrations** → **Pengaturan**
3. Klik **"Tambah Kunci API"**
4. Beri nama API Key (contoh: "Backend Golang Prod")
5. API Key akan ditampilkan **sekali saja**, simpan dengan aman

**Format API Key:**
```
biteship_live_xxxxxxxxxxxxxxxxxxxx  (Production)
biteship_test_xxxxxxxxxxxxxxxxxxxx   (Testing/Sandbox)
```

### B. Setup Environment Variables

**File: `.env`**

```env
# Biteship Configuration
BITESHIP_API_KEY=biteship_test_xxxxxxxxxxxxx
BITESHIP_BASE_URL=https://api.biteship.com/v1
BITESHIP_SANDBOX_MODE=true

# App Configuration
APP_PORT=8080
APP_ENV=development

# Database (Optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myshipping_app
DB_USER=postgres
DB_PASSWORD=password
```

**File: `.env.example`** (untuk dokumentasi repo)

```env
BITESHIP_API_KEY=biteship_test_xxxxxxxxxxxxx
BITESHIP_BASE_URL=https://api.biteship.com/v1
BITESHIP_SANDBOX_MODE=true
APP_PORT=8080
APP_ENV=development
```

### C. File config/config.go

```go
package config

import (
    "os"
    "github.com/joho/godotenv"
    "log"
)

type Config struct {
    BiteshipAPIKey     string
    BiteshipBaseURL    string
    BiteshipSandbox    bool
    AppPort            string
    AppEnv             string
}

var AppConfig *Config

func LoadConfig() {
    // Load .env file
    _ = godotenv.Load()

    AppConfig = &Config{
        BiteshipAPIKey:  os.Getenv("BITESHIP_API_KEY"),
        BiteshipBaseURL: os.Getenv("BITESHIP_BASE_URL"),
        BiteshipSandbox: os.Getenv("BITESHIP_SANDBOX_MODE") == "true",
        AppPort:         getEnv("APP_PORT", "8080"),
        AppEnv:          getEnv("APP_ENV", "development"),
    }

    // Validasi API Key
    if AppConfig.BiteshipAPIKey == "" {
        log.Fatal("BITESHIP_API_KEY is required")
    }

    log.Println("✓ Config loaded successfully")
}

func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}
```

---

## 4. Core Integration

### A. Setup Biteship Client

**File: `models/biteship.go`**

```go
package models

// Rate Response Model
type RateRequest struct {
    OriginLatitude      float64      `json:"origin_latitude"`
    OriginLongitude     float64      `json:"origin_longitude"`
    DestinationLatitude float64      `json:"destination_latitude"`
    DestLongitude       float64      `json:"destination_longitude"`
    CourierCode         string       `json:"courier_code,omitempty"`
    Items               []RateItem   `json:"items"`
}

type RateItem struct {
    Name        string  `json:"name"`
    Description string  `json:"description,omitempty"`
    Value       float64 `json:"value"`
    Weight      int     `json:"weight"` // dalam gram
    Quantity    int     `json:"quantity"`
}

type RateResponse struct {
    Success bool        `json:"success"`
    Data    []RateData  `json:"data"`
    Error   ErrorDetail `json:"error"`
}

type RateData struct {
    CourierCode  string         `json:"courier_code"`
    CourierName  string         `json:"courier_name"`
    CourierLogo  string         `json:"courier_logo"`
    Rates        []RateDetail   `json:"rates"`
    TieringCode  string         `json:"tiering_code"`
    ServiceType  string         `json:"service_type"`
}

type RateDetail struct {
    RateID          string  `json:"rate_id"`
    ServiceCode     string  `json:"service_code"`
    ServiceName     string  `json:"service_name"`
    ServiceDesc     string  `json:"service_description"`
    Price           int     `json:"price"`
    Duration        int     `json:"duration"`
    DurationUnit    string  `json:"duration_unit"`
    AvailableForCod bool    `json:"available_for_cod"`
}

// Order Model
type OrderRequest struct {
    OriginContactName  string           `json:"origin_contact_name"`
    OriginEmail        string           `json:"origin_email"`
    OriginPhoneNumber  string           `json:"origin_phone_number"`
    OriginNotes        string           `json:"origin_notes,omitempty"`
    OriginLatitude     float64          `json:"origin_latitude"`
    OriginLongitude    float64          `json:"origin_longitude"`
    DestinationName    string           `json:"destination_contact_name"`
    DestinationEmail   string           `json:"destination_email"`
    DestinationPhone   string           `json:"destination_phone_number"`
    DestinationNotes   string           `json:"destination_notes,omitempty"`
    DestinationLat     float64          `json:"destination_latitude"`
    DestinationLng     float64          `json:"destination_longitude"`
    CourierCode        string           `json:"courier_code"`
    ServiceCode        string           `json:"service_code"`
    Items              []OrderItem      `json:"items"`
    CodAmount          int              `json:"cod_amount,omitempty"`
    InsuranceAmount    int              `json:"insurance_amount,omitempty"`
    ReferenceID        string           `json:"reference_id"`
}

type OrderItem struct {
    Name        string  `json:"name"`
    Description string  `json:"description,omitempty"`
    Value       int     `json:"value"`
    Weight      int     `json:"weight"` // gram
    Quantity    int     `json:"quantity"`
    SKU         string  `json:"sku,omitempty"`
}

type OrderResponse struct {
    Success bool         `json:"success"`
    Data    OrderData    `json:"data"`
    Error   ErrorDetail  `json:"error"`
}

type OrderData struct {
    OrderID           string `json:"order_id"`
    ReferenceID       string `json:"reference_id"`
    CourierCode       string `json:"courier_code"`
    CourierName       string `json:"courier_name"`
    ServiceCode       string `json:"service_code"`
    ServiceName       string `json:"service_name"`
    Status            string `json:"status"`
    Resi              string `json:"resi"`
    ResiURL           string `json:"resi_url"`
    Price             int    `json:"price"`
    CodAmount         int    `json:"cod_amount"`
    InsuranceAmount   int    `json:"insurance_amount"`
    ShippingLabelURL  string `json:"shipping_label_url"`
}

// Tracking Model
type TrackingResponse struct {
    Success bool           `json:"success"`
    Data    TrackingData   `json:"data"`
    Error   ErrorDetail    `json:"error"`
}

type TrackingData struct {
    OrderID       string            `json:"order_id"`
    Resi          string            `json:"resi"`
    Status        string            `json:"status"`
    LastUpdate    string            `json:"last_update"`
    History       []TrackingHistory `json:"history"`
}

type TrackingHistory struct {
    Timestamp string `json:"timestamp"`
    Status    string `json:"status"`
    Location  string `json:"location"`
    Notes     string `json:"notes"`
}

// Couriers Model
type CouriersResponse struct {
    Success bool            `json:"success"`
    Data    []CourierDetail `json:"data"`
    Error   ErrorDetail     `json:"error"`
}

type CourierDetail struct {
    Code                string   `json:"code"`
    Name                string   `json:"name"`
    Logo                string   `json:"logo"`
    ServiceTypes        []string `json:"service_types"`
    AvailableForCod     bool     `json:"available_for_cod"`
    AvailableForInsurance bool   `json:"available_for_insurance"`
}

// Error Response Model
type ErrorDetail struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

// Generic Response
type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Message string      `json:"message,omitempty"`
    Error   string      `json:"error,omitempty"`
}
```

### B. Service Layer

**File: `services/biteship_service.go`**

```go
package services

import (
    "encoding/base64"
    "encoding/json"
    "log"
    "myshipping-app/config"
    "myshipping-app/models"
    "myshipping-app/utils"
    "github.com/go-resty/resty/v2"
)

type BiteshipService struct {
    Client    *resty.Client
    APIKey    string
    BaseURL   string
    AuthToken string
}

// Initialize Biteship Service
func NewBiteshipService() *BiteshipService {
    config.LoadConfig()
    
    client := resty.New()
    client.SetBaseURL(config.AppConfig.BiteshipBaseURL)
    
    // Setup Basic Auth
    authToken := base64.StdEncoding.EncodeToString(
        []byte(config.AppConfig.BiteshipAPIKey + ":"),
    )

    service := &BiteshipService{
        Client:    client,
        APIKey:    config.AppConfig.BiteshipAPIKey,
        BaseURL:   config.AppConfig.BiteshipBaseURL,
        AuthToken: authToken,
    }

    // Setup default headers
    service.Client.SetHeader("Authorization", "Basic "+authToken)
    service.Client.SetHeader("Content-Type", "application/json")

    log.Println("✓ Biteship Service initialized")
    return service
}

// GET request wrapper
func (bs *BiteshipService) Get(endpoint string) (*resty.Response, error) {
    resp, err := bs.Client.R().
        SetHeader("Authorization", "Basic "+bs.AuthToken).
        Get(endpoint)
    
    if err != nil {
        log.Printf("❌ GET Request Error: %v", err)
        return resp, err
    }

    if resp.StatusCode >= 400 {
        log.Printf("❌ HTTP Error: %d - %s", resp.StatusCode, string(resp.Body()))
    }

    return resp, nil
}

// POST request wrapper
func (bs *BiteshipService) Post(endpoint string, body interface{}) (*resty.Response, error) {
    resp, err := bs.Client.R().
        SetHeader("Authorization", "Basic "+bs.AuthToken).
        SetHeader("Content-Type", "application/json").
        SetBody(body).
        Post(endpoint)
    
    if err != nil {
        log.Printf("❌ POST Request Error: %v", err)
        return resp, err
    }

    if resp.StatusCode >= 400 {
        log.Printf("❌ HTTP Error: %d - %s", resp.StatusCode, string(resp.Body()))
    }

    return resp, nil
}

// Check API Connection
func (bs *BiteshipService) CheckConnection() bool {
    resp, err := bs.Get("/couriers")
    if err != nil || resp.StatusCode != 200 {
        return false
    }
    return true
}
```

---

## 5. Implementasi Fitur Utama

### A. Rates Service (Cek Tarif Pengiriman)

**File: `services/rates_service.go`**

```go
package services

import (
    "encoding/json"
    "log"
    "myshipping-app/models"
)

type RatesService struct {
    biteshipService *BiteshipService
}

func NewRatesService(bs *BiteshipService) *RatesService {
    return &RatesService{biteshipService: bs}
}

// GetRates - Get available rates for shipment
// endpoint: POST /rates/couriers
func (rs *RatesService) GetRates(req *models.RateRequest) (*models.RateResponse, error) {
    log.Println("📊 Getting rates from Biteship...")

    resp, err := rs.biteshipService.Post("/rates/couriers", req)
    if err != nil {
        return nil, err
    }

    var rateResp models.RateResponse
    if err := json.Unmarshal(resp.Body(), &rateResp); err != nil {
        log.Printf("❌ JSON Unmarshal Error: %v", err)
        return nil, err
    }

    if !rateResp.Success {
        log.Printf("❌ Rate API Error: %s - %s", rateResp.Error.Code, rateResp.Error.Message)
        return nil, err
    }

    log.Printf("✓ Got %d courier rates", len(rateResp.Data))
    return &rateResp, nil
}

// GetRatesByLocation - Get rates between two locations
func (rs *RatesService) GetRatesByLocation(
    originLat, originLng, destLat, destLng float64,
    weight int,
    items []models.RateItem,
) (*models.RateResponse, error) {
    
    rateReq := &models.RateRequest{
        OriginLatitude:      originLat,
        OriginLongitude:     originLng,
        DestinationLatitude: destLat,
        DestLongitude:       destLng,
        Items:               items,
    }

    return rs.GetRates(rateReq)
}

// GetRatesByCode - Get rates for specific courier
func (rs *RatesService) GetRatesByCode(
    originLat, originLng, destLat, destLng float64,
    courierCode string,
    items []models.RateItem,
) (*models.RateResponse, error) {
    
    rateReq := &models.RateRequest{
        OriginLatitude:      originLat,
        OriginLongitude:     originLng,
        DestinationLatitude: destLat,
        DestLongitude:       destLng,
        CourierCode:         courierCode,
        Items:               items,
    }

    return rs.GetRates(rateReq)
}
```

### B. Orders Service (Buat Pengiriman)

**File: `services/orders_service.go`**

```go
package services

import (
    "encoding/json"
    "log"
    "myshipping-app/models"
    "github.com/google/uuid"
)

type OrdersService struct {
    biteshipService *BiteshipService
}

func NewOrdersService(bs *BiteshipService) *OrdersService {
    return &OrdersService{biteshipService: bs}
}

// CreateOrder - Create new shipment order
// endpoint: POST /orders
func (os *OrdersService) CreateOrder(req *models.OrderRequest) (*models.OrderResponse, error) {
    log.Println("📦 Creating order in Biteship...")

    // Auto-generate reference ID if empty
    if req.ReferenceID == "" {
        req.ReferenceID = "REF-" + uuid.New().String()[:8]
    }

    resp, err := os.biteshipService.Post("/orders", req)
    if err != nil {
        return nil, err
    }

    var orderResp models.OrderResponse
    if err := json.Unmarshal(resp.Body(), &orderResp); err != nil {
        log.Printf("❌ JSON Unmarshal Error: %v", err)
        return nil, err
    }

    if !orderResp.Success {
        log.Printf("❌ Order API Error: %s - %s", orderResp.Error.Code, orderResp.Error.Message)
        return nil, err
    }

    log.Printf("✓ Order created: %s (Resi: %s)", orderResp.Data.OrderID, orderResp.Data.Resi)
    return &orderResp, nil
}

// GetOrder - Get order details
// endpoint: GET /orders/{order_id}
func (os *OrdersService) GetOrder(orderID string) (*models.OrderResponse, error) {
    log.Printf("🔍 Getting order: %s...", orderID)

    resp, err := os.biteshipService.Get("/orders/" + orderID)
    if err != nil {
        return nil, err
    }

    var orderResp models.OrderResponse
    if err := json.Unmarshal(resp.Body(), &orderResp); err != nil {
        return nil, err
    }

    return &orderResp, nil
}
```

### C. Tracking Service (Lacak Paket)

**File: `services/tracking_service.go`**

```go
package services

import (
    "encoding/json"
    "log"
    "myshipping-app/models"
)

type TrackingService struct {
    biteshipService *BiteshipService
}

func NewTrackingService(bs *BiteshipService) *TrackingService {
    return &TrackingService{biteshipService: bs}
}

// TrackByResi - Track shipment by resi number
// endpoint: GET /trackings?resi={resi}
func (ts *TrackingService) TrackByResi(resi string) (*models.TrackingResponse, error) {
    log.Printf("📍 Tracking resi: %s...", resi)

    resp, err := ts.biteshipService.Get("/trackings?resi=" + resi)
    if err != nil {
        return nil, err
    }

    var trackResp models.TrackingResponse
    if err := json.Unmarshal(resp.Body(), &trackResp); err != nil {
        return nil, err
    }

    if !trackResp.Success {
        log.Printf("❌ Tracking API Error: %s", trackResp.Error.Message)
        return nil, err
    }

    log.Printf("✓ Tracking Status: %s", trackResp.Data.Status)
    return &trackResp, nil
}

// TrackByOrderID - Track shipment by order ID
// endpoint: GET /trackings?order_id={order_id}
func (ts *TrackingService) TrackByOrderID(orderID string) (*models.TrackingResponse, error) {
    log.Printf("📍 Tracking Order: %s...", orderID)

    resp, err := ts.biteshipService.Get("/trackings?order_id=" + orderID)
    if err != nil {
        return nil, err
    }

    var trackResp models.TrackingResponse
    if err := json.Unmarshal(resp.Body(), &trackResp); err != nil {
        return nil, err
    }

    return &trackResp, nil
}

// GetTrackingHistory - Get full tracking history
func (ts *TrackingService) GetTrackingHistory(resi string) ([]models.TrackingHistory, error) {
    trackResp, err := ts.TrackByResi(resi)
    if err != nil {
        return nil, err
    }

    return trackResp.Data.History, nil
}
```

### D. Couriers Service (Daftar Kurir)

**File: `services/couriers_service.go`**

```go
package services

import (
    "encoding/json"
    "log"
    "myshipping-app/models"
)

type CouriersService struct {
    biteshipService *BiteshipService
}

func NewCouriersService(bs *BiteshipService) *CouriersService {
    return &CouriersService{biteshipService: bs}
}

// GetAvailableCouriers - Get all available couriers
// endpoint: GET /couriers
func (cs *CouriersService) GetAvailableCouriers() (*models.CouriersResponse, error) {
    log.Println("🚚 Getting available couriers...")

    resp, err := cs.biteshipService.Get("/couriers")
    if err != nil {
        return nil, err
    }

    var couriersResp models.CouriersResponse
    if err := json.Unmarshal(resp.Body(), &couriersResp); err != nil {
        log.Printf("❌ JSON Unmarshal Error: %v", err)
        return nil, err
    }

    if !couriersResp.Success {
        log.Printf("❌ Couriers API Error: %s", couriersResp.Error.Message)
        return nil, err
    }

    log.Printf("✓ Got %d available couriers", len(couriersResp.Data))
    return &couriersResp, nil
}

// GetCourierByCod - Get couriers supporting COD
func (cs *CouriersService) GetCourierByCod() ([]models.CourierDetail, error) {
    couriers, err := cs.GetAvailableCouriers()
    if err != nil {
        return nil, err
    }

    var codCouriers []models.CourierDetail
    for _, c := range couriers.Data {
        if c.AvailableForCod {
            codCouriers = append(codCouriers, c)
        }
    }

    log.Printf("✓ Found %d couriers supporting COD", len(codCouriers))
    return codCouriers, nil
}

// GetCourierByInsurance - Get couriers supporting insurance
func (cs *CouriersService) GetCourierByInsurance() ([]models.CourierDetail, error) {
    couriers, err := cs.GetAvailableCouriers()
    if err != nil {
        return nil, err
    }

    var insuranceCouriers []models.CourierDetail
    for _, c := range couriers.Data {
        if c.AvailableForInsurance {
            insuranceCouriers = append(insuranceCouriers, c)
        }
    }

    return insuranceCouriers, nil
}
```

---

## 6. Error Handling

### A. Error Handler Utility

**File: `utils/error_handler.go`**

```go
package utils

import (
    "log"
    "myshipping-app/models"
)

// Biteship Error Codes
const (
    // Authentication Errors
    AuthFailedCode        = "40000001"
    AuthorizationFailCode = "40101001"
    NoAccountCode         = "40101002"
    ProcessAuthFailCode   = "40101003"
    NoTokenMatchCode      = "40301001"
    UserNotFoundCode      = "40301002"

    // Rate Errors
    RateNotFoundCode      = "40401001"
    InvalidLocationCode   = "40401002"
    CalculationErrorCode  = "40401003"

    // Order Errors
    OrderNotFoundCode     = "40401101"
    CreateOrderFailCode   = "40401102"
    InvalidItemsCode      = "40401103"

    // Tracking Errors
    TrackingNotFoundCode  = "40401201"
    InvalidResiCode       = "40401202"
)

// Biteship Error Messages
var ErrorMessages = map[string]string{
    AuthFailedCode:        "Authentication failed. Check your API key",
    AuthorizationFailCode: "Authorization failed",
    NoAccountCode:         "No account found with associated key",
    ProcessAuthFailCode:   "Cannot process authorization",
    NoTokenMatchCode:      "No match token for this key",
    UserNotFoundCode:      "User information not found",
    RateNotFoundCode:      "Rate not found",
    InvalidLocationCode:   "Invalid origin or destination location",
    CalculationErrorCode:  "Error calculating rates",
    OrderNotFoundCode:     "Order not found",
    CreateOrderFailCode:   "Failed to create order",
    InvalidItemsCode:      "Invalid items in order",
    TrackingNotFoundCode:  "Tracking information not found",
    InvalidResiCode:       "Invalid resi number format",
}

// HandleError - Handle API errors with logging
func HandleError(code, message string) error {
    log.Printf("❌ Error Code: %s | Message: %s", code, message)
    
    if customMsg, exists := ErrorMessages[code]; exists {
        return &models.ErrorDetail{
            Code:    code,
            Message: customMsg,
        }
    }

    return &models.ErrorDetail{
        Code:    code,
        Message: message,
    }
}

// IsAuthError - Check if error is authentication related
func IsAuthError(code string) bool {
    authErrors := map[string]bool{
        AuthFailedCode:        true,
        AuthorizationFailCode: true,
        NoAccountCode:         true,
    }
    return authErrors[code]
}

// IsValidationError - Check if error is validation related
func IsValidationError(code string) bool {
    validationErrors := map[string]bool{
        InvalidLocationCode: true,
        InvalidItemsCode:    true,
        InvalidResiCode:     true,
    }
    return validationErrors[code]
}

// IsServerError - Check if error is server side error
func IsServerError(code string) bool {
    return code[0] == '5'
}
```

### B. Response Handler

**File: `utils/response.go`**

```go
package utils

import (
    "encoding/json"
    "log"
    "net/http"
    "myshipping-app/models"
)

// SendSuccess - Send success response
func SendSuccess(w http.ResponseWriter, data interface{}, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    response := models.Response{
        Success: true,
        Data:    data,
        Message: message,
    }

    json.NewEncoder(w).Encode(response)
    log.Printf("✓ Response sent: %s", message)
}

// SendCreated - Send created response (201)
func SendCreated(w http.ResponseWriter, data interface{}, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)

    response := models.Response{
        Success: true,
        Data:    data,
        Message: message,
    }

    json.NewEncoder(w).Encode(response)
}

// SendError - Send error response
func SendError(w http.ResponseWriter, statusCode int, errorMsg string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)

    response := models.Response{
        Success: false,
        Error:   errorMsg,
    }

    json.NewEncoder(w).Encode(response)
    log.Printf("❌ Error response sent: %d - %s", statusCode, errorMsg)
}

// SendBiteshipError - Send Biteship API error
func SendBiteshipError(w http.ResponseWriter, errDetail *models.ErrorDetail) {
    statusCode := http.StatusBadRequest

    // Map error codes to HTTP status codes
    if IsAuthError(errDetail.Code) {
        statusCode = http.StatusUnauthorized
    } else if IsServerError(errDetail.Code) {
        statusCode = http.StatusInternalServerError
    }

    SendError(w, statusCode, errDetail.Message)
}
```

---

## 7. HTTP Handlers

### A. Shipping Handler

**File: `handlers/shipping_handler.go`**

```go
package handlers

import (
    "encoding/json"
    "log"
    "net/http"
    "myshipping-app/models"
    "myshipping-app/services"
    "myshipping-app/utils"
)

type ShippingHandler struct {
    ratesService   *services.RatesService
    ordersService  *services.OrdersService
}

func NewShippingHandler(
    rs *services.RatesService,
    os *services.OrdersService,
) *ShippingHandler {
    return &ShippingHandler{
        ratesService:   rs,
        ordersService:  os,
    }
}

// POST /api/rates
// Get available shipping rates
func (sh *ShippingHandler) GetRates(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        utils.SendError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    var rateReq models.RateRequest
    if err := json.NewDecoder(r.Body).Decode(&rateReq); err != nil {
        utils.SendError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    // Validate request
    if rateReq.OriginLatitude == 0 || rateReq.DestinationLatitude == 0 {
        utils.SendError(w, http.StatusBadRequest, "Origin and destination coordinates required")
        return
    }

    if len(rateReq.Items) == 0 {
        utils.SendError(w, http.StatusBadRequest, "At least one item required")
        return
    }

    // Get rates
    rateResp, err := sh.ratesService.GetRates(&rateReq)
    if err != nil {
        utils.SendError(w, http.StatusInternalServerError, "Failed to get rates")
        return
    }

    utils.SendSuccess(w, rateResp.Data, "Rates retrieved successfully")
}

// POST /api/orders
// Create new shipment order
func (sh *ShippingHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        utils.SendError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    var orderReq models.OrderRequest
    if err := json.NewDecoder(r.Body).Decode(&orderReq); err != nil {
        utils.SendError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    // Validate request
    if orderReq.OriginContactName == "" || orderReq.DestinationName == "" {
        utils.SendError(w, http.StatusBadRequest, "Contact names required")
        return
    }

    if orderReq.CourierCode == "" || orderReq.ServiceCode == "" {
        utils.SendError(w, http.StatusBadRequest, "Courier and service code required")
        return
    }

    // Create order
    orderResp, err := sh.ordersService.CreateOrder(&orderReq)
    if err != nil {
        utils.SendError(w, http.StatusInternalServerError, "Failed to create order")
        return
    }

    utils.SendCreated(w, orderResp.Data, "Order created successfully")
}

// GET /api/orders/{order_id}
// Get order details
func (sh *ShippingHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        utils.SendError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    orderID := r.URL.Query().Get("order_id")
    if orderID == "" {
        utils.SendError(w, http.StatusBadRequest, "order_id parameter required")
        return
    }

    orderResp, err := sh.ordersService.GetOrder(orderID)
    if err != nil {
        utils.SendError(w, http.StatusInternalServerError, "Failed to get order")
        return
    }

    utils.SendSuccess(w, orderResp.Data, "Order retrieved successfully")
}
```

### B. Tracking Handler

**File: `handlers/tracking_handler.go`**

```go
package handlers

import (
    "log"
    "net/http"
    "myshipping-app/services"
    "myshipping-app/utils"
)

type TrackingHandler struct {
    trackingService *services.TrackingService
}

func NewTrackingHandler(ts *services.TrackingService) *TrackingHandler {
    return &TrackingHandler{
        trackingService: ts,
    }
}

// GET /api/tracking?resi={resi}
// Track shipment by resi number
func (th *TrackingHandler) TrackByResi(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        utils.SendError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    resi := r.URL.Query().Get("resi")
    if resi == "" {
        utils.SendError(w, http.StatusBadRequest, "resi parameter required")
        return
    }

    trackResp, err := th.trackingService.TrackByResi(resi)
    if err != nil {
        utils.SendError(w, http.StatusInternalServerError, "Failed to track shipment")
        return
    }

    utils.SendSuccess(w, trackResp.Data, "Tracking information retrieved")
}

// GET /api/tracking/order?order_id={order_id}
// Track shipment by order ID
func (th *TrackingHandler) TrackByOrderID(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        utils.SendError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    orderID := r.URL.Query().Get("order_id")
    if orderID == "" {
        utils.SendError(w, http.StatusBadRequest, "order_id parameter required")
        return
    }

    trackResp, err := th.trackingService.TrackByOrderID(orderID)
    if err != nil {
        utils.SendError(w, http.StatusInternalServerError, "Failed to track shipment")
        return
    }

    utils.SendSuccess(w, trackResp.Data, "Tracking information retrieved")
}

// GET /api/tracking/history?resi={resi}
// Get full tracking history
func (th *TrackingHandler) GetTrackingHistory(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        utils.SendError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    resi := r.URL.Query().Get("resi")
    if resi == "" {
        utils.SendError(w, http.StatusBadRequest, "resi parameter required")
        return
    }

    history, err := th.trackingService.GetTrackingHistory(resi)
    if err != nil {
        utils.SendError(w, http.StatusInternalServerError, "Failed to get tracking history")
        return
    }

    utils.SendSuccess(w, history, "Tracking history retrieved")
}
```

---

## 8. Main Application

**File: `main.go`**

```go
package main

import (
    "log"
    "net/http"
    "myshipping-app/config"
    "myshipping-app/handlers"
    "myshipping-app/services"
)

func main() {
    // Load configuration
    config.LoadConfig()

    // Initialize Biteship service
    biteshipService := services.NewBiteshipService()

    // Check connection
    if !biteshipService.CheckConnection() {
        log.Fatal("❌ Failed to connect to Biteship API. Check your API key.")
    }
    log.Println("✓ Connected to Biteship API")

    // Initialize service layers
    ratesService := services.NewRatesService(biteshipService)
    ordersService := services.NewOrdersService(biteshipService)
    trackingService := services.NewTrackingService(biteshipService)
    couriersService := services.NewCouriersService(biteshipService)

    // Initialize handlers
    shippingHandler := handlers.NewShippingHandler(ratesService, ordersService)
    trackingHandler := handlers.NewTrackingHandler(trackingService)

    // Setup routes
    http.HandleFunc("/api/rates", shippingHandler.GetRates)
    http.HandleFunc("/api/orders", shippingHandler.CreateOrder)
    http.HandleFunc("/api/orders/detail", shippingHandler.GetOrder)
    http.HandleFunc("/api/tracking", trackingHandler.TrackByResi)
    http.HandleFunc("/api/tracking/order", trackingHandler.TrackByOrderID)
    http.HandleFunc("/api/tracking/history", trackingHandler.GetTrackingHistory)

    // Health check endpoint
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok","service":"biteship-api-integration"}`))
    })

    // Start server
    port := config.AppConfig.AppPort
    log.Printf("🚀 Server starting on http://localhost:%s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

---

## 9. Testing & Sandbox

### A. Testing dengan cURL

**Test 1: Health Check**

```bash
curl -X GET http://localhost:8080/health
```

**Test 2: Get Rates**

```bash
curl -X POST http://localhost:8080/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "origin_latitude": -6.2088,
    "origin_longitude": 106.8456,
    "destination_latitude": -7.2575,
    "destination_longitude": 112.7521,
    "items": [
      {
        "name": "Product A",
        "weight": 500,
        "quantity": 1,
        "value": 100000
      }
    ]
  }'
```

**Test 3: Create Order**

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "origin_contact_name": "John Doe",
    "origin_email": "john@example.com",
    "origin_phone_number": "08123456789",
    "origin_latitude": -6.2088,
    "origin_longitude": 106.8456,
    "destination_contact_name": "Jane Smith",
    "destination_email": "jane@example.com",
    "destination_phone_number": "08198765432",
    "destination_latitude": -7.2575,
    "destination_longitude": 112.7521,
    "courier_code": "jne",
    "service_code": "JNE_REG",
    "items": [
      {
        "name": "Product A",
        "weight": 500,
        "quantity": 1,
        "value": 100000
      }
    ],
    "reference_id": "ORDER-12345"
  }'
```

**Test 4: Track Shipment**

```bash
curl -X GET "http://localhost:8080/api/tracking?resi=ABC123456789"
```

### B. Sandbox Mode Testing

Gunakan API Key dengan prefix `biteship_test_` untuk testing:

```env
BITESHIP_API_KEY=biteship_test_xxxxxxxxxxxxx
BITESHIP_SANDBOX_MODE=true
```

Semua transaksi di sandbox tidak akan benar-benar diproses, hanya untuk testing.

### C. Unit Tests

**File: `tests/biteship_test.go`**

```go
package main

import (
    "testing"
    "myshipping-app/services"
    "myshipping-app/models"
)

func TestBiteshipConnection(t *testing.T) {
    bs := services.NewBiteshipService()
    
    if !bs.CheckConnection() {
        t.Fatal("Failed to connect to Biteship API")
    }
}

func TestGetRates(t *testing.T) {
    bs := services.NewBiteshipService()
    rs := services.NewRatesService(bs)

    rateReq := &models.RateRequest{
        OriginLatitude:      -6.2088,
        OriginLongitude:     106.8456,
        DestinationLatitude: -7.2575,
        DestLongitude:       112.7521,
        Items: []models.RateItem{
            {
                Name:     "Test Product",
                Weight:   500,
                Quantity: 1,
                Value:    100000,
            },
        },
    }

    rateResp, err := rs.GetRates(rateReq)
    if err != nil {
        t.Fatalf("Failed to get rates: %v", err)
    }

    if !rateResp.Success {
        t.Fatalf("Rate response error: %s", rateResp.Error.Message)
    }

    if len(rateResp.Data) == 0 {
        t.Fatal("No rates returned")
    }

    t.Logf("✓ Got %d courier rates", len(rateResp.Data))
}

func TestGetCouriers(t *testing.T) {
    bs := services.NewBiteshipService()
    cs := services.NewCouriersService(bs)

    couriersResp, err := cs.GetAvailableCouriers()
    if err != nil {
        t.Fatalf("Failed to get couriers: %v", err)
    }

    if len(couriersResp.Data) == 0 {
        t.Fatal("No couriers returned")
    }

    t.Logf("✓ Got %d available couriers", len(couriersResp.Data))
}
```

Run tests:

```bash
go test -v ./tests/...
```

---

## 10. Production Best Practices

### A. Security

**1. Protect API Keys**
```go
// ❌ JANGAN
apiKey := "biteship_live_xxxxx" // Hardcoded

// ✅ GUNAKAN
apiKey := os.Getenv("BITESHIP_API_KEY")
```

**2. Use Environment Variables**
```bash
# .gitignore
.env
.env.local
*.key
```

**3. Rate Limiting**
```go
import "github.com/go-resty/resty/v2"

client := resty.New()
client.SetRetryCount(3)
client.SetRetryWaitTime(2 * time.Second)
```

### B. Error Handling & Logging

**Structured Logging:**
```go
import "log/slog"

logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("Order created", 
    "order_id", orderID,
    "resi", resi,
    "courier", courier,
)
```

### C. API Response Caching

```go
import "github.com/go-resty/resty/v2"

client := resty.New()
client.SetCacheTime(5 * time.Minute)
```

### D. Database Integration (Optional)

```go
type ShipmentRecord struct {
    ID          string    `db:"id"`
    OrderID     string    `db:"order_id"`
    Resi        string    `db:"resi"`
    Status      string    `db:"status"`
    CreatedAt   time.Time `db:"created_at"`
    UpdatedAt   time.Time `db:"updated_at"`
}

// Save to database after order creation
func (os *OrdersService) CreateOrderWithDB(req *models.OrderRequest, db *sql.DB) (*models.OrderResponse, error) {
    orderResp, err := os.CreateOrder(req)
    if err != nil {
        return nil, err
    }

    // Save to database
    _, err = db.Exec(
        "INSERT INTO shipments (order_id, resi, status) VALUES ($1, $2, $3)",
        orderResp.Data.OrderID,
        orderResp.Data.Resi,
        orderResp.Data.Status,
    )

    return orderResp, err
}
```

### E. Webhook Integration

**Handle Biteship Webhooks:**

```go
// POST /webhooks/biteship
func HandleBiteshipWebhook(w http.ResponseWriter, r *http.Request) {
    var webhook map[string]interface{}
    json.NewDecoder(r.Body).Decode(&webhook)

    eventType := webhook["type"].(string)
    
    switch eventType {
    case "ORDER_CREATED":
        // Handle order created
    case "SHIPMENT_PICKED_UP":
        // Handle pickup
    case "DELIVERY_COMPLETED":
        // Handle delivery
    }

    w.WriteHeader(http.StatusOK)
}
```

### F. Monitoring & Metrics

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    apiRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "biteship_api_requests_total",
        },
        []string{"endpoint", "status"},
    )
)
```

---

## 11. API Endpoints Reference

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/couriers` | Get list of available couriers |
| `POST` | `/rates/couriers` | Get shipping rates |
| `POST` | `/orders` | Create new shipment |
| `GET` | `/orders/{order_id}` | Get order details |
| `GET` | `/trackings?resi={resi}` | Track by resi number |
| `GET` | `/trackings?order_id={id}` | Track by order ID |

---

## 12. Troubleshooting

| Error | Solusi |
|-------|--------|
| `40000001 - Auth failed` | Periksa API Key di .env, pastikan sudah copy dengan benar |
| `401 Unauthorized` | API Key expired atau tidak valid, generate key baru |
| `404 Not Found` | Order/Resi tidak ditemukan, periksa ID |
| `400 Bad Request` | Validasi input (lat/lng, courier code, dll) |
| `500 Internal Server` | Error dari Biteship, check status page atau hubungi support |

---

## 13. Resources Berguna

- **Dokumentasi Biteship:** https://biteship.com/id/docs
- **Dashboard Biteship:** https://dashboard.biteship.com
- **Courier Codes:** https://biteship.com/id/docs/api/couriers/overview
- **Status Page:** https://status.biteship.com
- **Support:** support@biteship.com

---

## Kesimpulan

Anda sekarang memiliki dokumentasi lengkap untuk mengintegrasikan Biteship dengan backend Golang. Ikuti structure yang telah dibuatkan, dan jangan lupa:

✅ Setup environment variables dengan benar  
✅ Test dengan sandbox mode dulu sebelum production  
✅ Implement proper error handling & logging  
✅ Secure API keys Anda  
✅ Monitor API usage dan response times  

Happy coding! 🚀

---

**Last Updated:** 2024  
**Author:** Biteship Integration Docs  
**Version:** 1.0