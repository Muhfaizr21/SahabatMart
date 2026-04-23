package models

import (
	"time"
)

// AffiliateEducation - Materi edukasi untuk mitra
type AffiliateEducation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255);not null" json:"title"`
	Slug        string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"slug"`
	Content     string    `gorm:"type:text" json:"content"`
	VideoURL    string    `gorm:"type:text" json:"video_url"`
	FileURL     string    `gorm:"type:text" json:"file_url"`
	Category    string    `gorm:"type:varchar(100)" json:"category"` // "Marketing", "Product Knowledge", "Sales"
	ImageURL    string    `gorm:"type:text" json:"image_url"`
	IsFeatured  bool      `gorm:"default:false" json:"is_featured"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	ViewCount   int       `gorm:"default:0" json:"view_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AffiliateEvent - Event untuk mitra (Webinar, Kopdar, dll)
type AffiliateEvent struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Title       string     `gorm:"type:varchar(255);not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Type        string     `gorm:"type:varchar(50)" json:"type"` // "online", "offline"
	Location    string     `gorm:"type:varchar(255)" json:"location"` // Zoom link or physical address
	StartTime   time.Time  `json:"start_time"`
	EndTime     time.Time  `json:"end_time"`
	ImageURL    string     `gorm:"type:text" json:"image_url"`
	Status      string     `gorm:"type:varchar(20);default:'upcoming'" json:"status"` // upcoming, ongoing, completed, cancelled
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// PromoMaterial - Materi promosi/marketing (Konten iklan, copy-writing)
type PromoMaterial struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255);not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Type        string    `gorm:"type:varchar(50)" json:"type"` // "image", "video", "copywriting"
	Category    string    `gorm:"type:varchar(100)" json:"category"` // "Instagram", "Facebook", "WhatsApp"
	FileURL     string    `gorm:"type:text" json:"file_url"`
	Caption     string    `gorm:"type:text" json:"caption"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	DownloadCount int     `gorm:"default:0" json:"download_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (AffiliateEducation) TableName() string { return "affiliate_educations" }
func (AffiliateEvent) TableName() string     { return "affiliate_events" }
func (PromoMaterial) TableName() string      { return "promo_materials" }
