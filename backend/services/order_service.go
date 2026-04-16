package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type OrderService struct {
	OrderRepo *repositories.OrderRepository
	UserRepo  *repositories.UserRepository
	DB        *gorm.DB
}

func NewOrderService(db *gorm.DB) *OrderService {
	return &OrderService{
		OrderRepo: repositories.NewOrderRepository(db),
		UserRepo:  repositories.NewUserRepository(db),
		DB:        db,
	}
}

func (s *OrderService) CreateOrder(buyerID string, items []models.OrderItem, affiliateID *string, shippingInfo models.Order) (*models.Order, error) {
	merchantItems := make(map[string][]models.OrderItem)
	for _, item := range items {
		merchantItems[item.MerchantID] = append(merchantItems[item.MerchantID], item)
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
		order.GrandTotal = totalSubtotal // Basic
		
		return tx.Save(order).Error
	})

	return order, err
}

func (s *OrderService) CalculateCommission(db *gorm.DB, item models.OrderItem, affiliateID *string) (float64, float64, error) {
	var rule models.CommissionRule
	
	if err := db.Where("product_id = ? AND is_active = ?", item.ProductID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	if err := db.Where("merchant_id = ? AND is_active = ? AND product_id IS NULL", item.MerchantID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	if affiliateID != nil && *affiliateID != "" {
		if _, err := s.UserRepo.GetAffiliateByID(*affiliateID); err == nil {
			// Logic for tier-based commission
			return 0.05, 0.05, nil 
		}
	}

	return 0.03, 0.05, nil
}
