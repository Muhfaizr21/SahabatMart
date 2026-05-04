package seeder

import (
	"log"

	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

// AutoSeedCriticalData: bootstrap MINIMAL — tidak hardcode data bisnis di sini!
// Semua jenjang (level, syarat, komisi) dikonfigurasi via Superadmin → Membership Tiers.
func AutoSeedCriticalData(db *gorm.DB) {
	var count int64
	db.Model(&models.MembershipTier{}).Count(&count)
	if count == 0 {
		log.Println("⚠️  Tabel membership_tiers kosong. Membuat tier Bronze sebagai bootstrap...")

		// Hanya buat 1 tier awal agar sistem tidak crash saat mitra pertama mendaftar.
		// Superadmin HARUS tambah jenjang lain via Admin Panel → Membership Tiers.
		bronze := models.MembershipTier{
			ID:                  1,
			Name:                "Bronze",
			Level:               1,
			BaseCommissionRate:  0.03,
			MinActiveMitra:      0,
			MinMonthlyTurnover:  0,
			MinWithdrawalAmount: 50000,
			CommissionHoldDays:  14,
			CookieDurationDays:  30,
			Color:               "#cd7f32",
			Icon:                "military_tech",
			Description:         "Jenjang awal. Tambah jenjang lain via Superadmin → Membership Tiers.",
			IsActive:            true,
		}
		if err := db.Create(&bronze).Error; err != nil {
			log.Printf("❌ Gagal buat tier Bronze bootstrap: %v", err)
		} else {
			log.Println("✅ Bronze (bootstrap) selesai. Tambah Silver, Gold, dll via Superadmin UI.")
		}
	}

	// [Auto-Fix] Pastikan admin@akuglow.com selalu ACTIVE
	db.Model(&models.User{}).Where("email = ?", "admin@akuglow.com").Update("status", "active")

	// [Logistics] Seed default couriers if empty
	var logCount int64
	db.Model(&models.LogisticChannel{}).Count(&logCount)
	if logCount == 0 {
		log.Println("🚚 Seeding default logistics channels...")
		channels := []models.LogisticChannel{
			{Code: "jne", Name: "JNE", IsActive: true},
			{Code: "sicepat", Name: "SiCepat", IsActive: true},
			{Code: "jnt", Name: "J&T", IsActive: true},
			{Code: "tiki", Name: "TIKI", IsActive: true},
			{Code: "anteraja", Name: "AnterAja", IsActive: true},
		}
		for _, c := range channels {
			db.Create(&c)
		}
	}

	// [Platform Settings] Ensure default configs exist
	SeedConfigs(db)
}
