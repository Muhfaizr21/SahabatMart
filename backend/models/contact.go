package models

import "time"

type ContactMessage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Subject   string    `json:"subject"`
	Message   string    `gorm:"type:text" json:"message"`
	Status    string    `gorm:"default:'unread'" json:"status"` // unread, read, replied
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
