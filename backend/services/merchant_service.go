package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"errors"
	"fmt"
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

// ── PRODUCT MANAGEMENT ─────────────────────

func (s *MerchantService) GetProducts(merchantID string) ([]models.Product, error) {
	return s.Repo.GetByMerchant(merchantID)
}

func (s *MerchantService) AddProductWithVariants(product *models.Product, variants []models.ProductVariant) (*models.Product, error) {
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Save Product
		if err := tx.Create(product).Error; err != nil {
			return err
		}

		// 2. Save Variants
		for i := range variants {
			variants[i].ProductID = product.ID
			if err := tx.Create(&variants[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return product, err
}

func (s *MerchantService) UpdateProductWithVariants(merchantID string, product *models.Product, variants []models.ProductVariant) (*models.Product, error) {
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// Verify ownership
		var existing models.Product
		if err := tx.Where("id = ? AND merchant_id = ?", product.ID, merchantID).First(&existing).Error; err != nil {
			return errors.New("produk tidak ditemukan atau akses ditolak")
		}

		// 1. Update Product
		if err := tx.Model(&existing).Updates(product).Error; err != nil {
			return err
		}

		// 2. Update/Create Variants (Sync logic)
		// Simpel: Delete all old variants and insert new ones
		if err := tx.Where("product_id = ?", product.ID).Delete(&models.ProductVariant{}).Error; err != nil {
			return err
		}
		for i := range variants {
			variants[i].ProductID = product.ID
			if err := tx.Create(&variants[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return product, err
}

func (s *MerchantService) DeleteProduct(merchantID, productID string) error {
	return s.DB.Where("id = ? AND merchant_id = ?", productID, merchantID).Delete(&models.Product{}).Error
}

// ── ORDER MANAGEMENT ───────────────────────

func (s *MerchantService) GetOrders(merchantID string, status string) ([]models.OrderMerchantGroup, error) {
	var groups []models.OrderMerchantGroup
	query := s.DB.Preload("Items").Where("merchant_id = ?", merchantID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Order("created_at desc").Find(&groups).Error
	return groups, err
}

func (s *MerchantService) UpdateOrderStatus(groupID, merchantID, status, trackingNo, courierCode string) (*models.OrderMerchantGroup, error) {
	var group models.OrderMerchantGroup
	if err := s.DB.Where("id = ? AND merchant_id = ?", groupID, merchantID).First(&group).Error; err != nil {
		return nil, err
	}

	group.Status = models.MerchantOrderStatus(status)
	if trackingNo != "" {
		group.TrackingNumber = trackingNo
	}
	if courierCode != "" {
		group.CourierCode = courierCode
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
