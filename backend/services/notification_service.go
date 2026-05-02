package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"gorm.io/gorm"
	"time"
)

type NotificationService struct {
	DB    *gorm.DB
	Email *EmailService
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{
		DB:    db,
		Email: NewEmailService(db),
	}
}

// Push mengirim notifikasi ke user/merchant/admin tertentu
func (ns *NotificationService) Push(receiverID, receiverType, notifType, title, message, link string) error {
	userID := receiverID
	if receiverType == "merchant" {
		var merchant models.Merchant
		if err := ns.DB.Select("user_id").First(&merchant, "id = ?", receiverID).Error; err == nil {
			userID = merchant.UserID
		}
	}

	notif := models.Notification{
		UserID:       userID,
		ReceiverID:   receiverID,
		ReceiverType: receiverType,
		Type:         notifType,
		Title:        title,
		Message:      message,
		Body:         message,
		Link:         link,
		IsRead:       false,
		CreatedAt:    time.Now(),
	}
	if err := ns.DB.Create(&notif).Error; err != nil {
		return err
	}

	// Try to send email
	var receiver models.User
	if err := ns.DB.Select("email").First(&receiver, "id = ?", userID).Error; err == nil && receiver.Email != "" {
		go ns.Email.SendEmail(receiver.Email, title, message)
	}

	// Real-time broadcast via SSE
	utils.Hub.Broadcast(receiverID, map[string]interface{}{
		"type":    "notification",
		"data":    notif,
		"trigger": "new_notif",
	})

	return nil
}


// GetNotifications mengambil list notifikasi untuk receiver tertentu
func (ns *NotificationService) GetNotifications(receiverID, receiverType string, limit int) ([]models.Notification, error) {
	var results []models.Notification
	query := ns.DB.Where("receiver_type = ?", receiverType)
	
	// Admin biasanya melihat semua admin notif, tapi user/merchant spesifik ID
	if receiverType != "admin" {
		query = query.Where("receiver_id = ?", receiverID)
	}
	
	err := query.Order("created_at desc").Limit(limit).Find(&results).Error
	return results, err
}

// MarkAsRead menandai notifikasi telah dibaca
func (ns *NotificationService) MarkAsRead(notifID string) error {
	return ns.DB.Model(&models.Notification{}).Where("id = ?", notifID).Update("is_read", true).Error
}

func (ns *NotificationService) MarkAllAsRead(receiverID, receiverType string) error {
	query := ns.DB.Model(&models.Notification{}).Where("receiver_type = ?", receiverType)
	if receiverType != "admin" {
		query = query.Where("receiver_id = ?", receiverID)
	}
	return query.Update("is_read", true).Error
}
