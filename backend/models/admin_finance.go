package models

import (
	"time"
)

// FinancialLocation: Gudang/Tempat penyimpanan dana (e.g. Kas Utama, Bank BCA, dll)
type FinancialLocation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Balance   float64   `gorm:"type:decimal(15,2);default:0" json:"balance"`
	IsPrimary bool      `gorm:"default:false" json:"is_primary"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (FinancialLocation) TableName() string { return "financial_locations" }

// MoneyMutation: Pencatatan mutasi dana antar lokasi finansial
type MoneyMutation struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	FromLocationID *uint      `json:"from_location_id"`
	ToLocationID   *uint      `json:"to_location_id"`
	Amount         float64    `gorm:"type:decimal(15,2);not null" json:"amount"`
	Category       string     `gorm:"type:varchar(100)" json:"category"`
	Description    string     `gorm:"type:text" json:"description"`
	Type           string     `gorm:"type:varchar(50)" json:"type"`                     // "transfer", "income", "expense"
	Status         string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // "pending", "processed"
	ProcessedAt    *time.Time `json:"processed_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (MoneyMutation) TableName() string { return "money_mutations" }

// FinanceRevenueAllocation: Rekapitulasi alokasi pendapatan per periode
type FinanceRevenueAllocation struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	Period      string  `gorm:"type:varchar(7);index" json:"period"` // YYYY-MM
	SourceType  string  `gorm:"type:varchar(50)" json:"source_type"` // "period_summary"
	SourceID    string  `gorm:"type:varchar(100)" json:"source_id"`
	SourceHash  string  `gorm:"type:varchar(150);uniqueIndex" json:"source_hash"`
	GrossAmount float64 `gorm:"type:decimal(15,2)" json:"gross_amount"`
	Allocation  string  `gorm:"type:text" json:"allocation"` // JSON detail alokasi (Tax, Ops, dll)

	// Stats fields for specific percentages
	Tax         float64 `json:"tax"`
	Operational float64 `json:"operational"`
	Zakat       float64 `json:"zakat"`
	Marketing   float64 `json:"marketing"`
	IT          float64 `json:"it"`
	PT          float64 `json:"pt"`
	Investor    float64 `json:"investor"`

	CreatedAt time.Time `json:"created_at"`
}

func (FinanceRevenueAllocation) TableName() string { return "finance_revenue_allocations" }
