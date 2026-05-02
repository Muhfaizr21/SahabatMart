package services

import (
	"errors"
	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

type ProductService struct {
	DB *gorm.DB
}

func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{DB: db}
}

// SyncProductRating menghitung ulang rata-rata rating produk
func (s *ProductService) SyncProductRating(productID string) error {
	var stats struct {
		AvgRating float64
		Count     int
	}

	err := s.DB.Model(&models.Review{}).
		Where("product_id = ? AND is_hidden = ?", productID, false).
		Select("AVG(rating) as avg_rating, COUNT(id) as count").
		Scan(&stats).Error

	if err != nil {
		return err
	}

	return s.DB.Model(&models.Product{}).Where("id = ?", productID).Updates(map[string]interface{}{
		"rating":         stats.AvgRating,
		"average_rating": stats.AvgRating,
		"reviews":        stats.Count,
		"total_reviews":  stats.Count,
	}).Error
}

// AddReview menyimpan review baru dan mentrigger sinkronisasi rating
// Syarat: User harus sudah menyelesaikan pembelian produk tersebut (Order Completed)
func (s *ProductService) AddReview(review *models.Review) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Verifikasi Validitas Pembelian
		var order models.Order
		if err := tx.Preload("Items").Where("id = ? AND buyer_id = ?", review.OrderID, review.BuyerID).First(&order).Error; err != nil {
			return errors.New("data pesanan tidak ditemukan atau Anda bukan pemilik pesanan ini")
		}

		// 2. Pastikan Order sudah COMPLETED
		if order.Status != models.OrderCompleted {
			return errors.New("ulasan hanya dapat diberikan untuk pesanan yang sudah selesai (Completed)")
		}

		// 3. Pastikan Produk ada di dalam Order tersebut
		found := false
		for _, item := range order.Items {
			if item.ProductID == review.ProductID {
				found = true
				break
			}
		}
		if !found {
			return errors.New("produk ini tidak ditemukan dalam catatan pesanan Anda")
		}

		// 4. Cek apakah sudah pernah review untuk order/produk ini (cegah duplikasi)
		var existingCount int64
		tx.Model(&models.Review{}).Where("order_id = ? AND product_id = ? AND buyer_id = ?", review.OrderID, review.ProductID, review.BuyerID).Count(&existingCount)
		if existingCount > 0 {
			return errors.New("Anda sudah memberikan ulasan untuk produk ini pada pesanan yang sama")
		}

		// 5. Simpan Review
		if err := tx.Create(review).Error; err != nil {
			return err
		}
		
		// Update Product Stats
		var stats struct {
			Avg float64
			Cnt int64
		}
		tx.Model(&models.Review{}).Where("product_id = ? AND is_hidden = ?", review.ProductID, false).
			Select("AVG(rating), COUNT(*)").Row().Scan(&stats.Avg, &stats.Cnt)
		
		return tx.Model(&models.Product{}).Where("id = ?", review.ProductID).
			Updates(map[string]interface{}{
				"rating":         stats.Avg,
				"average_rating": stats.Avg,
				"reviews":        stats.Cnt,
				"total_reviews":  stats.Cnt,
			}).Error
	})
}

// GetProductReviews mengambil daftar ulasan untuk produk tertentu
func (s *ProductService) GetProductReviews(productID string) ([]models.Review, error) {
	var reviews []models.Review
	err := s.DB.Preload("Buyer.Profile").Where("product_id = ? AND is_hidden = ?", productID, false).Order("created_at DESC").Find(&reviews).Error
	return reviews, err
}

// CanUserReview mengecek apakah user bisa memberikan review (ada order completed & belum review)
func (s *ProductService) CanUserReview(userID string, productID string) (bool, string, error) {
	var order models.Order
	// Cari order completed yang mengandung produk ini
	err := s.DB.Joins("JOIN order_items ON order_items.order_id = orders.id").
		Where("orders.buyer_id = ? AND orders.status = ? AND order_items.product_id = ?", userID, models.OrderCompleted, productID).
		First(&order).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, "", nil
		}
		return false, "", err
	}

	// Cek apakah sudah pernah review untuk order tersebut
	var count int64
	s.DB.Model(&models.Review{}).Where("order_id = ? AND product_id = ? AND buyer_id = ?", order.ID, productID, userID).Count(&count)
	
	if count > 0 {
		return false, order.ID, nil // Sudah review
	}

	return true, order.ID, nil
}

// SyncInventoryMetadata sinkronisasi info dasar produk (harga/nama) ke seluruh inventory merchant
func (s *ProductService) SyncInventoryMetadata(productID string) error {
	var product models.Product
	if err := s.DB.First(&product, "id = ?", productID).Error; err != nil {
		return err
	}

	// Update seluruh inventory yang merujuk ke produk ini
	return s.DB.Model(&models.Inventory{}).
		Where("product_id = ?", productID).
		Updates(map[string]interface{}{
			"base_price":      product.Price,
			"last_sync_price": gorm.Expr("NOW()"),
		}).Error
}

// SyncAllInventories melakukan sinkronisasi harga massal untuk seluruh produk yang aktif
func (s *ProductService) SyncAllInventories() (int64, error) {
	var products []models.Product
	s.DB.Where("status = ?", "active").Find(&products)
	
	var count int64
	for _, p := range products {
		if err := s.SyncInventoryMetadata(p.ID); err == nil {
			count++
		}
	}
	return count, nil
}
