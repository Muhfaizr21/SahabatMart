package models

import (
	"time"

	"gorm.io/gorm"
)

type Permission struct {
	ID          string         `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Code        string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"code"` // e.g. "manage_products"
	Name        string         `gorm:"type:varchar(150);not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Group       string         `gorm:"type:varchar(100);not null" json:"group"` // e.g. "Inventory", "Users"
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Role struct {
	ID          string         `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Permissions []Permission   `gorm:"many2many:role_permissions" json:"permissions"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type RolePermission struct {
	RoleID       string `gorm:"primaryKey"`
	PermissionID string `gorm:"primaryKey"`
}

func (Permission) TableName() string { return "permissions" }
func (Role) TableName() string       { return "roles" }
