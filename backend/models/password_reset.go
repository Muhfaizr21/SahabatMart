package models

import (
	"time"
)

type PasswordReset struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"type:varchar(255);not null;index" json:"email"`
	Token     string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"token"`
	ExpiredAt time.Time `gorm:"not null" json:"expired_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time `json:"created_at"`
}

func (PasswordReset) TableName() string {
	return "password_resets"
}
