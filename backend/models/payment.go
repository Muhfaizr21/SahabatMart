package models

import (
	"time"
)

type PaymentStatus string

const (
	PaymentUnpaid           PaymentStatus = "unpaid"
	PaymentPending          PaymentStatus = "pending"
	PaymentPaid             PaymentStatus = "paid"
	PaymentFailed           PaymentStatus = "failed"
	PaymentExpired          PaymentStatus = "expired"
	PaymentRefunded         PaymentStatus = "refunded"
	PaymentPartiallyRefunded PaymentStatus = "partially_refunded"
)

type Payment struct {
	ID                  string        `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OrderID             string        `gorm:"type:uuid;unique;not null" json:"order_id"`
	PaymentMethod       string        `gorm:"type:varchar(50);not null" json:"payment_method"`
	Status              PaymentStatus `gorm:"type:varchar(50);default:'unpaid';not null" json:"status"`

	Gateway             string        `gorm:"type:varchar(50);not null" json:"gateway"` // midtrans, xendit, gopay, etc.
	GatewayTransactionID string       `gorm:"type:text;index" json:"gateway_transaction_id"`
	GatewayOrderID      string        `gorm:"type:text" json:"gateway_order_id"`
	GatewayResponse     string        `gorm:"type:text" json:"gateway_response"` // JSON string

	Amount              float64       `gorm:"type:decimal(15,2);not null" json:"amount"`
	FeeGateway          float64       `gorm:"type:decimal(15,2);default:0" json:"fee_gateway"`
	AmountReceived      float64       `gorm:"type:decimal(15,2)" json:"amount_received"`

	ExpiresAt           *time.Time    `json:"expires_at"`
	PaidAt              *time.Time    `json:"paid_at"`
	FailedAt            *time.Time    `json:"failed_at"`
	FailureReason       string        `gorm:"type:text" json:"failure_reason"`

	CreatedAt           time.Time     `json:"created_at"`
	UpdatedAt           time.Time     `json:"updated_at"`
}

type PaymentWebhook struct {
	ID           string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Gateway      string    `gorm:"type:varchar(50);not null" json:"gateway"`
	ExternalID   string    `gorm:"type:varchar(255);unique;not null" json:"external_id"` // Transaction ID/Reference ID from gateway
	EventType    string    `gorm:"type:varchar(100)" json:"event_type"`
	Payload      string    `gorm:"type:text;not null" json:"payload"` // JSON string
	
	IsProcessed  bool      `gorm:"default:false;index" json:"is_processed"`
	ProcessedAt  *time.Time `json:"processed_at"`
	ErrorMessage string     `gorm:"type:text" json:"error_message"`
	
	ReceivedAt   time.Time `gorm:"autoCreateTime" json:"received_at"`
}
