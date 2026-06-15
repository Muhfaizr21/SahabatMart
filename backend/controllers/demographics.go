package controllers

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/repositories"
	"akuglow/backend/services"
	"akuglow/backend/utils"
	"gorm.io/gorm"
)

type DemographicsController struct {
	DB    *gorm.DB
	Audit *services.AuditService
	Notif *services.NotificationService
}

func NewDemographicsController(db *gorm.DB) *DemographicsController {
	return &DemographicsController{
		DB:    db,
		Audit: services.NewAuditService(repositories.NewAuditRepository(db)),
		Notif: services.NewNotificationService(db),
	}
}

type IPAPIResponse struct {
	Status      string  `json:"status"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	RegionName  string  `json:"regionName"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Query       string  `json:"query"`
}

var mockLocations = []struct {
	City        string
	Region      string
	CountryName string
	CountryCode string
	Lat         float64
	Lon         float64
}{
	{"Jakarta", "DKI Jakarta", "Indonesia", "ID", -6.2088, 106.8456},
	{"Surabaya", "Jawa Timur", "Indonesia", "ID", -7.2575, 112.7521},
	{"Bandung", "Jawa Barat", "Indonesia", "ID", -6.9175, 107.6191},
	{"Medan", "Sumatera Utara", "Indonesia", "ID", 3.5952, 98.6722},
	{"Denpasar", "Bali", "Indonesia", "ID", -8.6705, 115.2126},
	{"Singapore", "Central Singapore", "Singapore", "SG", 1.3521, 103.8198},
	{"Tokyo", "Tokyo", "Japan", "JP", 35.6762, 139.6503},
	{"New York", "New York", "United States", "US", 40.7128, -74.0060},
}

func getMockLocation(ip string) (string, string, string, string, float64, float64) {
	sum := 0
	for _, char := range ip {
		sum += int(char)
	}
	loc := mockLocations[sum%len(mockLocations)]
	return loc.City, loc.Region, loc.CountryName, loc.CountryCode, loc.Lat, loc.Lon
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		var err error
		ip, _, err = net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
	}
	if strings.Contains(ip, ",") {
		parts := strings.Split(ip, ",")
		ip = strings.TrimSpace(parts[0])
	}
	return ip
}

func hashIP(ip string) string {
	h := sha256.New()
	h.Write([]byte(ip))
	return hex.EncodeToString(h.Sum(nil))
}

func isPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil {
		return ip4[0] == 10 ||
			(ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31) ||
			(ip4[0] == 192 && ip4[1] == 168)
	}
	return false
}

func lookupIP(ip string) (IPAPIResponse, error) {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/" + ip)
	if err != nil {
		return IPAPIResponse{}, err
	}
	defer resp.Body.Close()

	var apiRes IPAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiRes); err != nil {
		return IPAPIResponse{}, err
	}
	return apiRes, nil
}

func applyFilters(db *gorm.DB, r *http.Request) *gorm.DB {
	q := db

	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	if startDate != "" && endDate != "" {
		q = q.Where("user_location_logs.created_at BETWEEN ? AND ?", startDate, endDate)
	}

	countries := r.URL.Query().Get("countries")
	if countries != "" {
		codes := strings.Split(countries, ",")
		q = q.Where("country_code IN ?", codes)
	}

	city := r.URL.Query().Get("city")
	if city != "" {
		q = q.Where("LOWER(city) LIKE LOWER(?)", "%"+strings.ToLower(city)+"%")
	}

	userType := r.URL.Query().Get("user_type")
	if userType == "guest" {
		q = q.Where("user_location_logs.user_id IS NULL")
	} else if userType == "member" {
		q = q.Where("user_location_logs.user_id IS NOT NULL")
	}

	purchaseStatus := r.URL.Query().Get("purchase_status")
	if purchaseStatus == "purchased" {
		q = q.Where("is_converted = true")
	} else if purchaseStatus == "not_purchased" {
		q = q.Where("is_converted = false")
	}

	return q
}

// POST /api/public/location/log
func (dc *DemographicsController) TrackLocation(w http.ResponseWriter, r *http.Request) {
	optoutCookie, err := r.Cookie("akuglow_demographics_optout")
	if (err == nil && optoutCookie.Value == "true") || r.Header.Get("X-Demographics-OptOut") == "true" {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "message": "opted-out"})
		return
	}

	var req struct {
		VisitedURL string `json:"visited_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.VisitedURL = r.URL.Query().Get("visited_url")
		if req.VisitedURL == "" {
			req.VisitedURL = r.Referer()
		}
	}

	ip := getClientIP(r)
	ipHash := hashIP(ip)

	var cache models.IPLocationCache
	cacheFound := false
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	if err := dc.DB.Where("ip_hash = ? AND created_at >= ?", ipHash, thirtyDaysAgo).First(&cache).Error; err == nil {
		cacheFound = true
	}

	var lat, lon float64
	var city, region, countryName, countryCode string

	if cacheFound {
		lat = cache.Latitude
		lon = cache.Longitude
		city = cache.City
		region = cache.Region
		countryName = cache.CountryName
		countryCode = cache.CountryCode
	} else {
		if isPrivateIP(ip) {
			city, region, countryName, countryCode, lat, lon = getMockLocation(ip)
		} else {
			apiRes, err := lookupIP(ip)
			if err == nil && apiRes.Status == "success" {
				lat = apiRes.Lat
				lon = apiRes.Lon
				city = apiRes.City
				region = apiRes.RegionName
				countryName = apiRes.Country
				countryCode = apiRes.CountryCode
			} else {
				city, region, countryName, countryCode, lat, lon = getMockLocation(ip)
			}
		}

		newCache := models.IPLocationCache{
			IPHash:      ipHash,
			Latitude:    lat,
			Longitude:   lon,
			City:        city,
			Region:      region,
			CountryName: countryName,
			CountryCode: countryCode,
			CreatedAt:   time.Now(),
		}
		dc.DB.Save(&newCache)
	}

	var userID *string
	var role string
	if val := r.Context().Value("user_id"); val != nil {
		if uidStr, ok := val.(string); ok && isValidUUID(uidStr) {
			userID = &uidStr
		}
	}
	if val := r.Context().Value("role"); val != nil {
		if roleStr, ok := val.(string); ok {
			role = roleStr
		}
	}
	if userID == nil {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := utils.ParseJWT(token)
			if err == nil && isValidUUID(claims.UserID) {
				uid := claims.UserID
				userID = &uid
				role = claims.Role
			}
		}
	}

	if role == "superadmin" || role == "admin" {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "message": "skipped-admin"})
		return
	}

	if userID != nil {
		go SyncGuestLogsToUser(dc.DB, *userID, ip)
	}

	ua := r.UserAgent()
	deviceType := "desktop"
	uaLower := strings.ToLower(ua)
	if strings.Contains(uaLower, "ipad") || strings.Contains(uaLower, "tablet") || strings.Contains(uaLower, "playbook") || strings.Contains(uaLower, "kindle") {
		deviceType = "tablet"
	} else if strings.Contains(uaLower, "mobi") || strings.Contains(uaLower, "android") || strings.Contains(uaLower, "iphone") {
		deviceType = "mobile"
	}

	isConverted := false
	if userID != nil {
		var count int64
		dc.DB.Table("orders").Where("buyer_id = ? AND status IN ?", *userID, []string{"paid", "processing", "ready_to_ship", "shipped", "delivered", "completed"}).Count(&count)
		if count > 0 {
			isConverted = true
		}
	} else {
		var logCount int64
		dc.DB.Model(&models.UserLocationLog{}).Where("ip_hash = ? AND is_converted = true", ipHash).Count(&logCount)
		if logCount > 0 {
			isConverted = true
		}
	}

	logEntry := models.UserLocationLog{
		IPHash:      ipHash,
		UserID:      userID,
		Latitude:    lat,
		Longitude:   lon,
		City:        city,
		Region:      region,
		CountryName: countryName,
		CountryCode: countryCode,
		UserAgent:   ua,
		DeviceType:  deviceType,
		VisitedURL:  req.VisitedURL,
		IsConverted: isConverted,
		CreatedAt:   time.Now(),
	}
	dc.DB.Create(&logEntry)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": logEntry})
}

// GET /api/admin/demographics/stats
func (dc *DemographicsController) GetDemographicsStats(w http.ResponseWriter, r *http.Request) {
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	var currentStart, currentEnd, prevStart, prevEnd time.Time
	var dateFilterActive = false

	if startDateStr != "" && endDateStr != "" {
		var err1, err2 error
		currentStart, err1 = time.Parse(time.RFC3339, startDateStr)
		if err1 != nil {
			currentStart, err1 = time.Parse("2006-01-02", startDateStr)
		}
		currentEnd, err2 = time.Parse(time.RFC3339, endDateStr)
		if err2 != nil {
			currentEnd, err2 = time.Parse("2006-01-02", endDateStr)
		}

		if err1 == nil && err2 == nil {
			dateFilterActive = true
			duration := currentEnd.Sub(currentStart)
			prevStart = currentStart.Add(-duration)
			prevEnd = currentStart
		}
	}

	var currentUniques int64
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).Distinct("ip_hash").Count(&currentUniques)

	var prevUniques int64 = 0
	if dateFilterActive {
		qPrev := dc.DB.Model(&models.UserLocationLog{}).Where("created_at BETWEEN ? AND ?", prevStart, prevEnd)
		countries := r.URL.Query().Get("countries")
		if countries != "" {
			qPrev = qPrev.Where("country_code IN ?", strings.Split(countries, ","))
		}
		city := r.URL.Query().Get("city")
		if city != "" {
			qPrev = qPrev.Where("LOWER(city) LIKE LOWER(?)", "%"+strings.ToLower(city)+"%")
		}
		userType := r.URL.Query().Get("user_type")
		if userType == "guest" {
			qPrev = qPrev.Where("user_id IS NULL")
		} else if userType == "member" {
			qPrev = qPrev.Where("user_id IS NOT NULL")
		}
		purchaseStatus := r.URL.Query().Get("purchase_status")
		if purchaseStatus == "purchased" {
			qPrev = qPrev.Where("is_converted = true")
		} else if purchaseStatus == "not_purchased" {
			qPrev = qPrev.Where("is_converted = false")
		}
		qPrev.Distinct("ip_hash").Count(&prevUniques)
	}

	pctChange := 0.0
	if prevUniques > 0 {
		pctChange = float64(currentUniques-prevUniques) / float64(prevUniques) * 100.0
	} else if currentUniques > 0 {
		pctChange = 100.0
	}

	var countryCount int64
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).Distinct("country_code").Count(&countryCount)

	type TopCityRow struct {
		City  string `json:"city"`
		Count int64  `json:"count"`
	}
	var topCity TopCityRow
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).
		Select("city, COUNT(DISTINCT ip_hash) as count").
		Group("city").
		Order("count DESC").
		Limit(1).
		Scan(&topCity)

	var domesticCount int64
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).Where("country_code = 'ID'").Distinct("ip_hash").Count(&domesticCount)

	var totalUniques int64 = currentUniques
	intlCount := totalUniques - domesticCount

	domesticPct := 0.0
	intlPct := 0.0
	if totalUniques > 0 {
		domesticPct = float64(domesticCount) / float64(totalUniques) * 100.0
		intlPct = float64(intlCount) / float64(totalUniques) * 100.0
	}

	type CityAvgPages struct {
		City     string  `json:"city"`
		AvgPages float64 `json:"avg_pages"`
	}
	var cityAvgPages []CityAvgPages
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).
		Select("city, CAST(COUNT(id) AS float) / COUNT(DISTINCT ip_hash) as avg_pages").
		Group("city").
		Order("avg_pages DESC").
		Limit(5).
		Scan(&cityAvgPages)

	type MapMarker struct {
		City        string  `json:"city"`
		CountryName string  `json:"country_name"`
		Latitude    float64 `json:"latitude"`
		Longitude   float64 `json:"longitude"`
		UniqueCount int64   `json:"unique_count"`
		BuyerCount  int64   `json:"buyer_count"`
	}
	var markers []MapMarker
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).
		Select("city, country_name, AVG(latitude) as latitude, AVG(longitude) as longitude, COUNT(DISTINCT ip_hash) as unique_count, SUM(CASE WHEN is_converted = true THEN 1 ELSE 0 END) as buyer_count").
		Group("city, country_name").
		Order("unique_count DESC").
		Scan(&markers)

	var funnel2 int64
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).Where("visited_url LIKE ?", "%/product%").Distinct("ip_hash").Count(&funnel2)

	var funnel3 int64
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).Where("visited_url LIKE ? OR visited_url LIKE ?", "%/checkout%", "%/cart%").Distinct("ip_hash").Count(&funnel3)

	var funnel4 int64
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).Where("is_converted = true").Distinct("ip_hash").Count(&funnel4)

	funnel := map[string]int64{
		"visitors":      totalUniques,
		"product_views": funnel2,
		"checkouts":     funnel3,
		"purchased":     funnel4,
	}

	// PostgreSQL EXTRACT returns float64 so we use a raw struct to handle it
	type HourlyTrendRaw struct {
		Hour  float64 `json:"hour"`
		Count int64   `json:"count"`
	}
	var hourlyRaw []HourlyTrendRaw
	applyFilters(dc.DB.Model(&models.UserLocationLog{}), r).
		Select("EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Jakarta') as hour, COUNT(DISTINCT ip_hash) as count").
		Group("hour").
		Order("hour ASC").
		Scan(&hourlyRaw)

	type HourlyTrend struct {
		Hour  int   `json:"hour"`
		Count int64 `json:"count"`
	}
	hourlyTrend := make([]HourlyTrend, len(hourlyRaw))
	for i, row := range hourlyRaw {
		hourlyTrend[i] = HourlyTrend{Hour: int(row.Hour), Count: row.Count}
	}

	last7Days := time.Now().AddDate(0, 0, -7)
	var activeLast7 []string
	dc.DB.Model(&models.UserLocationLog{}).Where("created_at >= ?", last7Days).Distinct("ip_hash").Pluck("ip_hash", &activeLast7)

	retention := map[string]float64{
		"day_7":  0.0,
		"day_14": 0.0,
		"day_30": 0.0,
	}
	if len(activeLast7) > 0 {
		var ret7, ret14, ret30 int64
		dc.DB.Model(&models.UserLocationLog{}).
			Where("created_at BETWEEN ? AND ?", time.Now().AddDate(0, 0, -14), last7Days).
			Where("ip_hash IN ?", activeLast7).
			Distinct("ip_hash").
			Count(&ret7)

		dc.DB.Model(&models.UserLocationLog{}).
			Where("created_at BETWEEN ? AND ?", time.Now().AddDate(0, 0, -21), time.Now().AddDate(0, 0, -14)).
			Where("ip_hash IN ?", activeLast7).
			Distinct("ip_hash").
			Count(&ret14)

		dc.DB.Model(&models.UserLocationLog{}).
			Where("created_at BETWEEN ? AND ?", time.Now().AddDate(0, 0, -60), time.Now().AddDate(0, 0, -30)).
			Where("ip_hash IN ?", activeLast7).
			Distinct("ip_hash").
			Count(&ret30)

		totalActive := float64(len(activeLast7))
		retention["day_7"] = (float64(ret7) / totalActive) * 100.0
		retention["day_14"] = (float64(ret14) / totalActive) * 100.0
		retention["day_30"] = (float64(ret30) / totalActive) * 100.0
	}

	var last24hCount int64
	dc.DB.Model(&models.UserLocationLog{}).Where("created_at >= ?", time.Now().AddDate(0, 0, -1)).Count(&last24hCount)
	var last7dCount int64
	dc.DB.Model(&models.UserLocationLog{}).Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).Count(&last7dCount)
	avgDailyTraffic := float64(last7dCount) / 7.0
	trafficSpikeAlert := false
	if avgDailyTraffic > 0 && float64(last24hCount) > avgDailyTraffic*2.0 {
		trafficSpikeAlert = true
	}

	stats := map[string]interface{}{
		"total_visitors":          totalUniques,
		"percentage_change":       pctChange,
		"countries_count":         countryCount,
		"top_city":                topCity,
		"domestic_percentage":     domesticPct,
		"international_percentage": intlPct,
		"city_avg_pages":          cityAvgPages,
		"markers":                 markers,
		"funnel":                  funnel,
		"hourly_trend":            hourlyTrend,
		"retention":               retention,
		"traffic_spike_alert":     trafficSpikeAlert,
		"last_updated":            time.Now().Format(time.RFC3339),
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "data": stats})
}

// GET /api/admin/demographics/logs
type LogDetail struct {
	models.UserLocationLog
	UserEmail    string `json:"user_email"`
	UserFullName string `json:"user_fullname"`
}

// GET /api/admin/demographics/logs
func (dc *DemographicsController) GetDemographicsLogs(w http.ResponseWriter, r *http.Request) {
	q := applyFilters(dc.DB.Model(&models.UserLocationLog{}), r)

	export := r.URL.Query().Get("export")
	if export == "csv" {
		var logs []LogDetail
		
		baseQuery := dc.DB.Table("user_location_logs").
			Select("user_location_logs.*, users.email AS user_email, user_profiles.full_name AS user_fullname").
			Joins("LEFT JOIN users ON users.id = user_location_logs.user_id").
			Joins("LEFT JOIN user_profiles ON user_profiles.user_id = user_location_logs.user_id")

		applyFilters(baseQuery, r).Order("user_location_logs.created_at DESC").Scan(&logs)

		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", "attachment;filename=demographics_report.csv")

		writer := csv.NewWriter(w)
		writer.Write([]string{"ID", "IP Hash", "User ID", "User Name", "User Email", "Latitude", "Longitude", "City", "Region", "Country", "Country Code", "User Agent", "Device Type", "Visited URL", "Converted", "Created At"})

		for _, logEntry := range logs {
			uid := ""
			if logEntry.UserID != nil {
				uid = *logEntry.UserID
			}
			writer.Write([]string{
				strconv.Itoa(int(logEntry.ID)),
				logEntry.IPHash,
				uid,
				logEntry.UserFullName,
				logEntry.UserEmail,
				strconv.FormatFloat(logEntry.Latitude, 'f', 6, 64),
				strconv.FormatFloat(logEntry.Longitude, 'f', 6, 64),
				logEntry.City,
				logEntry.Region,
				logEntry.CountryName,
				logEntry.CountryCode,
				logEntry.UserAgent,
				logEntry.DeviceType,
				logEntry.VisitedURL,
				strconv.FormatBool(logEntry.IsConverted),
				logEntry.CreatedAt.Format(time.RFC3339),
			})
		}
		writer.Flush()
		return
	}

	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")
	page := 1
	pageSize := 10
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	sortField := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")
	if sortField == "" {
		sortField = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "desc"
	}

	allowedSortFields := map[string]string{
		"id":         "id",
		"city":       "city",
		"region":     "region",
		"country":    "country_name",
		"created_at": "created_at",
	}
	dbSortField, ok := allowedSortFields[sortField]
	if !ok {
		dbSortField = "created_at"
	}

	var totalCount int64
	q.Count(&totalCount)

	var logs []LogDetail
	offset := (page - 1) * pageSize

	baseQuery := dc.DB.Table("user_location_logs").
		Select("user_location_logs.*, users.email AS user_email, user_profiles.full_name AS user_fullname").
		Joins("LEFT JOIN users ON users.id = user_location_logs.user_id").
		Joins("LEFT JOIN user_profiles ON user_profiles.user_id = user_location_logs.user_id")

	applyFilters(baseQuery, r).
		Order("user_location_logs." + dbSortField + " " + sortOrder).
		Offset(offset).
		Limit(pageSize).
		Scan(&logs)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"logs":        logs,
			"page":        page,
			"page_size":   pageSize,
			"total_count": totalCount,
		},
	})
}

// POST /api/admin/demographics/settings
func (dc *DemographicsController) SaveDemographicsSettings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		WeeklyReportEnabled bool   `json:"weekly_report_enabled"`
		AdminEmail          string `json:"admin_email"`
		SpikeThreshold      int    `json:"spike_threshold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	configs := map[string]string{
		"demographics_weekly_report": strconv.FormatBool(req.WeeklyReportEnabled),
		"demographics_admin_email":   req.AdminEmail,
		"demographics_spike_limit":   strconv.Itoa(req.SpikeThreshold),
	}

	for k, v := range configs {
		var cfg models.PlatformConfig
		if err := dc.DB.Where("key = ?", k).First(&cfg).Error; err == nil {
			cfg.Value = v
			dc.DB.Save(&cfg)
		} else {
			dc.DB.Create(&models.PlatformConfig{Key: k, Value: v})
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "success", "message": "Settings updated"})
}

// GET /api/admin/demographics/settings
func (dc *DemographicsController) GetDemographicsSettings(w http.ResponseWriter, r *http.Request) {
	var weeklyReport models.PlatformConfig
	var adminEmail models.PlatformConfig
	var spikeLimit models.PlatformConfig

	dc.DB.Where("key = ?", "demographics_weekly_report").First(&weeklyReport)
	dc.DB.Where("key = ?", "demographics_admin_email").First(&adminEmail)
	dc.DB.Where("key = ?", "demographics_spike_limit").First(&spikeLimit)

	weeklyReportVal := false
	if weeklyReport.Value == "true" {
		weeklyReportVal = true
	}
	spikeLimitVal := 500
	if spikeLimit.Value != "" {
		if sl, err := strconv.Atoi(spikeLimit.Value); err == nil {
			spikeLimitVal = sl
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"weekly_report_enabled": weeklyReportVal,
			"admin_email":           adminEmail.Value,
			"spike_threshold":       spikeLimitVal,
		},
	})
}

// isValidUUID checks if a string is a valid UUID (non-empty)
func isValidUUID(s string) bool {
	if s == "" {
		return false
	}
	// Simple length+format check: UUID is 36 chars with hyphens
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		} else {
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
				return false
			}
		}
	}
	return true
}

// SyncGuestLogsToUser retroactively links past anonymous logs from the client IP to the newly logged-in/registered user ID
func SyncGuestLogsToUser(db *gorm.DB, userID string, ip string) {
	if ip == "" || !isValidUUID(userID) {
		return
	}
	h := sha256.New()
	h.Write([]byte(ip))
	ipHash := hex.EncodeToString(h.Sum(nil))

	// 1. Link past anonymous logs to this user ID — only update records with NULL user_id
	db.Model(&models.UserLocationLog{}).
		Where("ip_hash = ? AND user_id IS NULL", ipHash).
		Update("user_id", userID)

	// 2. If this user has already converted (purchased), mark all logs for this user/IP as converted
	var orderCount int64
	db.Table("orders").Where("buyer_id = ? AND status IN ?", userID, []string{"paid", "processing", "ready_to_ship", "shipped", "delivered", "completed"}).Count(&orderCount)
	if orderCount > 0 {
		db.Model(&models.UserLocationLog{}).
			Where("user_id = ? OR ip_hash = ?", userID, ipHash).
			Update("is_converted", true)
	}
}

// GET /api/admin/demographics/geography-list
func (dc *DemographicsController) GetGeographyList(w http.ResponseWriter, r *http.Request) {
	province := r.URL.Query().Get("province")
	city := r.URL.Query().Get("city")

	// If no province is specified, return all unique provinces
	if province == "" && city == "" {
		var provinces []string
		dc.DB.Model(&models.UserProfile{}).
			Where("province IS NOT NULL AND province != ''").
			Order("province ASC").
			Distinct("province").
			Pluck("province", &provinces)

		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"provinces": provinces,
			},
		})
		return
	}

	// If province is specified but no city, return all unique cities in that province
	if province != "" && city == "" {
		var cities []string
		dc.DB.Model(&models.UserProfile{}).
			Where("LOWER(province) = LOWER(?) AND city IS NOT NULL AND city != ''", strings.ToLower(province)).
			Order("city ASC").
			Distinct("city").
			Pluck("city", &cities)

		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"cities": cities,
			},
		})
		return
	}

	utils.JSONError(w, http.StatusBadRequest, "Parameter tidak valid")
}

// POST /api/admin/demographics/broadcast
func (dc *DemographicsController) BroadcastGeoNotification(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)

	var req struct {
		Title      string `json:"title"`
		Message    string `json:"message"`
		TargetRole string `json:"target_role"` // "all" or specific role
		Targets    []struct {
			Province string `json:"province"`
			City     string `json:"city"`
		} `json:"targets"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Payload tidak valid")
		return
	}

	if req.Title == "" || req.Message == "" {
		utils.JSONError(w, http.StatusBadRequest, "Judul dan Isi pesan wajib diisi")
		return
	}
	if len(req.Title) > 100 {
		utils.JSONError(w, http.StatusBadRequest, "Judul maksimal 100 karakter")
		return
	}

	// Build the query
	query := dc.DB.Table("users").
		Select("users.id, users.email").
		Joins("JOIN user_profiles ON user_profiles.user_id = users.id")

	// Filter by Role if specified
	if req.TargetRole != "all" && req.TargetRole != "" {
		query = query.Where("users.role = ?", req.TargetRole)
	} else {
		// Default: Do not send broadcasts to admin/superadmin unless explicitly selected (which they can't anymore)
		query = query.Where("users.role NOT IN ('admin', 'superadmin')")
	}

	// Filter by Geography if targets are specified
	if len(req.Targets) > 0 {
		var geoConditions []string
		var geoArgs []interface{}

		for _, t := range req.Targets {
			conds := []string{}
			if t.Province != "" {
				conds = append(conds, "LOWER(user_profiles.province) = LOWER(?)")
				geoArgs = append(geoArgs, t.Province)
			}
			if t.City != "" {
				conds = append(conds, "LOWER(user_profiles.city) = LOWER(?)")
				geoArgs = append(geoArgs, t.City)
			}

			if len(conds) > 0 {
				geoConditions = append(geoConditions, "("+strings.Join(conds, " AND ")+")")
			}
		}

		if len(geoConditions) > 0 {
			query = query.Where(strings.Join(geoConditions, " OR "), geoArgs...)
		}
	}

	type UserDetail struct {
		ID    string
		Email string
	}
	var targetUsers []UserDetail
	if err := query.Scan(&targetUsers).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data user: "+err.Error())
		return
	}

	if len(targetUsers) == 0 {
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status":  "success",
			"count":   0,
			"message": "Tidak ada user yang cocok dengan kriteria geografi tersebut",
		})
		return
	}

	// Send notifications in background using the Notif service dependency
	go func(users []UserDetail, title, message string) {
		for _, u := range users {
			dc.Notif.Push(u.ID, "user", "broadcast_geo", title, message, "")
		}
	}(targetUsers, req.Title, req.Message)

	// Audit log
	dc.Audit.Log(adminID, "broadcast_geo_notification", "demographics", "users", fmt.Sprintf("Title: %s, Count: %d", req.Title, len(targetUsers)), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"count":   len(targetUsers),
		"message": fmt.Sprintf("Pesan massal berhasil dikirim ke %d user", len(targetUsers)),
	})
}

// GET /api/admin/demographics/user-distribution
// Returns distribution of registered users by city and province from their profiles
func (dc *DemographicsController) GetUserDistribution(w http.ResponseWriter, r *http.Request) {
	roleFilter := r.URL.Query().Get("role") // e.g. "affiliate", "merchant", "all"

	baseQ := dc.DB.Table("user_profiles").
		Joins("JOIN users ON users.id = user_profiles.user_id").
		Where("users.deleted_at IS NULL AND users.status = 'active'")

	if roleFilter != "" && roleFilter != "all" {
		baseQ = baseQ.Where("users.role = ?", roleFilter)
	}

	// Total registered users
	var totalUsers int64
	baseQ.Count(&totalUsers)

	// By Province
	type ProvRow struct {
		Province string `json:"province"`
		Count    int64  `json:"count"`
	}
	var byProvince []ProvRow
	baseQ.Session(&gorm.Session{}).
		Select("user_profiles.province, COUNT(*) as count").
		Where("user_profiles.province IS NOT NULL AND user_profiles.province != ''").
		Group("user_profiles.province").
		Order("count DESC").
		Scan(&byProvince)

	// By City (top 20)
	type CityRow struct {
		City     string `json:"city"`
		Province string `json:"province"`
		Count    int64  `json:"count"`
	}
	var byCity []CityRow
	baseQ.Session(&gorm.Session{}).
		Select("user_profiles.city, user_profiles.province, COUNT(*) as count").
		Where("user_profiles.city IS NOT NULL AND user_profiles.city != ''").
		Group("user_profiles.city, user_profiles.province").
		Order("count DESC").
		Limit(20).
		Scan(&byCity)

	// Users with no location data
	var noLocation int64
	baseQ.Session(&gorm.Session{}).Where("(user_profiles.city IS NULL OR user_profiles.city = '') AND (user_profiles.province IS NULL OR user_profiles.province = '')").Count(&noLocation)

	// List of Users
	type UserDetail struct {
		ID       string `json:"id"`
		FullName string `json:"full_name"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		Province string `json:"province"`
		City     string `json:"city"`
	}
	var usersList []UserDetail
	// Create a new query for the list to avoid modifying the baseQ state with Where condition
	listQ := dc.DB.Table("user_profiles").
		Joins("JOIN users ON users.id = user_profiles.user_id").
		Where("users.deleted_at IS NULL AND users.status = 'active'")
		
	if roleFilter != "" && roleFilter != "all" {
		listQ = listQ.Where("users.role = ?", roleFilter)
	}
	
	listQ.Select("users.id, user_profiles.full_name, users.email, users.role, user_profiles.province, user_profiles.city").
		Order("users.created_at DESC").
		Scan(&usersList)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"total_users":  totalUsers,
			"by_province":  byProvince,
			"by_city":      byCity,
			"no_location":  noLocation,
			"users_list":   usersList,
		},
	})
}
