package repositories

import (
	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

type AuditRepository struct {
	DB *gorm.DB
}

func NewAuditRepository(db *gorm.DB) *AuditRepository {
	return &AuditRepository{DB: db}
}

func (r *AuditRepository) Create(log *models.AuditLog) error {
	return r.DB.Create(log).Error
}

func (r *AuditRepository) GetLatestLogs(limit int) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	err := r.DB.Order("created_at desc").Limit(limit).Find(&logs).Error
	return logs, err
}
