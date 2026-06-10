package models

import (
	"time"
)

type UserLocationLog struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	IPHash      string    `gorm:"type:varchar(64);index" json:"ip_hash"`
	UserID      *string   `gorm:"type:uuid" json:"user_id"`
	Latitude    float64   `gorm:"type:decimal(9,6)" json:"latitude"`
	Longitude   float64   `gorm:"type:decimal(9,6)" json:"longitude"`
	City        string    `gorm:"type:varchar(100)" json:"city"`
	Region      string    `gorm:"type:varchar(100)" json:"region"`
	CountryName string    `gorm:"type:varchar(100)" json:"country_name"`
	CountryCode string    `gorm:"type:varchar(10)" json:"country_code"`
	UserAgent   string    `gorm:"type:text" json:"user_agent"`
	DeviceType  string    `gorm:"type:varchar(20)" json:"device_type"` // desktop, mobile, tablet
	VisitedURL  string    `gorm:"type:text" json:"visited_url"`
	IsConverted bool      `gorm:"default:false" json:"is_converted"`
	CreatedAt   time.Time `json:"created_at"`
}

func (UserLocationLog) TableName() string {
	return "user_location_logs"
}

type IPLocationCache struct {
	IPHash      string    `gorm:"type:varchar(64);primaryKey" json:"ip_hash"`
	Latitude    float64   `gorm:"type:decimal(9,6)" json:"latitude"`
	Longitude   float64   `gorm:"type:decimal(9,6)" json:"longitude"`
	City        string    `gorm:"type:varchar(100)" json:"city"`
	Region      string    `gorm:"type:varchar(100)" json:"region"`
	CountryName string    `gorm:"type:varchar(100)" json:"country_name"`
	CountryCode string    `gorm:"type:varchar(10)" json:"country_code"`
	CreatedAt   time.Time `json:"created_at"`
}

func (IPLocationCache) TableName() string {
	return "ip_location_caches"
}
