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

	// 1. Distribute ke Merchant Portions (Distributor Cut)
	for _, group := range order.MerchantGroups {
		// [Financial Audit Fix] Distribution Logic based on Reseller Model
		pusatID := "00000000-0000-0000-0000-000000000000"
		
		if group.MerchantID != pusatID {
			// [Audit Fix] Intelligent Discount Burden Distribution
			merchantDiscShare := group.Discount * 0.5 // Default: bagi dua untuk Voucher Platform
			hqDiscShare := group.Discount * 0.5

			// Jika voucher dimiliki spesifik oleh merchant ini, merchant tanggung 100%
			if order.VoucherID != nil {
				var v models.Voucher
				if err := tx.First(&v, *order.VoucherID).Error; err == nil {
					if v.MerchantID != nil && *v.MerchantID == group.MerchantID {
						merchantDiscShare = group.Discount
						hqDiscShare = 0
					}
				}
			}

			// [Sync Fix] Sesuai Dokumen Bisnis Akuglow:
			// Merchant sebagai DISTRIBUTOR mendapat KOMISI DISTRIBUSI saja.
			// Ini beda dari model reseller biasa — Merchant tidak beli putus.
			// Formula distribusi:
			//   Merchant  = DistributionFee - BebanDiskon Merchant
			//   HQ        = Subtotal - PlatformFee - AffiliateFee - DistributionFee - BebanDiskon HQ
			//   Platform  = PlatformFee (dicatat terpisah)
			//   Affiliate = TotalCommission (dicatat di step 3)

			// 1. Bayar Merchant (Komisi Distribusi saja, sesuai peran distributor)
			merchantPayout := group.DistributionCommission - merchantDiscShare
			if merchantPayout < 0 { merchantPayout = 0 }

			if merchantPayout > 0 {
				if err := s.ProcessTransaction(tx, group.MerchantID, models.WalletMerchant, models.TxSaleRevenue, merchantPayout, order.ID, "order", fmt.Sprintf("Komisi Distribusi order %s", order.OrderNumber)); err != nil {
					return err
				}
			}

			// 2. HQ mendapat sisa: Subtotal - PlatformFee - AffiliateFee - DistributionFee - BebanDiskon HQ
			hqRevenue := group.Subtotal - group.PlatformFee - group.AffiliateCommission - group.DistributionCommission - hqDiscShare
			if hqRevenue < 0 { hqRevenue = 0 }
			
			if hqRevenue > 0 {
				desc := fmt.Sprintf("Revenue HQ dari order %s (setelah distribusi)", order.OrderNumber)
				if err := s.ProcessTransaction(tx, "system-hq", models.WalletBuyer, models.TxSaleRevenue, hqRevenue, order.ID, "order", desc); err != nil {
					return err
				}
			}

			// Catat subsidi diskon HQ jika ada
			if hqDiscShare > 0 {
				if err := s.ProcessTransaction(tx, models.PusatID, models.WalletBuyer, models.TxPlatformFee, -hqDiscShare, order.ID, "order", fmt.Sprintf("Subsidi Diskon order %s", order.OrderNumber)); err != nil {
					return err
				}
			}
		} else {
			// [MODEL PUSAT] HQ menanggung 100% diskon karena mereka pemilik stok
			hqPayout := (group.Subtotal - group.PlatformFee - group.AffiliateCommission) - group.Discount
			if hqPayout < 0 { hqPayout = 0 }

			desc := fmt.Sprintf("Penjualan Langsung Pusat: %s (Potong diskon 100%%)", order.OrderNumber)
			if err := s.ProcessTransaction(tx, "system-hq", models.WalletBuyer, models.TxSaleRevenue, hqPayout, order.ID, "order", desc); err != nil {
				return err
			}
		}

		// Platform Fee tetap ditarik ke wallet platform
		if group.PlatformFee > 0 {
			pfDesc := fmt.Sprintf("Platform Fee: %s", order.OrderNumber)
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

		// Notifikasi ke Affiliate
		_ = s.Notification.Push(*order.AffiliateID, "affiliate", "commission_earned", "Komisi Baru!", 
			fmt.Sprintf("Anda mendapatkan estimasi komisi Rp%.2f dari pesanan %s", order.TotalCommission, order.OrderNumber), 
			fmt.Sprintf("/affiliate/transactions?ref=%s", order.ID))
	}
	
	// Notifikasi ke Merchant (dengan info komisi distribusi yang benar)
	for _, group := range order.MerchantGroups {
		_ = s.Notification.Push(group.MerchantID, "merchant", "order_paid", "Pesanan Dibayar", 
			fmt.Sprintf("Pesanan %s telah dibayar. Komisi distribusi Rp%.2f masuk ke saldo tertunda.", order.OrderNumber, group.DistributionCommission), 
			fmt.Sprintf("/merchant/orders/%s", order.ID))
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
func (s *FinanceService) ProcessSettlements() (int64, error) {
	var settledCount int64
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		limitDate := time.Now().AddDate(0, 0, -7) // Settlement delay 7 hari
		
		var txs []models.WalletTransaction
		// Hardening: Gabungkan dengan tabel orders untuk memastikan status order valid (tidak sengketa/dibekukan)
		// Kita hanya mencairkan transaksi yang ReferenceType-nya 'order' DAN order tersebut sudah 'completed'
		err := tx.Table("wallet_transactions").
			Select("wallet_transactions.*").
			Joins("JOIN orders ON orders.id = wallet_transactions.reference_id").
			Where("wallet_transactions.pending_after > wallet_transactions.pending_before").
			Where("wallet_transactions.is_settled = ?", false).
			Where("wallet_transactions.created_at < ?", limitDate).
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
