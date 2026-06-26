package utils

import (
	"akuglow/backend/models"
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
	// [FIX #16] Financial audit actions
	ActionFundDistribution  AuditAction = "fund_distribution"
	ActionSettlement        AuditAction = "settlement"
	ActionReverseFunds      AuditAction = "reverse_funds"
	ActionCommissionRelease AuditAction = "commission_release"
	ActionWalletTransfer    AuditAction = "wallet_transfer"
)

// LogAudit records sensitive actions for auditing (Req 9)
// [FIX #16] Now stores before/after JSON and uses proper IP/UA extraction
func LogAudit(db *gorm.DB, adminID string, action AuditAction, entityType, entityID, description string, before, after interface{}, ip, ua string) {
	beforeJSON, _ := json.Marshal(before)
	afterJSON, _ := json.Marshal(after)

	if adminID == "system" || adminID == "" {
		adminID = "00000000-0000-0000-0000-000000000000" // Use zero UUID for system actions
	}

	if ip == "" {
		ip = "127.0.0.1"
	}

	audit := models.AuditLog{
		AdminID:    adminID,
		Action:     string(action),
		TargetType: entityType,
		TargetID:   entityID,
		Detail:     description,
		IPAddress:  ip,
		UserAgent:  ua,
		BeforeData: string(beforeJSON),
		AfterData:  string(afterJSON),
		CreatedAt:  time.Now(),
	}

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
