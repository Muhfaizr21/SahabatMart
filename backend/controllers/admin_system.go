package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"
)

// ToggleMaintenanceMode mengaktifkan atau menonaktifkan mode pemeliharaan platform
// POST /api/admin/system/maintenance
func (ac *AdminController) ToggleMaintenanceMode(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	
	var req struct {
		Enabled bool   `json:"enabled"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Payload tidak valid")
		return
	}

	configSvc := services.NewConfigService(ac.DB)
	
	val := "false"
	if req.Enabled {
		val = "true"
	}

	err := configSvc.Set("platform_maintenance", val, "Status Mode Pemeliharaan")
	if err == nil && req.Message != "" {
		err = configSvc.Set("platform_maint_msg", req.Message, "Pesan Mode Pemeliharaan")
	}

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate konfigurasi: "+err.Error())
		return
	}

	ac.Audit.Log(adminID, "toggle_maintenance", "system", "config", fmt.Sprintf("enabled=%v msg=%s", req.Enabled, req.Message), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"enabled": req.Enabled,
		"message": req.Message,
	})
}

// BroadcastNotification mengirim notifikasi ke banyak user sekaligus
// POST /api/admin/system/broadcast
func (ac *AdminController) BroadcastNotification(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)

	var req struct {
		TargetRole string `json:"target_role"` // "all", "merchant", "affiliate", "buyer"
		Title      string `json:"title"`
		Message    string `json:"message"`
		Link       string `json:"link"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Payload tidak valid")
		return
	}

	if req.Title == "" || req.Message == "" {
		utils.JSONError(w, http.StatusBadRequest, "Judul dan Pesan wajib diisi")
		return
	}

	// Query target users
	var userIDs []string
	query := ac.DB.Model(&models.User{})
	if req.TargetRole != "all" && req.TargetRole != "" {
		query = query.Where("role = ?", req.TargetRole)
	}
	query.Pluck("id", &userIDs)

	// Broadcast in background to avoid timeout
	go func(ids []string, t, m, l string) {
		for _, id := range ids {
			ac.Notif.Push(id, "system", "broadcast", t, m, l)
		}
	}(userIDs, req.Title, req.Message, req.Link)

	ac.Audit.Log(adminID, "broadcast_notification", "system", req.TargetRole, fmt.Sprintf("Title: %s, Count: %d", req.Title, len(userIDs)), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"target": req.TargetRole,
		"count":  len(userIDs),
	})
}

// GetSystemStats mengambil statistik performa platform secara mendalam
// GET /api/admin/system/stats
func (ac *AdminController) GetSystemStats(w http.ResponseWriter, r *http.Request) {
	// 1. Top Selling Products
	type TopProduct struct {
		ID        string  `json:"id"`
		Name      string  `json:"name"`
		Image     string  `json:"image"`
		SoldCount int64   `json:"sold_count"`
		Revenue   float64 `json:"revenue"`
	}
	var topProducts []TopProduct
	ac.DB.Table("order_items").
		Select("products.id, products.name, products.image, SUM(order_items.quantity) as sold_count, SUM(order_items.subtotal) as revenue").
		Joins("JOIN products ON products.id = order_items.product_id").
		Group("products.id, products.name, products.image").
		Order("sold_count DESC").
		Limit(10).
		Scan(&topProducts)

	// 2. Top Performing Merchants
	type TopMerchant struct {
		ID         string  `json:"id"`
		StoreName  string  `json:"store_name"`
		TotalSales float64 `json:"total_sales"`
		OrderCount int64   `json:"order_count"`
	}
	var topMerchants []TopMerchant
	ac.DB.Table("merchants").
		Select("merchants.id, merchants.store_name, merchants.total_sales, COUNT(orders.id) as order_count").
		Joins("LEFT JOIN orders ON orders.merchant_id = merchants.id").
		Group("merchants.id, merchants.store_name, merchants.total_sales").
		Order("merchants.total_sales DESC").
		Limit(10).
		Scan(&topMerchants)

	// 3. User Growth (Last 30 days)
	type Growth struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}
	var growth []Growth
	ac.DB.Raw(`
		SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(id) as count 
		FROM users 
		WHERE created_at >= NOW() - INTERVAL '30 days'
		GROUP BY date 
		ORDER BY date ASC
	`).Scan(&growth)

	// 4. Platform Totals
	var totals struct {
		TotalUsers     int64   `json:"total_users"`
		TotalMerchants int64   `json:"total_merchants"`
		TotalRevenue   float64 `json:"total_revenue"`
		ActiveOrders   int64   `json:"active_orders"`
	}
	ac.DB.Model(&models.User{}).Count(&totals.TotalUsers)
	ac.DB.Model(&models.Merchant{}).Count(&totals.TotalMerchants)
	ac.DB.Model(&models.Order{}).Where("status NOT IN ?", []string{"cancelled", "failed"}).Select("COALESCE(SUM(grand_total), 0)").Scan(&totals.TotalRevenue)
	ac.DB.Model(&models.Order{}).Where("status IN ?", []string{"pending", "paid", "processing", "shipped"}).Count(&totals.ActiveOrders)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":        "success",
		"totals":        totals,
		"top_products":  topProducts,
		"top_merchants": topMerchants,
		"user_growth":   growth,
	})
}

// GetSystemHealth mengecek kesehatan koneksi sistem dan dependency
// GET /api/admin/system/health
func (ac *AdminController) GetSystemHealth(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now(),
		"checks":    make(map[string]interface{}),
	}

	// DB Check
	sqlDB, err := ac.DB.DB()
	if err != nil {
		health["status"] = "error"
		health["checks"].(map[string]interface{})["database"] = "failed to get sql.DB"
	} else {
		err = sqlDB.Ping()
		if err != nil {
			health["status"] = "error"
			health["checks"].(map[string]interface{})["database"] = err.Error()
		} else {
			health["checks"].(map[string]interface{})["database"] = "connected"
		}
	}

	// Biteship Connectivity (Mock check if key exists)
	biteshipKey := "config_not_found"
	var biteshipCfg models.PlatformConfig
	if err := ac.DB.Where("key = ?", "biteship_api_key").First(&biteshipCfg).Error; err == nil {
		biteshipKey = "configured"
	}
	health["checks"].(map[string]interface{})["biteship"] = biteshipKey

	utils.JSONResponse(w, http.StatusOK, health)
}
