package models

import (
	"time"
)

type AffiliateStatus string

const (
	AffiliateActive              AffiliateStatus = "active"
	AffiliateInactive            AffiliateStatus = "inactive"
	AffiliateSuspended           AffiliateStatus = "suspended"
	AffiliatePendingVerification AffiliateStatus = "pending_verification"
)

type CommissionStatus string

const (
	CommissionPending   CommissionStatus = "pending"
	CommissionApproved  CommissionStatus = "approved"
	CommissionPaid      CommissionStatus = "paid"
	CommissionRejected  CommissionStatus = "rejected"
	CommissionCancelled CommissionStatus = "cancelled"
)

type AffiliateMember struct {
	ID               string          `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID           string          `gorm:"type:uuid;unique;not null" json:"user_id"`
	MembershipTierID uint            `gorm:"not null" json:"membership_tier_id"`
	RefCode          string          `gorm:"type:varchar(20);unique;not null" json:"ref_code"`
	Status           AffiliateStatus `gorm:"type:varchar(50);default:'pending_verification';not null" json:"status"`

	KTPNumber         string  `gorm:"type:varchar(20)" json:"ktp_number"`
	BankName          string  `gorm:"type:varchar(100)" json:"bank_name"`
	BankAccountNumber string  `gorm:"type:text" json:"bank_account_number"`
	BankAccountName   string  `gorm:"type:varchar(200)" json:"bank_account_name"`

	TotalClicks      int64   `gorm:"default:0" json:"total_clicks"`
	TotalConversions int     `gorm:"default:0" json:"total_conversions"`
	TotalEarned      float64 `gorm:"type:decimal(15,2);default:0" json:"total_earned"`
	TotalWithdrawn   float64 `gorm:"type:decimal(15,2);default:0" json:"total_withdrawn"`
	PostbackURL      string  `gorm:"type:text" json:"postback_url"`
	
	// Networking
	UplineID         *string `gorm:"type:uuid" json:"upline_id"`
	UplineCode       string  `gorm:"type:varchar(20)" json:"upline_code"`
	
	Flags            string  `gorm:"type:text" json:"flags"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Tier *MembershipTier `gorm:"foreignKey:MembershipTierID" json:"tier,omitempty"`
}

type MembershipTier struct {
	ID                   uint    `gorm:"primaryKey" json:"id"`
	Name                 string  `gorm:"type:varchar(50);unique;not null" json:"name"`
	Level                int     `gorm:"unique;not null" json:"level"`
	BaseCommissionRate   float64 `gorm:"type:decimal(5,4);not null" json:"base_commission_rate"`
	MonthlyFee           float64 `gorm:"type:decimal(15,2);default:0" json:"monthly_fee"`
	MinEarningsUpgrade   float64 `gorm:"type:decimal(15,2)" json:"min_earnings_upgrade"`
	MaxWithdrawalMonthly float64 `gorm:"type:decimal(15,2)" json:"max_withdrawal_monthly"`
	MinWithdrawalAmount  float64 `gorm:"type:decimal(15,2);default:100000" json:"min_withdrawal_amount"`
	CommissionHoldDays   int     `gorm:"default:7" json:"commission_hold_days"`
	CookieDurationDays   int     `gorm:"default:30" json:"cookie_duration_days"`
	IsActive             bool    `gorm:"default:true" json:"is_active"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type AffiliateCommission struct {
	ID          string           `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	AffiliateID string           `gorm:"type:uuid;not null;index" json:"affiliate_id"`
	OrderID     string           `gorm:"type:uuid;not null;index" json:"order_id"`
	OrderItemID string           `gorm:"type:uuid;not null;index" json:"order_item_id"`
	ProductID   string           `gorm:"type:uuid" json:"product_id"`
	MerchantID  string           `gorm:"type:uuid" json:"merchant_id"`

	GrossAmount float64          `gorm:"type:decimal(15,2);not null" json:"gross_amount"`
	RateApplied float64          `gorm:"type:decimal(5,4);not null" json:"rate_applied"`
	Amount      float64          `gorm:"type:decimal(15,2);not null" json:"amount"`
	Status      CommissionStatus `gorm:"type:varchar(50);default:'pending';not null" json:"status"`

	HoldUntil  *time.Time `json:"hold_until"`
	ApprovedAt *time.Time `json:"approved_at"`
	ApprovedBy *string    `gorm:"type:uuid" json:"approved_by"`
	PaidAt     *time.Time `json:"paid_at"`

	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

type AffiliateLink struct {
	ID          string `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	AffiliateID string `gorm:"type:uuid;not null;index" json:"affiliate_id"`
	TargetURL   string `gorm:"type:text;not null" json:"target_url"`
	ShortCode   string `gorm:"type:varchar(20);unique;not null" json:"short_code"`
	Title       string `gorm:"type:varchar(255)" json:"title"`

	ProductID  *string `gorm:"type:uuid" json:"product_id"`
	MerchantID *string `gorm:"type:uuid" json:"merchant_id"`

	ClicksCount      int64   `gorm:"default:0" json:"clicks_count"`
	ConversionsCount int     `gorm:"default:0" json:"conversions_count"`
	TotalCommission  float64 `gorm:"type:decimal(15,2);default:0" json:"total_commission"`

	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type AffiliateClickLog struct {
	ID              string `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	AffiliateID     string `gorm:"type:uuid;not null;index" json:"affiliate_id"`
	AffiliateLinkID *string `gorm:"type:uuid" json:"affiliate_link_id"`
	RefCode         string `gorm:"type:varchar(20);not null;index" json:"ref_code"`
	IPAddress       string `gorm:"type:inet" json:"ip_address"`
	UserAgent       string `gorm:"type:text" json:"user_agent"`
	ReferrerURL     string `gorm:"type:text" json:"referrer_url"`
	IsUnique        bool   `gorm:"default:true" json:"is_unique"`
	IsConverted     bool   `gorm:"default:false" json:"is_converted"`
	OrderID         *string `gorm:"type:uuid" json:"order_id"`
	DeviceFingerprint string `gorm:"type:varchar(255)" json:"device_fingerprint"`
	FraudScore      int    `gorm:"default:0" json:"fraud_score"`
	ClickedAt       time.Time `gorm:"autoCreateTime" json:"clicked_at"`
}

// AffiliateWithdrawal - permintaan pencairan komisi affiliate
type AffiliateWithdrawal struct {
	ID                string     `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	AffiliateID       string     `gorm:"type:uuid;not null;index" json:"affiliate_id"`
	Amount            float64    `gorm:"type:decimal(15,2);not null" json:"amount"`
	BankName          string     `gorm:"type:varchar(100)" json:"bank_name"`
	BankAccountNumber string     `gorm:"type:text" json:"bank_account_number"`
	BankAccountName   string     `gorm:"type:varchar(200)" json:"bank_account_name"`
	Status            string     `gorm:"type:varchar(50);default:'pending'" json:"status"` // pending, processed, completed, rejected
	Note              string     `gorm:"type:text" json:"note"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
	ProcessedAt       *time.Time `json:"processed_at"`
}

func (AffiliateMember) TableName() string     { return "affiliate_members" }
func (MembershipTier) TableName() string       { return "membership_tiers" }
func (AffiliateCommission) TableName() string  { return "affiliate_commissions" }
func (AffiliateLink) TableName() string        { return "affiliate_links" }
func (AffiliateClickLog) TableName() string    { return "affiliate_click_logs" }
func (AffiliateWithdrawal) TableName() string  { return "affiliate_withdrawals" }

