package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"gorm.io/gorm"
)

type AdminService struct {
	UserRepo *repositories.UserRepository
	Audit    *AuditService
	DB       *gorm.DB
}

func NewAdminService(db *gorm.DB, audit *AuditService) *AdminService {
	return &AdminService{
		UserRepo: repositories.NewUserRepository(db),
		Audit:    audit,
		DB:       db,
	}
}

func (s *AdminService) GetOverviewStats() (map[string]interface{}, error) {
	var userCount, merchantCount, orderCount int64
	s.DB.Model(&models.User{}).Count(&userCount)
	s.DB.Model(&models.Merchant{}).Count(&merchantCount)
	s.DB.Model(&models.Order{}).Count(&orderCount)

	var totalRevenue float64
	s.DB.Model(&models.Order{}).Where("status = ?", models.OrderCompleted).Select("COALESCE(SUM(grand_total), 0)").Scan(&totalRevenue)

	return map[string]interface{}{
		"users":    userCount,
		"merchants": merchantCount,
		"orders":    orderCount,
		"revenue":   totalRevenue,
	}, nil
}

func (s *AdminService) UpdateUserStatus(adminID, userID, status, ip string) error {
	err := s.UserRepo.Update(&models.User{ID: userID}, map[string]interface{}{"status": status})
	if err == nil {
		s.Audit.Log(adminID, "update_user_status", "user", userID, "status="+status, ip)
	}
	return err
}
// ... many more methods could go here
