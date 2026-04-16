package services

import (
	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

type AffiliateService struct {
	DB *gorm.DB
}

func NewAffiliateService(db *gorm.DB) *AffiliateService {
	return &AffiliateService{DB: db}
}

func (s *AffiliateService) TrackClick(refCode, productID, referrer, ip, ua string, subID1, subID2, subID3 string) (*models.AffiliateMember, error) {
	var affiliate models.AffiliateMember
	if err := s.DB.Where("ref_code = ?", refCode).First(&affiliate).Error; err != nil {
		return nil, err
	}

	// Fraud Shield: Cek anomali jumlah klik dari IP yang sama dalam durasi singkat
	var recentClicks int64
	s.DB.Model(&models.AffiliateClick{}).
		Where("ip_address = ? AND created_at > NOW() - INTERVAL '5 minutes'", ip).
		Count(&recentClicks)

	isFraud := recentClicks > 50 // Threshold proteksi bot

	click := models.AffiliateClick{
		AffiliateID: affiliate.ID,
		ProductID:   productID,
		Referrer:    referrer,
		IPAddress:   ip,
		UserAgent:   ua,
		SubID1:      subID1,
		SubID2:      subID2,
		SubID3:      subID3,
		IsFraud:     isFraud,
		IsBot:       isFraud, // Anggap bot jika klik brutal
	}
	s.DB.Create(&click)
	
	return &affiliate, nil
}

func (s *AffiliateService) GetDashboardStats(affiliateID string) (*models.AffiliateMember, int64, error) {
	var affiliate models.AffiliateMember
	if err := s.DB.Preload("Tier").First(&affiliate, "id = ?", affiliateID).Error; err != nil {
		return nil, 0, err
	}

	var totalClicks int64
	s.DB.Model(&models.AffiliateClick{}).Where("affiliate_id = ?", affiliateID).Count(&totalClicks)
	
	return &affiliate, totalClicks, nil
}
