package utils

import (
	"akuglow/backend/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

// CheckAffiliateFraud performs a real-time check for suspicious affiliate activity.
// Returns (score, flags) where score ≥ 50 triggers automatic flagging.
func CheckAffiliateFraud(db *gorm.DB, click *models.AffiliateClickLog, buyerIP string) (int, []string) {
	score := 0
	flags := []string{}

	// Rule 1: Self-referral — same IP as buyer at checkout
	if buyerIP != "" && click.IPAddress == buyerIP {
		score += 30
		flags = append(flags, "self_referral")
	}

	// Rule 2: High velocity clicks from same IP
	var recentClicks int64
	db.Model(&models.AffiliateClickLog{}).
		Where("ip_address = ? AND clicked_at > ?", click.IPAddress, time.Now().Add(-10*time.Minute)).
		Count(&recentClicks)

	if recentClicks > 50 {
		score += 40
		flags = append(flags, "high_velocity_clicks")
	} else if recentClicks > 20 {
		score += 10
		flags = append(flags, "elevated_click_velocity")
	}

	// Rule 4: Daily conversion cap per affiliate (max 100 orders/day)
	var dailyConversions int64
	db.Model(&models.Order{}).
		Joins("JOIN affiliate_click_logs ON affiliate_click_logs.id = orders.affiliate_click_id").
		Where("affiliate_click_logs.affiliate_id = ? AND orders.created_at > ?",
			click.AffiliateID, time.Now().Add(-24*time.Hour)).
		Count(&dailyConversions)
	if dailyConversions > 100 {
		score += 25
		flags = append(flags, "high_daily_conversions")
	}

	return score, flags
}

// ValidateConversionSpeed ensures click-to-order time > 60s (faster = suspicious/bot)
func ValidateConversionSpeed(clickTime time.Time, orderTime time.Time) bool {
	duration := orderTime.Sub(clickTime)
	return duration.Seconds() > 60 // True if safe (more than 60s)
}

// FlagAffiliate updates affiliate member with fraud flags
func FlagAffiliate(db *gorm.DB, affiliateID string, newFlag string) error {
	// Deduplicate flags
	if affiliateID == "" {
		return nil
	}
	var affiliate models.AffiliateMember
	if err := db.Where("id = ?", affiliateID).First(&affiliate).Error; err != nil {
		return err
	}

	current := affiliate.Flags
	for _, f := range strings.Split(current, ",") {
		if strings.TrimSpace(f) == newFlag {
			return nil // Already flagged
		}
	}
	if current != "" {
		current += ","
	}
	affiliate.Flags = current + newFlag
	return db.Save(&affiliate).Error
}
