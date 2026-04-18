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
	ConfigService  *ConfigService
	DB             *gorm.DB
}

func NewOrderService(db *gorm.DB) *OrderService {
	return &OrderService{
		OrderRepo:      repositories.NewOrderRepository(db),
		UserRepo:       repositories.NewUserRepository(db),
		FinanceService: NewFinanceService(db),
		ConfigService:  NewConfigService(db),
		DB:             db,
	}
}

func (s *OrderService) CreateOrder(buyerID string, items []models.OrderItem, affiliateID *string, shippingInfo models.Order) (*models.Order, error) {
	merchantItems := make(map[string][]models.OrderItem)
	for _, item := range items {
		merchantItems[item.MerchantID] = append(merchantItems[item.MerchantID], item)
	}

	// Resolve affiliate by ID or ref_code (in AffiliateRefCode field)
	var resolvedAffiliate *models.AffiliateMember
	if affiliateID != nil && *affiliateID != "" {
		var aff models.AffiliateMember
		if err := s.DB.Preload("Tier").Where("id = ? OR ref_code = ?", *affiliateID, *affiliateID).First(&aff).Error; err == nil {
			resolvedAffiliate = &aff
		}
	}

	order := &models.Order{
		BuyerID:            buyerID,
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
			group := models.OrderMerchantGroup{
				OrderID:    order.ID,
				MerchantID: merchantID,
				Status:     models.MOrderNew,
			}

			if err := tx.Create(&group).Error; err != nil {
				return err
			}

			var gSub, gPlat, gComm float64
			for _, item := range gItems {
				commRate, platRate, _ := s.CalculateCommission(tx, item, affiliateID)

				item.OrderID = order.ID
				item.OrderMerchantGroupID = group.ID
				item.Subtotal = item.UnitPrice * float64(item.Quantity)
				item.PlatformFeeAmount = item.Subtotal * platRate
				item.CommissionRate = commRate
				item.CommissionAmount = item.Subtotal * commRate
				item.MerchantAmount = item.Subtotal - item.PlatformFeeAmount - item.CommissionAmount

				if err := tx.Create(&item).Error; err != nil {
					return err
				}

				// ── AFFILIATE COMMISSION RECORDING ──────────────────────────────
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
						RateApplied: commRate,
						Amount:      item.CommissionAmount,
						Status:      models.CommissionPending,
						HoldUntil:   &holdUntil,
					}
					if err := tx.Create(&commission).Error; err != nil {
						return err
					}
				}
				// ────────────────────────────────────────────────────────────────

				gSub += item.Subtotal
				gPlat += item.PlatformFeeAmount
				gComm += item.CommissionAmount
			}

			group.Subtotal = gSub
			group.PlatformFee = gPlat
			group.Commission = gComm
			group.MerchantPayout = gSub - gPlat - gComm

			if err := tx.Save(&group).Error; err != nil {
				return err
			}

			totalSubtotal += gSub
			totalPlatformFee += gPlat
			totalCommission += gComm
		}

		order.Subtotal = totalSubtotal
		order.TotalPlatformFee = totalPlatformFee
		order.TotalCommission = totalCommission
		order.GrandTotal = totalSubtotal

		if err := tx.Save(order).Error; err != nil {
			return err
		}

		// ── INCREMENT AFFILIATE CONVERSION COUNTER ───────────────────────────
		if resolvedAffiliate != nil {
			tx.Model(&models.AffiliateMember{}).Where("id = ?", resolvedAffiliate.ID).
				Updates(map[string]interface{}{
					"total_conversions": gorm.Expr("total_conversions + 1"),
				})
		}
		// ────────────────────────────────────────────────────────────────────

		return nil
	})

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
		return s.FinanceService.DistributeFunds(tx, order.ID)
	})
}

func (s *OrderService) CalculateCommission(db *gorm.DB, item models.OrderItem, affiliateID *string) (float64, float64, error) {
	// Ambil fee default dari config db
	defaultPlatFee := s.ConfigService.GetFloat("default_platform_fee", 0.05)
	defaultCommRate := s.ConfigService.GetFloat("default_affiliate_commission", 0.03)

	// 1. Check Product Specific Rules (Highest Priority)
	var rule models.CommissionRule
	if err := db.Where("product_id = ? AND is_active = ?", item.ProductID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	// 2. Check Merchant Specific Override
	var merchComm models.MerchantCommission
	platFee := defaultPlatFee
	if err := db.Where("merchant_id = ?", item.MerchantID).First(&merchComm).Error; err == nil {
		platFee = merchComm.FeePercent / 100.0
	}

	// 3. Check Category Specific Override
	var product models.Product
	if err := db.Select("category").First(&product, "id = ?", item.ProductID).Error; err == nil {
		var catComm models.CategoryCommission
		if err := db.Where("category_name = ?", product.Category).First(&catComm).Error; err == nil {
			// Category fee only applies if no merchant specific fee is set
			if platFee == defaultPlatFee {
				platFee = catComm.FeePercent / 100.0
			}
		}
	}

	// 4. Calculate Affiliate Commission
	commRate := defaultCommRate
	if affiliateID != nil && *affiliateID != "" {
		if aff, err := s.UserRepo.GetAffiliateByID(*affiliateID); err == nil {
			var tier models.MembershipTier
			if err := db.First(&tier, "id = ?", aff.MembershipTierID).Error; err == nil {
				commRate = tier.BaseCommissionRate
			}
		}
	}

	return commRate, platFee, nil
}
