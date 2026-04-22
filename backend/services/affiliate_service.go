package services

import (
	"SahabatMart/backend/models"
	"time"
	"gorm.io/gorm"
)

type AffiliateService struct {
	DB    *gorm.DB
	Notif *NotificationService
}

func NewAffiliateService(db *gorm.DB, notif *NotificationService) *AffiliateService {
	return &AffiliateService{DB: db, Notif: notif}
}

// completedOrderStatuses adalah status pesanan yang dianggap sudah valid untuk perhitungan omset
var completedOrderStatuses = []string{"paid", "processing", "ready_to_ship", "shipped", "delivered", "completed"}

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
	// First fetch the affiliate member
	if err := s.DB.First(&affiliate, "id = ?", affiliateID).Error; err != nil {
		return nil, 0, err
	}

	// Try to preload tier separately — don't fail if tier is missing
	if affiliate.MembershipTierID > 0 {
		var tier models.MembershipTier
		if err := s.DB.First(&tier, "id = ?", affiliate.MembershipTierID).Error; err == nil {
			affiliate.Tier = &tier
		}
	}

	var totalClicks int64
	s.DB.Model(&models.AffiliateClick{}).Where("affiliate_id = ?", affiliateID).Count(&totalClicks)

	return &affiliate, totalClicks, nil
}

func (s *AffiliateService) TriggerTierUpgrade(affiliateMemberID string) error {
	var affiliate models.AffiliateMember
	if err := s.DB.Preload("Tier").First(&affiliate, "id = ?", affiliateMemberID).Error; err != nil {
		return err
	}

	if affiliate.Tier == nil {
		return nil
	}

	// Cari tier berikutnya (Level > current level)
	var nextTier models.MembershipTier
	err := s.DB.Order("level ASC").Where("level > ?", affiliate.Tier.Level).First(&nextTier).Error
	if err != nil {
		return nil // Sudah mencapai tier maksimal
	}

	// Cek apakah syarat terpenuhi (MinEarningsUpgrade)
	if affiliate.TotalEarned >= nextTier.MinEarningsUpgrade && nextTier.MinEarningsUpgrade > 0 {
		oldTierName := affiliate.Tier.Name
		if err := s.DB.Model(&affiliate).Update("membership_tier_id", nextTier.ID).Error; err != nil {
			return err
		}
		
		// Push Notification
		if s.Notif != nil {
			msg := "Selamat! Tier Anda naik dari " + oldTierName + " ke " + nextTier.Name + ". Nikmati komisi yang lebih besar! 🚀"
			s.Notif.Push(affiliate.UserID, "affiliate", "tier_upgrade", "Tier Naik! 🎉", msg, "/affiliate")
		}
	}

	return nil
}

// GetTeamStats: Menghitung total downline dan omset tim (total sales dari semua order yang direferensikan downlines)
func (s *AffiliateService) GetTeamStats(affiliateID string) (totalDownlines int64, teamTurnover float64, err error) {
	// 1. Hitung Total Downlines (Langsung)
	if err := s.DB.Model(&models.AffiliateMember{}).Where("upline_id = ?", affiliateID).Count(&totalDownlines).Error; err != nil {
		return 0, 0, err
	}

	// 2. Hitung Omset Tim:
	// Ambil semua ID downlines, lalu sum grand_total order yang affiliate_id-nya adalah salah satu dari downline
	var downlineIDs []string
	s.DB.Model(&models.AffiliateMember{}).Where("upline_id = ?", affiliateID).Pluck("id", &downlineIDs)

	if len(downlineIDs) > 0 {
		var turnover float64
		s.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ?", downlineIDs, completedOrderStatuses).
			Select("COALESCE(SUM(grand_total), 0)").
			Scan(&turnover)
		teamTurnover = turnover
	}

	return totalDownlines, teamTurnover, nil
}

// CheckMerchantEligibility: Cek apakah mitra memenuhi syarat upgrade jadi Merchant
// Syarat per spek Akuglow: 100 mitra aktif (direct downline) & omset tim Rp10jt/bulan
func (s *AffiliateService) CheckMerchantEligibility(affiliateID string) (isEligible bool, activeMitra int64, monthlyTurnover float64) {
	// Hitung mitra aktif (langsung / direct downline)
	s.DB.Model(&models.AffiliateMember{}).Where("upline_id = ? AND status = 'active'", affiliateID).Count(&activeMitra)

	// Hitung omset tim 30 hari terakhir dari semua order yang direferensikan downlines
	startTime := time.Now().AddDate(0, -1, 0)

	var downlineIDs []string
	s.DB.Model(&models.AffiliateMember{}).Where("upline_id = ?", affiliateID).Pluck("id", &downlineIDs)

	if len(downlineIDs) > 0 {
		s.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ? AND created_at >= ?", downlineIDs, completedOrderStatuses, startTime).
			Select("COALESCE(SUM(grand_total), 0)").
			Scan(&monthlyTurnover)
	}

	isEligible = activeMitra >= 100 && monthlyTurnover >= 10000000
	return isEligible, activeMitra, monthlyTurnover
}

// CancelCommission: Membatalkan komisi pending jika pesanan di-refund atau dispute dimenangkan buyer
func (s *AffiliateService) CancelCommission(orderID string) error {
	return s.DB.Model(&models.AffiliateCommission{}).
		Where("order_id = ? AND status = 'pending'", orderID).
		Update("status", "cancelled").Error
}

// GetLeaderboard: Mengambil daftar mitra dengan penghasilan tertinggi
func (s *AffiliateService) GetLeaderboard(limit int) ([]models.AffiliateMember, error) {
	var leaders []models.AffiliateMember
	err := s.DB.Preload("Tier").
		Order("total_earned DESC").
		Limit(limit).
		Find(&leaders).Error
	return leaders, err
}
