package repositories

import (
	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

type ProductRepository struct {
	DB *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{DB: db}
}

func (r *ProductRepository) GetByMerchant(merchantID string) ([]models.Product, error) {
	var products []models.Product
	err := r.DB.Preload("Variants").Where("merchant_id = ?", merchantID).Find(&products).Error
	return products, err
}

func (r *ProductRepository) Create(product *models.Product) error {
	return r.DB.Create(product).Error
}

func (r *ProductRepository) GetOrdersByMerchant(merchantID string) ([]models.OrderMerchantGroup, error) {
	var groups []models.OrderMerchantGroup
	err := r.DB.Preload("Items").Where("merchant_id = ?", merchantID).Order("created_at desc").Find(&groups).Error
	return groups, err
}

func (r *ProductRepository) GetOrderGroup(groupID, merchantID string) (*models.OrderMerchantGroup, error) {
	var group models.OrderMerchantGroup
	err := r.DB.Where("id = ? AND merchant_id = ?", groupID, merchantID).First(&group).Error
	return &group, err
}

func (r *ProductRepository) SaveOrderGroup(group *models.OrderMerchantGroup) error {
	return r.DB.Save(group).Error
}
