package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"gorm.io/gorm"
	"time"
)

type NotificationService struct {
	DB *gorm.DB
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{DB: db}
}

// Push mengirim notifikasi ke user/merchant/admin tertentu
func (ns *NotificationService) Push(receiverID, receiverType, notifType, title, message, link string) error {
	notif := models.Notification{
		ReceiverID:   receiverID,
		ReceiverType: receiverType,
		Type:         notifType,
		Title:        title,
		Message:      message,
		Link:         link,
		IsRead:       false,
		CreatedAt:    time.Now(),
	}
	if err := ns.DB.Create(&notif).Error; err != nil {
		return err
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
func (ns *NotificationService) MarkAsRead(notifID uint) error {
	return ns.DB.Model(&models.Notification{}).Where("id = ?", notifID).Update("is_read", true).Error
}

func (ns *NotificationService) MarkAllAsRead(receiverID, receiverType string) error {
	query := ns.DB.Model(&models.Notification{}).Where("receiver_type = ?", receiverType)
	if receiverType != "admin" {
		query = query.Where("receiver_id = ?", receiverID)
	}
	return query.Update("is_read", true).Error
}
