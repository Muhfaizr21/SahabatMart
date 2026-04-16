package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"gorm.io/gorm"
)

type MerchantService struct {
	Repo *repositories.ProductRepository
}

func NewMerchantService(db *gorm.DB) *MerchantService {
	return &MerchantService{
		Repo: repositories.NewProductRepository(db),
	}
}

func (s *MerchantService) GetProducts(merchantID string) ([]models.Product, error) {
	return s.Repo.GetByMerchant(merchantID)
}

func (s *MerchantService) AddProduct(product *models.Product) error {
	return s.Repo.Create(product)
}

func (s *MerchantService) GetOrders(merchantID string) ([]models.OrderMerchantGroup, error) {
	return s.Repo.GetOrdersByMerchant(merchantID)
}

func (s *MerchantService) UpdateOrderStatus(groupID, merchantID, status string) (*models.OrderMerchantGroup, error) {
	group, err := s.Repo.GetOrderGroup(groupID, merchantID)
	if err != nil {
		return nil, err
	}

	group.Status = models.MerchantOrderStatus(status)
	err = s.Repo.SaveOrderGroup(group)
	return group, err
}
