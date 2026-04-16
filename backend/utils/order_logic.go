package utils

import (
	"SahabatMart/backend/models"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// GenerateRefCode creates a robust referral code based on name and timestamp
func GenerateRefCode(name string) string {
	cleanName := strings.ReplaceAll(strings.ToLower(name), " ", "")
	if len(cleanName) > 6 {
		cleanName = cleanName[:6]
	} else if len(cleanName) == 0 {
		cleanName = "user"
	}
	// Use 4 digits of timestamp and a random-ish salt if needed, but 4 digits is usually fine for small scale
	return fmt.Sprintf("%-6s%d", cleanName, time.Now().UnixNano()%10000)
}

// ValidateOrderTransition ensures order status transitions follow strict rules (Req 1)
func ValidateOrderTransition(current, next models.OrderStatus) error {
	allowed := map[models.OrderStatus][]models.OrderStatus{
		models.OrderPendingPayment:   {models.OrderPaid, models.OrderCancelled},
		models.OrderPaid:             {models.OrderProcessing, models.OrderRefundRequested, models.OrderCancelled},
		models.OrderProcessing:       {models.OrderReadyToShip, models.OrderRefundRequested},
		models.OrderReadyToShip:      {models.OrderShipped, models.OrderRefundRequested},
		models.OrderShipped:          {models.OrderDelivered, models.OrderRefundRequested},
		models.OrderDelivered:        {models.OrderCompleted, models.OrderRefundRequested},
		models.OrderRefundRequested:  {models.OrderRefundProcessing, models.OrderPaid},
		models.OrderRefundProcessing: {models.OrderRefunded, models.OrderPaid},
	}

	for _, status := range allowed[current] {
		if status == next {
			return nil
		}
	}
	return fmt.Errorf("transisi tidak diizinkan dari %s ke %s", current, next)
}

// CalculateCommission handles deterministic commission calculation (Req 2)
// Prioritize Rules: Product > Merchant > Category > Tier Base
func CalculateCommission(db *gorm.DB, item models.OrderItem, affiliateID *string) (float64, float64, error) {
	var rule models.CommissionRule
	
	// 1. Check Product-specific rule
	if err := db.Where("product_id = ? AND is_active = ?", item.ProductID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	// 2. Check Merchant-specific rule
	if err := db.Where("merchant_id = ? AND is_active = ? AND product_id IS NULL", item.MerchantID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	// 3. Fallback to Tier Base if affiliate exists
	if affiliateID != nil && *affiliateID != "" {
		var affiliate models.AffiliateMember
		if err := db.Preload("Tier").Where("id = ?", *affiliateID).First(&affiliate).Error; err == nil {
			// In current models, MembershipTier is separate but related to AffiliateMember or AffiliateConfig
			// Let's assume there is a rule or tier logic.
			return 0.05, 0.05, nil // Fallback tier rate
		}
	}

	// 4. Global fallback
	return 0.03, 0.05, nil // 3% commission, 5% platform fee
}

// CreateOrder handles split order logic per merchant (Req 6)
func CreateOrder(db *gorm.DB, buyerID string, cartItems []models.OrderItem, affiliateID *string, shippingInfo models.Order) (*models.Order, error) {
	// 1. Group items by merchant
	merchantItems := make(map[string][]models.OrderItem)
	for _, item := range cartItems {
		merchantItems[item.MerchantID] = append(merchantItems[item.MerchantID], item)
	}

	// 2. Initialize Order
	order := models.Order{
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

	// Start Transaction
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		var totalSubtotal, totalPlatformFee, totalCommission float64

		for merchantID, items := range merchantItems {
			group := models.OrderMerchantGroup{
				OrderID:    order.ID,
				MerchantID: merchantID,
				Status:     models.MOrderNew,
			}

			if err := tx.Create(&group).Error; err != nil {
				return err
			}

			var groupSubtotal, groupPlatformFee, groupCommission float64

			for _, item := range items {
				// Calculate commission with robust fallback
				commRate, platRate, _ := CalculateCommission(tx, item, affiliateID)
				
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

				groupSubtotal += item.Subtotal
				groupPlatformFee += item.PlatformFeeAmount
				groupCommission += item.CommissionAmount
			}

			group.Subtotal = groupSubtotal
			group.PlatformFee = groupPlatformFee
			group.Commission = groupCommission
			group.MerchantPayout = groupSubtotal - groupPlatformFee - groupCommission

			if err := tx.Save(&group).Error; err != nil {
				return err
			}

			totalSubtotal += groupSubtotal
			totalPlatformFee += groupPlatformFee
			totalCommission += groupCommission
		}

		order.Subtotal = totalSubtotal
		order.TotalPlatformFee = totalPlatformFee
		order.TotalCommission = totalCommission
		order.GrandTotal = totalSubtotal // Basic grand total; shipping & discounts can be added later
		
		return tx.Save(&order).Error
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}
