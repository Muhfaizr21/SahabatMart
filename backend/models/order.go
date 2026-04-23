package models

import (
	"time"
)

type OrderStatus string

const (
	OrderPendingPayment OrderStatus = "pending_payment"
	OrderPaid           OrderStatus = "paid"
	OrderProcessing     OrderStatus = "processing"
	OrderReadyToShip    OrderStatus = "ready_to_ship"
	OrderShipped        OrderStatus = "shipped"
	OrderDelivered      OrderStatus = "delivered"
	OrderCompleted      OrderStatus = "completed"
	OrderCancelled      OrderStatus = "cancelled"
	OrderRefundRequested OrderStatus = "refund_requested"
	OrderRefundProcessing OrderStatus = "refund_processing"
	OrderRefunded       OrderStatus = "refunded"
	OrderDisputed       OrderStatus = "disputed"
	OrderFrozen         OrderStatus = "frozen" // Transaksi dibekukan oleh admin
)

type MerchantOrderStatus string

const (
	MOrderNew            MerchantOrderStatus = "new"
	MOrderConfirmed      MerchantOrderStatus = "confirmed"
	MOrderProcessing     MerchantOrderStatus = "processing"
	MOrderPacked         MerchantOrderStatus = "packed"
	MOrderHandedToCourier MerchantOrderStatus = "handed_to_courier"
	MOrderShipped        MerchantOrderStatus = "shipped"
	MOrderDelivered      MerchantOrderStatus = "delivered"
	MOrderCompleted      MerchantOrderStatus = "completed"
	MOrderCancelled      MerchantOrderStatus = "cancelled"
	MOrderRefundRequested MerchantOrderStatus = "refund_requested"
	MOrderRefunded       MerchantOrderStatus = "refunded"
)

type Order struct {
	ID                  string         `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OrderNumber         string         `gorm:"type:varchar(30);unique;not null" json:"order_number"`
	BuyerID             *string        `gorm:"type:uuid" json:"buyer_id"`
	CashierID           *string        `gorm:"type:uuid" json:"cashier_id"`
	OrderType           string         `gorm:"type:varchar(20);default:'online';not null" json:"order_type"` // online, pos
	
	// Affiliate attribution
	AffiliateID         *string        `gorm:"type:uuid" json:"affiliate_id"`
	AffiliateRefCode    *string        `gorm:"type:varchar(20)" json:"affiliate_ref_code"`
	AffiliateClickID    *string        `gorm:"type:uuid" json:"affiliate_click_id"`
	
	// Shipping Snapshot (Nullable for POS)
	ShippingName        string         `gorm:"type:varchar(150)" json:"shipping_name"`
	ShippingPhone       string         `gorm:"type:varchar(20)" json:"shipping_phone"`
	ShippingAddress     string         `gorm:"type:text" json:"shipping_address"`
	ShippingDistrict    string         `gorm:"type:varchar(100)" json:"shipping_district"`
	ShippingCity        string         `gorm:"type:varchar(100)" json:"shipping_city"`
	ShippingProvince    string         `gorm:"type:varchar(100)" json:"shipping_province"`
	ShippingPostalCode  string         `gorm:"type:varchar(10)" json:"shipping_postal_code"`
	
	// Financials
	Subtotal            float64        `gorm:"type:decimal(15,2);not null" json:"subtotal"`
	TotalShippingCost   float64        `gorm:"type:decimal(15,2);not null;default:0" json:"total_shipping_cost"`
	TotalPlatformFee    float64        `gorm:"type:decimal(15,2);not null;default:0" json:"total_platform_fee"`
	TotalCommission     float64        `gorm:"type:decimal(15,2);not null;default:0" json:"total_commission"`
	TotalDiscount       float64        `gorm:"type:decimal(15,2);not null;default:0" json:"total_discount"`
	GrandTotal          float64        `gorm:"type:decimal(15,2);not null" json:"grand_total"`
	TotalWeight         float64        `gorm:"type:decimal(10,3);default:0" json:"total_weight"`
	
	VoucherID           *uint          `gorm:"index" json:"voucher_id"`
	VoucherCode         string         `gorm:"type:varchar(50)" json:"voucher_code"`

	Status              OrderStatus    `gorm:"type:varchar(50);default:'pending_payment';not null" json:"status"`
	Notes               string         `gorm:"type:text" json:"notes"`
	CancelReason        string         `gorm:"type:text" json:"cancel_reason"`
	CancelledBy         *string        `gorm:"type:uuid" json:"cancelled_by"`
	CancelledAt         *time.Time     `json:"cancelled_at"`

	PaidAt              *time.Time     `json:"paid_at"`
	ExpiredAt           *time.Time     `json:"expired_at"`
	CompletedAt         *time.Time     `json:"completed_at"`
	AutoCompleteAt      *time.Time     `json:"auto_complete_at"`

	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`

	MerchantGroups      []OrderMerchantGroup `gorm:"foreignKey:OrderID" json:"merchant_groups"`
	Items               []OrderItem          `gorm:"foreignKey:OrderID" json:"items"`
	Payment             *Payment             `gorm:"foreignKey:OrderID" json:"payment"`
}

type OrderMerchantGroup struct {
	ID              string              `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OrderID         string              `gorm:"type:uuid;not null;index" json:"order_id"`
	MerchantID      string              `gorm:"type:uuid;not null;index" json:"merchant_id"` // Sang Distributor
	Status          MerchantOrderStatus `gorm:"type:varchar(50);default:'new';not null" json:"status"`

	Subtotal        float64             `gorm:"type:decimal(15,2);not null" json:"subtotal"`
	ShippingCost    float64             `gorm:"type:decimal(15,2);not null;default:0" json:"shipping_cost"`
	PlatformFee     float64             `gorm:"type:decimal(15,2);not null;default:0" json:"platform_fee"`
	
	// Dual Commissions
	DistributionCommission float64     `gorm:"type:decimal(15,2);not null;default:0" json:"distribution_commission"` // Jatah Merchant Distributor
	AffiliateCommission    float64     `gorm:"type:decimal(15,2);not null;default:0" json:"affiliate_commission"`    // Jatah Pengajak (Affiliate)
	
	Commission      float64             `gorm:"type:decimal(15,2);not null;default:0" json:"commission"` // Legacy/Total
	Discount        float64             `gorm:"type:decimal(15,2);not null;default:0" json:"discount"`
	MerchantPayout  float64             `gorm:"type:decimal(15,2);not null;default:0" json:"merchant_payout"`

	CourierCode     string              `gorm:"type:varchar(50)" json:"courier_code"`
	ServiceCode     string              `gorm:"type:varchar(50)" json:"service_code"`
	TrackingNumber  string              `gorm:"type:varchar(100)" json:"tracking_number"`
	ShippedAt       *time.Time          `json:"shipped_at"`
	DeliveredAt     *time.Time          `json:"delivered_at"`
	
	Merchant        *Merchant           `gorm:"foreignKey:MerchantID" json:"merchant"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`

	Items           []OrderItem         `gorm:"foreignKey:OrderMerchantGroupID" json:"items"`
}

type OrderItem struct {
	ID                    string  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OrderID               string  `gorm:"type:uuid;not null;index" json:"order_id"`
	OrderMerchantGroupID  string  `gorm:"type:uuid;not null;index" json:"order_merchant_group_id"`
	MerchantID           string  `gorm:"type:uuid;not null" json:"merchant_id"` // Sang Distributor
	ProductID            string  `gorm:"type:uuid;not null" json:"product_id"`
	ProductVariantID     *string `gorm:"type:uuid" json:"product_variant_id"`

	ProductName          string  `gorm:"type:varchar(255);not null" json:"product_name"`
	VariantName          string  `gorm:"type:varchar(255)" json:"variant_name"`
	SKU                  string  `gorm:"type:varchar(100)" json:"sku"`
	ProductImageURL      string  `gorm:"type:text" json:"product_image_url"`

	Quantity             int     `gorm:"not null" json:"quantity"`
	UnitPrice            float64 `gorm:"type:decimal(15,2);not null" json:"unit_price"`
	Subtotal             float64 `gorm:"type:decimal(15,2);not null" json:"subtotal"`
	Metadata             string  `gorm:"type:text" json:"metadata"` // JSON: {color: "Black"}
	PlatformFeeAmount    float64 `gorm:"type:decimal(15,2);not null;default:0" json:"platform_fee_amount"`
	
	// Commissions
	CommissionRate         float64 `gorm:"type:decimal(5,4);not null;default:0" json:"commission_rate"`           // Affiliate Rate
	CommissionAmount       float64 `gorm:"type:decimal(15,2);not null;default:0" json:"commission_amount"`         // Affiliate Amount
	DistributionFeeAmount  float64 `gorm:"type:decimal(15,2);not null;default:0" json:"distribution_fee_amount"`  // Distributor Amount
	
	DiscountAmount       float64 `gorm:"type:decimal(15,2);not null;default:0" json:"discount_amount"`
	MerchantAmount       float64 `gorm:"type:decimal(15,2);not null" json:"merchant_amount"` // Net for Distributor

	CreatedAt            time.Time `json:"created_at"`
}

type OrderStatusHistory struct {
	ID         string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	OrderID    string    `gorm:"type:uuid" json:"order_id"`
	GroupID    *string   `gorm:"type:uuid" json:"group_id"`
	Status     string    `gorm:"type:varchar(50);not null" json:"status"`
	Note       string    `gorm:"type:text" json:"note"`
	ChangedBy  string    `gorm:"type:uuid" json:"changed_by"`
	ChangedAt  time.Time `gorm:"autoCreateTime" json:"changed_at"`
}
