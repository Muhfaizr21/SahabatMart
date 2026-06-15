package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/services"
	"akuglow/backend/utils"

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
// Supported values: "all", "today", "week", "month", "year", or "YYYY-MM:YYYY-MM" for custom range.
func periodWhere(db *gorm.DB, col, period string) *gorm.DB {
	if strings.Contains(period, ":") {
		parts := strings.Split(period, ":")
		if len(parts) == 2 {
			from := parts[0]
			to := parts[1]
			if from != "" && to != "" {
				return db.Where(col+" >= ? AND "+col+" <= ?", from+" 00:00:00", to+" 23:59:59")
			} else if from != "" {
				return db.Where(col+" >= ?", from+" 00:00:00")
			} else if to != "" {
				return db.Where(col+" <= ?", to+" 23:59:59")
			}
		}
	}

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

// getIncomeBreakdown computes:
// - totalGrossRevenue = orders.grand_total (active) + manual income mutations
// - breakdown by income source name from config (wallet tx mapping for display)
// - totalCapitalCost (COGS) from non-cancelled order_items
//
// Single Source of Truth: orders.grand_total for revenue KPI
// Breakdown maps wallet tx types to config source names (for display only, NOT revenue KPI)
func (fc *AdminFinanceController) getIncomeBreakdown(period string) (totalGross float64, breakdown map[string]float64, totalCOGS float64) {
	_, _, isList := fc.loadConfig()
	breakdown = make(map[string]float64)

	// Pre-fill breakdown with names from config (all start at 0)
	for _, it := range isList {
		breakdown[it["name"].(string)] = 0
	}

	// ─── 1. WALLET TRANSACTIONS — map types to source names (for breakdown display ONLY)
	type WTRow struct {
		Type   string
		Amount float64
	}
	var walletRows []WTRow
	periodWhere(
		fc.DB.Table("wallet_transactions").
			Select("type, SUM(amount) as amount").
			Where("amount != 0").
			Group("type"),
		"created_at", period,
	).Scan(&walletRows)

	for _, r := range walletRows {
		baseType := r.Type
		if baseType == "commission_reversed" {
			baseType = "commission_earned"
		} else if strings.HasSuffix(baseType, "_reversed") {
			baseType = strings.TrimSuffix(baseType, "_reversed")
		}

		for _, it := range isList {
			if it["type"].(string) == baseType {
				breakdown[it["name"].(string)] += r.Amount
			}
		}
	}

	// ─── 2. SALE REVENUE — orders.grand_total as SOLE source for gross revenue KPI
	var saleRevenue float64
	activeStatuses := []string{
		string(models.OrderCompleted), string(models.OrderDelivered),
		string(models.OrderShipped), string(models.OrderReadyToShip),
		string(models.OrderPaid), string(models.OrderProcessing),
	}
	periodWhere(
		fc.DB.Table("orders").
			Select("COALESCE(SUM(grand_total),0)").
			Where("status IN ?", activeStatuses),
		"created_at", period,
	).Scan(&saleRevenue)

	// Assign sale revenue to matching income source in breakdown (for display)
	for _, it := range isList {
		if it["type"].(string) == string(models.TxSaleRevenue) {
			breakdown[it["name"].(string)] = saleRevenue
			break
		}
	}

	// ─── 3. MANUAL INCOME MUTATIONS (non-auto) ───
	var manualIncome float64
	periodWhere(
		fc.DB.Table("money_mutations").
			Select("COALESCE(SUM(amount),0)").
			Where("type = 'income' AND (description LIKE 'Auto-Sync:%' OR description = '' OR description IS NULL) = false"),
		"created_at", period,
	).Scan(&manualIncome)
	for _, it := range isList {
		if it["type"].(string) == "manual_income" {
			breakdown[it["name"].(string)] += manualIncome
		}
	}

	// ─── 4. TOTAL GROSS REVENUE = saleRevenue (orders) + manualIncome ONLY
	// NOT from breakdown sum — breakdown can contain commission/platform_fee which are NOT gross revenue
	totalGross = saleRevenue + manualIncome

	// ─── 5. CAPITAL COST (COGS) from non-cancelled/non-refunded order_items ───
	var capitalCost float64
	periodWhere(
		fc.DB.Table("order_items").
			Joins("JOIN orders ON orders.id = order_items.order_id").
			Where("orders.status NOT IN ?", []string{string(models.OrderCancelled), string(models.OrderRefunded)}),
		"orders.created_at", period,
	).Select("COALESCE(SUM(order_items.cogs), 0)").Scan(&capitalCost)

	return totalGross, breakdown, capitalCost
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

	// Add Retained Earnings (Laba Ditahan) to the snapshot
	allocMap["Laba Ditahan"] = netProfit - totalPSValue

	return allocMap, netProfit
}

// ensureAllocations ensures that a FinanceRevenueAllocation record exists for the given period.
func (fc *AdminFinanceController) ensureAllocations(period string) {
	if period == "all" || period == "today" || period == "week" || len(period) != 7 {
		return
	}

	fc.DB.Transaction(func(tx *gorm.DB) error {
		var alloc models.FinanceRevenueAllocation
		err := tx.Where("period = ? AND source_type = 'period_summary'", period).First(&alloc).Error

		dsList, psList, _ := fc.loadConfig()

		if err != nil {
			grossRevenue, _, capitalCost := fc.getIncomeBreakdown(period)
			grossProfit := grossRevenue - capitalCost

			newMap, _ := buildAllocMap(grossProfit, dsList, psList)
			b, _ := json.Marshal(newMap)
			newAlloc := models.FinanceRevenueAllocation{
				Period:     period,
				SourceType: "period_summary",
				SourceID:   "initial",
				SourceHash: "summary_" + period,
				GrossAmount: grossProfit,
				Allocation: string(b),
				CreatedAt:  time.Now(),
			}
			tx.Create(&newAlloc)
			return nil
		}

		grossRevenue, _, capitalCost := fc.getIncomeBreakdown(period)
		grossProfit := grossRevenue - capitalCost

		newMap, _ := buildAllocMap(grossProfit, dsList, psList)
		b, _ := json.Marshal(newMap)

		alloc.GrossAmount = grossProfit
		alloc.Allocation = string(b)
		tx.Save(&alloc)

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

	go fc.ensureAllocations(period)

	configSvc := services.NewConfigService(fc.DB)
	gross, _, capitalCost := fc.getIncomeBreakdown(period)
	dsList, psList, isList := fc.loadConfig()

	// ── GROSS PROFIT ─────────────────────────────────────────
	grossProfit := gross - capitalCost

	// ── DATA SAVING ALLOCATION ─────────────────────────────
	dataSaving := make(map[string]interface{})
	totalSaving := 0.0
	for _, it := range dsList {
		pct := it["percent"].(float64)
		val := grossProfit * pct / 100.0
		dataSaving[it["name"].(string)] = map[string]interface{}{"percent": pct, "value": val}
		totalSaving += val
	}
	dataSaving["total"] = totalSaving

	// ── NET PROFIT & PROFIT SHARE ──────────────────────────
	netProfit := grossProfit - totalSaving
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

	// ── CASH FLOW IN → ITEMIZED ────────────────────────────
	type CashFlowItem struct {
		Label       string  `json:"label"`
		Type        string  `json:"type"` // in | out
		Amount      float64 `json:"amount"`
		Description string  `json:"description"`
	}

	// IN 1: Penjualan dari orders (active statuses)
	var saleRevenue float64
	activeStatuses := []string{
		string(models.OrderCompleted), string(models.OrderDelivered),
		string(models.OrderShipped), string(models.OrderReadyToShip),
		string(models.OrderPaid), string(models.OrderProcessing),
	}
	periodWhere(
		fc.DB.Table("orders").Select("COALESCE(SUM(grand_total),0)").Where("status IN ?", activeStatuses),
		"created_at", period,
	).Scan(&saleRevenue)

	// IN 2: Manual income mutations (bukan Auto-Sync/Auto-Reverse)
	var manualIncomeIn float64
	periodWhere(
		fc.DB.Table("money_mutations").Select("COALESCE(SUM(amount),0)").
			Where("type = 'income' AND (description NOT LIKE 'Auto-Sync:%' AND description NOT LIKE 'Auto-Reverse:%' OR description IS NULL)"),
		"created_at", period,
	).Scan(&manualIncomeIn)

	// IN 3: Other positive tx to Admin wallet (bonus, adjustment, withdrawal reversal)
	var otherIn float64
	periodWhere(
		fc.DB.Table("wallet_transactions wt").
			Select("COALESCE(SUM(wt.amount),0)").
			Joins("JOIN wallets w ON w.id = wt.wallet_id").
			Where("w.owner_type = 'admin' AND wt.amount > 0 AND wt.type NOT IN (?, ?)",
				models.TxSaleRevenue, models.TxPayoutOutflow),
		"created_at", period,
	).Scan(&otherIn)

	totalCashIn := saleRevenue + manualIncomeIn + otherIn

	// ── CASH FLOW OUT → ITEMIZED ───────────────────────────
	// OUT 1: COGS (modal barang)
	outCOGS := capitalCost

	// OUT 2: Payout outflow (Admin wallet — mencakup komisi affiliate, payout merchant, penarikan)
	// Ini adalah DEBIT dari Admin wallet. Tidak perlu ditambah affCommissionOut/merchantPayoutOut
	// karena payoutOutflow SUDAH mencakup semua itu (double-counting guard).
	var payoutOutflow float64
	periodWhere(
		fc.DB.Table("wallet_transactions wt").
			Select("COALESCE(SUM(ABS(wt.amount)),0)").
			Joins("JOIN wallets w ON w.id = wt.wallet_id").
			Where("w.owner_type = 'admin' AND wt.type = 'payout_outflow' AND wt.amount < 0"),
		"created_at", period,
	).Scan(&payoutOutflow)

	// OUT 3: Manual expense mutations (non-Auto-Sync)
	var manualExpenseOut float64
	periodWhere(
		fc.DB.Table("money_mutations").Select("COALESCE(SUM(amount),0)").
			Where("type = 'expense' AND (description NOT LIKE 'Auto-Sync:%' AND description NOT LIKE 'Auto-Reverse:%' OR description IS NULL)"),
		"created_at", period,
	).Scan(&manualExpenseOut)

	totalCashOut := outCOGS + payoutOutflow + manualExpenseOut

	// ── CASH BALANCE → LOKASI KAS ─────────────────────────
	var locations []models.FinancialLocation
	fc.DB.Order("is_primary desc, name asc").Find(&locations)
	totalLocationBalance := 0.0
	for _, l := range locations {
		totalLocationBalance += l.Balance
	}

	// ── WALLET BALANCE BY OWNER TYPE ─────────────────────
	type WalletBalance struct {
		OwnerType string  `json:"owner_type"`
		Balance   float64 `json:"balance"`
		Count     int64   `json:"count"`
	}
	var walletBalances []WalletBalance
	fc.DB.Table("wallets").
		Select("owner_type, COALESCE(SUM(balance),0) as balance, COUNT(*) as count").
		Group("owner_type").Scan(&walletBalances)
	platformWalletBalance := 0.0
	for _, wb := range walletBalances {
		if wb.OwnerType == "admin" || wb.OwnerType == "platform" {
			platformWalletBalance += wb.Balance
		}
	}

	// ── PENDING PAYOUT ──────────────────────────────────
	var pendingPayout float64
	periodWhere(
		fc.DB.Table("payout_requests").Select("COALESCE(SUM(amount),0)").
			Where("status = 'pending'"),
		"created_at", period,
	).Scan(&pendingPayout)

	// ── MUTATIONS (manual) ────────────────────────────────
	var mutations []models.MoneyMutation
	periodWhere(fc.DB.Order("created_at desc").Limit(50), "created_at", period).Find(&mutations)

	// ── RECENT ORDERS ──────────────────────────────────
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
			Where("o.status != ?", string(models.OrderCancelled)).
			Group("o.id, o.created_at, o.grand_total, o.status, up.full_name").
			Order("o.created_at desc").Limit(30),
		"o.created_at", period,
	).Scan(&recentOrders)

	// ── WALLET ACTIVITY ─────────────────────────────────
	type WalletActivity struct {
		ID          string    `json:"id"`
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
			Where("wt.amount != 0").
			Order("wt.created_at desc").Limit(100),
		"wt.created_at", period,
	).Scan(&walletActivity)

	// ── DAILY CASH FLOW TREND (last 30 days) ──────────
	type DailyFlow struct {
		Date       string  `json:"date"`
		CashIn     float64 `json:"cash_in"`
		CashOut    float64 `json:"cash_out"`
		NetFlow    float64 `json:"net_flow"`
	}
	var dailyFlow []DailyFlow
	fc.DB.Table("orders").Select(`
		DATE(created_at) as date,
		COALESCE(SUM(CASE WHEN status IN ('completed','delivered','shipped','ready_to_ship','paid','processing') THEN grand_total ELSE 0 END),0) as cash_in,
		0 as cash_out,
		COALESCE(SUM(CASE WHEN status IN ('completed','delivered','shipped','ready_to_ship','paid','processing') THEN grand_total ELSE 0 END),0) as net_flow
	`).
		Where("created_at >= NOW() - INTERVAL '30 days'").
		Group("DATE(created_at)").Order("date DESC").Scan(&dailyFlow)

	// ── BUILD CASH FLOW LINE ITEMS ─────────────────────
	cashFlowItems := []CashFlowItem{
		{Label: "Penjualan (Orders)", Type: "in", Amount: saleRevenue, Description: "Pendapatan dari pesanan pelanggan"},
		{Label: "Pemasukan Manual", Type: "in", Amount: manualIncomeIn, Description: "Pencatatan kas masuk manual"},
		{Label: "Lain-lain (Masuk)", Type: "in", Amount: otherIn, Description: "Bonus, adjustment, reversal masuk"},
	}
	outItems := []CashFlowItem{
		{Label: "Harga Modal (COGS)", Type: "out", Amount: outCOGS, Description: "Biaya modal barang terjual"},
		{Label: "Payout ke Merchant & Affiliate", Type: "out", Amount: payoutOutflow, Description: "Komisi affiliate + payout merchant + penarikan user"},
		{Label: "Pengeluaran Manual", Type: "out", Amount: manualExpenseOut, Description: "Pencatatan kas keluar manual"},
	}

	netCashFlow := totalCashIn - totalCashOut

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"period":              period,
		"gross_revenue":        gross,
		"capital_cost":         capitalCost,
		"gross_profit":         grossProfit,
		"net_profit":           netProfit,
		"data_saving":          dataSaving,
		"profit_shares":        profitShares,

		// ── CASH FLOW SUMMARY ────────────────────────────
		"cash_flow": map[string]interface{}{
			"total_cash_in":   totalCashIn,
			"total_cash_out":   totalCashOut,
			"net_cash_flow":    netCashFlow,
			"cash_in_items":    cashFlowItems,
			"cash_out_items":   outItems,
		},

		// ── BALANCE ───────────────────────────────────
		"balance": map[string]interface{}{
			"total_location_balance":   totalLocationBalance,
			"platform_wallet_balance":  platformWalletBalance,
			"pending_payout":           pendingPayout,
			"net_available":           totalLocationBalance - pendingPayout,
		},

		// ── LOCATION BALANCES ─────────────────────────
		"locations": locations,

		// ── WALLET BALANCES BY OWNER ──────────────────
		"wallet_balances": walletBalances,

		// ── DAILY TREND ──────────────────────────────
		"daily_flow": dailyFlow,

		// ── DETAIL DATA ─────────────────────────────
		"mutations":      mutations,
		"recent_orders":   recentOrders,
		"wallet_activity": walletActivity,

		// ── CONFIG ───────────────────────────────────
		"config": map[string]interface{}{
			"data_saving_list":        dsList,
			"profit_share_list":        psList,
			"income_source_list":      isList,
			"payout_payday_dates":     configSvc.Get("payout_payday_dates", "all"),
			"payout_min_amount":       configSvc.GetFloat("payout_min_amount", 50000.0),
			"settlement_delay_hours":   configSvc.GetInt("settlement_delay_hours", 24),
			"platform_fee_percent":     configSvc.GetFloat("platform_fee_percent", 5.0),
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

	gross, _, capitalCost := fc.getIncomeBreakdown(period)
	grossProfit := gross - capitalCost

	var posData []map[string]interface{}
	var catNames []string
	totalAlloc, totalPaid, totalPlanned := 0.0, 0.0, 0.0

	for _, it := range dsList {
		name := it["name"].(string)
		catNames = append(catNames, name)
		alloc := grossProfit * (it["percent"].(float64)) / 100.0
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

	gross, _, capitalCost := fc.getIncomeBreakdown(period)
	grossProfit := gross - capitalCost
	dsCfg, _, _ := fc.loadConfig()
	totalSaving := 0.0
	for _, it := range dsCfg {
		totalSaving += grossProfit * (it["percent"].(float64)) / 100.0
	}
	netProfit := grossProfit - totalSaving

	var posData []map[string]interface{}
	var catNames []string
	totalAlloc, totalPaid, totalPlanned := 0.0, 0.0, 0.0

	for _, it := range psList {
		name := it["name"].(string)
		catNames = append(catNames, name)
		alloc := netProfit * (it["percent"].(float64)) / 100.0
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

	// Add Retained Earnings (Laba Ditahan) as a dynamic card
	psPercentSum := 0.0
	for _, it := range psList {
		psPercentSum += it["percent"].(float64)
	}
	rdName := "Laba Ditahan"
	catNames = append(catNames, rdName)
	rdAlloc := netProfit - totalAlloc

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

// buildHistory builds mutation history for given category names.
func (fc *AdminFinanceController) buildHistory(period string, catNames []string, isProfitShare bool) []map[string]interface{} {
	var history []map[string]interface{}

	// 1. Wallet transactions (real cash flow, exclude zero and reversed)
	type WTRow struct {
		Type      string
		Amount    float64
		CreatedAt time.Time
	}
	var rows []WTRow
	q := periodWhere(
		fc.DB.Table("wallet_transactions").
			Select("type, amount, created_at").
			Where("amount != 0"),
		"created_at", period,
	)
	q.Limit(50).Scan(&rows)

	_, _, isList := fc.loadConfig()
	for _, r := range rows {
		baseType := r.Type
		if baseType == "commission_reversed" {
			baseType = "commission_earned"
		} else if strings.HasSuffix(baseType, "_reversed") {
			baseType = strings.TrimSuffix(baseType, "_reversed")
		}

		sourceName := "Lainnya"
		for _, it := range isList {
			if it["type"].(string) == baseType {
				sourceName = it["name"].(string)
				break
			}
		}
		history = append(history, map[string]interface{}{
			"type": "Pendapatan Real-time", "category": sourceName,
			"amount": r.Amount, "created_at": r.CreatedAt,
			"desc": "Otomatis: " + r.Type,
		})
	}

	// 2. Allocation events from seeded records
	q2 := fc.DB.Model(&models.FinanceRevenueAllocation{})
	q2 = periodWhere(q2, "created_at", period)
	var allocs []models.FinanceRevenueAllocation
	q2.Order("created_at desc").Limit(50).Find(&allocs)

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

	// 3. Actual money mutations (cash out)
	if len(catNames) > 0 {
		var muts []models.MoneyMutation
		periodWhere(
			fc.DB.Where("category IN ?", catNames).Order("created_at desc").Limit(50),
			"created_at", period,
		).Find(&muts)
		for _, m := range muts {
			history = append(history, map[string]interface{}{
				"type": "Uang Keluar", "category": m.Category, "amount": m.Amount,
				"created_at": m.CreatedAt, "desc": m.Description, "status": m.Status,
			})
		}
	}

	// Sort by created_at desc
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

	// VALIDATION: sum of percentages per list must not exceed 100%
	for k, v := range req {
		if k == "finance_data_saving_list" || k == "finance_profit_share_list" {
			list, ok := v.([]interface{})
			if !ok {
				continue
			}
			totalPct := 0.0
			for _, item := range list {
				m, ok := item.(map[string]interface{})
				if !ok {
					continue
				}
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
		var valStr string
		switch val := v.(type) {
		case string:
			valStr = val
		case float64:
			if val == float64(int(val)) {
				valStr = fmt.Sprintf("%d", int(val))
			} else {
				valStr = fmt.Sprintf("%f", val)
				valStr = strings.TrimRight(strings.TrimRight(valStr, "0"), ".")
			}
		case int:
			valStr = fmt.Sprintf("%d", val)
		case bool:
			valStr = fmt.Sprintf("%t", val)
		default:
			b, _ := json.Marshal(v)
			valStr = string(b)
		}

		var pc models.PlatformConfig
		if err := fc.DB.Where("key = ?", k).First(&pc).Error; err != nil {
			fc.DB.Create(&models.PlatformConfig{Key: k, Value: valStr, UpdatedAt: time.Now()})
		} else {
			pc.Value = valStr
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

// GET /api/admin/finance/locations
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

// PUT /api/admin/finance/locations/{id}
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