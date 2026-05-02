package models

import (
	"time"
)

type Review struct {
	ID         string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ProductID  string    `gorm:"type:uuid;not null;index" json:"product_id"`
	MerchantID string    `gorm:"type:uuid;not null;index" json:"merchant_id"`
	BuyerID    string    `gorm:"type:uuid;not null" json:"buyer_id"`
	OrderID    string    `gorm:"type:uuid;not null" json:"order_id"`
	OrderItemID string    `gorm:"type:uuid;not null" json:"order_item_id"`
	Rating     int       `gorm:"type:int;not null" json:"rating"` // 1-5
	Comment    string    `gorm:"type:text" json:"comment"`
	ImageURL   string    `gorm:"type:text" json:"image_url"`
	IsHidden   bool      `gorm:"default:false" json:"is_hidden"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Buyer      User      `gorm:"foreignKey:BuyerID" json:"buyer,omitempty"`
}

func (Review) TableName() string { return "reviews" }
