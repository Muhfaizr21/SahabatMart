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

func (s *AffiliateService) TrackClick(refCode, productID, referrer, ip, ua string) (*models.AffiliateMember, error) {
	var affiliate models.AffiliateMember
	if err := s.DB.Where("ref_code = ?", refCode).First(&affiliate).Error; err != nil {
		return nil, err
	}

	click := models.AffiliateClick{
		AffiliateID: affiliate.ID,
		ProductID:   productID,
		Referrer:    referrer,
		IPAddress:   ip,
		UserAgent:   ua,
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
