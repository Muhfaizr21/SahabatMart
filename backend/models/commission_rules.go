package models

import (
	"time"
)

type CommissionRule struct {
	ID              string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name            string    `gorm:"type:varchar(255);not null" json:"name"`
	Description     string    `gorm:"type:text" json:"description"`
	
	// Rule Targets (NULL = applies to all)
	MembershipTierID *uint     `gorm:"index" json:"membership_tier_id"`
	MerchantID       *string   `gorm:"type:uuid;index" json:"merchant_id"`
	CategoryID       *uint     `gorm:"index" json:"category_id"`
	ProductID        *string   `gorm:"type:uuid;index" json:"product_id"`
	
	// Commission configuration
	CommissionRate   float64   `gorm:"type:decimal(5,4);not null" json:"commission_rate"` // e.g., 0.05 = 5%
	PlatformFeeRate  float64   `gorm:"type:decimal(5,4);not null" json:"platform_fee_rate"`
	
	IsActive         bool      `gorm:"default:true" json:"is_active"`
	Priority         int       `gorm:"default:0" json:"priority"` // Higher priority overrides lower
	
	ValidFrom        *time.Time `json:"valid_from"`
	ValidUntil       *time.Time `json:"valid_until"`
	
	CreatedBy        string    `gorm:"type:uuid" json:"created_by"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
