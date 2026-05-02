package services

import (
	"SahabatMart/backend/models"
	"errors"
	"fmt"
	"log"
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
		if err == gorm.ErrRecordNotFound {
			return nil // Record already gone, ignore
		}
		return err
	}

	// [Sync Fix] Re-hitung stats real-time dari DB, jangan pakai nilai stale di kolom
	// 1. Hitung total komisi approved (untuk TotalEarned sync)
	var totalApproved float64
	s.DB.Model(&models.AffiliateCommission{}).
		Where("affiliate_id = ? AND status IN ?", affiliateMemberID, []string{"approved", "paid"}).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalApproved)

	// 2. Hitung mitra aktif real-time (30 hari, bertransaksi)
	startTime := time.Now().AddDate(0, -1, 0)
	var activeMitraCount int
	s.DB.Raw(`
		SELECT COUNT(DISTINCT am.id)
		FROM affiliate_members am
		INNER JOIN orders o ON o.affiliate_id = am.id
		WHERE am.upline_id = ?
		  AND am.status = 'active'
		  AND o.status IN ('paid','processing','ready_to_ship','shipped','delivered','completed')
		  AND o.created_at >= ?
	`, affiliateMemberID, startTime).Scan(&activeMitraCount)

	// 3. Hitung omset tim bulan ini (recursive downline)
	var allDescIDs []string
	s.DB.Raw(`
		WITH RECURSIVE sub AS (
			SELECT id FROM affiliate_members WHERE upline_id = ?
			UNION ALL
			SELECT a.id FROM affiliate_members a INNER JOIN sub s ON a.upline_id = s.id
		) SELECT id FROM sub
	`, affiliateMemberID).Scan(&allDescIDs)

	var teamMonthlyTurnover float64
	if len(allDescIDs) > 0 {
		s.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ? AND created_at >= ?", allDescIDs, completedOrderStatuses, startTime).
			Select("COALESCE(SUM(subtotal), 0)").Scan(&teamMonthlyTurnover)
	}

	// Sync ke DB
	s.DB.Model(&affiliate).Updates(map[string]interface{}{
		"total_earned":           totalApproved,
		"active_mitra_count":     activeMitraCount,
		"team_monthly_turnover":  teamMonthlyTurnover,
	})

	// 4. Check for Merchant Auto-Promotion
	isEligible, _, _, _, _ := s.CheckMerchantEligibility(affiliateMemberID)
	if isEligible {
		var user models.User
		err := s.DB.First(&user, "id = ?", affiliate.UserID).Error
		if err == nil && user.Role != "merchant" {
			// Auto-Promote to Merchant
			err := s.DB.Transaction(func(tx *gorm.DB) error {
				// Update user role
				if err := tx.Model(&user).Update("role", "merchant").Error; err != nil {
					return err
				}

				// Check if merchant record already exists
				var existingMerchant models.Merchant
				if err := tx.Where("user_id = ?", user.ID).First(&existingMerchant).Error; err == gorm.ErrRecordNotFound {
					// Create new merchant record
					var profile models.UserProfile
					tx.Where("user_id = ?", user.ID).First(&profile)
					storeName := profile.FullName + " Store"
					if profile.FullName == "" {
						storeName = "Merchant " + user.ID[:8]
					}

					newMerchant := models.Merchant{
						UserID:     user.ID,
						StoreName:  storeName,
						Slug:       fmt.Sprintf("store-%s", user.ID[:8]),
						Status:     "active",
						IsVerified: true,
						City:       profile.City,
						JoinedAt:   time.Now(),
						// Fallback: Default ke Jakarta Pusat agar shipping rate tidak error
						BiteshipAreaID: "IDNP3CL10", 
						EnabledCouriers: "jne,tiki,sicepat,jnt",
					}
					if err := tx.Create(&newMerchant).Error; err != nil {
						return err
					}
				} else {
					// Ensure status is active
					tx.Model(&existingMerchant).Update("status", "active")
				}
				return nil
			})

			if err == nil && s.Notif != nil {
				s.Notif.Push(affiliate.UserID, "merchant", "merchant_promoted", 
					"🎉 Selamat! Anda Menjadi Merchant", 
					"Karena performa tim yang luar biasa, Anda otomatis dipromosikan menjadi Merchant SahabatMart.", 
					"/merchant")
			}
		}
	}

	if affiliate.Tier == nil {
		return nil
	}

	// Cari tier berikutnya (Level > current level)
	var nextTier models.MembershipTier
	if err := s.DB.Order("level ASC").Where("level > ? AND is_active = true", affiliate.Tier.Level).First(&nextTier).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // Sudah mencapai tier maksimal
		}
		return err
	}

	// Evaluasi syarat upgrade berdasarkan data real-time yang baru dihitung
	isTierEligible := true
	if nextTier.MinActiveMitra > 0 && activeMitraCount < nextTier.MinActiveMitra {
		isTierEligible = false
	}
	if nextTier.MinMonthlyTurnover > 0 && teamMonthlyTurnover < nextTier.MinMonthlyTurnover {
		isTierEligible = false
	}

	if isTierEligible && (nextTier.MinActiveMitra > 0 || nextTier.MinMonthlyTurnover > 0) {
		if err := s.DB.Model(&affiliate).Update("membership_tier_id", nextTier.ID).Error; err != nil {
			return err
		}
		if s.Notif != nil {
			s.Notif.Push(affiliateMemberID, "affiliate", "tier_upgrade",
				"🎉 Selamat! Anda naik ke "+nextTier.Name,
				"Anda telah memenuhi syarat jenjang "+nextTier.Name+". Pertahankan performa tim Anda!",
				"/affiliate/status")
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
// [Sync Fix] Ambil syarat dari MembershipTier level TERTINGGI (bukan platform_config)
// Ini menyatukan sumber kebenaran dengan TriggerTierUpgrade
func (s *AffiliateService) CheckMerchantEligibility(affiliateID string) (isEligible bool, activeMitra int64, monthlyTurnover float64, reqMitra int, reqTurnover float64) {
	startTime := time.Now().AddDate(0, -1, 0) // 30 hari terakhir

	// Hitung mitra aktif real-time (bertransaksi dalam 30 hari)
	s.DB.Raw(`
		SELECT COUNT(DISTINCT am.id)
		FROM affiliate_members am
		INNER JOIN orders o ON o.affiliate_id = am.id
		WHERE am.upline_id = ?
		  AND am.status = 'active'
		  AND o.status IN ('paid','processing','ready_to_ship','shipped','delivered','completed')
		  AND o.created_at >= ?
	`, affiliateID, startTime).Scan(&activeMitra)

	// Hitung omset tim 30 hari (Recursive Depth - semua level)
	var allDescendantIDs []string
	s.DB.Raw(`
		WITH RECURSIVE subordinates AS (
			SELECT id FROM affiliate_members WHERE upline_id = ?
			UNION ALL
			SELECT a.id FROM affiliate_members a
			INNER JOIN subordinates s ON a.upline_id = s.id
		)
		SELECT id FROM subordinates
	`, affiliateID).Scan(&allDescendantIDs)

	if len(allDescendantIDs) > 0 {
		s.DB.Model(&models.Order{}).
			Where("affiliate_id IN ? AND status IN ? AND created_at >= ?", allDescendantIDs, completedOrderStatuses, startTime).
			Select("COALESCE(SUM(subtotal), 0)").
			Scan(&monthlyTurnover)
	}

	// [SYNC FIX] Ambil syarat dari MembershipTier level TERTINGGI (tier Merchant/puncak)
	// Jika tidak ada tier, gunakan PlatformConfig
	configSvc := NewConfigService(s.DB)
	reqMitra = configSvc.GetInt("merchant_min_active_mitra", 100)
	reqTurnover = configSvc.GetFloat("merchant_min_team_turnover", 10000000.0)

	var merchantTier models.MembershipTier
	if err := s.DB.Order("level DESC").Where("is_active = true").First(&merchantTier).Error; err == nil {
		if merchantTier.MinActiveMitra > 0 {
			reqMitra = merchantTier.MinActiveMitra
		}
		if merchantTier.MinMonthlyTurnover > 0 {
			reqTurnover = merchantTier.MinMonthlyTurnover
		}
	}

	isEligible = activeMitra >= int64(reqMitra) && monthlyTurnover >= reqTurnover
	return isEligible, activeMitra, monthlyTurnover, reqMitra, reqTurnover
}

// CheckAndDowngradeMerchants: Cek merchant yang tidak memenuhi syarat dan downgrade otomatis
// [Sync Fix] Sesuai dokumen bisnis: Merchant yang tidak memenuhi syarat 3 bulan berturut-turut → dicabut
func (s *AffiliateService) CheckAndDowngradeMerchants() (downgraded int, err error) {
	// Ambil threshold dari config
	configSvc := NewConfigService(s.DB)
	minActiveMitra := configSvc.GetInt("merchant_min_active_mitra", 100)
	minTurnover := configSvc.GetFloat("merchant_min_team_turnover", 10000000.0)

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
// [Safety Fix] Dibatasi maksimum 15 level kedalaman untuk mencegah infinite recursion
func (s *AffiliateService) UpdateUplineSnapshotsRecursive(affiliateID string) {
	s.updateUplineRecursive(affiliateID, 0)
}

func (s *AffiliateService) updateUplineRecursive(affiliateID string, depth int) {
	const maxDepth = 15
	if depth > maxDepth {
		log.Printf("⚠️ UpdateUplineSnapshots: max depth %d reached at affiliate %s", maxDepth, affiliateID)
		return
	}

	// Update diri sendiri
	s.UpdateTurnoverSnapshot(affiliateID)

	// Cari upline dan lanjut ke atas
	var member models.AffiliateMember
	if err := s.DB.Select("upline_id").Where("id = ?", affiliateID).First(&member).Error; err == nil {
		if member.UplineID != nil && *member.UplineID != "" {
			s.updateUplineRecursive(*member.UplineID, depth+1)
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
