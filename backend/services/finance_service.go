package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type FinanceService struct {
	Repo *repositories.FinanceRepository
	DB   *gorm.DB
}

func NewFinanceService(db *gorm.DB) *FinanceService {
	return &FinanceService{
		Repo: repositories.NewFinanceRepository(db),
		DB:   db,
	}
}

func (s *FinanceService) ProcessTransaction(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, txType models.WalletTransactionType, amount float64, refID, refType, description string) error {
	wallet, err := s.Repo.GetWalletWithLock(ownerID, ownerType)
	if err != nil {
		return err
	}

	balanceBefore := wallet.Balance
	pendingBefore := wallet.PendingBalance

	switch txType {
	case models.TxSaleRevenue, models.TxCommissionEarned:
		wallet.PendingBalance += amount
		wallet.TotalEarned += amount
	case models.TxWithdrawalRequest:
		if wallet.Balance < amount {
			return fmt.Errorf("saldo tidak mencukupi")
		}
		wallet.Balance -= amount
	case models.TxWithdrawalCompleted:
		wallet.TotalWithdrawn += amount
	case models.TxWithdrawalRejected:
		wallet.Balance += amount
	case models.TxRefundDeduction, models.TxCommissionReversed, models.TxSaleRevenueReversed:
		if wallet.PendingBalance >= amount {
			wallet.PendingBalance -= amount
		} else {
			wallet.Balance -= amount
		}
		wallet.TotalEarned -= amount
	default:
		wallet.Balance += amount
	}

	if err := tx.Save(wallet).Error; err != nil {
		return err
	}

	txn := &models.WalletTransaction{
		WalletID:      wallet.ID,
		Type:          txType,
		Amount:        amount,
		BalanceBefore: balanceBefore,
		BalanceAfter:  wallet.Balance,
		PendingBefore: pendingBefore,
		PendingAfter:  wallet.PendingBalance,
		Description:   description,
		ReferenceID:   refID,
		ReferenceType: refType,
	}

	return tx.Create(txn).Error
}

// DistributeFunds membagi dana ke Merchant dan Affiliate saat pesanan dibayar
func (s *FinanceService) DistributeFunds(tx *gorm.DB, orderID string) error {
	var order models.Order
	if err := tx.Preload("MerchantGroups").First(&order, "id = ?", orderID).Error; err != nil {
		return err
	}

	// 1. Distribute ke Merchant Portions
	for _, group := range order.MerchantGroups {
		desc := fmt.Sprintf("Hasil Penjualan: %s", order.OrderNumber)
		if err := s.ProcessTransaction(tx, group.MerchantID, models.WalletMerchant, models.TxSaleRevenue, group.MerchantPayout, order.ID, "order", desc); err != nil {
			return err
		}

		// 2. Record Platform Fee
		if group.PlatformFee > 0 {
			pfDesc := fmt.Sprintf("Biaya Layanan Platform: %s", order.OrderNumber)
			// Kita catat sebagai earning untuk SYSTEM (ID: system-platform)
			if err := s.ProcessTransaction(tx, "system-platform", models.WalletBuyer, models.TxPlatformFee, group.PlatformFee, order.ID, "order", pfDesc); err != nil {
				return err
			}
		}
	}

	// 3. Distribute ke Affiliate (jika ada)
	if order.AffiliateID != nil && *order.AffiliateID != "" {
		desc := fmt.Sprintf("Komisi Affiliate: %s", order.OrderNumber)
		if err := s.ProcessTransaction(tx, *order.AffiliateID, models.WalletAffiliate, models.TxCommissionEarned, order.TotalCommission, order.ID, "order", desc); err != nil {
			return err
		}
	}

	return nil
}

// ManualAdjustment memungkinkan Admin mengintervensi saldo secara manual (Credit/Debit)
func (s *FinanceService) ManualAdjustment(adminID string, targetID string, ownerType models.WalletOwnerType, amount float64, note string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		txType := models.TxAdjustment
		desc := fmt.Sprintf("Penyesuaian Admin (%s): %s", adminID, note)
		
		return s.ProcessTransaction(tx, targetID, ownerType, txType, amount, adminID, "admin_adjustment", desc)
	})
}

// MovePendingToAvailable... (previous code)
func (s *FinanceService) ProcessSettlements() error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		limitDate := time.Now().AddDate(0, 0, -7) // Settlement delay 7 hari
		
		var txs []models.WalletTransaction
		// Cari transaksi pending yang sudah melewati batas waktu dan belum di-settle
		err := tx.Where("pending_after > pending_before AND created_at < ?", limitDate).Find(&txs).Error
		if err != nil {
			return err
		}

		for _, txn := range txs {
			var wallet models.Wallet
			if err := tx.First(&wallet, "id = ?", txn.WalletID).Error; err != nil {
				continue
			}

			// Pindahkan dari pending ke balance
			amount := txn.Amount
			wallet.PendingBalance -= amount
			wallet.Balance += amount

			if err := tx.Save(&wallet).Error; err != nil {
				return err
			}

			// Update transaction status atau buat log baru
			// Di sini kita asumsikan sistem track via timestamp
		}
		return nil
	})
}

// ReleaseEscrow secara langsung menarik dana dari Pending ke Available Balance
func (s *FinanceService) ReleaseEscrow(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, amount float64, refID, desc string) error {
	wallet, err := s.Repo.GetWalletWithLock(ownerID, ownerType)
	if err != nil {
		return err
	}

	if wallet.PendingBalance < amount {
		amount = wallet.PendingBalance // safety fallback
	}

	balanceBefore := wallet.Balance
	pendingBefore := wallet.PendingBalance

	wallet.PendingBalance -= amount
	wallet.Balance += amount

	if err := tx.Save(wallet).Error; err != nil {
		return err
	}

	txn := &models.WalletTransaction{
		WalletID:      wallet.ID,
		Type:          models.TxAdjustment,
		Amount:        amount,
		BalanceBefore: balanceBefore,
		BalanceAfter:  wallet.Balance,
		PendingBefore: pendingBefore,
		PendingAfter:  wallet.PendingBalance,
		Description:   desc,
		ReferenceID:   refID,
		ReferenceType: "order_escrow",
	}

	return tx.Create(txn).Error
}
