package services

import (
	"SahabatMart/backend/models"
	"fmt"
	"strconv"
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
			// [Audit Fix] Always use AffiliateMember.ID for Affiliate Area notifications
			s.Notif.Push(affiliate.ID, "affiliate", "tier_upgrade", "Tier Naik! 🎉", msg, "/affiliate")
		}
	}

	return nil
}

// GetTeamStats: Menghitung total downline dan omset tim (seluruh keturunan/infinite depth)
func (s *AffiliateService) GetTeamStats(affiliateID string) (totalDownlines int64, teamTurnover float64, err error) {
	// 1. Ambil Semua ID Downlines (Semua Level) menggunakan Recursive CTE
	var allDescendantIDs []string
	query := `
		WITH RECURSIVE subordinates AS (
			SELECT id FROM affiliate_members WHERE upline_id = ?
			UNION ALL
			SELECT a.id FROM affiliate_members a
			INNER JOIN subordinates s ON a.upline_id = s.id
		)
		SELECT id FROM subordinates
	`
	s.DB.Raw(query, affiliateID).Scan(&allDescendantIDs)

	totalDownlines = int64(len(allDescendantIDs))

	// 2. Hitung Omset Tim dari semua ID tersebut
	if totalDownlines > 0 {
		var turnover float64
		s.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ?", allDescendantIDs, completedOrderStatuses).
			Select("COALESCE(SUM(subtotal), 0)").
			Scan(&turnover)
		teamTurnover = turnover
	}

	return totalDownlines, teamTurnover, nil
}

// CheckMerchantEligibility: Cek kelayakan upgrade ke Merchant
// [Sync Fix] Definisi "mitra aktif" = mitra yang memiliki minimal 1 transaksi COMPLETED dalam 30 hari terakhir
// Ini sesuai dengan dokumen bisnis Akuglow dan menutup gap ambiguitas sebelumnya
func (s *AffiliateService) CheckMerchantEligibility(affiliateID string) (isEligible bool, activeMitra int64, monthlyTurnover float64, reqMitra int, reqTurnover float64) {
	startTime := time.Now().AddDate(0, -1, 0) // 30 hari terakhir

	// [FIX] Mitra "aktif" = memiliki min 1 order completed dalam 30 hari, bukan hanya status 'active'
	// Ambil semua downline langsung dulu
	var directDownlineIDs []string
	s.DB.Model(&models.AffiliateMember{}).
		Select("id").
		Where("upline_id = ? AND status = 'active'", affiliateID).
		Scan(&directDownlineIDs)

	if len(directDownlineIDs) > 0 {
		// Hitung yang benar-benar aktif bertransaksi dalam 30 hari
		s.DB.Raw(`
			SELECT COUNT(DISTINCT am.id)
			FROM affiliate_members am
			INNER JOIN orders o ON o.affiliate_id = am.id
			WHERE am.upline_id = ?
			  AND am.status = 'active'
			  AND o.status IN ('paid','processing','ready_to_ship','shipped','delivered','completed')
			  AND o.created_at >= ?
		`, affiliateID, startTime).Scan(&activeMitra)
	}

	// Hitung omset tim 30 hari terakhir (Recursive Depth - semua level)
	var allDescendantIDs []string
	query := `
		WITH RECURSIVE subordinates AS (
			SELECT id FROM affiliate_members WHERE upline_id = ?
			UNION ALL
			SELECT a.id FROM affiliate_members a
			INNER JOIN subordinates s ON a.upline_id = s.id
		)
		SELECT id FROM subordinates
	`
	s.DB.Raw(query, affiliateID).Scan(&allDescendantIDs)

	if len(allDescendantIDs) > 0 {
		s.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ? AND created_at >= ?", allDescendantIDs, completedOrderStatuses, startTime).
			Select("COALESCE(SUM(subtotal), 0)").
			Scan(&monthlyTurnover)
	}

	// Ambil syarat dari PlatformConfig (Dynamic, fallback ke default dokumen bisnis)
	minActiveMitra := 100      // Syarat: 100 mitra aktif
	minTurnover := 10000000.0  // Syarat: Omset tim Rp 10.000.000/bulan

	var configActive models.PlatformConfig
	if err := s.DB.Where("key = ?", "merchant_min_active_mitra").First(&configActive).Error; err == nil {
		if val, err := strconv.Atoi(configActive.Value); err == nil {
			minActiveMitra = val
		}
	}

	var configTurnover models.PlatformConfig
	if err := s.DB.Where("key = ?", "merchant_min_team_turnover").First(&configTurnover).Error; err == nil {
		if val, err := strconv.ParseFloat(configTurnover.Value, 64); err == nil {
			minTurnover = val
		}
	}

	isEligible = activeMitra >= int64(minActiveMitra) && monthlyTurnover >= minTurnover
	return isEligible, activeMitra, monthlyTurnover, minActiveMitra, minTurnover
}

// CheckAndDowngradeMerchants: Cek merchant yang tidak memenuhi syarat dan downgrade otomatis
// [Sync Fix] Sesuai dokumen bisnis: Merchant yang tidak memenuhi syarat 3 bulan berturut-turut → dicabut
func (s *AffiliateService) CheckAndDowngradeMerchants() (downgraded int, err error) {
	// Ambil threshold dari config
	minActiveMitra := 100
	minTurnover := 10000000.0

	var configActive models.PlatformConfig
	if dbErr := s.DB.Where("key = ?", "merchant_min_active_mitra").First(&configActive).Error; dbErr == nil {
		if val, dbErr := strconv.Atoi(configActive.Value); dbErr == nil {
			minActiveMitra = val
		}
	}
	var configTurnover models.PlatformConfig
	if dbErr := s.DB.Where("key = ?", "merchant_min_team_turnover").First(&configTurnover).Error; dbErr == nil {
		if val, dbErr := strconv.ParseFloat(configTurnover.Value, 64); dbErr == nil {
			minTurnover = val
		}
	}

	// Ambil semua merchant aktif
	var merchants []struct {
		MerchantID  string
		UserID      string
		AffiliateID string
		StoreName   string
	}
	s.DB.Raw(`
		SELECT m.id as merchant_id, m.user_id, am.id as affiliate_id, m.store_name
		FROM merchants m
		LEFT JOIN affiliate_members am ON am.user_id = m.user_id
		WHERE m.status = 'active'
	`).Scan(&merchants)

	startTime := time.Now().AddDate(0, -1, 0)
	_ = minActiveMitra
	_ = minTurnover

	for _, m := range merchants {
		if m.AffiliateID == "" {
			continue
		}

		// Hitung mitra aktif (bertransaksi dalam 30 hari)
		var activeMitraCount int64
		s.DB.Raw(`
			SELECT COUNT(DISTINCT am.id)
			FROM affiliate_members am
			INNER JOIN orders o ON o.affiliate_id = am.id
			WHERE am.upline_id = ?
			  AND am.status = 'active'
			  AND o.status IN ('paid','processing','ready_to_ship','shipped','delivered','completed')
			  AND o.created_at >= ?
		`, m.AffiliateID, startTime).Scan(&activeMitraCount)

		// Hitung omset tim bulan ini
		var teamTurnover float64
		var allDescIDs []string
		s.DB.Raw(`
			WITH RECURSIVE sub AS (
				SELECT id FROM affiliate_members WHERE upline_id = ?
				UNION ALL
				SELECT a.id FROM affiliate_members a INNER JOIN sub s ON a.upline_id = s.id
			) SELECT id FROM sub
		`, m.AffiliateID).Scan(&allDescIDs)

		if len(allDescIDs) > 0 {
			s.DB.Model(&models.Order{}).
				Where("affiliate_id IN ? AND status IN ? AND created_at >= ?", allDescIDs, completedOrderStatuses, startTime).
				Select("COALESCE(SUM(subtotal), 0)").
				Scan(&teamTurnover)
		}

		// Update statistik merchant (sync dengan field di models.Merchant)
		s.DB.Model(&models.Merchant{}).Where("id = ?", m.MerchantID).Updates(map[string]interface{}{
			"active_mitra_count":    int(activeMitraCount),
			"team_monthly_turnover": teamTurnover,
		})

		// [Dokumen Bisnis] Jika tidak memenuhi syarat → notifikasi peringatan
		// Downgrade hanya dilakukan oleh Admin secara manual setelah 3 bulan berturut-turut
		// (tracking downgrade_warning_count ada di PlatformConfig, bukan auto-downgrade)
		if activeMitraCount < int64(minActiveMitra) || teamTurnover < minTurnover {
			if s.Notif != nil {
				msg := fmt.Sprintf("Peringatan: Toko '%s' tidak memenuhi syarat Merchant bulan ini (Mitra aktif: %d/%d, Omset: Rp %.0f/%.0f). Harap tingkatkan performa tim Anda.",
					m.StoreName, activeMitraCount, minActiveMitra, teamTurnover, minTurnover)
				s.Notif.Push(m.MerchantID, "merchant", "merchant_warning", "⚠️ Peringatan Syarat Merchant", msg, "/merchant/dashboard")
			}
		}
	}

	return downgraded, nil
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

// UpdateTurnoverSnapshot memperbarui cache omset tim untuk dashboard yang cepat
func (s *AffiliateService) UpdateTurnoverSnapshot(affiliateID string) error {
	totalDownlines, teamTurnover, err := s.GetTeamStats(affiliateID)
	if err != nil {
		return err
	}

	_, _, monthlyTurnover, _, _ := s.CheckMerchantEligibility(affiliateID)

	var directMitra int64
	s.DB.Model(&models.AffiliateMember{}).Where("upline_id = ?", affiliateID).Count(&directMitra)

	snapshot := models.AffiliateTurnoverSnapshot{
		AffiliateID:     affiliateID,
		TeamDownlines:   totalDownlines,
		TeamTurnover:    teamTurnover,
		MonthlyTurnover: monthlyTurnover,
		DirectMitra:     directMitra,
		LastUpdated:     time.Now(),
	}

	return s.DB.Where("affiliate_id = ?", affiliateID).
		Assign(snapshot).
		FirstOrCreate(&models.AffiliateTurnoverSnapshot{}).Error
}
// SyncLeaderboard menghitung ulang peringkat affiliate dan menyimpan ke cache
func (s *AffiliateService) SyncLeaderboard() error {
	var results []struct {
		AffiliateID string
		FullName    string
		AvatarUrl   string
		TotalEarned float64
	}

	// Ambil top 50 penghasilan tertinggi
	query := `
		SELECT am.id as affiliate_id, up.full_name, up.avatar_url, am.total_earned
		FROM affiliate_members am
		JOIN user_profiles up ON am.user_id = up.user_id
		WHERE am.status = 'active'
		ORDER BY am.total_earned DESC
		LIMIT 50
	`
	s.DB.Raw(query).Scan(&results)

	return s.DB.Transaction(func(tx *gorm.DB) error {
		// Bersihkan cache lama
		tx.Exec("DELETE FROM leaderboard_cache")

		for i, res := range results {
			cache := models.LeaderboardCache{
				AffiliateID: res.AffiliateID,
				Name:        res.FullName,
				Avatar:      res.AvatarUrl,
				Rank:        i + 1,
				TotalEarned: res.TotalEarned,
				LastSynced:  time.Now(),
			}
			if err := tx.Create(&cache).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// UpdateUplineSnapshotsRecursive memperbarui snapshot omset untuk seluruh silsilah upline
func (s *AffiliateService) UpdateUplineSnapshotsRecursive(affiliateID string) {
	// 1. Update diri sendiri dulu
	s.UpdateTurnoverSnapshot(affiliateID)

	// 2. Cari upline
	var member models.AffiliateMember
	if err := s.DB.Select("upline_id").Where("id = ?", affiliateID).First(&member).Error; err == nil {
		if member.UplineID != nil && *member.UplineID != "" {
			// Rekursif ke atas
			s.UpdateUplineSnapshotsRecursive(*member.UplineID)
		}
	}
}

// LinkUpline menghubungkan user ke upline baru secara manual lewat kode referral
func (s *AffiliateService) LinkUpline(userID, refCode string) error {
	var userAff models.AffiliateMember
	if err := s.DB.Where("user_id = ?", userID).First(&userAff).Error; err != nil {
		return fmt.Errorf("data affiliate Anda tidak ditemukan")
	}

	if userAff.UplineID != nil && *userAff.UplineID != "" {
		return fmt.Errorf("Anda sudah tergabung dalam jaringan")
	}

	var upline models.AffiliateMember
	if err := s.DB.Where("ref_code = ?", refCode).First(&upline).Error; err != nil {
		return fmt.Errorf("kode referral tidak valid")
	}

	// Cegah self-referral
	if upline.UserID == userID {
		return fmt.Errorf("tidak bisa menggunakan kode referral sendiri")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		uID := upline.ID
		updates := map[string]interface{}{
			"upline_id":   &uID,
			"upline_code": upline.RefCode,
		}
		if err := tx.Model(&userAff).Updates(updates).Error; err != nil {
			return err
		}

		// Sync stats ke atas
		go s.UpdateUplineSnapshotsRecursive(uID)
		return nil
	})
}
