package services

import (
	"SahabatMart/backend/models"
	"strconv"
	"gorm.io/gorm"
)

type ConfigService struct {
	DB *gorm.DB
}

func NewConfigService(db *gorm.DB) *ConfigService {
	return &ConfigService{DB: db}
}

func (s *ConfigService) Get(key string, defaultValue string) string {
	var cfg models.PlatformConfig
	if err := s.DB.Where("key = ?", key).First(&cfg).Error; err != nil {
		return defaultValue
	}
	return cfg.Value
}

func (s *ConfigService) GetFloat(key string, defaultValue float64) float64 {
	val := s.Get(key, "")
	if val == "" {
		return defaultValue
	}
	f, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return defaultValue
	}
	return f
}

func (s *ConfigService) GetInt(key string, defaultValue int) int {
	val := s.Get(key, "")
	if val == "" {
		return defaultValue
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultValue
	}
	return i
}

func (s *ConfigService) Set(key string, value string, description string) error {
	var cfg models.PlatformConfig
	err := s.DB.Where("key = ?", key).First(&cfg).Error
	if err != nil {
		cfg = models.PlatformConfig{
			Key:   key,
			Value: value,
			Description: description,
		}
		return s.DB.Create(&cfg).Error
	}
	
	cfg.Value = value
	cfg.Description = description
	return s.DB.Save(&cfg).Error
}
