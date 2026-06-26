package services

import (
	"akuglow/backend/models"
	"akuglow/backend/repositories"
	"fmt"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"time"
)

type AdminService struct {
	UserRepo *repositories.UserRepository
	Audit    *AuditService
	Notif    *NotificationService
	DB       *gorm.DB
}

func NewAdminService(db *gorm.DB, audit *AuditService, notif *NotificationService) *AdminService {
	return &AdminService{
		UserRepo: repositories.NewUserRepository(db),
		Audit:    audit,
		Notif:    notif,
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
		"users":     userCount,
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
func (s *AdminService) ModerateRestockRequest(adminID, requestID, status, adminNote, trackingNumber string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var req models.RestockRequest
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Preload("Items").First(&req, "id = ?", requestID).Error; err != nil {
			return err
		}

		// Status Transition Validation
		if req.Status != "pending" && req.Status != "requested" && status != "shipped" && status != "rejected" && status != "approved" {
			return fmt.Errorf("transisi status tidak valid dari %s ke %s", req.Status, status)
		}

		// 1. Stock Movement Logic
		if status == "approved" && (req.Status == "pending" || req.Status == "requested") {
			// Deduct from Pusat
			for _, item := range req.Items {
				var pusatInv models.Inventory
				dbInv := tx.Set("gorm:query_option", "FOR UPDATE").Where("merchant_id = ? AND product_id = ?", models.PusatID, item.ProductID)
				if item.ProductVariantID != nil && *item.ProductVariantID != "" {
					dbInv = dbInv.Where("product_variant_id = ?", *item.ProductVariantID)
				} else {
					dbInv = dbInv.Where("product_variant_id IS NULL OR product_variant_id = ''")
				}

				if err := dbInv.First(&pusatInv).Error; err != nil {
					return fmt.Errorf("pusat tidak memiliki stok untuk produk %s", item.ProductID)
				}
				if pusatInv.Stock < item.Quantity {
					return fmt.Errorf("stok pusat tidak cukup untuk %s (Tersisa: %d)", item.ProductID, pusatInv.Stock)
				}

				stockBefore := pusatInv.Stock
				pusatInv.Stock -= item.Quantity
				if err := tx.Save(&pusatInv).Error; err != nil {
					return err
				}

				// Deduct from Master Tables (Sync for Admin UI)
				if item.ProductVariantID != nil && *item.ProductVariantID != "" {
					if err := tx.Model(&models.ProductVariant{}).Where("id = ?", *item.ProductVariantID).
						Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
						return err
					}

					// Sync parent product stock if not variable
					var parentProduct models.Product
					if err := tx.Select("id, product_type").First(&parentProduct, "id = ?", item.ProductID).Error; err == nil {
						if parentProduct.ProductType != "variable" {
							if err := tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
								Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
								return err
							}
						}
					}
				} else {
					if err := tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
						Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
						return err
					}
				}

				// Log Mutation Pusat (OUT)
				tx.Create(&models.StockMutation{
					ProductID:        item.ProductID,
					ProductVariantID: item.ProductVariantID,
					MerchantID:       models.PusatID,
					Type:             "RESTOCK_OUT",
					Quantity:         -item.Quantity,
					Reference:        req.ID,
					StockBefore:      stockBefore,
					StockAfter:       pusatInv.Stock,
					Note:             "Pengiriman ke Merchant: " + req.MerchantID,
				})
			}
		}

		// 2. Update Record
		updates := map[string]interface{}{
			"status":     status,
			"admin_note": adminNote,
			"updated_at": time.Now(),
		}
		if trackingNumber != "" {
			updates["tracking_number"] = trackingNumber
		}

		if err := tx.Model(&req).Updates(updates).Error; err != nil {
			return err
		}

		s.Audit.Log(adminID, "moderate_restock", "restock_request", requestID, fmt.Sprintf("status=%s, resi=%s", status, trackingNumber), "internal")

		// 3. Notify Merchant
		title := "📦 Update Restock"
		msg := fmt.Sprintf("Permintaan kulakan Anda %s telah diperbarui menjadi: %s.", req.ID, status)
		if status == "approved" {
			title = "✅ Restock Disetujui"
		}
		if status == "shipped" {
			title = "🚚 Restock Dikirim"
		}
		if status == "rejected" {
			title = "❌ Restock Ditolak"
		}

		if s.Notif != nil {
			_ = s.Notif.Push(req.MerchantID, "merchant", "restock_update", title, msg, "/merchant/restock")
		}

		return nil
	})
}

func (s *AdminService) ResetUserPassword(adminID, userID, newPassword, ip string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	hashedPasswordStr := string(hashedPassword)
	err = s.UserRepo.Update(&models.User{ID: userID}, map[string]interface{}{"password_hash": &hashedPasswordStr})
	if err == nil {
		s.Audit.Log(adminID, "reset_user_password", "user", userID, "manual_reset", ip)
	}
	return err
}
