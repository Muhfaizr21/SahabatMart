package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"encoding/json"
	"fmt"
	"log"
	"math"
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
	
	// 1. [TOTAL INFLOW] Customer pays FULL amount to HQ
	descInflow := fmt.Sprintf("Penerimaan Pembayaran Pesanan #%s", order.OrderNumber)
	if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxSaleRevenue, order.GrandTotal, order.ID, "order", descInflow, nil); err != nil {
		return err
	}

	orderSvc := NewOrderService(tx)
	
	for _, group := range order.MerchantGroups {
		// 2. [ALLOCATION] Payout to Merchant
		var merchant models.Merchant
		if err := tx.First(&merchant, "id = ?", group.MerchantID).Error; err != nil {
			return err
		}

		actualPayout := group.MerchantPayout
		settleDate := time.Now().Add(24 * time.Hour) 
		
		descPayout := fmt.Sprintf("Bagi Hasil Penjualan (Pesanan #%s)", order.OrderNumber)
		
		// Debit Admin (Source)
		descDebitAdmin := fmt.Sprintf("Alokasi Penjualan Merchant %s (Pesanan #%s)", merchant.StoreName, order.OrderNumber)
		if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxPayoutOutflow, -actualPayout, order.ID, "order", descDebitAdmin, nil); err != nil {
			return err
		}

		// Credit Merchant (Destination)
		if err := s.ProcessTransaction(tx, merchant.UserID, models.WalletMerchant, models.TxSaleRevenue, actualPayout, order.ID, "order", descPayout, &settleDate); err != nil {
			return err
		}

		// 3. [ALLOCATION] Affiliate Commission Distribution
		var orderItems []models.OrderItem
		// Filter items by Group ID to avoid double-counting
		tx.Where("order_id = ? AND order_merchant_group_id = ?", order.ID, group.ID).Find(&orderItems)
		
		for _, item := range orderItems {
			presetDistributed := false
			if order.AffiliateID != nil && *order.AffiliateID != "" {
				entries, err := orderSvc.DistributePresetCommissions(tx, order, item, *order.AffiliateID)
				
				if err == nil && len(entries) > 0 {
					presetDistributed = true
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

						// Debit Admin (Source)
						descDebitComm := fmt.Sprintf("Alokasi Komisi Affiliate %s (Pesanan #%s)", member.RefCode, order.OrderNumber)
						if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxPayoutOutflow, -ent.Amount, ent.CommissionID, "affiliate_commission", descDebitComm, nil); err != nil {
							return err
						}

						// Credit Affiliate (Destination)
						if err := s.ProcessTransaction(tx, member.UserID, models.WalletAffiliate, models.TxCommissionEarned, ent.Amount, ent.CommissionID, "affiliate_commission", descComm, &settleAt); err != nil {
							return err
						}
					}
				}
			}

			// Fallback ke Global/Default jika tidak menggunakan preset
			if !presetDistributed && item.CommissionAmount > 0 && order.AffiliateID != nil {
				var member models.AffiliateMember
				if tx.First(&member, "id = ?", *order.AffiliateID).Error == nil {
					descFallback := fmt.Sprintf("Komisi Affiliate - %s (Pesanan #%s)", item.ProductName, order.OrderNumber)
					
					holdDays := 3
					if err := tx.Preload("Tier").First(&member, "id = ?", *order.AffiliateID).Error; err == nil {
						if member.Tier != nil {
							holdDays = member.Tier.CommissionHoldDays
						}
					}
					settleAt := time.Now().AddDate(0, 0, holdDays)

					// Create AffiliateCommission record so it appears in the dashboard
					commRecord := models.AffiliateCommission{
						AffiliateID: *order.AffiliateID,
						OrderID:     order.ID,
						OrderItemID: item.ID,
						ProductID:   item.ProductID,
						MerchantID:  item.MerchantID,
						GrossAmount: item.Subtotal,
						RateApplied: item.CommissionRate, // This might be 0 if we use nominal, but it's fine for tracking
						Amount:      item.CommissionAmount,
						Status:      models.CommissionPending,
						HoldUntil:   &settleAt,
					}
					if err := tx.Create(&commRecord).Error; err == nil {
						// Debit Admin
						descDebitFallback := fmt.Sprintf("Alokasi Komisi Affiliate Fallback (Pesanan #%s)", order.OrderNumber)
						if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxPayoutOutflow, -item.CommissionAmount, commRecord.ID, "affiliate_commission", descDebitFallback, nil); err != nil {
							return err
						}

						// Credit Affiliate
						if err := s.ProcessTransaction(tx, member.UserID, models.WalletAffiliate, models.TxCommissionEarned, item.CommissionAmount, commRecord.ID, "affiliate_commission", descFallback, &settleAt); err != nil {
							return err
						}
					}
				}
			}
		}
	}

	// NOTE: The remaining balance in Admin wallet is the Net Platform Revenue (Platform Fees + Tax + etc).
	// No need for a separate TxPlatformFee credit unless we want to move it to another internal wallet.

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

	if txType == models.TxShoppingPayment {
		wallet.ShoppingBalance += amount // amount should be negative for payments
	} else if isPending {
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

	// [Financial Sync] Auto-Sync Revenue/Outflow to Primary Bank Location
	// If this is an inflow/outflow to Admin (Platform Revenue), update physical bank balance
	if ownerType == models.WalletAdmin {
		// INFLOW: Real money coming into the system
		isPlatformInflow := amount > 0 && (txType == models.TxSaleRevenue || txType == models.TxRestockRevenue || txType == models.TxPlatformFee)
		
		// OUTFLOW: Physical money leaving the system (Withdrawals/Payouts)
		// We ignore internal allocations (refType 'order' or 'affiliate_commission') because those are just digital moves
		isPhysicalOutflow := amount < 0 && txType == models.TxPayoutOutflow && 
			refType != "order" && refType != "affiliate_commission"

		if isPlatformInflow || isPhysicalOutflow {
			// Find primary financial location (e.g. Bank BCA)
			var primaryLoc models.FinancialLocation
			if err := tx.Where("is_primary = ?", true).First(&primaryLoc).Error; err == nil {
				tx.Model(&primaryLoc).Update("balance", gorm.Expr("balance + ?", amount))
				
				// Record mutation for audit trail
				now := time.Now()
				mutType := "income"
				mutCat := "Pendapatan Real-time"
				if amount < 0 {
					mutType = "expense"
					mutCat = "Pengeluaran Payout"
				}

				tx.Create(&models.MoneyMutation{
					ToLocationID: &primaryLoc.ID,
					Amount:       math.Abs(amount),
					Category:     mutCat,
					Description:  fmt.Sprintf("Auto-Sync: %s", desc),
					Type:         mutType,
					Status:       "processed",
					CreatedAt:    now,
					ProcessedAt:  &now,
				})
			}

			// [SNAPSHOT] Record exact allocation breakdown for this transaction
			if isPlatformInflow {
				s.RecordTransactionAllocation(tx, amount, refID, refType)
			}
		}
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
	var affiliatesToUpgrade []string

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var txs []models.WalletTransaction
		now := time.Now()
		
		err := tx.Where("is_settled = ? AND target_settlement_date IS NOT NULL AND target_settlement_date <= ?", false, now).Find(&txs).Error
		if err != nil {
			return err
		}

		for _, txn := range txs {
			var wallet models.Wallet
			if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&wallet, "id = ?", txn.WalletID).Error; err != nil {
				continue
			}

			if txn.Type == models.TxCommissionEarned && wallet.OwnerType == models.WalletAffiliate {
				configSvc := NewConfigService(tx)
				withdrawPct := configSvc.GetFloat("affiliate_withdraw_pct", 70) / 100.0
				shoppingPct := configSvc.GetFloat("affiliate_shopping_pct", 30) / 100.0

				withdrawableAmt := txn.Amount * withdrawPct
				shoppingAmt := txn.Amount * shoppingPct

				wallet.PendingBalance -= txn.Amount
				wallet.Balance += withdrawableAmt
				wallet.ShoppingBalance += shoppingAmt
			} else {
				wallet.PendingBalance -= txn.Amount
				wallet.Balance += txn.Amount
			}
			
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
				
				// [Akuglow Sync] Kumpulkan ID affiliate untuk trigger kalkulasi setelah TX selesai
				if wallet.OwnerType == models.WalletAffiliate {
					var member models.AffiliateMember
					if tx.Where("user_id = ?", wallet.OwnerID).First(&member).Error == nil {
						affiliatesToUpgrade = append(affiliatesToUpgrade, member.ID)
					}
				}
			}
			
			count++
			log.Printf("[Settlement] Processed txn %s for wallet %s (Amount: %.2f)", txn.ID, wallet.ID, txn.Amount)
		}

		return nil
	})

	// Run upgrades asynchronously AFTER transaction commits to prevent blocking
	if err == nil && len(affiliatesToUpgrade) > 0 {
		go func(ids []string) {
			affSvc := NewAffiliateService(s.DB, nil)
			for _, id := range ids {
				_ = affSvc.TriggerTierUpgrade(id)
			}
		}(affiliatesToUpgrade)
	}

	return count, err
}

// UpdateSettlementDatesOnDelivery memperbarui target_settlement_date saat barang sampai.
// Ini memastikan dana merchant cair tepat X jam setelah barang diterima pembeli.
func (s *FinanceService) UpdateSettlementDatesOnDelivery(tx *gorm.DB, orderID string) error {
	configSvc := NewConfigService(tx)
	merchantSettleHours := configSvc.GetInt("settlement_merchant_hours", 24)
	
	newSettleDate := time.Now().Add(time.Duration(merchantSettleHours) * time.Hour)
	
	// Cari semua transaksi merchant terkait order ini yang masih pending
	return tx.Model(&models.WalletTransaction{}).
		Where("reference_id = ? AND reference_type = 'order' AND is_settled = ?", orderID, false).
		Update("target_settlement_date", newSettleDate).Error
}


func (s *FinanceService) ReverseDistribution(tx *gorm.DB, orderID string) error {
	// [Idempotency] Check if already reversed
	var existingRev models.WalletTransaction
	if err := tx.Where("reference_id = ? AND reference_type = 'order_reversal'", orderID).First(&existingRev).Error; err == nil {
		log.Printf("⚠️ Order %s already reversed, skipping ReverseDistribution", orderID)
		return nil
	}

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

		// [BUG-C1 Fix] Balikkan saldo fisik bank (FinancialLocation) secara simetris.
		// Saat DistributeFunds: inflow (+GrandTotal) DAN payout outflow (-MerchantPayout)
		// keduanya mempengaruhi bank. Reversal HARUS membalikkan keduanya.
		// Kondisi lama (txn.Amount > 0 saja) melewatkan reversal untuk payout outflow.
		if wallet.OwnerType == models.WalletAdmin {
			// Tentukan apakah transaksi ini pernah menyentuh saldo bank fisik saat distribusi.
			// INFLOW: penerimaan dari customer (Amount > 0, TxSaleRevenue/TxPlatformFee)
			wasPhysicalInflow := txn.Amount > 0 && (txn.Type == models.TxSaleRevenue || txn.Type == models.TxRestockRevenue || txn.Type == models.TxPlatformFee)
			// OUTFLOW fisik: hanya payout yang sudah keluar nyata (withdrawal final)
			// Catatan: PayoutOutflow dengan refType 'order' atau 'affiliate_commission' adalah
			// transfer digital internal, BUKAN uang yang sudah keluar ke bank pihak luar.
			// Sehingga tidak perlu di-reverse di FinancialLocation.
			// Hanya PayoutOutflow dengan refType lain (withdrawal nyata) yang perlu di-reverse.
			wasPhysicalOutflow := txn.Amount < 0 && txn.Type == models.TxPayoutOutflow &&
				txn.ReferenceType != "order" && txn.ReferenceType != "affiliate_commission" && txn.ReferenceType != "order_reversal"

			if wasPhysicalInflow || wasPhysicalOutflow {
				var primaryLoc models.FinancialLocation
				if err := tx.Where("is_primary = ?", true).First(&primaryLoc).Error; err == nil {
					// Balikkan: kurangi inflow, tambah outflow (karena kita sedang membalik)
					tx.Model(&primaryLoc).Update("balance", gorm.Expr("balance - ?", txn.Amount))

					// Record reversal mutation untuk audit trail
					now := time.Now()
					mutLabel := "Pembalikan Pendapatan"
					if wasPhysicalOutflow {
						mutLabel = "Pembalikan Pengeluaran"
					}
					tx.Create(&models.MoneyMutation{
						ToLocationID: &primaryLoc.ID,
						Amount:       math.Abs(txn.Amount),
						Category:     mutLabel,
						Description:  fmt.Sprintf("Auto-Reverse: %s", txn.Description),
						Type:         "expense",
						Status:       "processed",
						CreatedAt:    now,
						ProcessedAt:  &now,
					})
				}
			}
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

// RecordTransactionAllocation snapshots the profit distribution configuration for a specific transaction.
func (s *FinanceService) RecordTransactionAllocation(tx *gorm.DB, gross float64, refID, refType string) {
	var dsCfg, psCfg models.PlatformConfig
	var dsList, psList []map[string]interface{}
	if err := tx.Where("key = ?", "finance_data_saving_list").First(&dsCfg).Error; err == nil {
		json.Unmarshal([]byte(dsCfg.Value), &dsList)
	}
	if err := tx.Where("key = ?", "finance_profit_share_list").First(&psCfg).Error; err == nil {
		json.Unmarshal([]byte(psCfg.Value), &psList)
	}

	allocMap := make(map[string]float64)
	totalSaving := 0.0
	for _, it := range dsList {
		pct, _ := it["percent"].(float64)
		val := gross * pct / 100.0
		allocMap[it["name"].(string)] = val
		totalSaving += val
	}
	netProfit := gross - totalSaving
	totalPSValue := 0.0
	for _, it := range psList {
		pct, _ := it["percent"].(float64)
		val := netProfit * pct / 100.0
		allocMap[it["name"].(string)] = val
		totalPSValue += val
	}
	// Always include Retained Earnings (Laba Ditahan)
	allocMap["Laba Ditahan"] = netProfit - totalPSValue

	b, _ := json.Marshal(allocMap)
	tx.Create(&models.FinanceRevenueAllocation{
		Period:      time.Now().Format("2006-01"),
		SourceType:  refType,
		SourceID:    refID,
		SourceHash:  fmt.Sprintf("%s_%s_%d", refType, refID, time.Now().Unix()),
		GrossAmount: gross,
		Allocation:  string(b),
		CreatedAt:   time.Now(),
	})
}

