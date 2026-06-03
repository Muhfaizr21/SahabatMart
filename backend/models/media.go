package models

import (
	"time"
)

type Media struct {
	ID         string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Filename   string    `gorm:"type:varchar(255);not null" json:"filename"`
	URL        string    `gorm:"type:text;not null" json:"url"`
	Size       int64     `json:"size"`
	MimeType   string    `gorm:"type:varchar(100)" json:"mime_type"`
	UploadedBy string    `gorm:"type:uuid" json:"uploaded_by"`
	CreatedAt  time.Time `json:"created_at"`
}

func (Media) TableName() string {
	return "media"
}
