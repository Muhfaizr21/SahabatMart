package services

import (
	"akuglow/backend/models"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

type VoucherService struct {
	DB *gorm.DB
}

func NewVoucherService(db *gorm.DB) *VoucherService {
	return &VoucherService{DB: db}
}

// VoucherValidateRequest berisi konteks dari checkout untuk validasi voucher
type VoucherValidateRequest struct {
	Code       string   `json:"code"`
	BuyerID    string   `json:"buyer_id"`
	Subtotal   float64  `json:"subtotal"`    // Total nilai keranjang
	ProductIDs []string `json:"product_ids"` // ID produk di keranjang
	Categories []string `json:"categories"`  // Kategori produk di keranjang
}

// VoucherValidateResult hasil validasi voucher
type VoucherValidateResult struct {
	Voucher        models.Voucher `json:"voucher"`
	DiscountAmount float64        `json:"discount_amount"` // Nominal diskon yang akan diberikan
	Message        string         `json:"message"`
}

// Validate memvalidasi voucher berdasarkan tipe dan konteks keranjang
func (s *VoucherService) Validate(req VoucherValidateRequest) (*VoucherValidateResult, error) {
	// 1. Ambil voucher dari database
	var voucher models.Voucher
	if err := s.DB.Where("UPPER(code) = UPPER(?)", req.Code).First(&voucher).Error; err != nil {
		return nil, fmt.Errorf("kode voucher tidak valid atau tidak ditemukan")
	}

	// 2. Validasi status dasar
	if voucher.Status != "active" {
		return nil, fmt.Errorf("voucher ini sedang tidak aktif")
	}

	now := time.Now()
	if !voucher.ExpiryDate.IsZero() && voucher.ExpiryDate.Before(now) {
		return nil, fmt.Errorf("voucher ini sudah kedaluwarsa")
	}

	if voucher.Quota > 0 && voucher.Used >= voucher.Quota {
		return nil, fmt.Errorf("kuota voucher ini sudah habis")
	}

	// 3. Validasi MinOrder (berlaku untuk semua tipe)
	if req.Subtotal < voucher.MinOrder {
		return nil, fmt.Errorf("minimal belanja Rp%s untuk menggunakan voucher ini",
			formatIDR(voucher.MinOrder))
	}

	// 4. Validasi tipe-spesifik
	switch voucher.VoucherType {
	case "first_order":
		if err := s.validateFirstOrder(voucher, req.BuyerID); err != nil {
			return nil, err
		}

	case "group":
		if err := s.validateGroup(voucher, req.Categories); err != nil {
			return nil, err
		}

	case "product":
		if err := s.validateProduct(voucher, req.ProductIDs); err != nil {
			return nil, err
		}

	case "cart_value":
		if err := s.validateCartValue(voucher, req.Subtotal); err != nil {
			return nil, err
		}

	case "platform", "":
		// Tidak ada validasi tambahan untuk voucher platform umum
	default:
		// Tipe tidak dikenal dianggap platform voucher
	}

	// 5. Hitung diskon
	discountAmount := s.calculateDiscount(voucher, req.Subtotal)

	return &VoucherValidateResult{
		Voucher:        voucher,
		DiscountAmount: discountAmount,
		Message:        fmt.Sprintf("Voucher berhasil! Hemat Rp%s", formatIDR(discountAmount)),
	}, nil
}

// IncrementUsage menambah counter pemakaian voucher (dipanggil saat order dibuat)
func (s *VoucherService) IncrementUsage(tx *gorm.DB, code string) error {
	return tx.Model(&models.Voucher{}).
		Where("UPPER(code) = UPPER(?)", code).
		UpdateColumn("used", gorm.Expr("used + 1")).Error
}

// ─── Private Validators ───────────────────────────────────────────────────────

// validateFirstOrder: Voucher hanya bisa digunakan pada pembelian pertama
func (s *VoucherService) validateFirstOrder(v models.Voucher, buyerID string) error {
	if buyerID == "" {
		return fmt.Errorf("voucher pembelian pertama hanya tersedia untuk member terdaftar")
	}
	var orderCount int64
	s.DB.Model(&models.Order{}).
		Where("buyer_id = ? AND status NOT IN (?)", buyerID,
			[]string{"cancelled", "expired"}).
		Count(&orderCount)
	if orderCount > 0 {
		return fmt.Errorf("voucher ini hanya berlaku untuk pembelian pertama Anda")
	}
	return nil
}

// validateGroup: Voucher hanya berlaku jika ada produk dari kategori yang dituju
func (s *VoucherService) validateGroup(v models.Voucher, categories []string) error {
	if v.TargetGroup == "" {
		return nil // Tidak ada target group, lewati
	}
	targetGroups := strings.Split(v.TargetGroup, ",")
	catMap := make(map[string]bool)
	for _, c := range categories {
		catMap[strings.ToLower(strings.TrimSpace(c))] = true
	}
	for _, tg := range targetGroups {
		if catMap[strings.ToLower(strings.TrimSpace(tg))] {
			return nil // Ada setidaknya satu produk dari kategori yang dimaksud
		}
	}
	return fmt.Errorf("voucher ini hanya berlaku untuk produk dalam kategori: %s", v.TargetGroup)
}

// validateProduct: Voucher hanya berlaku untuk produk tertentu
func (s *VoucherService) validateProduct(v models.Voucher, productIDs []string) error {
	if v.TargetProduct == "" {
		return nil
	}
	targetProducts := strings.Split(v.TargetProduct, ",")
	pidMap := make(map[string]bool)
	for _, pid := range productIDs {
		pidMap[strings.TrimSpace(pid)] = true
	}
	for _, tp := range targetProducts {
		if pidMap[strings.TrimSpace(tp)] {
			return nil // Ada setidaknya satu produk yang cocok
		}
	}
	return fmt.Errorf("voucher ini hanya berlaku untuk produk tertentu yang tidak ada di keranjang Anda")
}

// validateCartValue: Voucher hanya berlaku jika nilai keranjang mencapai ambang
func (s *VoucherService) validateCartValue(v models.Voucher, subtotal float64) error {
	threshold := v.CartMinValue
	if threshold <= 0 {
		threshold = v.MinOrder // Fallback ke MinOrder jika CartMinValue tidak diset
	}
	if subtotal < threshold {
		return fmt.Errorf("nilai keranjang minimal Rp%s untuk menggunakan voucher ini",
			formatIDR(threshold))
	}
	return nil
}

// calculateDiscount menghitung nominal diskon berdasarkan tipe diskon dan max cap
func (s *VoucherService) calculateDiscount(v models.Voucher, subtotal float64) float64 {
	var discount float64
	if v.DiscountType == "percent" {
		discount = subtotal * (v.DiscountValue / 100.0)
		if v.MaxDiscount > 0 && discount > v.MaxDiscount {
			discount = v.MaxDiscount // Terapkan cap maksimal
		}
	} else {
		discount = v.DiscountValue
		if discount > subtotal {
			discount = subtotal // Diskon tidak boleh melebihi subtotal
		}
	}
	return discount
}

func formatIDR(amount float64) string {
	// Simple formatter – cukup untuk error message
	return fmt.Sprintf("%.0f", amount)
}
