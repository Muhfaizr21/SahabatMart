package utils

import (
	"SahabatMart/backend/models"
	"errors"
	"time"

	"gorm.io/gorm"
)

var ErrWebhookAlreadyProcessed = errors.New("webhook already processed")

// HandleWebhook ensures idempotency of payment call-backs (Req 4)
func HandleWebhook(db *gorm.DB, gateway, externalID string, payload string, processFunc func(*gorm.DB) error) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var webhook models.PaymentWebhook
		err := tx.Set("gorm:query_option", "FOR UPDATE").Where("gateway = ? AND external_id = ?", gateway, externalID).First(&webhook).Error
		
		if err == nil {
			// Callback exists
			if webhook.IsProcessed {
				return ErrWebhookAlreadyProcessed
			}
			// Update payload just in case (e.g. for retries with new data)
			webhook.Payload = payload
		} else {
			// New callback
			webhook = models.PaymentWebhook{
				Gateway:    gateway,
				ExternalID: externalID,
				Payload:    payload,
			}
			if err := tx.Create(&webhook).Error; err != nil {
				return err
			}
		}

		// Run processing logic (Requirement: order status update, commissions, wallet, etc)
		if err := processFunc(tx); err != nil {
			webhook.ErrorMessage = err.Error()
			tx.Save(&webhook)
			return err
		}

		// Mark as processed (Idempotency check)
		now := time.Now()
		webhook.IsProcessed = true
		webhook.ProcessedAt = &now
		webhook.ErrorMessage = ""
		
		if err := tx.Save(&webhook).Error; err != nil {
			return err
		}

		return nil
	})
}
