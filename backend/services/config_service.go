package services

import (
	"SahabatMart/backend/models"
	"strconv"
	"strings"
	"time"
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

func (s *ConfigService) SeedFinancialConfigs() {
	configs := []models.PlatformConfig{
		{Key: "payout_payday_dates", Value: "1,5,10,15,20,25", Description: "Tanggal penarikan dana yang diizinkan (pisahkan dengan koma)"},
		{Key: "payout_min_amount", Value: "50000", Description: "Minimum jumlah penarikan dana"},
		{Key: "settlement_delay_hours", Value: "24", Description: "Penundaan pencairan dana setelah barang sampai (jam)"},
		{Key: "platform_fee_percent", Value: "5", Description: "Persentase biaya layanan platform (%)"},
	}

	for _, c := range configs {
		var existing models.PlatformConfig
		if err := s.DB.Where("key = ?", c.Key).First(&existing).Error; err != nil {
			s.DB.Create(&c)
		}
	}
}

func (s *ConfigService) IsPayday() (bool, string) {
	// If payout_payday_dates is empty or "all", it's always payday
	datesStr := s.Get("payout_payday_dates", "all")
	if datesStr == "all" || datesStr == "" {
		return true, ""
	}

	today := strconv.Itoa(time.Now().Day())
	dates := strings.Split(datesStr, ",")
	for _, d := range dates {
		if strings.TrimSpace(d) == today {
			return true, ""
		}
	}

	return false, datesStr
}
