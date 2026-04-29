package models

import (
	"time"
)

// SkinEducation - Artikel & Podcast untuk edukasi psikologis
type SkinEducation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(255);not null" json:"title"`
	ContentType string    `gorm:"type:varchar(50)" json:"content_type"` // article, podcast
	Content     string    `gorm:"type:text" json:"content"`
	MediaURL    string    `gorm:"type:text" json:"media_url"` // Link podcast atau gambar
	DayTarget   int       `json:"day_target"`                 // Muncul di hari ke berapa
	CreatedAt   time.Time `json:"created_at"`
}

func (SkinEducation) TableName() string { return "skin_educations" }
