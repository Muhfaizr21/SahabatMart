package models

import (
	"time"
)

type WalletOwnerType string

const (
	WalletMerchant  WalletOwnerType = "merchant"
	WalletAffiliate WalletOwnerType = "affiliate"
	WalletBuyer     WalletOwnerType = "buyer"
)

type WalletTransactionType string

const (
	TxCommissionEarned    WalletTransactionType = "commission_earned"
	TxCommissionReversed  WalletTransactionType = "commission_reversed"
	TxSaleRevenue         WalletTransactionType = "sale_revenue"
	TxSaleRevenueReversed WalletTransactionType = "sale_revenue_reversed"
	TxWithdrawalRequest   WalletTransactionType = "withdrawal_request"
	TxWithdrawalCompleted WalletTransactionType = "withdrawal_completed"
	TxWithdrawalRejected  WalletTransactionType = "withdrawal_rejected"
	TxPlatformFee         WalletTransactionType = "platform_fee"
	TxRefundDeduction     WalletTransactionType = "refund_deduction"
	TxBonus               WalletTransactionType = "bonus"
	TxAdjustment          WalletTransactionType = "adjustment"
)

type Wallet struct {
	ID             string          `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OwnerID        string          `gorm:"type:uuid;not null;index:idx_wallet_owner" json:"owner_id"`
	OwnerType      WalletOwnerType `gorm:"type:varchar(20);not null;index:idx_wallet_owner" json:"owner_type"`
	Balance        float64         `gorm:"type:decimal(15,2);not null;default:0" json:"balance"`         // Ready for withdrawal
	PendingBalance float64         `gorm:"type:decimal(15,2);not null;default:0" json:"pending_balance"` // Hold balance
	TotalEarned    float64         `gorm:"type:decimal(15,2);not null;default:0" json:"total_earned"`
	TotalWithdrawn float64         `gorm:"type:decimal(15,2);not null;default:0" json:"total_withdrawn"`
	IsActive       bool            `gorm:"default:true" json:"is_active"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type WalletTransaction struct {
	ID             string                `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	WalletID       string                `gorm:"type:uuid;not null;index" json:"wallet_id"`
	Type           WalletTransactionType `gorm:"type:varchar(50);not null" json:"type"`
	Amount         float64               `gorm:"type:decimal(15,2);not null" json:"amount"` // Pos = credit, Neg = debit
	BalanceBefore  float64               `gorm:"type:decimal(15,2);not null" json:"balance_before"`
	BalanceAfter   float64               `gorm:"type:decimal(15,2);not null" json:"balance_after"`
	PendingBefore  float64               `gorm:"type:decimal(15,2)" json:"pending_before"`
	PendingAfter   float64               `gorm:"type:decimal(15,2)" json:"pending_after"`
	Description    string                `gorm:"type:text" json:"description"`
	ReferenceID    string                `gorm:"type:uuid" json:"reference_id"`
	ReferenceType  string                `gorm:"type:varchar(50)" json:"reference_type"` // order, commission, withdrawal, refund
	CreatedAt      time.Time             `gorm:"autoCreateTime" json:"created_at"`
}

type PayoutStatus string

const (
	PayoutRequested  PayoutStatus = "requested"
	PayoutReserved   PayoutStatus = "reserved"
	PayoutApproved   PayoutStatus = "approved"
	PayoutProcessing PayoutStatus = "processing"
	PayoutPaid       PayoutStatus = "paid"
	PayoutRejected   PayoutStatus = "rejected"
)

type WithdrawalRequest struct {
	ID                 string       `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	WalletID           string       `gorm:"type:uuid;not null" json:"wallet_id"`
	RequesterID        string       `gorm:"type:uuid;not null" json:"requester_id"`
	RequesterType      WalletOwnerType `gorm:"type:varchar(20);not null" json:"requester_type"`
	
	Amount             float64      `gorm:"type:decimal(15,2);not null" json:"amount"`
	Fee                float64      `gorm:"type:decimal(15,2);not null;default:0" json:"fee"`
	NetAmount          float64      `gorm:"type:decimal(15,2);not null" json:"net_amount"`

	BankName           string       `gorm:"type:varchar(100);not null" json:"bank_name"`
	BankAccountNumber  string       `gorm:"type:text;not null" json:"bank_account_number"`
	BankAccountName    string       `gorm:"type:varchar(200);not null" json:"bank_account_name"`
	
	Status             PayoutStatus `gorm:"type:varchar(50);default:'requested';not null" json:"status"`
	Notes              string       `gorm:"type:text" json:"notes"`

	ReviewedBy         *string      `gorm:"type:uuid" json:"reviewed_by"`
	ReviewedAt         *time.Time   `json:"reviewed_at"`
	ProcessedAt        *time.Time   `json:"processed_at"`

	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
}

type RefundStatus string

const (
	RefundPending    RefundStatus = "pending"
	RefundProcessing RefundStatus = "processing"
	RefundApproved   RefundStatus = "approved"
	RefundRejected   RefundStatus = "rejected"
	RefundCompleted  RefundStatus = "completed"
)

type Refund struct {
	ID              string       `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OrderID         string       `gorm:"type:uuid;not null" json:"order_id"`
	OrderMerchantGroupID *string `gorm:"type:uuid" json:"order_merchant_group_id"`
	RequestedBy     string       `gorm:"type:uuid;not null" json:"requested_by"`
	Reason          string       `gorm:"type:text;not null" json:"reason"`
	Amount          float64      `gorm:"type:decimal(15,2);not null" json:"amount"`
	Status          RefundStatus `gorm:"type:varchar(50);default:'pending';not null" json:"status"`
	
	ApprovedBy      *string      `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt      *time.Time   `json:"approved_at"`
	ProcessedAt     *time.Time   `json:"processed_at"`
	
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}
