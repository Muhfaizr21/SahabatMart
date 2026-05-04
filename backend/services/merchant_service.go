package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"errors"
	"fmt"
	"log"
	"strconv"
	"gorm.io/gorm"
	"time"
	"github.com/google/uuid"
)

type MerchantService struct {
	DB   *gorm.DB
	Repo *repositories.ProductRepository
}

func NewMerchantService(db *gorm.DB) *MerchantService {
	return &MerchantService{
		DB:   db,
		Repo: repositories.NewProductRepository(db),
	}
}

func (s *MerchantService) GetCatalog(search string) ([]models.Product, error) {
	var products []models.Product
	query := s.DB.Where("status = ? AND is_master = ?", "active", true)
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	err := query.Find(&products).Error
	return products, err
}

// ── PRODUCT MANAGEMENT ─────────────────────

func (s *MerchantService) GetProducts(merchantID string, search, categoryID, stockStatus string, page, limit int) (map[string]interface{}, error) {
	if merchantID == "" || merchantID == "undefined" {
		return nil, fmt.Errorf("merchant identity not found or invalid")
	}

	// ProductResult helps in combining product data with merchant-specific inventory stock
	type ProductResult struct {
		models.Product
		Stock int `json:"stock" gorm:"column:inventory_stock"` // Override Product.Stock with Inventory Stock
	}
	var results []ProductResult
	var total int64

	// Use Session to ensure clean query state for multiple calls (Count & Find)
	baseQuery := s.DB.Session(&gorm.Session{}).Table("products").
		Joins("JOIN inventories inv ON inv.product_id = products.id").
		Where("inv.merchant_id = ?", merchantID).
		Where("products.deleted_at IS NULL")

	// Apply Filters to baseQuery
	if search != "" {
		baseQuery = baseQuery.Where("products.name ILIKE ?", "%"+search+"%")
	}
	
	if categoryID != "" && categoryID != "0" && categoryID != "all" {
		var cat models.Category
		if err := s.DB.First(&cat, categoryID).Error; err == nil {
			// Filtering by category name because Product stores category as string
			// Use ILIKE for case-insensitive matching (e.g. 'Eye Care' vs 'EYE CARE')
			baseQuery = baseQuery.Where("products.category ILIKE ?", cat.Name)
		}
	}

	if stockStatus != "" && stockStatus != "all" {
		if stockStatus == "low" {
			baseQuery = baseQuery.Where("COALESCE(inv.stock, 0) > 0 AND COALESCE(inv.stock, 0) <= 5")
		} else if stockStatus == "out" {
			baseQuery = baseQuery.Where("COALESCE(inv.stock, 0) <= 0")
		} else if stockStatus == "ready" {
			baseQuery = baseQuery.Where("COALESCE(inv.stock, 0) > 5")
		}
	}

	// Count Total (using a separate clone of the query)
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	// Pagination
	if limit <= 0 { limit = 10 }
	if page <= 1 { page = 1 }
	offset := (page - 1) * limit

	// Execute Final Query
	err := baseQuery.Select("products.*, inv.stock as inventory_stock").
		Order("products.created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&results).Error

	if err != nil {
		log.Printf("[MerchantService] GetProducts Error: %v", err)
		return nil, err
	}

	log.Printf("[MerchantService] GetProducts: merchant=%s, found=%d, total=%d, filter(cat=%s, stock=%s)", 
		merchantID, len(results), total, categoryID, stockStatus)

	return map[string]interface{}{
		"data":  results,
		"total": total,
		"page":  page,
		"limit": limit,
	}, nil
}

// [Akuglow Refactor] Merchants can no longer add/delete products directly.
// They "add" products to their storefront by requesting restock or being assigned by admin.
func (s *MerchantService) CreateRestockRequest(merchantID string, items []models.RestockItem, paymentMethod string) (*models.RestockRequest, error) {
	if len(items) == 0 {
		return nil, errors.New("daftar kulakan tidak boleh kosong")
	}

	totalQty := 0
	var totalAmount float64
	
	req := &models.RestockRequest{
		MerchantID:    merchantID,
		Status:        "requested",
		PaymentMethod: paymentMethod,
		CreatedAt:     time.Now(),
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Create Request Header
		if err := tx.Create(req).Error; err != nil {
			return err
		}

		// 2. Process Items
		for i := range items {
			var prod models.Product
			if err := tx.First(&prod, "id = ?", items[i].ProductID).Error; err != nil {
				return fmt.Errorf("produk %s tidak ditemukan", items[i].ProductID)
			}
			
			// [Financial Audit Fix] Use WholesalePrice for B2B transactions
			// Fallback order: WholesalePrice -> COGS -> 80% Retail Price
			items[i].RestockID = req.ID
			items[i].UnitPrice = prod.WholesalePrice
			if items[i].UnitPrice <= 0 {
				items[i].UnitPrice = prod.COGS
			}
			if items[i].UnitPrice <= 0 {
				items[i].UnitPrice = prod.Price * 0.8 // Default 20% margin for merchant
			}
			items[i].Subtotal = items[i].UnitPrice * float64(items[i].Quantity)
			
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}
			
			totalQty += items[i].Quantity
			totalAmount += items[i].Subtotal
		}

		// 3. Update Header with Totals
		if err := tx.Model(req).Updates(map[string]interface{}{
			"total_items": totalQty,
			"total_price": totalAmount,
		}).Error; err != nil {
			return err
		}

		// 4. Handle Wallet Payment
		if paymentMethod == "wallet" {
			financeSvc := NewFinanceService(s.DB)
			// Deduct balance
			desc := fmt.Sprintf("Pembayaran Restock / Kulakan: %s", req.ID)
			err := financeSvc.ProcessTransaction(tx, merchantID, models.WalletMerchant, models.TxRestockPayment, -totalAmount, req.ID, "restock_request", desc, nil)
			if err != nil {
				return fmt.Errorf("saldo tidak mencukupi untuk pembayaran wallet: %v", err)
			}
			
			// HQ receives money (system-hq)
			err = financeSvc.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxRestockRevenue, totalAmount, req.ID, "restock_request", "Penerimaan Kulakan Merchant: "+merchantID, nil)
			if err != nil {
				return err
			}

			// Update request as paid
			if err := tx.Model(req).Update("is_paid", true).Error; err != nil {
				return err
			}
		}

		return nil
	})
	
	var finalReq models.RestockRequest
	if err == nil {
		s.DB.Preload("Items").First(&finalReq, "id = ?", req.ID)
	}
	return &finalReq, err
}

func (s *MerchantService) GetRestockRequests(merchantID string) ([]models.RestockRequest, error) {
	var requests []models.RestockRequest
	err := s.DB.Preload("Items.Product").Where("merchant_id = ?", merchantID).Order("created_at desc").Find(&requests).Error
	return requests, err
}

// ── ORDER MANAGEMENT ───────────────────────

func (s *MerchantService) GetOrders(merchantID string, status string, page, limit int) (map[string]interface{}, error) {
	var groups []models.OrderMerchantGroup
	var total int64

	query := s.DB.Model(&models.OrderMerchantGroup{}).Where("merchant_id = ?", merchantID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	if limit <= 0 { limit = 10 }
	if page <= 0 { page = 1 }
	offset := (page - 1) * limit

	err := query.Preload("Items").Order("created_at desc").Limit(limit).Offset(offset).Find(&groups).Error
	
	return map[string]interface{}{
		"data": groups,
		"total": total,
		"page": page,
		"limit": limit,
	}, err
}

func (s *MerchantService) UpdateOrderStatus(groupID, merchantID, status, trackingNo, courierCode string) (*models.OrderMerchantGroup, error) {
	var group models.OrderMerchantGroup
	if err := s.DB.Where("id = ? AND merchant_id = ?", groupID, merchantID).First(&group).Error; err != nil {
		return nil, err
	}

	oldStatus := string(group.Status)
	group.Status = models.MerchantOrderStatus(status)
	if trackingNo != "" {
		group.TrackingNumber = trackingNo
	}
	if courierCode != "" {
		group.CourierCode = courierCode
	}

	// Trigger Biteship Order Creation when confirmed
	if status == string(models.MOrderConfirmed) && oldStatus != status {
		var order models.Order
		if err := s.DB.First(&order, "id = ?", group.OrderID).Error; err == nil {
			shippingSvc := NewShippingService(s.DB)
			biteshipOrderID, waybill, err := shippingSvc.CreateOrder(order, group)
			if err == nil {
				group.BiteshipOrderID = biteshipOrderID
				group.TrackingNumber = waybill
			} else {
				log.Printf("[Shipping] Error creating Biteship order for Group %s: %v", groupID, err)
				// Option: fail the status update or just log it
				return nil, fmt.Errorf("gagal membuat pengiriman Biteship: %v", err)
			}
		}
	}

	if status == string(models.MOrderShipped) {
		now := time.Now()
		group.ShippedAt = &now
	}

	err := s.DB.Save(&group).Error
	return &group, err
}

// ── WALLET & PAYOUT ────────────────────────

func (s *MerchantService) GetWallet(merchantID string) (map[string]interface{}, error) {
	var merchant models.Merchant
	if err := s.DB.Where("id = ?", merchantID).First(&merchant).Error; err != nil {
		return nil, err
	}

	financeSvc := NewFinanceService(s.DB)
	wallet, err := financeSvc.Repo.GetWalletWithLock(merchantID, models.WalletMerchant)
	if err != nil {
		return nil, err
	}

	var comm models.MerchantCommission
	s.DB.Where("merchant_id = ?", merchantID).First(&comm)
	fee := comm.FeePercent
	if fee == 0 {
		var config models.PlatformConfig
		if err := s.DB.Where("key = ?", "default_platform_fee").First(&config).Error; err == nil {
			val, _ := strconv.ParseFloat(config.Value, 64)
			fee = val
		} else {
			fee = 0.05 // Ultimate fallback
		}
	}

	// If fee is from config (e.g. "5"), it's already a percentage. 
	// If it was stored as "0.05", we normalize it.
	displayFee := fee
	if displayFee < 1 && displayFee > 0 {
		displayFee = displayFee * 100
	}

	return map[string]interface{}{
		"available_balance": wallet.Balance,
		"pending_balance":   wallet.PendingBalance,
		"total_sales":       wallet.TotalEarned,
		"service_fee":       displayFee,
	}, nil
}

func (s *MerchantService) RequestPayout(merchantID string, amount float64, note string, bankName, accNo, accName string) (*models.PayoutRequest, error) {
	financeSvc := NewFinanceService(s.DB)
	wallet, err := financeSvc.Repo.GetWalletWithLock(merchantID, models.WalletMerchant)
	if err != nil {
		return nil, err
	}

	if wallet.Balance < amount {
		return nil, errors.New("saldo tidak mencukupi")
	}

	// [Financial Integrity] Min withdrawal check from config
	configSvc := NewConfigService(s.DB)
	minWithdrawal := configSvc.GetFloat("payout_min_amount", 50000.0)
	if amount < minWithdrawal {
		return nil, fmt.Errorf("minimum penarikan adalah Rp %.0f", minWithdrawal)
	}

	payout := &models.PayoutRequest{
		ID:                uuid.New().String(),
		MerchantID:        merchantID,
		Amount:            amount,
		BankName:          bankName,
		BankAccountNumber: accNo,
		BankAccountName:   accName,
		Status:            "pending",
		Note:              note,
		RequestedAt:       time.Now(),
	}

	err = s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(payout).Error; err != nil {
			return err
		}
		
		desc := fmt.Sprintf("Penarikan Dana / Payout PID:%s", payout.ID)
		if payout.ID == "" {
			desc = "Penarikan Dana / Payout"
		}

		err = financeSvc.ProcessTransaction(tx, merchantID, models.WalletMerchant, models.TxWithdrawalRequest, amount, payout.ID, "payout_request", desc, nil)
		if err != nil {
			return err
		}

		return nil
	})

	// Add payout.ID generated to description if possible?
	if payout.ID != "" {
		desc := fmt.Sprintf("Penarikan Dana / Payout PID:%s", payout.ID)
		s.DB.Model(&models.WalletTransaction{}).Where("reference_id = ? AND type = ?", payout.ID, models.TxWithdrawalRequest).Update("description", desc)
	}

	return payout, err
}

func (s *MerchantService) GetPayoutHistory(merchantID string) ([]models.PayoutRequest, error) {
	var history []models.PayoutRequest
	err := s.DB.Where("merchant_id = ?", merchantID).Order("requested_at desc").Find(&history).Error
	return history, err
}

func (s *MerchantService) GetWalletTransactions(merchantID string, limit int) ([]models.WalletTransaction, error) {
	var wallet models.Wallet
	if err := s.DB.Where("owner_id = ? AND owner_type = ?", merchantID, models.WalletMerchant).First(&wallet).Error; err != nil {
		return nil, err
	}

	var txs []models.WalletTransaction
	err := s.DB.Where("wallet_id = ?", wallet.ID).Order("created_at desc").Limit(limit).Find(&txs).Error
	return txs, err
}

// ── VOUCHERS ───────────────────────────────

func (s *MerchantService) GetVouchers(merchantID string) ([]models.Voucher, error) {
	var vouchers []models.Voucher
	err := s.DB.Where("merchant_id = ?", merchantID).Find(&vouchers).Error
	return vouchers, err
}

func (s *MerchantService) UpsertVoucher(v *models.Voucher) (*models.Voucher, error) {
	err := s.DB.Save(v).Error
	return v, err
}

func (s *MerchantService) DeleteVoucher(merchantID, id string) error {
	return s.DB.Where("id = ? AND merchant_id = ?", id, merchantID).Delete(&models.Voucher{}).Error
}

// ── DISPUTES ───────────────────────────────

func (s *MerchantService) GetDisputes(merchantID string) ([]models.Dispute, error) {
	var disputes []models.Dispute
	err := s.DB.Where("merchant_id = ?", merchantID).Order("created_at desc").Find(&disputes).Error
	return disputes, err
}

func (s *MerchantService) RespondDispute(merchantID string, disputeID uint, response string, note string) (*models.Dispute, error) {
	var d models.Dispute
	if err := s.DB.Where("id = ? AND merchant_id = ?", disputeID, merchantID).First(&d).Error; err != nil {
		return nil, err
	}

	if response == "accept" {
		d.Status = "refund_approved"
	} else {
		d.Status = "merchant_refused"
	}
	d.DecisionNote = note

	err := s.DB.Save(&d).Error
	return &d, err
}

// ── STORE PROFILE ──────────────────────────

func (s *MerchantService) GetStoreProfile(merchantID string) (*models.Merchant, error) {
	var m models.Merchant
	if err := s.DB.Where("id = ?", merchantID).First(&m).Error; err != nil {
		return nil, err
	}

	// Fallback JoinedAt jika masih kosong/zero (0001-01-01)
	if m.JoinedAt.IsZero() {
		m.JoinedAt = m.CreatedAt
	}

	// 1. Sinkronisasi Total Sales dari OrderMerchantGroup (Live Calculation)
	var totalSales float64
	s.DB.Model(&models.OrderMerchantGroup{}).
		Where("merchant_id = ? AND status IN ?", merchantID, []string{"completed", "confirmed", "shipped", "paid"}).
		Select("COALESCE(SUM(subtotal), 0)").
		Scan(&totalSales)
	m.TotalSales = totalSales

	// 2. Sinkronisasi Balance dari Wallet (Source of Truth)
	var balance float64
	s.DB.Table("wallets").
		Where("owner_id = ? AND owner_type = ?", merchantID, models.WalletMerchant).
		Select("COALESCE(balance, 0)").
		Scan(&balance)
	m.Balance = balance

	return &m, nil
}

func (s *MerchantService) UpdateStoreProfile(merchantID string, updates map[string]interface{}) (*models.Merchant, error) {
	var m models.Merchant
	if err := s.DB.Where("id = ?", merchantID).First(&m).Error; err != nil {
		return nil, err
	}

	// Proteksi field finansial agar tidak bisa diubah via update profil
	delete(updates, "balance")
	delete(updates, "total_sales")
	delete(updates, "user_id")
	delete(updates, "id")

	err := s.DB.Model(&m).Updates(updates).Error
	return &m, err
}

// ── AFFILIATE STATS ────────────────────────

func (s *MerchantService) GetDetailedAnalytics(merchantID string, year int) (map[string]interface{}, error) {
	var totalOrders int64
	var totalSales float64
	var totalNet float64
	
	var affOrders int64
	var affComm float64
	var affSales float64
	var affNet float64

	// 1. General Stats
	s.DB.Model(&models.OrderMerchantGroup{}).
		Where("merchant_id = ?", merchantID).
		Count(&totalOrders).
		Select("SUM(subtotal), SUM(merchant_payout)").
		Row().Scan(&totalSales, &totalNet)

	// 2. Affiliate Specific
	s.DB.Model(&models.OrderMerchantGroup{}).
		Where("merchant_id = ? AND commission > 0", merchantID).
		Count(&affOrders).
		Select("SUM(commission), SUM(subtotal), SUM(merchant_payout)").
		Row().Scan(&affComm, &affSales, &affNet)

	// 3. Monthly Chart Data
	type MonthlyData struct {
		Month int
		Count int64
		Sales float64
	}
	var monthlyResults []MonthlyData
	
	s.DB.Model(&models.OrderMerchantGroup{}).
		Select("EXTRACT(MONTH FROM created_at) as month, COUNT(*) as count, SUM(subtotal) as sales").
		Where("merchant_id = ? AND EXTRACT(YEAR FROM created_at) = ?", merchantID, year).
		Group("month").
		Order("month").
		Scan(&monthlyResults)

	chartData := make([]map[string]interface{}, 12)
	for i := 0; i < 12; i++ {
		chartData[i] = map[string]interface{}{
			"month": i + 1,
			"count": 0,
			"sales": 0,
		}
	}
	for _, res := range monthlyResults {
		if res.Month >= 1 && res.Month <= 12 {
			chartData[res.Month-1]["count"] = res.Count
			chartData[res.Month-1]["sales"] = res.Sales
		}
	}

	return map[string]interface{}{
		"total_orders":          totalOrders,
		"total_sales":           totalSales,
		"total_net_sales":       totalNet,
		"affiliate_orders":      affOrders,
		"affiliate_commissions": affComm,
		"affiliate_sales":       affSales,
		"affiliate_net_sales":   affNet,
		"chart_data":            chartData,
	}, nil
}

func (s *MerchantService) ReceiveRestock(merchantID, requestID string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var req models.RestockRequest
		if err := tx.Preload("Items").First(&req, "id = ? AND merchant_id = ?", requestID, merchantID).Error; err != nil {
			return err
		}

		if req.Status != "shipped" {
			return fmt.Errorf("hanya restock yang sudah dikirim yang dapat diterima (Status saat ini: %s)", req.Status)
		}

		// 1. Update Inventory & Log Mutation
		for _, item := range req.Items {
			var prod models.Product
			tx.First(&prod, "id = ?", item.ProductID)

			var inv models.Inventory
			err := tx.Where("merchant_id = ? AND product_id = ?", merchantID, item.ProductID).First(&inv).Error
			
			stockBefore := 0
			if err == nil { stockBefore = inv.Stock }

			if errors.Is(err, gorm.ErrRecordNotFound) {
				inv = models.Inventory{
					MerchantID:    merchantID,
					ProductID:     item.ProductID,
					Stock:         item.Quantity,
					BasePrice:     prod.Price,
					LastSyncPrice: time.Now(),
				}
				if err := tx.Create(&inv).Error; err != nil { return err }
			} else if err == nil {
				if err := tx.Model(&inv).Updates(map[string]interface{}{
					"stock":           gorm.Expr("stock + ?", item.Quantity),
					"base_price":      prod.Price,
					"last_sync_price": time.Now(),
				}).Error; err != nil { return err }
				inv.Stock += item.Quantity // For mutation log
			} else {
				return err
			}

			// LOG MUTATION (Mata Elang) - Tracking Stock IN at Merchant
			tx.Create(&models.StockMutation{
				ProductID:   item.ProductID,
				MerchantID:  merchantID,
				Type:        "RESTOCK_IN",
				Quantity:    item.Quantity,
				Reference:   req.ID,
				StockBefore: stockBefore,
				StockAfter:  inv.Stock,
				Note:        "Received from Pusat (Restock)",
			})
		}

		// 2. Financial Transaction (Merchant pays HQ)
		financeSvc := NewFinanceService(tx)
		
		// Debit Merchant
		descPay := fmt.Sprintf("Pembayaran Kulakan: %s", req.ID)
		if err := financeSvc.ProcessTransaction(tx, merchantID, models.WalletMerchant, models.TxRestockPayment, -req.TotalPrice, req.ID, "restock", descPay, nil); err != nil {
			return err
		}

		// Credit HQ
		descRev := fmt.Sprintf("Pendapatan Kulakan Merchant: %s", req.ID)
		if err := financeSvc.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxRestockRevenue, req.TotalPrice, req.ID, "restock", descRev, nil); err != nil {
			return err
		}

		req.Status = "received"
		return tx.Save(&req).Error
	})
}
