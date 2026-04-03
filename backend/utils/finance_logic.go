package utils

import (
	"SahabatMart/backend/models"
	"fmt"

	"gorm.io/gorm"
)

// ProcessTransaction handles the atomic update of wallet and transaction ledger (Req 3)
func ProcessTransaction(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, txType models.WalletTransactionType, amount float64, refID, refType, description string) error {
	var wallet models.Wallet
	if err := tx.FirstOrCreate(&wallet, models.Wallet{OwnerID: ownerID, OwnerType: ownerType}).Error; err != nil {
		return fmt.Errorf("failed to get or create wallet: %v", err)
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
		// Reserve balance: decrement balance, move to pending or just decrement
		if wallet.Balance < amount {
			return fmt.Errorf("insufficient balance")
		}
		wallet.Balance -= amount
		// Reserved balance stays in PayoutRequest status, not necessarily pending_balance in wallet
	case models.TxWithdrawalCompleted:
		// Just log the success
		wallet.TotalWithdrawn += amount
	case models.TxWithdrawalRejected:
		// Return reserved balance
		wallet.Balance += amount
	case models.TxRefundDeduction, models.TxCommissionReversed, models.TxSaleRevenueReversed:
		// Deduct from pending or active balance depending on order status
		// Here we assume it was in pending if recently made
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
		return fmt.Errorf("failed to save wallet: %v", err)
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
		return fmt.Errorf("failed to create transaction ledger: %v", err)
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
			tx.Model(&comm).Update("status", models.CommissionCancelled)
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

// InitializeWallet creates a fresh wallet for a new merchant or affiliate
func InitializeWallet(db *gorm.DB, ownerID string, ownerType models.WalletOwnerType) error {
	wallet := models.Wallet{
		OwnerID:   ownerID,
		OwnerType: ownerType,
	}
	return db.FirstOrCreate(&wallet, models.Wallet{OwnerID: ownerID, OwnerType: ownerType}).Error
}
