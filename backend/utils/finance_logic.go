package utils

import (
	"SahabatMart/backend/models"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProcessTransaction handles the atomic update of wallet and transaction ledger (Req 3)
// It uses row-level locking (SELECT FOR UPDATE) to prevent race conditions.
func ProcessTransaction(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, txType models.WalletTransactionType, amount float64, refID, refType, description string) error {
	var wallet models.Wallet

	// Lock the wallet record for this transaction
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		FirstOrCreate(&wallet, models.Wallet{OwnerID: ownerID, OwnerType: ownerType}).Error; err != nil {
		return fmt.Errorf("gagal mendapatkan atau membuat dompet: %v", err)
	}

	balanceBefore := wallet.Balance
	pendingBefore := wallet.PendingBalance

	// Special handling for pending vs active balance
	switch txType {
	case models.TxSaleRevenue, models.TxCommissionEarned:
		// Move directly to pending (Requirement 7: Reserve balance)
		wallet.PendingBalance += amount
		wallet.TotalEarned += amount

	case models.TxWithdrawalRequest:
		// Reserve balance: decrement balance
		if wallet.Balance < amount {
			return fmt.Errorf("saldo tidak mencukupi: tersedia %f, butuh %f", wallet.Balance, amount)
		}
		wallet.Balance -= amount
		// Balance moves to PayoutRequest, but logically deducted from 'available'

	case models.TxWithdrawalCompleted:
		// Withdrawal successful, update total withdrawn
		wallet.TotalWithdrawn += amount

	case models.TxWithdrawalRejected:
		// Return reserved balance to available
		wallet.Balance += amount

	case models.TxRefundDeduction, models.TxCommissionReversed, models.TxSaleRevenueReversed:
		// Deduct from pending or active balance depending on availability
		if wallet.PendingBalance >= amount {
			wallet.PendingBalance -= amount
		} else {
			wallet.Balance -= amount
		}
		wallet.TotalEarned -= amount

	default:
		// Platform fee, adjustment, etc directly to balance
		wallet.Balance += amount
	}

	if err := tx.Save(&wallet).Error; err != nil {
		return fmt.Errorf("gagal memperbarui saldo dompet: %v", err)
	}

	// Create transaction record (Audit Trail)
	txn := models.WalletTransaction{
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

	if err := tx.Create(&txn).Error; err != nil {
		return fmt.Errorf("gagal membuat catatan transaksi: %v", err)
	}

	return nil
}

// ReverseTransaction automatically reverses commissions and revenue for refunds (Req 7)
func ReverseTransaction(tx *gorm.DB, orderID string, amount float64, reason string) error {
	// Find commissions related to this order
	var commissions []models.AffiliateCommission
	if err := tx.Where("order_id = ? AND status != 'cancelled'", orderID).Find(&commissions).Error; err == nil {
		for _, comm := range commissions {
			// Reverse commission for affiliate
			err := ProcessTransaction(tx, comm.AffiliateID, models.WalletAffiliate, models.TxCommissionReversed, comm.Amount, orderID, "order_refund", reason)
			if err != nil {
				return err
			}
			// Cancel commission record
			if err := tx.Model(&comm).Update("status", models.CommissionCancelled).Error; err != nil {
				return fmt.Errorf("gagal membatalkan komisi: %v", err)
			}
		}
	}

	// Find order details to reverse merchant revenue
	var orderMerchantGroups []models.OrderMerchantGroup
	if err := tx.Where("order_id = ?", orderID).Find(&orderMerchantGroups).Error; err == nil {
		for _, group := range orderMerchantGroups {
			err := ProcessTransaction(tx, group.MerchantID, models.WalletMerchant, models.TxSaleRevenueReversed, group.MerchantPayout, orderID, "order_refund", reason)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// ReleasePendingBalance moves funds from pending to available (Req 2)
func ReleasePendingBalance(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, amount float64, refID, refType string) error {
	var wallet models.Wallet
	
	// Lock the wallet record
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("owner_id = ? AND owner_type = ?", ownerID, ownerType).
		First(&wallet).Error; err != nil {
		return fmt.Errorf("dompet tidak ditemukan: %v", err)
	}

	if wallet.PendingBalance < amount {
		return fmt.Errorf("saldo tertunda tidak mencukupi untuk dicairkan: tersedia %f, butuh %f", wallet.PendingBalance, amount)
	}

	balanceBefore := wallet.Balance
	pendingBefore := wallet.PendingBalance

	wallet.PendingBalance -= amount
	wallet.Balance += amount

	if err := tx.Save(&wallet).Error; err != nil {
		return fmt.Errorf("gagal memperbarui pemindahan saldo: %v", err)
	}

	// Create transaction record for the release
	txn := models.WalletTransaction{
		WalletID:      wallet.ID,
		Type:          "pending_released",
		Amount:        amount,
		BalanceBefore: balanceBefore,
		BalanceAfter:  wallet.Balance,
		PendingBefore: pendingBefore,
		PendingAfter:  wallet.PendingBalance,
		Description:   fmt.Sprintf("Pencairan dana dari saldo tertunda untuk %s: %s", refType, refID),
		ReferenceID:   refID,
		ReferenceType: refType,
	}

	if err := tx.Create(&txn).Error; err != nil {
		return fmt.Errorf("gagal mencatat riwayat pencairan: %v", err)
	}

	return nil
}

// InitializeWallet creates a fresh wallet for a new merchant or affiliate
func InitializeWallet(db *gorm.DB, ownerID string, ownerType models.WalletOwnerType) error {
	wallet := models.Wallet{
		OwnerID:   ownerID,
		OwnerType: ownerType,
	}
	return db.FirstOrCreate(&wallet, models.Wallet{OwnerID: ownerID, OwnerType: ownerType}).Error
}
