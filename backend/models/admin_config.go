package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	AdminID = "00000000-0000-0000-0000-000000000001"
	PusatID = "00000000-0000-0000-0000-000000000000"
)

// ProductTierCommission mengatur komisi spesifik per produk per jenjang (Req 1 & 2)
type ProductTierCommission struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	ProductID      string  `gorm:"type:uuid;not null;index" json:"product_id"`
	MembershipTierID uint  `gorm:"not null;index" json:"membership_tier_id"`
	CommissionRate float64 `gorm:"type:decimal(5,4);not null" json:"commission_rate"` // e.g. 0.10 = 10%
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (ProductTierCommission) TableName() string { return "product_tier_commissions" }

// PlatformConfig menyimpan pengaturan global platform
type PlatformConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"key"`
	Value       string    `gorm:"type:text" json:"value"`
	Description string    `json:"description"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CategoryCommission mengatur komisi berdasarkan kategori produk
type CategoryCommission struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	CategoryName string  `gorm:"type:varchar(100);uniqueIndex;not null" json:"category_name"`
	FeePercent   float64 `gorm:"type:decimal(5,2);not null" json:"fee_percent"`
	AffiliateFee float64 `gorm:"type:decimal(5,2);default:0" json:"affiliate_fee"`
	DistFee      float64 `gorm:"type:decimal(5,2);default:0" json:"dist_fee"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// MerchantCommission Override komisi per merchant (Special Deal)
type MerchantCommission struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	MerchantID string  `gorm:"type:uuid;uniqueIndex;not null" json:"merchant_id"`
	FeePercent float64 `gorm:"type:decimal(5,2);not null" json:"fee_percent"`
	AffiliateFee float64 `gorm:"type:decimal(5,2);default:0" json:"affiliate_fee"`
	DistFee      float64 `gorm:"type:decimal(5,2);default:0" json:"dist_fee"`
	Note       string  `gorm:"type:text" json:"note"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}


// AuditLog mencatat semua aksi admin ke sistem
type AuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	AdminID    string    `gorm:"type:uuid;not null" json:"admin_id"`
	Action     string    `gorm:"type:varchar(100);not null" json:"action"`
	TargetType string    `gorm:"type:varchar(50)" json:"target_type"` // "user","merchant","product","config"
	TargetID   string    `gorm:"type:varchar(100)" json:"target_id"`
	Detail     string    `gorm:"type:text" json:"detail"`
	IPAddress  string    `gorm:"type:inet" json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
}

// PayoutRequest adalah permintaan pencairan saldo merchant
type PayoutRequest struct {
	ID          string     `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	MerchantID  string     `gorm:"type:uuid;not null" json:"merchant_id"`
	Amount      float64    `gorm:"type:decimal(15,2);not null" json:"amount"`
	BankName          string     `gorm:"type:varchar(100)" json:"bank_name"`
	BankAccountNumber string     `gorm:"type:text" json:"bank_account_number"`
	BankAccountName   string     `gorm:"type:varchar(200)" json:"bank_account_name"`
	Status      string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, approved, rejected, paid
	Note        string     `gorm:"type:text" json:"note"`
	RequestedAt time.Time  `json:"requested_at"`
	ProcessedAt *time.Time `json:"processed_at"`
	ProcessedBy *string    `gorm:"type:uuid" json:"processed_by"`
}

// Merchant menyimpan data toko merchant
type Merchant struct {
	ID          string     `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID      string     `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	StoreName   string     `gorm:"type:varchar(150);not null" json:"store_name"`
	Slug        string     `gorm:"type:varchar(150);uniqueIndex" json:"slug"`
	Description string     `gorm:"type:text" json:"description"`
	LogoURL     string     `gorm:"type:text" json:"logo_url"`
	BannerURL   string     `gorm:"type:text" json:"banner_url"`
	Status      string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, active, suspended, banned
	IsVerified  bool       `gorm:"default:false" json:"is_verified"`
	Balance     float64    `gorm:"type:decimal(15,2);default:0" json:"balance"`
	TotalSales  float64    `gorm:"type:decimal(15,2);default:0" json:"total_sales"`
	
	// Akuglow Specifics
	City              string  `gorm:"type:varchar(100)" json:"city"` // Untuk filtering merchant terdekat
	ActiveMitraCount int     `gorm:"default:0" json:"active_mitra_count"`
	TeamMonthlyTurnover float64 `gorm:"type:decimal(15,2);default:0" json:"team_monthly_turnover"`
	DistributionFeePercent float64 `gorm:"type:decimal(5,2);default:0" json:"distribution_fee_percent"` // Komisi distribusi
	BiteshipAreaID         string  `gorm:"type:varchar(100)" json:"biteship_area_id"`                 // Origin for Biteship
	EnabledCouriers       string  `gorm:"type:text" json:"enabled_couriers"`                         // Comma-separated courier codes

	JoinedAt    time.Time  `json:"joined_at"`
	SuspendedAt *time.Time `json:"suspended_at"`
	SuspendNote string     `gorm:"type:text" json:"suspend_note"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Inventory menyimpan stok produk di berbagai gudang (Pusat/Merchant)
type Inventory struct {
	ID         string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ProductID  string    `gorm:"type:uuid;not null;index" json:"product_id"`
	MerchantID string    `gorm:"type:uuid;not null;index" json:"merchant_id"` // ID Merchant atau ID "SYSTEM_PUSAT"
	Stock      int       `gorm:"default:0" json:"stock"`
	BasePrice  float64   `gorm:"type:decimal(15,2);default:0" json:"base_price"` // Harga beli/dasar saat sync terakhir
	LastSyncPrice time.Time `json:"last_sync_price"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// RestockRequest permintaan stok merchant ke pusat
type RestockRequest struct {
	ID          string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	MerchantID  string    `gorm:"type:uuid;not null;index" json:"merchant_id"`
	Status      string    `gorm:"type:varchar(50);default:'requested'" json:"status"` // requested, approved, shipped, received, rejected
	TotalItems  int       `json:"total_items"`
	TotalPrice  float64   `gorm:"type:decimal(15,2);default:0" json:"total_price"`
	Note        string    `gorm:"type:text" json:"note"`
	AdminNote   string    `gorm:"type:text" json:"admin_note"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	Items       []RestockItem `gorm:"foreignKey:RestockID" json:"items"`
	Merchant    Merchant      `gorm:"foreignKey:MerchantID;references:ID" json:"merchant"`
	TrackingNumber string    `gorm:"type:varchar(100)" json:"tracking_number"` // Resi pengiriman B2B ke merchant
	PaymentMethod  string    `gorm:"type:varchar(50);default:'transfer'" json:"payment_method"` // wallet, transfer
	IsPaid         bool      `gorm:"default:false" json:"is_paid"`
}

// Supplier pabrik/penyedia barang ke pusat
type Supplier struct {
	ID        string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Contact   string    `gorm:"type:varchar(100)" json:"contact"`
	Phone     string    `gorm:"type:varchar(20)" json:"phone"`
	Email     string    `gorm:"type:varchar(100)" json:"email"`
	Address   string    `gorm:"type:text" json:"address"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// InboundStock penerimaan barang dari supplier ke pusat
type InboundStock struct {
	ID          string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	SupplierID  string    `gorm:"type:uuid;not null;index" json:"supplier_id"`
	ReferenceNo string    `gorm:"type:varchar(100)" json:"reference_no"` // Nomor PO atau Surat Jalan Supplier
	Status      string    `gorm:"type:varchar(50);default:'received'" json:"status"` // pending, received, cancelled
	Note        string    `gorm:"type:text" json:"note"`
	TotalItems  int       `json:"total_items"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Supplier    Supplier      `gorm:"foreignKey:SupplierID" json:"supplier"`
	Items       []InboundItem `gorm:"foreignKey:InboundID" json:"items"`
}

type InboundItem struct {
	ID         string  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InboundID  string  `gorm:"type:uuid;not null;index" json:"inbound_id"`
	ProductID  string  `gorm:"type:uuid;not null;index" json:"product_id"`
	Quantity   int     `json:"quantity"`
	CostPrice  float64 `gorm:"type:decimal(15,2)" json:"cost_price"` // COGS saat barang masuk
	CreatedAt  time.Time `json:"created_at"`
}

// StockMutation Mata Elang: Pencatatan mutasi stok global
type StockMutation struct {
	ID          string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ProductID   string    `gorm:"type:uuid;not null;index" json:"product_id"`
	MerchantID  string    `gorm:"type:uuid;not null;index" json:"merchant_id"` // Lokasi gudang (Pusat atau Cabang)
	Type        string    `gorm:"type:varchar(50)" json:"type"` // IN (Supplier), OUT (Order), RESTOCK_OUT (Pusat ke Cabang), RESTOCK_IN (Cabang nerima dari Pusat), ADJUST (Manual)
	Quantity    int       `json:"quantity"`
	Reference   string    `gorm:"type:varchar(255)" json:"reference"` // ID Order, ID Restock, ID Inbound
	StockBefore int       `json:"stock_before"`
	StockAfter  int       `json:"stock_after"`
	Note        string    `gorm:"type:text" json:"note"`
	CreatedAt   time.Time `json:"created_at"`
}

type RestockItem struct {
	ID        string `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RestockID string `gorm:"type:uuid;not null;index" json:"restock_id"`
	ProductID string `gorm:"type:uuid;not null" json:"product_id"`
	Quantity  int    `gorm:"not null" json:"quantity"`
	UnitPrice float64 `gorm:"type:decimal(15,2);not null;default:0" json:"unit_price"`
	Subtotal  float64 `gorm:"type:decimal(15,2);not null;default:0" json:"subtotal"`

	Product   Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// AffiliateConfig tier/setting afiliasi
type AffiliateConfig struct {
	ID            uint    `gorm:"primaryKey" json:"id"`
	TierName      string  `gorm:"type:varchar(50);not null" json:"tier_name"`   // bronze, silver, gold, platinum
	CommRate      float64 `gorm:"type:decimal(5,4);not null" json:"comm_rate"` // 0.03 = 3%
	MinSales      float64 `gorm:"type:decimal(15,2);default:0" json:"min_sales"`
	MaxSales      float64 `gorm:"type:decimal(15,2);default:0" json:"max_sales"`
	BonusRate     float64 `gorm:"type:decimal(5,4);default:0" json:"bonus_rate"`
	IsActive      bool    `gorm:"default:true" json:"is_active"`
}

// Category produk
type Category struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Slug        string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	ParentID    *uint     `json:"parent_id"`
	Order       int       `gorm:"default:0" json:"order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Brand merk produk
type Brand struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	LogoURL      string    `gorm:"type:text" json:"logo_url"`
	IsFeatured   bool      `gorm:"default:false" json:"is_featured"`
	ProductCount int64     `gorm:"-" json:"product_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// Attribute global (Ukuran, Warna, dsb)
type Attribute struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"` // "Ukuran", "Warna"
	Type      string    `gorm:"type:varchar(20)" json:"type"`           // "dropdown", "color-picker"
	Values    string    `gorm:"type:text" json:"values"`                // JSON string: ["S","M","XL"]
	CreatedAt time.Time `json:"created_at"`
}

// Voucher diskon platform atau merchant
type Voucher struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	MerchantID    *string   `gorm:"type:uuid;index" json:"merchant_id"` // NULL jika platform voucher
	Code          string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Title         string    `gorm:"type:varchar(100)" json:"title"`
	Description   string    `gorm:"type:text" json:"description"`
	DiscountType  string    `gorm:"type:varchar(20);default:'fixed'" json:"discount_type"` // "percent", "fixed"
	DiscountValue float64   `gorm:"type:decimal(15,2)" json:"discount_value"`
	MinOrder      float64   `gorm:"type:decimal(15,2)" json:"min_order"`
	Quota         int       `gorm:"default:0" json:"quota"`
	Used          int       `gorm:"default:0" json:"used"`
	Status        string    `gorm:"type:varchar(20);default:'active'" json:"status"`
	BgColor       string    `gorm:"type:varchar(20);default:'bg-blue-600'" json:"bg_color"`
	ExpiryDate    time.Time `json:"expiry_date"`
}

// Dispute sengketa pengembalian dana
type Dispute struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	OrderID      string     `gorm:"type:uuid;not null" json:"order_id"`
	BuyerID      string     `gorm:"type:uuid;not null" json:"buyer_id"`
	MerchantID   string     `gorm:"type:uuid;not null" json:"merchant_id"`
	Reason       string     `gorm:"type:text" json:"reason"`
	Amount       float64    `gorm:"type:decimal(15,2);not null;default:0" json:"amount"`
	Attachments  string     `gorm:"type:text" json:"attachments"`                  // JSON array URLs
	Status       string     `gorm:"type:varchar(20);default:'open'" json:"status"` // open, pending, merchant_refused, refund_approved, rejected
	DecisionNote string     `gorm:"type:text" json:"decision_note"`
	DecidedBy    string     `gorm:"type:uuid" json:"decided_by"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// LogisticChannel ekspedisi
type LogisticChannel struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Code     string `gorm:"type:varchar(20);uniqueIndex" json:"code"` // JNE, SICEPAT
	Name     string `gorm:"type:varchar(100)" json:"name"`
	IsActive bool   `gorm:"default:true" json:"is_active"`
}

// AffiliateClick log untuk deteksi fraud & deep tracking
type AffiliateClick struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	AffiliateID string    `gorm:"type:uuid" json:"affiliate_id"`
	ProductID   string    `gorm:"type:uuid" json:"product_id"`
	Referrer    string    `gorm:"type:text" json:"referrer"`
	IPAddress   string    `gorm:"type:inet" json:"ip_address"`
	UserAgent   string    `gorm:"type:text" json:"user_agent"`
	SubID1      string    `gorm:"type:varchar(100)" json:"sub_id_1"` // Support professional tracking
	SubID2      string    `gorm:"type:varchar(100)" json:"sub_id_2"`
	SubID3      string    `gorm:"type:varchar(100)" json:"sub_id_3"`
	IsBot       bool      `gorm:"default:false" json:"is_bot"`
	IsFraud     bool      `gorm:"default:false" json:"is_fraud"`
	CreatedAt   time.Time `json:"created_at"`
}

// Region data wilayah (Province, City, etc)
type Region struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	ParentID uint   `gorm:"default:0" json:"parent_id"`
	Name     string `gorm:"type:varchar(100);not null" json:"name"`
	Type     string `gorm:"type:varchar(20)" json:"type"` // province, city, district
	ZipCode  string `gorm:"type:varchar(10)" json:"zip_code"`
}

type Notification struct {
	ID           string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID       string    `gorm:"type:uuid;not null;index" json:"user_id"` // Backwards compatibility & DB Constraint
	ReceiverID   string    `gorm:"type:uuid;index" json:"receiver_id"`     // Global ID (User ID or Merchant ID)
	ReceiverType string    `gorm:"type:varchar(20);index" json:"receiver_type"` // admin, merchant, buyer
	Type         string    `gorm:"type:varchar(50)" json:"type"`           // order_new, payout_approved, product_approved, dispute_new
	Title        string    `gorm:"type:varchar(100)" json:"title"`
	Message      string    `gorm:"type:text;column:body" json:"message"` // Synced with DB 'body' column
	Body         string    `gorm:"type:text;column:body" json:"body"`    // Alias for 'body' column to satisfy constraint
	Link         string    `gorm:"type:varchar(255)" json:"link"`
	IsRead       bool      `gorm:"default:false" json:"is_read"`
	CreatedAt    time.Time `json:"created_at"`
}


// BlogPost untuk CMS SahabatMart
type BlogPost struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	Slug      string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"slug"`
	Summary   string    `gorm:"type:text" json:"summary"`
	Content   string    `gorm:"type:text" json:"content"`
	Author    string    `gorm:"type:varchar(100)" json:"author"`
	Category  string    `gorm:"type:varchar(100)" json:"category"`
	Image     string    `gorm:"type:text" json:"image"`
	Status    string    `gorm:"type:varchar(20);default:'published'" json:"status"` // published, draft
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Product utama platform (Master Product Pusat)
type Product struct {
	ID          string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	Slug        string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"slug"`
	SKU         string    `gorm:"type:varchar(100);unique;index" json:"sku"`
	Description string    `gorm:"type:text" json:"description"`
	Price       float64   `gorm:"type:decimal(15,2);not null" json:"price"`
	WholesalePrice float64 `gorm:"type:decimal(15,2);default:0" json:"wholesale_price"` // Harga khusus merchant
	OldPrice    float64   `gorm:"type:decimal(15,2)" json:"old_price"`
	COGS        float64   `gorm:"type:decimal(15,2);not null;default:0" json:"cogs"` // Modal Awal
	
	// Master Config
	IsMaster    bool      `gorm:"default:false" json:"is_master"`
	SupplierID  string    `gorm:"type:uuid;index" json:"supplier_id"`
	
	// Global Info
	Category    string    `gorm:"type:varchar(100)" json:"category"`
	Brand       string    `gorm:"type:varchar(100)" json:"brand"`
	Attributes  string     `gorm:"type:text" json:"attributes"` // JSON: {color: "red", size: "XL"}
	Image       string     `gorm:"type:text" json:"image"`
	Images      string     `gorm:"type:text" json:"images"` // JSON Array: ["url1", "url2", "url3"]
	
	// Distribution Specs
	BaseDistributionFee        float64 `gorm:"type:decimal(15,2);default:0" json:"base_distribution_fee"`
	BaseDistributionFeeNominal float64 `gorm:"type:decimal(15,2);default:0" json:"base_distribution_fee_nominal"`
	BaseAffiliateFee          float64 `gorm:"type:decimal(15,2);default:0" json:"base_affiliate_fee"`
	BaseAffiliateFeeNominal   float64 `gorm:"type:decimal(15,2);default:0" json:"base_affiliate_fee_nominal"`	
	
	// Merchant/Distributor Cut (Req 3)
	MerchantCommissionPercent float64  `gorm:"type:decimal(5,2);default:0" json:"merchant_commission_percent"` // Bagi hasil merchant per produk

	// Multi-Level Commission Preset (Req 4)
	// Assign preset ini untuk mendistribusikan komisi ke seluruh jaringan upline secara otomatis.
	CommissionPresetID *string `gorm:"type:uuid;index" json:"commission_preset_id"` // nullable = tidak pakai preset
	
	MerchantID  string    `gorm:"type:uuid;index" json:"merchant_id"`
	Stock       int       `gorm:"default:0" json:"stock"`

	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Rating      float64   `gorm:"type:decimal(2,1);default:0" json:"rating"`
	AverageRating float64 `gorm:"type:decimal(2,1);default:0" json:"average_rating"` // Satisfy legacy triggers
	TotalReviews  int     `gorm:"default:0" json:"total_reviews"`               // Satisfy legacy triggers
	Reviews     int       `gorm:"default:0" json:"reviews"`
	Badge       string    `gorm:"type:varchar(50)" json:"badge"`
	BadgeClass  string    `gorm:"type:varchar(50)" json:"badge_class"`
	Status      string    `gorm:"type:varchar(20);default:'active'" json:"status"` // active, taken_down, draft
	Weight      int       `gorm:"default:0" json:"weight"`                         // Weight in grams
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Variants    []ProductVariant `gorm:"foreignKey:ProductID" json:"variants"`
	Inventories []Inventory      `gorm:"foreignKey:ProductID" json:"inventories"`
}

// ProductVariant untuk variasi produk (warna, ukuran, dsb)
type ProductVariant struct {
	ID        string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ProductID string    `gorm:"type:uuid;not null;index" json:"product_id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"` // e.g., "Red, XL"
	SKU       string    `gorm:"type:varchar(100);unique;not null" json:"sku"`
	Price          float64   `gorm:"type:decimal(15,2);not null" json:"price"`
	WholesalePrice float64   `gorm:"type:decimal(15,2);not null;default:0" json:"wholesale_price"`
	COGS           float64   `gorm:"type:decimal(15,2);not null;default:0" json:"cogs"` // Modal Awal
	Stock          int       `gorm:"default:0" json:"stock"`
	Weight    int       `gorm:"default:0" json:"weight"` // Weight in grams (overrides product weight if > 0)
	Image     string    `gorm:"type:text" json:"image"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Cart persistence untuk buyer
type Cart struct {
	ID        string     `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	BuyerID   string     `gorm:"type:uuid;uniqueIndex;not null" json:"buyer_id"`
	Items     []CartItem `gorm:"foreignKey:CartID" json:"items"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CartItem struct {
	ID               string  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	CartID           string  `gorm:"type:uuid;not null;index" json:"cart_id"`
	MerchantID       string  `gorm:"type:uuid;not null" json:"merchant_id"`
	ProductID        string  `gorm:"type:uuid;not null" json:"product_id"`
	ProductVariantID string  `gorm:"type:uuid;not null" json:"product_variant_id"`
	Quantity         int       `gorm:"not null" json:"quantity"`
	Metadata         string    `gorm:"type:text" json:"metadata"` // JSON: {color: "Black"}
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	Product          Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	ProductVariant   ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
}

// Banner untuk Hero Slider Home Page
type Banner struct {
	ID       uint      `gorm:"primaryKey" json:"id"`
	Title    string    `gorm:"type:varchar(255);not null" json:"title"`
	SubTitle string    `gorm:"type:text" json:"subtitle"`
	Badge    string    `gorm:"type:varchar(100)" json:"badge"`
	Offer    string    `gorm:"type:varchar(100)" json:"offer"`
	Image    string    `gorm:"type:text" json:"image"`
	BgColor  string    `gorm:"type:varchar(20);default:'#3b82f6'" json:"bg_color"`
	Link     string    `gorm:"type:varchar(255)" json:"link"`
	Order    int       `gorm:"default:0" json:"order"`
	IsActive bool      `gorm:"default:true" json:"is_active"`
}

// Wishlist menyimpan produk favorit buyer
type Wishlist struct {
	ID        string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	BuyerID   string    `gorm:"type:uuid;not null;index:idx_buyer_product,unique" json:"buyer_id"`
	ProductID string    `gorm:"type:uuid;not null;index:idx_buyer_product,unique" json:"product_id"`
	CreatedAt time.Time `json:"created_at"`
}

func (PlatformConfig) TableName() string     { return "platform_configs" }
func (CategoryCommission) TableName() string  { return "category_commissions" }
func (MerchantCommission) TableName() string  { return "merchant_commissions" }
func (AuditLog) TableName() string            { return "audit_logs" }
func (PayoutRequest) TableName() string       { return "payout_requests" }
func (Merchant) TableName() string            { return "merchants" }
func (Category) TableName() string            { return "categories" }
func (Brand) TableName() string               { return "brands" }
func (Attribute) TableName() string           { return "attributes" }
func (Voucher) TableName() string             { return "vouchers" }
func (Dispute) TableName() string             { return "disputes" }
func (LogisticChannel) TableName() string     { return "logistic_channels" }
func (AffiliateClick) TableName() string      { return "affiliate_clicks" }
func (Region) TableName() string              { return "regions" }
func (ProductVariant) TableName() string      { return "product_variants" }
func (Cart) TableName() string                { return "carts" }
func (CartItem) TableName() string            { return "cart_items" }
func (Supplier) TableName() string            { return "suppliers" }
func (InboundStock) TableName() string        { return "inbound_stocks" }
func (InboundItem) TableName() string         { return "inbound_items" }
func (StockMutation) TableName() string       { return "stock_mutations" }
func (Notification) TableName() string        { return "notifications" }
func (BlogPost) TableName() string            { return "blog_posts" }
func (Inventory) TableName() string        { return "inventories" }
func (RestockRequest) TableName() string { return "restock_requests" }
func (RestockItem) TableName() string    { return "restock_items" }
func (Product) TableName() string             { return "products" }
func (Banner) TableName() string              { return "banners" }
func (Wishlist) TableName() string            { return "wishlists" }
