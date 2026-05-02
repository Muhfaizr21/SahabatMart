package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"errors"
	"fmt"
	"log"
	"gorm.io/gorm"
	"time"
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

	type ProductResult struct {
		models.Product
		InventoryStock int `json:"stock" gorm:"column:inventory_stock"`
	}
	var results []ProductResult
	var total int64

	// Build Base Query
	query := s.DB.Table("products").
		Select("products.*, inv.stock as inventory_stock").
		Joins("JOIN inventories inv ON inv.product_id = products.id").
		Where("inv.merchant_id = ?", merchantID).
		Where("products.deleted_at IS NULL")

	// Filters
	if search != "" {
		query = query.Where("products.name ILIKE ?", "%"+search+"%")
	}
	if categoryID != "" {
		var cat models.Category
		if err := s.DB.First(&cat, categoryID).Error; err == nil {
			query = query.Where("products.category = ?", cat.Name)
		}
	}
	if stockStatus == "low" {
		query = query.Where("inv.stock > 0 AND inv.stock <= 5")
	} else if stockStatus == "out" {
		query = query.Where("inv.stock <= 0")
	} else if stockStatus == "ready" {
		query = query.Where("inv.stock > 5")
	}

	// Count Total
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Pagination
	if limit <= 0 { limit = 10 }
	if page <= 1 { page = 1 }
	offset := (page - 1) * limit

	err := query.Order("products.created_at desc").Limit(limit).Offset(offset).Find(&results).Error
	if err != nil {
		log.Printf("[MerchantService] GetProducts Error: %v", err)
		return nil, err
	}
	
	if len(results) == 0 {
		var count int64
		s.DB.Table("inventories").Where("merchant_id = ?", merchantID).Count(&count)
		log.Printf("[MerchantService] DEBUG: No results found for merchant %s. Total inventory records in DB: %d", merchantID, count)
	}

	log.Printf("[MerchantService] GetProducts: merchant=%s, found=%d, total=%d", merchantID, len(results), total)

	// Convert to interface slice for easy JSON response
	final := make([]interface{}, len(results))
	for i, v := range results { final[i] = v }
	
	return map[string]interface{}{
		"data":  final,
		"total": total,
		"page":  page,
		"limit": limit,
	}, err
}

// [Akuglow Refactor] Merchants can no longer add/delete products directly.
// They "add" products to their storefront by requesting restock or being assigned by admin.
func (s *MerchantService) CreateRestockRequest(merchantID string, items []models.RestockItem) (*models.RestockRequest, error) {
	if len(items) == 0 {
		return nil, errors.New("daftar kulakan tidak boleh kosong")
	}

	totalQty := 0
	var totalAmount float64
	
	req := &models.RestockRequest{
		MerchantID: merchantID,
		Status:     "requested",
		CreatedAt:  time.Now(),
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
		return tx.Model(req).Updates(map[string]interface{}{
			"total_items": totalQty,
			"total_price": totalAmount,
		}).Error
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
		fee = 0.05 // Default platform fee
	}

	return map[string]interface{}{
		"available_balance": wallet.Balance,
		"pending_balance":   wallet.PendingBalance,
		"total_sales":       wallet.TotalEarned,
		"service_fee":       fee * 100,
	}, nil
}

func (s *MerchantService) RequestPayout(merchantID string, amount float64, note string) (*models.PayoutRequest, error) {
	financeSvc := NewFinanceService(s.DB)
	wallet, err := financeSvc.Repo.GetWalletWithLock(merchantID, models.WalletMerchant)
	if err != nil {
		return nil, err
	}

	if wallet.Balance < amount {
		return nil, errors.New("saldo tidak mencukupi")
	}

	payout := &models.PayoutRequest{
		MerchantID:  merchantID,
		Amount:      amount,
		Status:      "pending",
		Note:        note,
		RequestedAt: time.Now(),
	}

	err = s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(payout).Error; err != nil {
			return err
		}
		
		desc := fmt.Sprintf("Penarikan Dana / Payout PID:%s", payout.ID)
		if payout.ID == "" {
			desc = "Penarikan Dana / Payout"
		}

		err = financeSvc.ProcessTransaction(tx, merchantID, models.WalletMerchant, models.TxWithdrawalRequest, amount, payout.ID, "payout_request", desc)
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
	err := s.DB.Where("id = ?", merchantID).First(&m).Error
	return &m, err
}

func (s *MerchantService) UpdateStoreProfile(merchantID string, updates map[string]interface{}) (*models.Merchant, error) {
	var m models.Merchant
	if err := s.DB.Where("id = ?", merchantID).First(&m).Error; err != nil {
		return nil, err
	}

	err := s.DB.Model(&m).Updates(updates).Error
	return &m, err
}

// ── AFFILIATE STATS ────────────────────────

func (s *MerchantService) GetAffiliateStats(merchantID string) (map[string]interface{}, error) {
	var totalOrders int64
	var totalComm float64
	var totalSales float64

	s.DB.Model(&models.OrderMerchantGroup{}).
		Where("merchant_id = ? AND commission > 0", merchantID).
		Count(&totalOrders).
		Select("SUM(commission), SUM(subtotal)").
		Row().Scan(&totalComm, &totalSales)

	return map[string]interface{}{
		"affiliate_orders":      totalOrders,
		"affiliate_commissions": totalComm,
		"affiliate_sales":       totalSales,
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
		if err := financeSvc.ProcessTransaction(tx, merchantID, models.WalletMerchant, models.TxRestockPayment, -req.TotalPrice, req.ID, "restock", descPay); err != nil {
			return err
		}

		// Credit HQ
		descRev := fmt.Sprintf("Pendapatan Kulakan Merchant: %s", req.ID)
		if err := financeSvc.ProcessTransaction(tx, "system-hq", models.WalletBuyer, models.TxRestockRevenue, req.TotalPrice, req.ID, "restock", descRev); err != nil {
			return err
		}

		req.Status = "received"
		return tx.Save(&req).Error
	})
}
