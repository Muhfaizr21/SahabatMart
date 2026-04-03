package utils

import (
	"SahabatMart/backend/models"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// ReconciliationJob regularly compares financial totals (Req 12)
func ReconciliationJob(db *gorm.DB) {
	fmt.Println("🔎 Starting Reconciliation Job...")

	// 1. Order Totals vs Grand Totals
	type OrderMismatch struct {
		OrderID     string
		CalcTotal   float64
		GrandTotal  float64
	}
	var mismatches []OrderMismatch
	db.Raw(`
		SELECT o.id as order_id, 
		       (o.subtotal + o.total_shipping_cost + o.total_platform_fee - o.total_discount) as calc_total, 
		       o.grand_total
		FROM orders o
		WHERE abs(o.grand_total - (o.subtotal + o.total_shipping_cost + o.total_platform_fee - o.total_discount)) > 0.01
	`).Scan(&mismatches)

	if len(mismatches) > 0 {
		LogError(db, "recon-service", fmt.Sprintf("Found %d order total mismatches!", len(mismatches)), map[string]interface{}{"mismatches": mismatches})
	}

	// 2. Wallet Balance vs Transaction Log
	type WalletMismatch struct {
		WalletID      string
		OwnerID       string
		WalletBalance float64
		CalcBalance   float64
	}
	var walletMismatches []WalletMismatch
	db.Raw(`
		SELECT w.id as wallet_id, w.owner_id, w.balance as wallet_balance, 
		       COALESCE(SUM(wt.amount), 0) as calc_balance
		FROM wallets w
		JOIN wallet_transactions wt ON wt.wallet_id = w.id
		GROUP BY w.id
		HAVING abs(w.balance - COALESCE(SUM(wt.amount), 0)) > 0.01
	`).Scan(&walletMismatches)

	if len(walletMismatches) > 0 {
		LogError(db, "recon-service", fmt.Sprintf("Found %d wallet balance mismatches!", len(walletMismatches)), map[string]interface{}{"mismatches": walletMismatches})
	}

	fmt.Println("✅ Reconciliation Job Completed!")
}

// StartBackgroundJobs initializes recurring background tasks (Req 13)
func StartBackgroundJobs(db *gorm.DB) {
	// Auto-complete orders (e.g., if delivered for 7 days)
	go func() {
		for {
			db.Transaction(func(tx *gorm.DB) error {
				var groups []models.OrderMerchantGroup
				tx.Where("status = 'delivered' AND delivered_at <= ?", time.Now().AddDate(0, 0, -7)).Find(&groups)
				for _, group := range groups {
					group.Status = models.MOrderCompleted
					tx.Save(&group)
					// Handle payout logic, commission approved, etc (Deterministic commission logic)
					// Req 2 & 7 automatic commission approval logic would go here
				}
				return nil
			})
			time.Sleep(1 * time.Hour)
		}
	}()

	// Scheduled Reconciliation
	go func() {
		for {
			ReconciliationJob(db)
			time.Sleep(24 * time.Hour)
		}
	}()
}
