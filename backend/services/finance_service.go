package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type FinanceService struct {
	Repo         *repositories.FinanceRepository
	DB           *gorm.DB
	Notification *NotificationService
}

func NewFinanceService(db *gorm.DB) *FinanceService {
	return &FinanceService{
		Repo:         repositories.NewFinanceRepository(db),
		DB:           db,
		Notification: NewNotificationService(db),
	}
}

func (s *FinanceService) ProcessTransaction(tx *gorm.DB, ownerID string, ownerType models.WalletOwnerType, txType models.WalletTransactionType, amount float64, refID, refType, description string, settleAt *time.Time) error {
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
		wallet.PendingBalance += amount // Pindahkan ke pending (escrow penarikan)
	case models.TxWithdrawalCompleted:
		if wallet.PendingBalance >= amount {
			wallet.PendingBalance -= amount
		}
		wallet.TotalWithdrawn += amount
	case models.TxWithdrawalRejected:
		if wallet.PendingBalance >= amount {
			wallet.PendingBalance -= amount
		}
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

	var refPtr *string
	if refID != "" {
		refPtr = &refID
	}

	txn := &models.WalletTransaction{
		WalletID:             wallet.ID,
		Type:                 txType,
		Amount:               amount,
		BalanceBefore:        balanceBefore,
		BalanceAfter:         wallet.Balance,
		PendingBefore:        pendingBefore,
		PendingAfter:         wallet.PendingBalance,
		Description:          description,
		ReferenceID:          refPtr,
		ReferenceType:        refType,
		TargetSettlementDate: settleAt,
	}

	return tx.Create(txn).Error
}

// DistributeFunds membagi dana ke Merchant dan Affiliate saat pesanan dibayar
func (s *FinanceService) DistributeFunds(tx *gorm.DB, orderID string) error {
	var order models.Order
	if err := tx.Preload("MerchantGroups").First(&order, "id = ?", orderID).Error; err != nil {
		return err
	}

	// 0. [Financial Audit] Record TOTAL Inflow to HQ Cash Account
	// Every cent paid by the buyer enters the platform's bank account first.
	totalInflow := order.GrandTotal
	inflowDesc := fmt.Sprintf("Pembayaran Pesanan %s (Total Inflow)", order.OrderNumber)
	if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxSaleRevenue, totalInflow, order.ID, "order", inflowDesc, nil); err != nil {
		return err
	}

	// 1. Distribute ke Merchant Portions (Distributor Cut)
	for _, group := range order.MerchantGroups {
		// [Financial Audit Fix] Distribution Logic based on Reseller Model
		pusatID := "00000000-0000-0000-0000-000000000000"
		
		if group.MerchantID != pusatID {
			// [Audit Fix] Intelligent Discount Burden Distribution
			merchantDiscShare := group.Discount * 0.5 // Default: bagi dua untuk Voucher Platform

			// Jika voucher dimiliki spesifik oleh merchant ini, merchant tanggung 100%
			if order.VoucherID != nil {
				var v models.Voucher
				if err := tx.First(&v, *order.VoucherID).Error; err == nil {
					if v.MerchantID != nil && *v.MerchantID == group.MerchantID {
						merchantDiscShare = group.Discount
					}
				}
			}

			// [Financial Integrity Fix] Use the pre-calculated MerchantPayout from OrderService
			// This ensures synchronization between what was promised at checkout and what is distributed.
			
			// 1. Ambil jatah Merchant (Revenue - Fees)
			actualPayout := group.MerchantPayout - merchantDiscShare
			if actualPayout < 0 { actualPayout = 0 }
			
			if actualPayout > 0 {
				desc := fmt.Sprintf("Hasil Penjualan order %s", order.OrderNumber)
				// Settlement target: 7 hari untuk merchant
				settleDate := time.Now().AddDate(0, 0, 7)
				if err := s.ProcessTransaction(tx, group.MerchantID, models.WalletMerchant, models.TxSaleRevenue, actualPayout, order.ID, "order", desc, &settleDate); err != nil {
					return err
				}
			}

			// 2. HQ (Pusat) - Tidak perlu mencatat TxSaleRevenue tambahan untuk HQ di sini
			// karena kita sudah mencatat TOTAL INFLOW di langkah (0) ke system-hq.
			// Keuntungan bersih HQ secara otomatis tersisa di saldo system-hq 
			// setelah semua payout merchant & affiliate dibayarkan nanti.
			
			// 3. Catat record subsidi jika terjadi kerugian diskon untuk keperluan audit (opsional)
			// Namun jangan menambah/mengurangi saldo pusat lagi agar tidak double count inflow.
		} else {
			// [MODEL PUSAT] HQ menanggung 100% diskon karena mereka pemilik stok
			hqPayout := group.MerchantPayout
			if hqPayout < 0 { hqPayout = 0 }

			desc := fmt.Sprintf("Penjualan Langsung Pusat: %s (Potong diskon 100%%)", order.OrderNumber)
			if err := s.ProcessTransaction(tx, models.PusatID, models.WalletAdmin, models.TxSaleRevenue, hqPayout, order.ID, "order", desc, nil); err != nil {
				return err
			}
		}

		// Platform Fee tetap ditarik ke wallet platform
		if group.PlatformFee > 0 {
			pfDesc := fmt.Sprintf("Platform Fee: %s", order.OrderNumber)
			if err := s.ProcessTransaction(tx, models.AdminID, models.WalletAdmin, models.TxPlatformFee, group.PlatformFee, order.ID, "order", pfDesc, nil); err != nil {
				return err
			}
		}
	}

	// 3. Distribute ke Affiliate (jika ada)
	if order.AffiliateID != nil && *order.AffiliateID != "" {
		// Cek apakah ada item produk yang pakai preset multi-level
		var orderItems []models.OrderItem
		tx.Where("order_id = ?", order.ID).Find(&orderItems)

		orderSvc := NewOrderService(tx)
		presetUsed := false
		for _, item := range orderItems {
			entries, err := orderSvc.DistributePresetCommissions(tx, order, item, *order.AffiliateID)
			if err == nil && len(entries) > 0 {
				presetUsed = true
				// Distribute wallet credit untuk tiap level
				for _, entry := range entries {
					desc := fmt.Sprintf("Komisi Level %d (Preset): %s", entry.Level, order.OrderNumber)
					// Ambil hold days dari tier affiliate
					holdDays := 7
					var aff models.AffiliateMember
					if err := tx.Preload("Tier").Where("id = ?", entry.AffiliateID).First(&aff).Error; err == nil && aff.Tier != nil {
						holdDays = aff.Tier.CommissionHoldDays
					}
					settleDate := time.Now().AddDate(0, 0, holdDays)

					if err := s.ProcessTransaction(tx, entry.AffiliateID, models.WalletAffiliate, models.TxCommissionEarned, entry.Amount, order.ID, "order", desc, &settleDate); err != nil {
						return err
					}
					// Notifikasi per affiliate
					_ = s.Notification.Push(entry.AffiliateID, "affiliate", "commission_earned",
						fmt.Sprintf("Komisi Level %d Masuk! 🎉", entry.Level),
						fmt.Sprintf("Anda mendapat komisi Rp%.0f (Level %d) dari pesanan %s", entry.Amount, entry.Level, order.OrderNumber),
						"/affiliate/commissions")
				}
			}
		}

		// Jika tidak ada item yang pakai preset, fallback ke komisi flat biasa
		if !presetUsed && order.TotalCommission > 0 {
			desc := fmt.Sprintf("Komisi Affiliate: %s", order.OrderNumber)
			// Ambil hold days dari tier affiliate
			holdDays := 7
			var aff models.AffiliateMember
			if err := tx.Preload("Tier").Where("id = ?", *order.AffiliateID).First(&aff).Error; err == nil && aff.Tier != nil {
				holdDays = aff.Tier.CommissionHoldDays
			}
			settleDate := time.Now().AddDate(0, 0, holdDays)

			if err := s.ProcessTransaction(tx, *order.AffiliateID, models.WalletAffiliate, models.TxCommissionEarned, order.TotalCommission, order.ID, "order", desc, &settleDate); err != nil {
				return err
			}
			_ = s.Notification.Push(*order.AffiliateID, "affiliate", "commission_earned", "Komisi Baru!",
				fmt.Sprintf("Anda mendapatkan estimasi komisi Rp%.2f dari pesanan %s", order.TotalCommission, order.OrderNumber),
				fmt.Sprintf("/affiliate/transactions?ref=%s", order.ID))
		}
	}
	
	// Notifikasi ke Merchant (dengan info jatah yang benar)
	for _, group := range order.MerchantGroups {
		actualPayout := group.MerchantPayout
		
		pusatID := "00000000-0000-0000-0000-000000000000"
		if group.MerchantID != pusatID {
			merchantDiscShare := group.Discount * 0.5
			if order.VoucherID != nil {
				var v models.Voucher
				if err := tx.First(&v, *order.VoucherID).Error; err == nil {
					if v.MerchantID != nil && *v.MerchantID == group.MerchantID {
						merchantDiscShare = group.Discount
					}
				}
			}
			actualPayout -= merchantDiscShare
			if actualPayout < 0 { actualPayout = 0 }
		}

		_ = s.Notification.Push(group.MerchantID, "merchant", "order_paid", "Pesanan Dibayar", 
			fmt.Sprintf("Pesanan %s telah dibayar. Hasil penjualan Rp%.2f masuk ke saldo tertunda.", order.OrderNumber, actualPayout), 
			fmt.Sprintf("/merchant/orders/%s", order.ID))
	}
	return nil
}

// ReverseDistribution menarik kembali dana yang sudah dibagikan jika pesanan dibatalkan/refund
func (s *FinanceService) ReverseDistribution(tx *gorm.DB, orderID string) error {
	// Temukan semua transaksi wallet terkait order ini yang belum cair (pending)
	var txs []models.WalletTransaction
	if err := tx.Where("reference_id = ? AND reference_type = ? AND is_settled = ?", orderID, "order", false).Find(&txs).Error; err != nil {
		return err
	}

	for _, txn := range txs {
		// Jika transaksi ini adalah penambahan saldo (SaleRevenue atau CommissionEarned)
		if txn.Type == models.TxSaleRevenue || txn.Type == models.TxCommissionEarned || txn.Type == models.TxPlatformFee {
			var wallet models.Wallet
			if err := tx.First(&wallet, txn.WalletID).Error; err != nil {
				continue
			}

			// Tentukan tipe reversal-nya
			revType := models.TxSaleRevenueReversed
			if txn.Type == models.TxCommissionEarned {
				revType = models.TxCommissionReversed
			}

			desc := fmt.Sprintf("Pembatalan Dana: %s (Ref: %s)", txn.Description, orderID)
			// Tarik kembali dana menggunakan ProcessTransaction dengan nilai negatif (atau gunakan case deduksi)
			if err := s.ProcessTransaction(tx, wallet.OwnerID, wallet.OwnerType, revType, txn.Amount, orderID, "order_reversal", desc, nil); err != nil {
				return err
			}
		}
	}

	return nil
}

// ManualAdjustment memungkinkan Admin mengintervensi saldo secara manual (Credit/Debit)
func (s *FinanceService) ManualAdjustment(adminID string, targetID string, ownerType models.WalletOwnerType, amount float64, note string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		txType := models.TxAdjustment
		desc := fmt.Sprintf("Penyesuaian Admin (%s): %s", adminID, note)
		
		return s.ProcessTransaction(tx, targetID, ownerType, txType, amount, adminID, "admin_adjustment", desc, nil)
	})
}

// MovePendingToAvailable... (previous code)
func (s *FinanceService) ProcessSettlements() (int64, error) {
	var settledCount int64
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var txs []models.WalletTransaction
		// Hardening: Gabungkan dengan tabel orders untuk memastikan status order valid (tidak sengketa/dibekukan)
		// Kita hanya mencairkan transaksi yang ReferenceType-nya 'order' DAN order tersebut sudah 'completed'
		err := tx.Table("wallet_transactions").
			Select("wallet_transactions.*").
			Joins("JOIN orders ON orders.id = wallet_transactions.reference_id").
			Where("wallet_transactions.pending_after > wallet_transactions.pending_before").
			Where("wallet_transactions.is_settled = ?", false).
			Where("wallet_transactions.target_settlement_date < ?", time.Now()). // Ganti delay kaku 7 hari dengan target date
			Where("wallet_transactions.reference_type = ?", "order").
			Where("orders.status = ?", models.OrderCompleted). // Hanya yang sudah selesai
			Find(&txs).Error
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

			// Update transaction status (Idempotency)
			now := time.Now()
			txn.IsSettled = true
			txn.SettledAt = &now
			if err := tx.Save(&txn).Error; err != nil {
				return err
			}

			// Update Affiliate Commissions status jika reference adalah order
			if txn.ReferenceType == "order" && wallet.OwnerType == models.WalletAffiliate {
				tx.Model(&models.AffiliateCommission{}).
					Where("order_id = ? AND affiliate_id = ?", txn.ReferenceID, wallet.OwnerID).
					Updates(map[string]interface{}{
						"status":  models.CommissionPaid,
						"paid_at": &now,
					})
				
				// Notifikasi pencairan komisi
				_ = s.Notification.Push(wallet.OwnerID, "affiliate", "commission_settled", "Komisi Cair!", 
					fmt.Sprintf("Komisi dari pesanan %s sebesar Rp%.2f sudah masuk ke saldo utama.", txn.ReferenceID, amount), "/affiliate/wallet")
			}
			
			if wallet.OwnerType == models.WalletMerchant {
				_ = s.Notification.Push(wallet.OwnerID, "merchant", "payout_settled", "Saldo Cair", 
					fmt.Sprintf("Dana Rp%.2f dari pesanan %s sudah masuk ke saldo utama.", amount, txn.ReferenceID), "/merchant/wallet")
			}
			settledCount++
		}
		return nil
	})
	return settledCount, err
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

	var refPtr *string
	if refID != "" {
		refPtr = &refID
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
		ReferenceID:   refPtr,
		ReferenceType: "order_escrow",
	}

	return tx.Create(txn).Error
}

func (s *FinanceService) SyncPlatformLedger() (map[string]interface{}, error) {
	var results struct {
		TotalBalance   float64 `gorm:"column:total_balance"`
		TotalPending   float64 `gorm:"column:total_pending"`
		TotalEarned    float64 `gorm:"column:total_earned"`
		TotalWithdrawn float64 `gorm:"column:total_withdrawn"`
	}

	err := s.DB.Table("wallets").Select("SUM(balance) as total_balance, SUM(pending_balance) as total_pending, SUM(total_earned) as total_earned, SUM(total_withdrawn) as total_withdrawn").Scan(&results).Error
	if err != nil {
		return nil, err
	}

	platformLiquidity := results.TotalBalance + results.TotalPending

	return map[string]interface{}{
		"total_user_balance":       results.TotalBalance,
		"total_user_pending":       results.TotalPending,
		"total_platform_liquidity": platformLiquidity,
		"sync_status":              "healthy",
		"checked_at":               time.Now(),
	}, nil
}
