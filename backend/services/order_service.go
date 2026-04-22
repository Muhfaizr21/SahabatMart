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

	order := &models.Order{
		BuyerID:            &buyerID,
		OrderNumber:        fmt.Sprintf("ORD-%d-%s", time.Now().Unix(), buyerID[:8]),
		Status:             models.OrderPendingPayment,
		AffiliateID:        affiliateID,
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

				item.OrderID = order.ID
				item.OrderMerchantGroupID = group.ID
				item.Subtotal = item.UnitPrice * float64(item.Quantity)
				item.PlatformFeeAmount = platAmt
				
				// Affiliate Commission
				item.CommissionRate = affAmt / item.Subtotal
				item.CommissionAmount = affAmt
				
				// Distribution Commission (Untuk Merchant)
				item.DistributionFeeAmount = distAmt
				
				// Merchant Payout: Apa yang diterima merchant setelah dipotong platform & affiliate
				item.MerchantAmount = item.Subtotal - platAmt - affAmt

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
			group.MerchantPayout = gSub - gPlat - gAffComm

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

		if order.VoucherCode != "" {
			var voucher models.Voucher
			// Validate voucher: active, not expired, min_order met
			err := tx.Set("gorm:query_option", "FOR UPDATE").
				Where("code = ? AND status = ? AND min_order <= ? AND expiry_date > ?", order.VoucherCode, "active", order.Subtotal, time.Now()).
				First(&voucher).Error

			if err == nil {
				if voucher.Quota > voucher.Used {
					// Calculate Discount
					var discount float64
					if voucher.DiscountType == "percent" {
						discount = order.Subtotal * (voucher.DiscountValue / 100.0)
					} else {
						discount = voucher.DiscountValue
					}

					// Cap discount to subtotal
					if discount > order.Subtotal {
						discount = order.Subtotal
					}

					order.VoucherID = &voucher.ID
					order.TotalDiscount = discount
					order.GrandTotal = order.Subtotal - discount
					
					// Increment used count
					if err := tx.Model(&voucher).Update("used", gorm.Expr("used + 1")).Error; err != nil {
						return err
					}
				} else {
					return fmt.Errorf("voucher '%s' sudah habis", order.VoucherCode)
				}
			} else {
				return fmt.Errorf("voucher '%s' tidak valid atau minimal belanja tidak terpenuhi", order.VoucherCode)
			}
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
	// Rules: Merchant Tier % > Product % > Product Nominal
	if merchant.DistributionFeePercent > 0 {
		distAmt = subtotal * (merchant.DistributionFeePercent / 100.0)
	} else if product.BaseDistributionFee > 0 {
		distAmt = subtotal * (product.BaseDistributionFee / 100.0)
	} else if product.BaseDistributionFeeNominal > 0 {
		distAmt = product.BaseDistributionFeeNominal * float64(item.Quantity)
	}

	// 4. Affiliate Fee (Referrer's cut)
	// Rules: Tier % > Product % > Product Nominal
	if affiliateID != nil && *affiliateID != "" {
		if aff, err := s.UserRepo.GetAffiliateByID(*affiliateID); err == nil {
			var tier models.MembershipTier
			if err := db.First(&tier, "id = ?", aff.MembershipTierID).Error; err == nil {
				affAmt = subtotal * tier.BaseCommissionRate
			} else if product.BaseAffiliateFee > 0 {
				affAmt = subtotal * (product.BaseAffiliateFee / 100.0)
			} else if product.BaseAffiliateFeeNominal > 0 {
				affAmt = product.BaseAffiliateFeeNominal * float64(item.Quantity)
			} else {
				affAmt = subtotal * 0.03 // global fallback 3%
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
	// Find orders pending_payment older than 24 hours
	expiryTime := time.Now().Add(-24 * time.Hour)
	var orders []models.Order
	if err := s.DB.Where("status = ? AND created_at < ?", models.OrderPendingPayment, expiryTime).Find(&orders).Error; err != nil {
		return err
	}

	for _, order := range orders {
		if err := s.CancelOrder(order.ID, "Sistem: Waktu pembayaran habis", "system"); err != nil {
			fmt.Printf("❌ Gagal membatalkan pesanan %s: %v\n", order.ID, err)
		}
	}
	return nil
}

