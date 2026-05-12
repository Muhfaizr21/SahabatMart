package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AdminFinanceController struct {
	DB *gorm.DB
}

func NewAdminFinanceController(db *gorm.DB) *AdminFinanceController {
	return &AdminFinanceController{DB: db}
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func (fc *AdminFinanceController) loadConfig() ([]map[string]interface{}, []map[string]interface{}, []map[string]interface{}) {
	var dsCfg, psCfg, isCfg models.PlatformConfig
	var dsList, psList, isList []map[string]interface{}
	if err := fc.DB.Where("key = ?", "finance_data_saving_list").First(&dsCfg).Error; err == nil {
		json.Unmarshal([]byte(dsCfg.Value), &dsList)
	}
	if err := fc.DB.Where("key = ?", "finance_profit_share_list").First(&psCfg).Error; err == nil {
		json.Unmarshal([]byte(psCfg.Value), &psList)
	}
	if err := fc.DB.Where("key = ?", "finance_income_source_list").First(&isCfg).Error; err == nil {
		json.Unmarshal([]byte(isCfg.Value), &isList)
	}
	return dsList, psList, isList
}

// periodWhere returns a GORM scope that filters created_at by period.
// Supported values: "all", "today", "week", "month", "year", or "YYYY-MM".
func periodWhere(db *gorm.DB, col, period string) *gorm.DB {
	switch period {
	case "all":
		return db
	case "today":
		return db.Where(col+" >= ?", time.Now().Format("2006-01-02"))
	case "week":
		return db.Where(col+" >= ?", time.Now().AddDate(0, 0, -7))
	case "month":
		return db.Where("to_char("+col+", 'YYYY-MM') = ?", time.Now().Format("2006-01"))
	case "year":
		return db.Where("to_char("+col+", 'YYYY') = ?", time.Now().Format("2006"))
	default:
		// Assume YYYY-MM format
		return db.Where("to_char("+col+", 'YYYY-MM') = ?", period)
	}
}

// getMutSum gets sum of money_mutations by category+status, respecting period.
func (fc *AdminFinanceController) getMutSum(cat, status, period string) float64 {
	var sum float64
	q := periodWhere(fc.DB.Table("money_mutations").Where("category = ? AND status = ?", cat, status), "created_at", period)
	q.Select("COALESCE(SUM(amount),0)").Scan(&sum)
	return sum
}

// getIncomeBreakdown fetches gross revenue broken down by source type.
// Uses wallet_transactions as the single source of truth (always exists).
func (fc *AdminFinanceController) getIncomeBreakdown(period string) (float64, map[string]float64, float64) {
	_, _, isList := fc.loadConfig()
	breakdown := make(map[string]float64)
	
	// Pre-fill breakdown with names from config
	for _, it := range isList {
		breakdown[it["name"].(string)] = 0
	}

	type WTRow struct {
		Type   string
		Amount float64
	}
	var rows []WTRow
	q := periodWhere(
		fc.DB.Table("wallet_transactions").
			Select("type, COALESCE(SUM(amount),0) as amount").
			Where("type IN ? AND amount > 0", []string{
				string(models.TxPlatformFee),
				string(models.TxRestockRevenue),
				string(models.TxCommissionEarned),
			}).
			Group("type"),
		"created_at", period,
	)
	q.Scan(&rows)

	// Map transaction types to income names
	for _, r := range rows {
		for _, it := range isList {
			if it["type"].(string) == r.Type {
				breakdown[it["name"].(string)] += r.Amount
			}
		}
	}

	// ─── NEW: Synchronize Order Revenue with COGS ───
	// To avoid negative profit, we must count the revenue from the same orders we use for COGS
	var activeOrderRevenue float64
	activeStatuses := []string{
		string(models.OrderCompleted), string(models.OrderDelivered), 
		string(models.OrderShipped), string(models.OrderReadyToShip), 
		string(models.OrderPaid), string(models.OrderProcessing),
	}
	
	periodWhere(
		fc.DB.Table("orders"),
		"created_at", period,
	).Where("status IN ?", activeStatuses).
	  Select("COALESCE(SUM(grand_total), 0)").Scan(&activeOrderRevenue)

	// Add this to "Penjualan" or "Sale Revenue" source
	saleFound := false
	for _, it := range isList {
		if it["type"].(string) == string(models.TxSaleRevenue) {
			breakdown[it["name"].(string)] = activeOrderRevenue // Use order table as source of truth for Sales
			saleFound = true
			break
		}
	}
	if !saleFound && len(isList) > 0 {
		breakdown[isList[0]["name"].(string)] += activeOrderRevenue
	}

	// Also count manual income mutations
	var incomeSum float64
	q2 := periodWhere(
		fc.DB.Table("money_mutations").Where("type = 'income'"),
		"created_at", period,
	)
	q2.Select("COALESCE(SUM(amount),0)").Scan(&incomeSum)
	
	// Add manual income to any source configured as 'manual_income'
	for _, it := range isList {
		if it["type"].(string) == "manual_income" {
			breakdown[it["name"].(string)] += incomeSum
		}
	}

	// Also add seeded allocations gross (for demo/dev data)
	var allocSum float64
	q3 := fc.DB.Table("finance_revenue_allocations")
	q3 = periodWhere(q3, "created_at", period)
	q3.Select("COALESCE(SUM(gross_amount),0)").Scan(&allocSum)

	walletTotal := 0.0
	for _, v := range breakdown {
		walletTotal += v
	}

	// Dev env: distribute seeded gross proportionally if no real data
	if allocSum > walletTotal && walletTotal == 0 {
		for i, it := range isList {
			name := it["name"].(string)
			// Proportional dummy distribution
			p := 0.1
			if i == 0 { p = 0.6 }
			if i == 1 { p = 0.2 }
			breakdown[name] = allocSum * p
		}
		walletTotal = allocSum
	}
	
	// Calculate Capital Cost (COGS) from completed orders only
	var capitalCost float64
	periodWhere(
		fc.DB.Table("order_items").
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("orders.status IN ?", []string{string(models.OrderCompleted), string(models.OrderDelivered), string(models.OrderShipped), string(models.OrderReadyToShip), string(models.OrderPaid), string(models.OrderProcessing)}), 
		"orders.created_at", period,
	).Select("COALESCE(SUM(order_items.cogs), 0)").Scan(&capitalCost)
	
	// If dev env (seeded gross), simulate capital cost as 70% of gross
	if allocSum > walletTotal && capitalCost == 0 {
		capitalCost = allocSum * 0.7
	}

	return walletTotal, breakdown, capitalCost
}

// buildAllocMap computes allocation map for a given gross amount.
func buildAllocMap(gross float64, dsList, psList []map[string]interface{}) (map[string]interface{}, float64) {
	allocMap := make(map[string]interface{})
	totalSaving := 0.0
	for _, item := range dsList {
		pct := item["percent"].(float64)
		val := gross * pct / 100.0
		allocMap[item["name"].(string)] = val
		totalSaving += val
	}
	netProfit := gross - totalSaving
	totalPSValue := 0.0
	for _, item := range psList {
		pct := item["percent"].(float64)
		val := netProfit * pct / 100.0
		allocMap[item["name"].(string)] = val
		totalPSValue += val
	}

	// [Crucial] Add Retained Earnings to the snapshot
	allocMap["Laba Ditahan"] = netProfit - totalPSValue

	return allocMap, netProfit
}

// ensureAllocations ensures that a FinanceRevenueAllocation record exists for the given period.
// If it doesn't exist, it clones the configuration from the previous period.
// If it exists but the config changed, it updates the allocation JSON.
func (fc *AdminFinanceController) ensureAllocations(period string) {
	if period == "all" || period == "today" || period == "week" || len(period) != 7 {
		return 
	}

	fc.DB.Transaction(func(tx *gorm.DB) error {
		var alloc models.FinanceRevenueAllocation
		err := tx.Where("period = ? AND source_type = 'period_summary'", period).First(&alloc).Error
		
		dsList, psList, _ := fc.loadConfig()
		
		if err != nil {
			// Record NOT FOUND -> CLONING LOGIC
			log.Printf("🆕 Period %s not found. Attempting to clone from previous period...", period)
			
			// Find previous period (YYYY-MM)
			t, _ := time.Parse("2006-01", period)
			prevPeriod := t.AddDate(0, -1, 0).Format("2006-01")
			
			var prevAlloc models.FinanceRevenueAllocation
			if errPrev := tx.Where("period = ? AND source_type = 'period_summary'", prevPeriod).First(&prevAlloc).Error; errPrev == nil {
				// Clone from previous
				newAlloc := models.FinanceRevenueAllocation{
					Period:      period,
					SourceType:  "period_summary",
					SourceID:    "auto_clone",
					SourceHash:  "summary_" + period,
					GrossAmount: 0, // Fresh month
					Allocation:  prevAlloc.Allocation, // Copy the distribution map
					CreatedAt:   time.Now(),
				}
				tx.Create(&newAlloc)
			} else {
				// No previous period? Use current config
				newMap, _ := buildAllocMap(0, dsList, psList)
				b, _ := json.Marshal(newMap)
				newAlloc := models.FinanceRevenueAllocation{
					Period:      period,
					SourceType:  "period_summary",
					SourceID:    "initial",
					SourceHash:  "summary_" + period,
					GrossAmount: 0,
					Allocation:  string(b),
					CreatedAt:   time.Now(),
				}
				tx.Create(&newAlloc)
			}
			return nil
		}

		// Record EXISTS -> SYNC LOGIC (Update if config changed)
		var currentMap map[string]float64
		json.Unmarshal([]byte(alloc.Allocation), &currentMap)

		configChanged := len(currentMap) != (len(dsList) + len(psList))
		if !configChanged {
			for _, item := range dsList {
				if _, ok := currentMap[item["name"].(string)]; !ok {
					configChanged = true
					break
				}
			}
		}
		if !configChanged {
			for _, item := range psList {
				if _, ok := currentMap[item["name"].(string)]; !ok {
					configChanged = true
					break
				}
			}
		}

		if configChanged {
			log.Printf("⚙️ Config changed for period %s. Updating allocations...", period)
			newMap, _ := buildAllocMap(alloc.GrossAmount, dsList, psList)
			b, _ := json.Marshal(newMap)
			alloc.Allocation = string(b)
			tx.Save(&alloc)
		}
		
		return nil
	})
}

// ─── API Handlers ─────────────────────────────────────────────────────────────

// GET /api/admin/finance/revenue-detail
func (fc *AdminFinanceController) GetRevenueDetail(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "all"
	}

	// Run allocation sync in background — never block the HTTP response
	go fc.ensureAllocations(period)
	
	configSvc := services.NewConfigService(fc.DB)
	gross, breakdown, capitalCost := fc.getIncomeBreakdown(period)
	dsList, psList, isList := fc.loadConfig()

	// Build data_saving & profit_shares using current config %
	dataSaving := make(map[string]interface{})
	totalSaving := 0.0
	for _, it := range dsList {
		pct := it["percent"].(float64)
		val := gross * pct / 100.0
		dataSaving[it["name"].(string)] = map[string]interface{}{"percent": pct, "value": val}
		totalSaving += val
	}
	dataSaving["total"] = totalSaving
	netProfit := gross - totalSaving

	profitShares := make(map[string]interface{})
	totalPSPercent := 0.0
	totalPSValue := 0.0
	for _, it := range psList {
		pct := it["percent"].(float64)
		val := netProfit * pct / 100.0
		profitShares[it["name"].(string)] = map[string]interface{}{"percent": pct, "value": val}
		totalPSPercent += pct
		totalPSValue += val
	}
	profitShares["Laba Ditahan"] = map[string]interface{}{
		"percent": 100.0 - totalPSPercent,
		"value":   netProfit - totalPSValue,
	}

	var locations []models.FinancialLocation
	fc.DB.Order("is_primary desc, name asc").Find(&locations)

	var mutations []models.MoneyMutation
	periodWhere(fc.DB.Order("created_at desc").Limit(20), "created_at", period).Find(&mutations)

	// Fetch recent orders with COGS for audit visibility
	type OrderSummary struct {
		ID          string    `json:"id"`
		CreatedAt   time.Time `json:"created_at"`
		TotalAmount float64   `json:"total_amount"`
		TotalCOGS   float64   `json:"total_cogs"`
		Customer    string    `json:"customer"`
		Status      string    `json:"status"`
	}
	var recentOrders []OrderSummary
	periodWhere(
		fc.DB.Table("orders o").
			Select("o.id, o.created_at, o.grand_total as total_amount, o.status, COALESCE(SUM(oi.cogs),0) as total_cogs, COALESCE(up.full_name, 'Offline / POS') as customer").
			Joins("LEFT JOIN order_items oi ON oi.order_id = o.id").
			Joins("LEFT JOIN users u ON u.id = o.buyer_id").
			Joins("LEFT JOIN user_profiles up ON up.user_id = u.id").
			Group("o.id, o.created_at, o.grand_total, o.status, up.full_name").
			Order("o.created_at desc").
			Limit(20),
		"o.created_at", period,
	).Scan(&recentOrders)

	// Fetch all wallet activity for full audit trail
	// NOTE: Tidak ada filter type — semua tipe (sale, withdrawal, refund, topup, commission, dll)
	// harus tampil agar audit trail benar-benar lengkap sesuai kebutuhan SuperAdmin
	type WalletActivity struct {
		ID          uint      `json:"id"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		Description string    `json:"description"`
		CreatedAt   time.Time `json:"created_at"`
		WalletOwner string    `json:"wallet_owner"`
	}
	var walletActivity []WalletActivity
	periodWhere(
		fc.DB.Table("wallet_transactions wt").
			Select("wt.id, wt.type, wt.amount, wt.description, wt.created_at, COALESCE(up.full_name, 'Platform') as wallet_owner").
			Joins("LEFT JOIN wallets w ON w.id = wt.wallet_id").
			Joins("LEFT JOIN users u ON u.id = w.owner_id").
			Joins("LEFT JOIN user_profiles up ON up.user_id = u.id").
			Order("wt.created_at desc").
			Limit(100), // Dinaikkan dari 50 → 100 untuk audit trail lengkap
		"wt.created_at", period,
	).Scan(&walletActivity)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"period":           period,
		"gross_revenue":    gross,
		"capital_cost":     capitalCost,
		"gross_profit":     gross - capitalCost,
		"income_breakdown": breakdown,
		"data_saving":      dataSaving,
		"net_profit":       netProfit,
		"profit_shares":    profitShares,
		"locations":        locations,
		"mutations":        mutations,
		"recent_orders":    recentOrders,
		"wallet_activity":  walletActivity,
		"config": map[string]interface{}{
			"data_saving_list":   dsList,
			"profit_share_list":  psList,
			"income_source_list": isList,
			"payout_payday_dates": configSvc.Get("payout_payday_dates", "all"),
			"payout_min_amount":   configSvc.GetFloat("payout_min_amount", 50000.0),
			"settlement_delay_hours": configSvc.GetInt("settlement_delay_hours", 24),
			"platform_fee_percent": configSvc.GetFloat("platform_fee_percent", 5.0),
		},
	})
}

// GET /api/admin/finance/data-saving-detail
func (fc *AdminFinanceController) GetDataSavingDetail(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "all"
	}
	go fc.ensureAllocations(period)

	dsList, _, _ := fc.loadConfig()

	// Aggregate allocation sums from seeded/computed records
	sums := fc.sumAllocations(period)

	var posData []map[string]interface{}
	var catNames []string
	totalAlloc, totalPaid, totalPlanned := 0.0, 0.0, 0.0

	for _, it := range dsList {
		name := it["name"].(string)
		catNames = append(catNames, name)
		alloc := sums[name]
		paid := fc.getMutSum(name, "processed", period)
		planned := fc.getMutSum(name, "pending", period)
		posData = append(posData, map[string]interface{}{
			"name": name, "percent": it["percent"],
			"allocated": alloc, "paid": paid, "planned": planned,
			"sisa": alloc - paid - planned,
		})
		totalAlloc += alloc
		totalPaid += paid
		totalPlanned += planned
	}

	history := fc.buildHistory(period, catNames, false)

	var locs []models.FinancialLocation
	fc.DB.Order("is_primary desc").Find(&locs)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"period": period, "locations": locs, "pos_data": posData, "history": history,
		"summary": map[string]interface{}{
			"allocated": totalAlloc, "paid": totalPaid, "planned": totalPlanned,
			"sisa": totalAlloc - totalPaid - totalPlanned,
		},
	})
}

// GET /api/admin/finance/profit-share-detail
func (fc *AdminFinanceController) GetProfitShareDetail(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "all"
	}
	go fc.ensureAllocations(period)

	_, psList, _ := fc.loadConfig()

	sums := fc.sumAllocations(period)

	var posData []map[string]interface{}
	var catNames []string
	totalAlloc, totalPaid, totalPlanned := 0.0, 0.0, 0.0

	// Also calculate gross and net profit for FinanceConfigModal
	gross, _, _ := fc.getIncomeBreakdown(period)
	dsCfg, _, _ := fc.loadConfig()
	totalSaving := 0.0
	for _, it := range dsCfg {
		totalSaving += gross * (it["percent"].(float64)) / 100.0
	}
	netProfit := gross - totalSaving

	for _, it := range psList {
		name := it["name"].(string)
		catNames = append(catNames, name)
		alloc := sums[name]
		paid := fc.getMutSum(name, "processed", period)
		planned := fc.getMutSum(name, "pending", period)
		posData = append(posData, map[string]interface{}{
			"name": name, "percent": it["percent"],
			"allocated": alloc, "paid": paid, "planned": planned,
			"sisa": alloc - paid - planned,
		})
		totalAlloc += alloc
		totalPaid += paid
		totalPlanned += planned
	}

	// [Visual Sync] Add Retained Earnings (Laba Ditahan) as a dynamic card
	psPercentSum := 0.0
	for _, it := range psList {
		psPercentSum += it["percent"].(float64)
	}
	rdName := "Laba Ditahan"
	catNames = append(catNames, rdName)
	rdAlloc := sums[rdName]
	rdPaid := fc.getMutSum(rdName, "processed", period)
	rdPlanned := fc.getMutSum(rdName, "pending", period)
	posData = append(posData, map[string]interface{}{
		"name": rdName, "percent": 100.0 - psPercentSum,
		"allocated": rdAlloc, "paid": rdPaid, "planned": rdPlanned,
		"sisa": rdAlloc - rdPaid - rdPlanned,
	})

	history := fc.buildHistory(period, catNames, true)

	var locs []models.FinancialLocation
	fc.DB.Order("is_primary desc").Find(&locs)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"period": period, "locations": locs, "pos_data": posData, "history": history,
		"gross_revenue": gross, "net_profit": netProfit,
		"summary": map[string]interface{}{
			"allocated": totalAlloc, "paid": totalPaid, "planned": totalPlanned,
			"sisa": totalAlloc - totalPaid - totalPlanned,
		},
	})
}

// sumAllocations aggregates allocation JSON sums from finance_revenue_allocations.
func (fc *AdminFinanceController) sumAllocations(period string) map[string]float64 {
	sums := make(map[string]float64)
	q := fc.DB.Model(&models.FinanceRevenueAllocation{})
	q = periodWhere(q, "created_at", period)
	var allocs []models.FinanceRevenueAllocation
	q.Find(&allocs)
	for _, a := range allocs {
		var m map[string]float64
		if err := json.Unmarshal([]byte(a.Allocation), &m); err == nil {
			for k, v := range m {
				sums[k] += v
			}
		}
	}
	return sums
}

// buildHistory builds mutation history for given category names.
func (fc *AdminFinanceController) buildHistory(period string, catNames []string, isProfitShare bool) []map[string]interface{} {
	var history []map[string]interface{}

	// 1. Real-time Inflow from Wallet Transactions
	history = append(history, fc.getRawTransactions(period)...)

	// 2. Allocation events from seeded records
	q := fc.DB.Model(&models.FinanceRevenueAllocation{})
	q = periodWhere(q, "created_at", period)
	var allocs []models.FinanceRevenueAllocation
	q.Order("created_at desc").Limit(100).Find(&allocs)

	label := "Alokasi Biaya"
	if isProfitShare {
		label = "Alokasi Profit"
	}
	for _, a := range allocs {
		var m map[string]float64
		json.Unmarshal([]byte(a.Allocation), &m)
		for _, name := range catNames {
			if val, ok := m[name]; ok && val > 0 {
				history = append(history, map[string]interface{}{
					"type": label, "category": name, "amount": val,
					"created_at": a.CreatedAt, "desc": "Sumber: " + a.SourceType,
				})
			}
		}
	}

	// Actual mutations (money out)
	if len(catNames) > 0 {
		var muts []models.MoneyMutation
		mq := periodWhere(
			fc.DB.Where("category IN ?", catNames).Order("created_at desc").Limit(50),
			"created_at", period,
		)
		mq.Find(&muts)
		for _, m := range muts {
			history = append(history, map[string]interface{}{
				"type": "Uang Keluar", "category": m.Category, "amount": m.Amount,
				"created_at": m.CreatedAt, "desc": m.Description, "status": m.Status,
			})
		}
	}

	// Sort history by created_at desc to ensure newest transactions are always on top
	sort.Slice(history, func(i, j int) bool {
		ti := history[i]["created_at"].(time.Time)
		tj := history[j]["created_at"].(time.Time)
		return ti.After(tj)
	})

	return history
}

// POST /api/admin/finance/config
func (fc *AdminFinanceController) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	// ─── VALIDATION ───
	for k, v := range req {
		if k == "finance_data_saving_list" || k == "finance_profit_share_list" {
			list, ok := v.([]interface{})
			if !ok { continue }
			totalPct := 0.0
			for _, item := range list {
				m, ok := item.(map[string]interface{})
				if !ok { continue }
				if pct, ok := m["percent"].(float64); ok {
					totalPct += pct
				}
			}
			if totalPct > 100.0 {
				utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("Total persentase %s tidak boleh lebih dari 100%% (saat ini %.2f%%)", k, totalPct))
				return
			}
		}
	}

	for k, v := range req {
		b, _ := json.Marshal(v)
		var pc models.PlatformConfig
		if err := fc.DB.Where("key = ?", k).First(&pc).Error; err != nil {
			fc.DB.Create(&models.PlatformConfig{Key: k, Value: string(b), UpdatedAt: time.Now()})
		} else {
			pc.Value = string(b)
			pc.UpdatedAt = time.Now()
			fc.DB.Save(&pc)
		}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "updated"})
}

// POST /api/admin/finance/mutation
func (fc *AdminFinanceController) CreateMutation(w http.ResponseWriter, r *http.Request) {
	var req models.MoneyMutation
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if req.Type == "" {
		req.Type = "expense"
	}
	req.CreatedAt = time.Now()
	if req.Status == "processed" {
		now := time.Now()
		req.ProcessedAt = &now
	}
	if err := fc.DB.Create(&req).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "gagal menyimpan mutasi")
		return
	}
	// Adjust location balances immediately when processed
	if req.Status == "processed" {
		if req.FromLocationID != nil {
			fc.DB.Exec(`UPDATE financial_locations SET balance = balance - ?, updated_at = NOW() WHERE id = ?`, req.Amount, *req.FromLocationID)
		}
		if req.ToLocationID != nil {
			fc.DB.Exec(`UPDATE financial_locations SET balance = balance + ?, updated_at = NOW() WHERE id = ?`, req.Amount, *req.ToLocationID)
		}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "ok", "data": req})
}

// POST /api/admin/finance/generate
func (fc *AdminFinanceController) GenerateAllocations(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		utils.JSONError(w, http.StatusBadRequest, "period required (format: YYYY-MM)")
		return
	}
	go fc.ensureAllocations(period)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "ok", "period": period})
}

// GET /api/admin/finance/locations  (bonus: list locations)
func (fc *AdminFinanceController) GetLocations(w http.ResponseWriter, r *http.Request) {
	var locs []models.FinancialLocation
	fc.DB.Order("is_primary desc, name asc").Find(&locs)
	totalBalance := 0.0
	for _, l := range locs {
		totalBalance += l.Balance
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"locations":     locs,
		"total_balance": totalBalance,
	})
}

// PUT /api/admin/finance/locations/{id}  (bonus: update location balance)
func (fc *AdminFinanceController) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	var req models.FinancialLocation
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "id required")
		return
	}

	fc.DB.Transaction(func(tx *gorm.DB) error {
		if req.IsPrimary {
			// Set others to false
			tx.Model(&models.FinancialLocation{}).Where("id != ?", id).Update("is_primary", false)
		}
		
		return tx.Model(&models.FinancialLocation{}).Where("id = ?", id).Updates(map[string]interface{}{
			"name":       req.Name,
			"balance":    req.Balance,
			"is_primary": req.IsPrimary,
			"updated_at": time.Now(),
		}).Error
	})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "updated"})
}

// POST /api/admin/finance/locations
func (fc *AdminFinanceController) CreateLocation(w http.ResponseWriter, r *http.Request) {
	var req models.FinancialLocation
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if req.Name == "" {
		utils.JSONError(w, http.StatusBadRequest, "name required")
		return
	}

	fc.DB.Transaction(func(tx *gorm.DB) error {
		if req.IsPrimary {
			// Set others to false
			tx.Model(&models.FinancialLocation{}).Where("is_primary = ?", true).Update("is_primary", false)
		}
		
		req.CreatedAt = time.Now()
		req.UpdatedAt = time.Now()
		if err := tx.Create(&req).Error; err != nil {
			return err
		}
		return nil
	})

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"status": "created", "data": req})
}

// DELETE /api/admin/finance/locations
func (fc *AdminFinanceController) DeleteLocation(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "id required")
		return
	}
	fc.DB.Where("id = ?", id).Delete(&models.FinancialLocation{})
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// DELETE /api/admin/finance/mutation
func (fc *AdminFinanceController) DeleteMutation(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "id required")
		return
	}
	var mut models.MoneyMutation
	if err := fc.DB.Where("id = ?", id).First(&mut).Error; err == nil {
		// Reverse balance if processed
		if mut.Status == "processed" {
			if mut.FromLocationID != nil {
				fc.DB.Exec(`UPDATE financial_locations SET balance = balance + ?, updated_at = NOW() WHERE id = ?`, mut.Amount, *mut.FromLocationID)
			}
			if mut.ToLocationID != nil {
				fc.DB.Exec(`UPDATE financial_locations SET balance = balance - ?, updated_at = NOW() WHERE id = ?`, mut.Amount, *mut.ToLocationID)
			}
		}
		fc.DB.Delete(&mut)
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// getRawTransactions fetches real wallet transactions to supplement recorded allocations.
func (fc *AdminFinanceController) getRawTransactions(period string) []map[string]interface{} {
	var history []map[string]interface{}
	_, _, isList := fc.loadConfig()

	type WTRow struct {
		Type      string
		Amount    float64
		CreatedAt time.Time
	}
	var rows []WTRow
	q := periodWhere(
		fc.DB.Table("wallet_transactions").
			Select("type, amount, created_at").
			Where("type IN ? AND amount > 0", []string{
				string(models.TxPlatformFee),
				string(models.TxRestockRevenue),
				string(models.TxSaleRevenue),
				string(models.TxCommissionEarned),
			}).
				Limit(30),
		"created_at", period,
	)
	q.Scan(&rows)

	for _, r := range rows {
		sourceName := "Lainnya"
		for _, it := range isList {
			if it["type"].(string) == r.Type {
				sourceName = it["name"].(string)
				break
			}
		}
		history = append(history, map[string]interface{}{
			"type":       "Pendapatan Real-time",
			"category":   sourceName,
			"amount":     r.Amount,
			"created_at": r.CreatedAt,
			"desc":       "Otomatis: " + r.Type,
		})
	}
	return history
}
