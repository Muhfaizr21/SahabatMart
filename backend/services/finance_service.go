package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

type FinanceService struct {
	Repo         *repositories.FinanceRepository
	DB           *gorm.DB
	Notification *NotificationService
}

func NewFinanceService(db *gorm.DB) *FinanceService {
	notif := NewNotificationService(db)
	return &FinanceService{
		DB:           db,
		Repo:         repositories.NewFinanceRepository(db),
		Notification: notif,
	}
}

func (s *FinanceService) DistributeFunds(tx *gorm.DB, orderID string) error {
	var order models.Order
	if err := tx.Preload("MerchantGroups").First(&order, "id = ?", orderID).Error; err != nil {
		return err
	}
	
	// 0. [Financial Audit] Record TOTAL Inflow to HQ Cash Account
	descInflow := fmt.Sprintf("Pembayaran Pesanan #%s", order.OrderNumber)
	if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxSaleRevenue, order.GrandTotal, order.ID, "order", descInflow, nil); err != nil {
		return err
	}

	orderSvc := NewOrderService(tx)
	
	for _, group := range order.MerchantGroups {
		// 1. Merchant Payout
		var merchant models.Merchant
		if err := tx.First(&merchant, "id = ?", group.MerchantID).Error; err != nil {
			return err
		}

		actualPayout := group.MerchantPayout
		settleDate := time.Now().Add(24 * time.Hour) 
		
		descPayout := fmt.Sprintf("Penjualan Produk (Pesanan #%s)", order.OrderNumber)
		if err := s.ProcessTransaction(tx, merchant.UserID, models.WalletMerchant, models.TxSaleRevenue, actualPayout, order.ID, "order", descPayout, &settleDate); err != nil {
			return err
		}

		// 2. Affiliate Commission Distribution
		var orderItems []models.OrderItem
		// Filter items by Group ID to avoid double-counting
		tx.Where("order_id = ? AND order_merchant_group_id = ?", order.ID, group.ID).Find(&orderItems)
		
		for _, item := range orderItems {
			if order.AffiliateID != nil && *order.AffiliateID != "" {
				entries, err := orderSvc.DistributePresetCommissions(tx, order, item, *order.AffiliateID)
				
				if err == nil && len(entries) > 0 {
					for _, ent := range entries {
						var member models.AffiliateMember
						if err := tx.First(&member, "id = ?", ent.AffiliateID).Error; err != nil {
							continue
						}

						descComm := fmt.Sprintf("Komisi Affiliate Lvl %d - %s (Pesanan #%s)", ent.Level, item.ProductName, order.OrderNumber)
						
						holdDays := 3 
						if err := tx.Preload("Tier").First(&member, "id = ?", ent.AffiliateID).Error; err == nil {
							if member.Tier != nil {
								holdDays = member.Tier.CommissionHoldDays
							}
						}
						settleAt := time.Now().AddDate(0, 0, holdDays)

						// Use ent.CommissionID as ref for status tracking
						if err := s.ProcessTransaction(tx, member.UserID, models.WalletAffiliate, models.TxCommissionEarned, ent.Amount, ent.CommissionID, "affiliate_commission", descComm, &settleAt); err != nil {
							return err
						}
					}
					continue 
				}
			}

			// Fallback ke Global/Default
			if group.AffiliateCommission > 0 && order.AffiliateID != nil {
				var member models.AffiliateMember
				if err := tx.First(&member, "id = ?", *order.AffiliateID).Error; err == nil {
					descFallback := fmt.Sprintf("Komisi Affiliate (Pesanan #%s)", order.OrderNumber)
					if err := s.ProcessTransaction(tx, member.UserID, models.WalletAffiliate, models.TxCommissionEarned, group.AffiliateCommission, order.ID, "order_fallback_comm", descFallback, nil); err != nil {
						return err
					}
				}
			}
		}

		// 3. Platform Revenue
		revenue := group.PlatformFee
		if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxPlatformFee, revenue, order.ID, "order", "Pendapatan Layanan (Platform Fee)", nil); err != nil {
			return err
		}
	}

	return nil
}

func (s *FinanceService) GetWallet(ownerID string, ownerType models.WalletOwnerType) (*models.Wallet, error) {
	return s.Repo.GetWalletWithLock(ownerID, ownerType)
}

func (s *FinanceService) ReleaseEscrow(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, amount float64, refID string, desc string) error {
	return s.ProcessTransaction(tx, ownerID, ownerType, models.TxSaleRevenue, amount, refID, "escrow_release", desc, nil)
}

func (s *FinanceService) ProcessTransaction(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, txType models.WalletTransactionType, amount float64, refID string, refType string, desc string, settleDate *time.Time) error {
	var wallet models.Wallet
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("owner_id = ? AND owner_type = ?", ownerID, ownerType).FirstOrCreate(&wallet, models.Wallet{
		OwnerID: ownerID, OwnerType: ownerType, Balance: 0, IsActive: true,
	}).Error; err != nil {
		return err
	}

	oldBalance := wallet.Balance
	oldPending := wallet.PendingBalance
	isPending := false
	if settleDate != nil && settleDate.After(time.Now()) {
		isPending = true
	}

	if isPending {
		wallet.PendingBalance += amount
	} else {
		wallet.Balance += amount
	}

	if amount > 0 {
		wallet.TotalEarned += amount
	}

	if err := tx.Save(&wallet).Error; err != nil {
		return err
	}

	txn := &models.WalletTransaction{
		WalletID:      wallet.ID,
		Type:          txType,
		Amount:        amount,
		BalanceBefore: oldBalance,
		BalanceAfter:  wallet.Balance,
		PendingBefore: oldPending,
		PendingAfter:  wallet.PendingBalance,
		Description:   desc,
		ReferenceID:   &refID,
		ReferenceType: refType,
		IsSettled:     !isPending,
		CreatedAt:     time.Now(),
	}

	if isPending {
		txn.TargetSettlementDate = settleDate
	} else {
		now := time.Now()
		txn.SettledAt = &now
	}

	return tx.Create(txn).Error
}

func (s *FinanceService) ProcessSettlements() (int, error) {
	count := 0
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var txs []models.WalletTransaction
		now := time.Now()
		
		err := tx.Where("is_settled = ? AND target_settlement_date <= ?", false, now).Find(&txs).Error
		if err != nil {
			return err
		}

		for _, txn := range txs {
			var wallet models.Wallet
			if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&wallet, "id = ?", txn.WalletID).Error; err != nil {
				continue
			}

			wallet.PendingBalance -= txn.Amount
			wallet.Balance += txn.Amount
			
			if err := tx.Save(&wallet).Error; err != nil {
				return err
			}

			txn.IsSettled = true
			txn.SettledAt = &now
			txn.BalanceAfter = wallet.Balance
			txn.PendingAfter = wallet.PendingBalance
			
			if err := tx.Save(&txn).Error; err != nil {
				return err
			}

			// [SYNC] Update AffiliateCommission status if applicable
			if txn.ReferenceType == "affiliate_commission" && txn.ReferenceID != nil {
				tx.Model(&models.AffiliateCommission{}).Where("id = ?", *txn.ReferenceID).Update("status", models.CommissionApproved)
			}
			
			count++
			log.Printf("[Settlement] Processed txn %s for wallet %s (Amount: %.2f)", txn.ID, wallet.ID, txn.Amount)
		}

		return nil
	})
	return count, err
}

func (s *FinanceService) ReverseDistribution(tx *gorm.DB, orderID string) error {
	var txs []models.WalletTransaction
	
	// Direct order transactions
	if err := tx.Where("reference_id = ? AND reference_type IN ('order', 'order_fallback_comm')", orderID).Find(&txs).Error; err != nil {
		return err
	}

	// Commission transactions
	var commTxs []models.WalletTransaction
	// Since both are UUIDs in DB, simple join is best
	tx.Raw(`SELECT wt.* FROM wallet_transactions wt 
		    JOIN affiliate_commissions ac ON wt.reference_id = ac.id 
			WHERE ac.order_id = ? AND wt.reference_type = 'affiliate_commission'`, orderID).Scan(&commTxs)
	
	txs = append(txs, commTxs...)

	for _, txn := range txs {
		var wallet models.Wallet
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&wallet, "id = ?", txn.WalletID).Error; err != nil {
			continue
		}

		if txn.IsSettled {
			wallet.Balance -= txn.Amount
		} else {
			wallet.PendingBalance -= txn.Amount
		}
		
		if txn.Amount > 0 {
			wallet.TotalEarned -= txn.Amount
		}

		if err := tx.Save(&wallet).Error; err != nil {
			return err
		}

		revType := models.WalletTransactionType(string(txn.Type) + "_reversed")
		if txn.Type == models.TxCommissionEarned {
			revType = models.TxCommissionReversed
		} else if txn.Type == models.TxSaleRevenue {
			revType = models.TxSaleRevenueReversed
		} else if txn.Type == models.TxPlatformFee {
			revType = models.TxPlatformFeeReversed
		}

		revTxn := &models.WalletTransaction{
			WalletID:      wallet.ID,
			Type:          revType,
			Amount:        -txn.Amount,
			BalanceBefore: wallet.Balance + (func() float64 { if txn.IsSettled { return txn.Amount } else { return 0 } }()),
			BalanceAfter:  wallet.Balance,
			PendingBefore: wallet.PendingBalance + (func() float64 { if !txn.IsSettled { return txn.Amount } else { return 0 } }()),
			PendingAfter:  wallet.PendingBalance,
			Description:   fmt.Sprintf("Pembalikan: %s", txn.Description),
			ReferenceID:   txn.ReferenceID,
			ReferenceType: "order_reversal",
			IsSettled:     true,
			CreatedAt:     time.Now(),
		}
		now := time.Now()
		revTxn.SettledAt = &now

		if err := tx.Create(revTxn).Error; err != nil {
			return err
		}
	}

	// [SYNC] Mark all commissions for this order as cancelled
	tx.Model(&models.AffiliateCommission{}).Where("order_id = ?", orderID).Update("status", models.CommissionCancelled)

	return nil
}

type PlatformLedger struct {
	TotalAssets     float64
	MerchantPending float64
	AffiliatePending float64
	AdminBalance    float64
}

func (s *FinanceService) SyncPlatformLedger() (*PlatformLedger, error) {
	var ledger PlatformLedger
	
	s.DB.Model(&models.Wallet{}).Where("owner_type = ?", models.WalletAdmin).Select("COALESCE(SUM(balance), 0)").Scan(&ledger.AdminBalance)
	s.DB.Model(&models.Wallet{}).Where("owner_type = ?", models.WalletMerchant).Select("COALESCE(SUM(pending_balance), 0)").Scan(&ledger.MerchantPending)
	s.DB.Model(&models.Wallet{}).Where("owner_type = ?", models.WalletAffiliate).Select("COALESCE(SUM(pending_balance), 0)").Scan(&ledger.AffiliatePending)
	
	ledger.TotalAssets = ledger.AdminBalance + ledger.MerchantPending + ledger.AffiliatePending
	
	return &ledger, nil
}
