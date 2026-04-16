package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
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
