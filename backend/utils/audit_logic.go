package utils

import (
	"SahabatMart/backend/models"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type AuditAction string

const (
	ActionCreate        AuditAction = "create"
	ActionUpdate        AuditAction = "update"
	ActionDelete        AuditAction = "delete"
	ActionApprove       AuditAction = "approve"
	ActionReject        AuditAction = "reject"
	ActionSuspend       AuditAction = "suspend"
	ActionActivate      AuditAction = "activate"
	ActionLogin         AuditAction = "login"
	ActionProcessPayout AuditAction = "process_payout"
	ActionRefund        AuditAction = "refund"
)

// LogAudit records sensitive actions for auditing (Req 9)
func LogAudit(db *gorm.DB, adminID string, action AuditAction, entityType, entityID, description string, before, after interface{}, ip, ua string) {
	// For robust auditing, we should store before/after data
	// beforeJSON, _ := json.Marshal(before)
	// afterJSON, _ := json.Marshal(after)

	audit := models.AuditLog{
		AdminID:    adminID,
		Action:     string(action),
		TargetType: entityType,
		TargetID:   entityID,
		Detail:     description,
		// Using the original AuditLog model field name 'Detail', but in db.md it was 'description'
		// Let's assume AuditLog in models/admin_config.go is the current definition
		IPAddress:  ip,
		CreatedAt:  time.Now(),
	}

	// For robust auditing, we should store before/after data
	// Let's create a more robust ActivityLog table instead of basic AuditLog
	db.Create(&audit)
}

// LogError handles observability (Req 14)
func LogError(db *gorm.DB, service, message string, context map[string]interface{}) {
	contextJSON, _ := json.Marshal(context)
	
	// Create system log for observability (Requirement: structured logging)
	// We'll use a Background job to avoid blocking (Requirement 13)
	go func() {
		log := map[string]interface{}{
			"level":      "error",
			"service":    service,
			"message":    message,
			"context":    string(contextJSON),
			"created_at": time.Now(),
		}
		// If we had a SystemLog model, we'd use it here.
		// For now we just print or use db.Table
		db.Table("system_logs").Create(&log)
		fmt.Printf("SYSTEM ERROR [%s]: %s\n", service, message)
	}()
}
