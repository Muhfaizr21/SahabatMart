package utils

import (
	"SahabatMart/backend/models"
	"time"

	"gorm.io/gorm"
)

// CheckAffiliateFraud performs a real-time check for suspicious affiliate activity
func CheckAffiliateFraud(db *gorm.DB, click *models.AffiliateClickLog) (int, []string) {
	score := 0
	flags := []string{}

	// Rule 1: Self-referral detection (Same IP or Device)
	// We need to compare with the buyer's IP/Device at checkout time (Requirement 1)
	
	// Rule 2: High velocity clicks from same IP
	var recentClicks int64
	db.Model(&models.AffiliateClickLog{}).
		Where("ip_address = ? AND clicked_at > ?", click.IPAddress, time.Now().Add(-10*time.Minute)).
		Count(&recentClicks)
	
	if recentClicks > 50 {
		score += 40
		flags = append(flags, "high_velocity_clicks")
	}

	// Rule 3: Conversion speed (Requirement 1: Click-to-order < 60s)
	// This is checked during order placement
	
	return score, flags
}

// ValidateConversion speed-check (Req 1)
func ValidateConversionSpeed(clickTime time.Time, orderTime time.Time) bool {
	duration := orderTime.Sub(clickTime)
	return duration.Seconds() > 60 // True if safe (more than 60s)
}

// FlagAffiliate updates affiliate member with fraud flags
func FlagAffiliate(db *gorm.DB, affiliateID string, newFlag string) error {
	var affiliate models.AffiliateMember
	if err := db.Where("id = ?", affiliateID).First(&affiliate).Error; err != nil {
		return err
	}
	
	// Simple append for now, in real case use JSON array
	affiliate.Flags = affiliate.Flags + "," + newFlag
	return db.Save(&affiliate).Error
}
