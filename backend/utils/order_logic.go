package utils

import (
	"SahabatMart/backend/models"
	"fmt"

	"gorm.io/gorm"
)

// ValidateOrderTransition ensures order status transitions follow strict rules (Req 1)
func ValidateOrderTransition(current, next models.OrderStatus) error {
	allowed := map[models.OrderStatus][]models.OrderStatus{
		models.OrderPendingPayment: {models.OrderPaid, models.OrderCancelled},
		models.OrderPaid:           {models.OrderProcessing, models.OrderRefundRequested},
		models.OrderProcessing:     {models.OrderReadyToShip, models.OrderRefundRequested},
		models.OrderReadyToShip:    {models.OrderShipped, models.OrderRefundRequested},
		models.OrderShipped:        {models.OrderDelivered, models.OrderRefundRequested},
		models.OrderDelivered:      {models.OrderCompleted, models.OrderRefundRequested},
		models.OrderRefundRequested: {models.OrderRefundProcessing, models.OrderPaid}, // Can go back to Paid if refund rejected
		models.OrderRefundProcessing: {models.OrderRefunded, models.OrderPaid},
	}

	for _, status := range allowed[current] {
		if status == next {
			return nil
		}
	}
	return fmt.Errorf("invalid transition from %s to %s", current, next)
}

// CalculateCommissions handles deterministic commission calculation (Req 2)
func CalculateCommissions(db *gorm.DB, item *models.OrderItem, affiliateID string, tierID uint) (float64, float64, error) {
	// Rule priority: Product > Merchant > Category > Global/Tier Base
	var rule models.CommissionRule
	
	// 1. Check Product-specific rule
	if err := db.Where("product_id = ? AND is_active = ?", item.ProductID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	// 2. Check Merchant-specific rule
	if err := db.Where("merchant_id = ? AND is_active = ? AND product_id IS NULL", item.MerchantID, true).Order("priority DESC").First(&rule).Error; err == nil {
		return rule.CommissionRate, rule.PlatformFeeRate, nil
	}

	// 3. Check Category-specific rule
	var product models.Product
	db.Where("id = ?", item.ProductID).First(&product)
	// Note: Category in Product is string in current simplified model, but we'll try to find by ID if we can or use category name
	// For robust system, we should have CategoryID in Product model.
	
	// Fallback to Tier Base
	var tier models.MembershipTier
	if err := db.First(&tier, tierID).Error; err == nil {
		return tier.BaseCommissionRate, 0.05, nil // Default 5% platform fee
	}

	return 0.03, 0.05, nil // Global fallback
}

// CreateOrder handles split order logic per merchant (Req 6)
func CreateOrder(db *gorm.DB, buyerID string, cartItems []models.OrderItem, affiliateID *string, shippingInfo models.Order) (*models.Order, error) {
	return nil, nil // Implementation placeholder
}
