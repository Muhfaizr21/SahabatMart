package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type OrderService struct {
	OrderRepo      *repositories.OrderRepository
	UserRepo       *repositories.UserRepository
	FinanceService *FinanceService
	Affiliate      *AffiliateService
	Notification   *NotificationService
	ConfigService  *ConfigService
	DB             *gorm.DB
}

func NewOrderService(db *gorm.DB) *OrderService {
	notif := NewNotificationService(db)
	return &OrderService{
		OrderRepo:      repositories.NewOrderRepository(db),
		UserRepo:       repositories.NewUserRepository(db),
		FinanceService: NewFinanceService(db),
		Affiliate:      NewAffiliateService(db, notif),
		Notification:   notif,
		ConfigService:  NewConfigService(db),
		DB:             db,
	}
}

func (s *OrderService) CreateOrder(buyerID string, items []models.OrderItem, affiliateID *string, shippingInfo models.Order) (*models.Order, error) {
	merchantItems := make(map[string][]models.OrderItem)
	for _, item := range items {
		merchantItems[item.MerchantID] = append(merchantItems[item.MerchantID], item)
	}

	var resolvedAffiliate *models.AffiliateMember
	if affiliateID != nil && *affiliateID != "" {
		var aff models.AffiliateMember
		if err := s.DB.Preload("Tier").Where("id = ? OR ref_code = ?", *affiliateID, *affiliateID).First(&aff).Error; err == nil {
			resolvedAffiliate = &aff
		}
	}

	// Sanitize AffiliateID (Convert empty string to nil)
	if affiliateID != nil && *affiliateID == "" {
		affiliateID = nil
	}

	for i := range items {
		if items[i].ProductVariantID != nil && *items[i].ProductVariantID == "" {
			items[i].ProductVariantID = nil
		}
		if items[i].MerchantID == "" || items[i].MerchantID == "pusat" {
			items[i].MerchantID = "00000000-0000-0000-0000-000000000000"
		}
	}

	expiry := time.Now().Add(30 * time.Minute)
	order := &models.Order{
		BuyerID:            &buyerID,
		OrderNumber:        fmt.Sprintf("ORD-%d-%s", time.Now().Unix(), buyerID[:8]),
		Status:             models.OrderPendingPayment,
		AffiliateID:        affiliateID,
		ExpiredAt:          &expiry,
		ShippingName:       shippingInfo.ShippingName,
		ShippingPhone:      shippingInfo.ShippingPhone,
		ShippingAddress:    shippingInfo.ShippingAddress,
		ShippingDistrict:   shippingInfo.ShippingDistrict,
		ShippingCity:       shippingInfo.ShippingCity,
		ShippingProvince:   shippingInfo.ShippingProvince,
		ShippingPostalCode: shippingInfo.ShippingPostalCode,
		Notes:              shippingInfo.Notes,
	}
	if resolvedAffiliate != nil {
		refCode := resolvedAffiliate.RefCode
		order.AffiliateRefCode = &refCode
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		adminID := "00000000-0000-0000-0000-000000000001"

		var totalSubtotal, totalPlatformFee, totalCommission float64

		for merchantID, gItems := range merchantItems {
			// [Akuglow Refactor] Ambil info Merchant untuk hitung Distribution Fee
			var merchant models.Merchant
			tx.First(&merchant, "id = ?", merchantID)

			group := models.OrderMerchantGroup{
				OrderID:    order.ID,
				MerchantID: merchantID,
				Status:     models.MOrderNew,
			}

			if err := tx.Create(&group).Error; err != nil {
				return err
			}

			var gSub, gPlat, gAffComm, gDistComm float64
			for _, item := range gItems {
				affAmt, distAmt, platAmt, _ := s.CalculateCommissions(tx, item, affiliateID, merchantID)

				// [Akuglow Refactor] Decrement Stock from Inventory Table
				var inventory models.Inventory
				if err := tx.Set("gorm:query_option", "FOR UPDATE").
					Where("merchant_id = ? AND product_id = ?", merchantID, item.ProductID).
					First(&inventory).Error; err != nil {
					return fmt.Errorf("stok tidak ditemukan di merchant %s", merchant.StoreName)
				}

				if inventory.Stock < item.Quantity {
					return fmt.Errorf("stok produk '%s' di merchant %s tidak mencukupi (Tersisa: %d)", item.ProductName, merchant.StoreName, inventory.Stock)
				}

				if err := tx.Model(&inventory).Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
					return err
				}

				// [Akuglow Sync] Low Stock Alert (Threshold: 5)
				if inventory.Stock-item.Quantity <= 5 {
					_ = s.Notification.Push(merchantID, "merchant", "low_stock_alert", "⚠️ Stok Menipis!", 
						fmt.Sprintf("Produk '%s' sisa %d pcs. Segera lakukan restock!", item.ProductName, inventory.Stock-item.Quantity), "")
				}

				item.OrderID = order.ID
				item.OrderMerchantGroupID = group.ID
				item.Subtotal = item.UnitPrice * float64(item.Quantity)
				item.PlatformFeeAmount = platAmt
				
				// Affiliate Commission
				item.CommissionRate = affAmt / item.Subtotal
				item.CommissionAmount = affAmt
				
				// Distribution Commission (Jatah Pasti Merchant sebagai Distributor)
				item.DistributionFeeAmount = distAmt
				
				// Merchant Payout: Sekarang Merchant menerima jatah distribusi (Fixed Margin)
				// Jika Anda ingin Merchant menerima SEMUA sisa, gunakan: item.Subtotal - platAmt - affAmt
				// Tapi demi akurasi finansial yang Anda minta, kita pisahkan HQ Cut.
				item.MerchantAmount = distAmt 

				// HQ Cut: Sisa uang yang menjadi hak Pemilik Brand (Headquarters)
				// Formula: Subtotal - PlatformFee - AffiliateFee - DistributionFee
				hqCut := item.Subtotal - platAmt - affAmt - distAmt
				if hqCut < 0 { hqCut = 0 } // Safety check

				if err := tx.Create(&item).Error; err != nil {
					return err
				}

				if resolvedAffiliate != nil && item.CommissionAmount > 0 {
					holdDays := 7
					if resolvedAffiliate.Tier != nil {
						holdDays = resolvedAffiliate.Tier.CommissionHoldDays
					}
					holdUntil := time.Now().AddDate(0, 0, holdDays)
					commission := models.AffiliateCommission{
						AffiliateID: resolvedAffiliate.ID,
						OrderID:     order.ID,
						OrderItemID: item.ID,
						ProductID:   item.ProductID,
						MerchantID:  item.MerchantID,
						GrossAmount: item.Subtotal,
						RateApplied: item.CommissionRate,
						Amount:      item.CommissionAmount,
						Status:      models.CommissionPending,
						HoldUntil:   &holdUntil,
					}

					// [Akuglow Sync] Fraud Detection: Self-Referral Check
					if resolvedAffiliate.UserID == buyerID {
						commission.Status = models.CommissionFlagged
						commission.Amount = 0 // Batalkan komisi otomatis
						_ = s.Notification.Push(adminID, "admin", "fraud_detected", "Potensi Fraud Terdeteksi", 
							fmt.Sprintf("User %s mencoba beli pakai link sendiri di pesanan %s.", resolvedAffiliate.UserID, order.OrderNumber), "")
					}

					if err := tx.Create(&commission).Error; err != nil {
						return err
					}
				}

				gSub += item.Subtotal
				gPlat += item.PlatformFeeAmount
				gAffComm += item.CommissionAmount
				gDistComm += item.DistributionFeeAmount
			}

			group.Subtotal = gSub
			group.PlatformFee = gPlat
			group.AffiliateCommission = gAffComm
			group.DistributionCommission = gDistComm
			group.MerchantPayout = gDistComm // Merchant hanya dapat jatah distribusi
			
			// Hitung HQ Cut untuk group ini (Pusat profit)
			groupRevenue := gSub - gPlat - gAffComm - gDistComm
			if groupRevenue < 0 { groupRevenue = 0 }

			if err := tx.Save(&group).Error; err != nil {
				return err
			}

			totalSubtotal += gSub
			totalPlatformFee += gPlat
			totalCommission += gAffComm
		}

		order.Subtotal = totalSubtotal
		order.TotalPlatformFee = totalPlatformFee
		order.TotalCommission = totalCommission
		order.GrandTotal = totalSubtotal
		order.VoucherCode = shippingInfo.VoucherCode

		// 4. Calculate and Distribute Discount (Voucher)
		if order.VoucherCode != "" {
			var voucher models.Voucher
			err := tx.Set("gorm:query_option", "FOR UPDATE").
				Where("code = ? AND status = ? AND min_order <= ? AND expiry_date > ?", order.VoucherCode, "active", order.Subtotal, time.Now()).
				First(&voucher).Error

			if err == nil {
				if voucher.Quota > voucher.Used {
					var discount float64
					if voucher.DiscountType == "percent" {
						discount = order.Subtotal * (voucher.DiscountValue / 100.0)
					} else {
						discount = voucher.DiscountValue
					}

					if discount > order.Subtotal {
						discount = order.Subtotal
					}

					order.VoucherID = &voucher.ID
					order.TotalDiscount = discount
					order.GrandTotal = order.Subtotal - discount
					
					// Distribute discount proportionally to merchant groups
					remainingDiscount := discount
					var groups []models.OrderMerchantGroup
					tx.Where("order_id = ?", order.ID).Find(&groups)

					for i, group := range groups {
						var groupDiscount float64
						if i == len(groups)-1 {
							groupDiscount = remainingDiscount
						} else {
							groupDiscount = (group.Subtotal / order.Subtotal) * discount
							remainingDiscount -= groupDiscount
						}
						group.Discount = groupDiscount
						tx.Save(&group)
					}

					if err := tx.Model(&voucher).Update("used", gorm.Expr("used + 1")).Error; err != nil {
						return err
					}
				} else {
					return fmt.Errorf("voucher '%s' sudah habis", order.VoucherCode)
				}
			} else {
				return fmt.Errorf("voucher '%s' tidak valid atau minimal belanja tidak terpenuhi", order.VoucherCode)
			}
		} else {
			order.GrandTotal = order.Subtotal
		}

		if err := tx.Save(order).Error; err != nil {
			return err
		}

		return nil
	})

	if err == nil {
		// [NOTIF] Kirim ke Admin Topbar (Pesanan Baru)
		adminID := "00000000-0000-0000-0000-000000000001"
		_ = s.Notification.Push(adminID, "admin", "order_new", "Pesanan Baru Masuk!", 
			fmt.Sprintf("Pesanan %s menunggu pembayaran.", order.OrderNumber), 
			fmt.Sprintf("/admin/orders/%s", order.ID))
	}

	return order, err
}


func (s *OrderService) CompletePayment(orderID string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return err
		}

		if order.Status != models.OrderPendingPayment {
			return fmt.Errorf("pesanan tidak dalam status menunggu pembayaran")
		}

		now := time.Now()
		order.Status = models.OrderPaid
		order.PaidAt = &now

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// [Akuglow Sync] Update all merchant groups to 'confirmed' status
		if err := tx.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", order.ID).Update("status", "confirmed").Error; err != nil {
			return err
		}

		// [Akuglow Sync] Update Payment Record status to PAID
		if err := tx.Model(&models.Payment{}).Where("order_id = ?", order.ID).Update("status", "PAID").Error; err != nil {
			return err
		}

		// Distribusikan dana otomatis ke Merchant & Affiliate
		if err := s.FinanceService.DistributeFunds(tx, order.ID); err != nil {
			return err
		}

		// Notifikasi ke Buyer
		if order.BuyerID != nil {
			_ = s.Notification.Push(*order.BuyerID, "buyer", "payment_success", "Pembayaran Berhasil", 
				fmt.Sprintf("Pembayaran untuk pesanan %s telah kami terima.", order.OrderNumber), 
				fmt.Sprintf("/orders/%s", order.ID))
		}

		// [NOTIF] Kirim ke Admin Topbar (Pembayaran Masuk)
		adminID := "00000000-0000-0000-0000-000000000001"
		_ = s.Notification.Push(adminID, "admin", "payment_received", "Pembayaran Diterima!", 
			fmt.Sprintf("Pembayaran untuk pesanan %s telah divalidasi.", order.OrderNumber), 
			fmt.Sprintf("/admin/orders/%s", order.ID))

		// [NOTIF] Kirim ke Merchant: SIAP KIRIM
		var groups []models.OrderMerchantGroup
		tx.Where("order_id = ?", order.ID).Find(&groups)
		for _, g := range groups {
			_ = s.Notification.Push(g.MerchantID, "merchant", "order_ready_to_ship", "📦 Pesanan Siap Kirim!", 
				fmt.Sprintf("Pesanan %s telah dibayar. Silakan segera packing dan kirim item pembeli.", order.OrderNumber), 
				fmt.Sprintf("/merchant/orders/%s", order.ID))
		}

		// Cek Upgrade Tier Affiliate jika ada
		if order.AffiliateID != nil {
			// Increment Conversion Count
			tx.Model(&models.AffiliateMember{}).Where("id = ?", *order.AffiliateID).
				UpdateColumn("total_conversions", gorm.Expr("total_conversions + 1"))

			_ = s.Affiliate.TriggerTierUpgrade(*order.AffiliateID)
		}

		return nil
	})
}

func (s *OrderService) CalculateCommissions(db *gorm.DB, item models.OrderItem, affiliateID *string, merchantID string) (affAmt float64, distAmt float64, platAmt float64, err error) {
	subtotal := item.UnitPrice * float64(item.Quantity)

	// 1. Platform Fee (Percentage only)
	platRate := s.ConfigService.GetFloat("default_platform_fee", 0.05)
	platAmt = subtotal * platRate

	// 2. Load Data
	var product models.Product
	db.Where("id = ?", item.ProductID).First(&product)

	var merchant models.Merchant
	db.Where("id = ?", merchantID).First(&merchant)

	// 3. Distribution Fee (Merchant's cut)
	// Rules: Product Specific % > Product Nominal > Merchant Tier %
	if product.BaseDistributionFee > 0 {
		distAmt = subtotal * (product.BaseDistributionFee / 100.0)
	} else if product.BaseDistributionFeeNominal > 0 {
		distAmt = product.BaseDistributionFeeNominal * float64(item.Quantity)
	} else if merchant.DistributionFeePercent > 0 {
		distAmt = subtotal * (merchant.DistributionFeePercent / 100.0)
	}

	// 4. Affiliate Fee (Referrer's cut)
	// Rules Priority: Product Specific % > Product Nominal > Tier % > Global Fallback
	if affiliateID != nil && *affiliateID != "" {
		if aff, err := s.UserRepo.GetAffiliateByID(*affiliateID); err == nil {
			if product.BaseAffiliateFee > 0 {
				// 1. Prioritas Utama: Komisi Persentase Produk
				affAmt = subtotal * (product.BaseAffiliateFee / 100.0)
			} else if product.BaseAffiliateFeeNominal > 0 {
				// 2. Prioritas Kedua: Komisi Nominal Produk
				affAmt = product.BaseAffiliateFeeNominal * float64(item.Quantity)
			} else {
				// 3. Prioritas Ketiga: Berdasarkan Tier Affiliate
				var tier models.MembershipTier
				if err := db.First(&tier, "id = ?", aff.MembershipTierID).Error; err == nil {
					affAmt = subtotal * tier.BaseCommissionRate
				} else {
					// 4. Fallback Terakhir: Global 3%
					affAmt = subtotal * 0.03
				}
			}
		}
	}

	return affAmt, distAmt, platAmt, nil
}

func (s *OrderService) CancelOrder(orderID string, reason string, cancelledBy string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
			return err
		}

		if order.Status == models.OrderCancelled || order.Status == models.OrderCompleted {
			return fmt.Errorf("pesanan sudah dalam status akhir")
		}

		// Return Stock to Merchant's Inventory
		for _, item := range order.Items {
			if err := tx.Model(&models.Inventory{}).
				Where("merchant_id = ? AND product_id = ?", item.MerchantID, item.ProductID).
				UpdateColumn("stock", gorm.Expr("stock + ?", item.Quantity)).Error; err != nil {
				return err
			}
		}

		now := time.Now()
		order.Status = models.OrderCancelled
		order.CancelReason = reason
		order.CancelledBy = &cancelledBy
		order.CancelledAt = &now

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Sync Merchant Group Status
		if err := tx.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", order.ID).
			Update("status", models.MOrderCancelled).Error; err != nil {
			return err
		}

		// Refund/Reversal logic if paid (simplified for now as only pending_payment can be cancelled by user)
		// ...

		return nil
	})
}

func (s *OrderService) ExpireOrders() error {
	// Find orders pending_payment that have passed their ExpiredAt time
	now := time.Now()
	var orders []models.Order
	if err := s.DB.Where("status = ? AND expired_at <= ?", models.OrderPendingPayment, now).Find(&orders).Error; err != nil {
		return err
	}

	for _, order := range orders {
		if err := s.CancelOrder(order.ID, "Sistem: Waktu pembayaran habis", "system"); err != nil {
			fmt.Printf("❌ Gagal membatalkan pesanan %s: %v\n", order.ID, err)
		}
	}
	return nil
}

// [Akuglow Sync] UpdateMerchantOrderStatus memperbarui status group dan melakukan agregasi ke status induk
func (s *OrderService) UpdateMerchantOrderStatus(groupID string, status models.MerchantOrderStatus) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var group models.OrderMerchantGroup
		if err := tx.First(&group, "id = ?", groupID).Error; err != nil {
			return err
		}

		group.Status = status
		if status == models.MOrderShipped {
			now := time.Now()
			group.ShippedAt = &now
		} else if status == models.MOrderDelivered {
			now := time.Now()
			group.DeliveredAt = &now
		}

		if err := tx.Save(&group).Error; err != nil {
			return err
		}

		// Sync ke Status Induk
		return s.SyncOrderStatusFromGroups(tx, group.OrderID)
	})
}

// [Akuglow Sync] SyncOrderStatusFromGroups mengagregasi status dari seluruh distributor ke status pesanan utama
func (s *OrderService) SyncOrderStatusFromGroups(tx *gorm.DB, orderID string) error {
	var groups []models.OrderMerchantGroup
	if err := tx.Where("order_id = ?", orderID).Find(&groups).Error; err != nil {
		return err
	}

	total := len(groups)
	shippedCount := 0
	deliveredCount := 0
	completedCount := 0
	cancelledCount := 0

	for _, g := range groups {
		switch g.Status {
		case models.MOrderShipped:
			shippedCount++
		case models.MOrderDelivered:
			deliveredCount++
		case models.MOrderCompleted:
			completedCount++
		case models.MOrderCancelled:
			cancelledCount++
		}
	}

	var newStatus models.OrderStatus
	if cancelledCount == total {
		newStatus = models.OrderCancelled
	} else if completedCount == total {
		newStatus = models.OrderCompleted
	} else if (deliveredCount + completedCount) == total {
		newStatus = models.OrderDelivered
	} else if (shippedCount + deliveredCount + completedCount) == total {
		newStatus = models.OrderShipped
	} else {
		// Tetap di status sebelumnya (Processing/Paid)
		return nil
	}

	// Jika status berubah menjadi COMPLETED, trigger turnover update & Reward Points
	if newStatus == models.OrderCompleted {
		var order models.Order
		tx.First(&order, "id = ?", orderID)
		if order.Status != models.OrderCompleted {
			// 1. Tambahkan Reward Points (Contoh: 1 poin per Rp 1.000)
			if order.BuyerID != nil {
				points := int64(order.GrandTotal / 1000)
				if points > 0 {
					tx.Model(&models.UserProfile{}).Where("user_id = ?", *order.BuyerID).
						UpdateColumn("reward_points", gorm.Expr("reward_points + ?", points))
					
					_ = s.Notification.Push(*order.BuyerID, "buyer", "reward_earned", "🎁 Poin SahabatMart!", 
						fmt.Sprintf("Selamat! Anda mendapatkan %d poin dari pesanan %s.", points, order.OrderNumber), "/profile?tab=points")
				}
			}

			// 2. Trigger Turnover Snapshot Update untuk Affiliate secara Rekursif
			if order.AffiliateID != nil {
				go s.Affiliate.UpdateUplineSnapshotsRecursive(*order.AffiliateID)
			}
		}
	}

	return tx.Model(&models.Order{}).Where("id = ?", orderID).Update("status", newStatus).Error
}

