package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
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
func (s *AdminService) ModerateRestockRequest(adminID, requestID, status, adminNote string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var req models.RestockRequest
		if err := tx.Preload("Items").First(&req, "id = ?", requestID).Error; err != nil {
			return err
		}

		if req.Status != "pending" && req.Status != "requested" && status != "shipped" {
			return gorm.ErrInvalidData
		}

		if status == "approved" {
			// Transfer Stock from PUSAT to Merchant
			for _, item := range req.Items {
				// 1. Deduct from Pusat
				var pusatInv models.Inventory
				err := tx.Where("merchant_id = ? AND product_id = ?", models.PusatID, item.ProductID).First(&pusatInv).Error
				if err != nil {
					return fmt.Errorf("pusat tidak memiliki stok untuk produk %s", item.ProductID)
				}
				if pusatInv.Stock < item.Quantity {
					return fmt.Errorf("stok pusat tidak cukup untuk %s (Tersisa: %d)", item.ProductID, pusatInv.Stock)
				}
				if err := tx.Model(&pusatInv).Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
					return err
				}

				// 2. Add to Merchant Inventory
				var merchInv models.Inventory
				err = tx.Where("merchant_id = ? AND product_id = ?", req.MerchantID, item.ProductID).First(&merchInv).Error
				if err != nil {
					// Create if not exists
					merchInv = models.Inventory{
						MerchantID: req.MerchantID,
						ProductID:  item.ProductID,
						Stock:      item.Quantity,
					}
					if err := tx.Create(&merchInv).Error; err != nil { return err }
				} else {
					if err := tx.Model(&merchInv).Update("stock", gorm.Expr("stock + ?", item.Quantity)).Error; err != nil { return err }
				}
			}
		}

		req.Status = status
		req.AdminNote = adminNote
		if err := tx.Save(&req).Error; err != nil {
			return err
		}

		s.Audit.Log(adminID, "moderate_restock", "restock_request", requestID, "status="+status, "internal")
		return nil
	})
}
