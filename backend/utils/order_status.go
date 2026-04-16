package utils

import (
	"SahabatMart/backend/models"
	"fmt"
)

func ValidateOrderTransition(current, next models.OrderStatus) error {
	allowed := false
	switch current {
	case models.OrderPendingPayment:
		allowed = (next == models.OrderPaid || next == models.OrderCancelled)
	case models.OrderPaid:
		allowed = (next == models.OrderProcessing || next == models.OrderRefunded)
	case models.OrderProcessing:
		allowed = (next == models.OrderShipped)
	case models.OrderShipped:
		allowed = (next == models.OrderDelivered || next == models.OrderDisputed)
	case models.OrderDelivered:
		allowed = (next == models.OrderCompleted || next == models.OrderRefundRequested)
	case models.OrderCompleted, models.OrderCancelled, models.OrderRefunded:
		allowed = false // Final states
	}

	if !allowed {
		return fmt.Errorf("transisi status dari %s ke %s tidak diizinkan", current, next)
	}
	return nil
}
