package repositories

import (
	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

type OrderRepository struct {
	DB *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{DB: db}
}

func (r *OrderRepository) Create(order *models.Order) error {
	return r.DB.Create(order).Error
}

func (r *OrderRepository) GetOrderByID(id string) (*models.Order, error) {
	var order models.Order
	err := r.DB.Preload("MerchantGroups.Items").First(&order, "id = ?", id).Error
	return &order, err
}

func (r *OrderRepository) UpdateStatus(orderID string, status models.OrderStatus) error {
	return r.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("status", status).Error
}
