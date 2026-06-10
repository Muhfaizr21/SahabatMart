package seeder

import (
	"log"

	"akuglow/backend/models"
	"golang.org/x/crypto/bcrypt"
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
			CommissionHoldDays:  0,
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

	// [Auto-Fix] Pastikan admin@akuglow.com selalu ada dan ACTIVE
	var admin models.User
	if err := db.Where("email = ?", "admin@akuglow.com").First(&admin).Error; err != nil {
		password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		pwHash := string(password)
		admin = models.User{
			ID:           "00000000-0000-0000-0000-000000000000",
			Email:        "admin@akuglow.com",
			PasswordHash: &pwHash,
			Role:         "superadmin",
			Status:       "active",
		}
		db.Create(&admin)
		db.Create(&models.UserProfile{
			UserID:   admin.ID,
			FullName: "Superadmin",
		})
		log.Println("✅ Akun admin@akuglow.com berhasil direkonstruksi.")
	} else {
		db.Model(&models.User{}).Where("email = ?", "admin@akuglow.com").Update("status", "active")
	}

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

	// [RBAC] Seed permissions and default roles (idempotent — safe to run every startup)
	seedRBAC(db)
	seedDefaultRoles(db)

	// [AkuGlow Products] Auto-seed products from official store
	// SeedAkuglowProducts(db)

	// [Skin Journey] Auto-seed COMPLETE programs, steps, and flow configurations
	// SeedSkinJourneyComplete(db)

	// [Blog Posts] Auto-seed news
	// seedBlogs(db)

	// [Home Banners] Auto-seed slider
	// seedBanners(db)

	// [Merchants] Auto-seed at least 1 merchant for testing
	// SeedMerchants(db)

	// Sync existing images to Media Library
	// SyncExistingImagesToMediaLibrary(db)

	// [Auto-Heal] Audit and repair roles, slugs, and wallets
	HealAndSyncDatabase(db)

	// [Demographics] Auto-seed mock demographics data if table is empty
	// SeedDemographics(db)

	// [Finance] We no longer auto-seed high-fidelity finance data here to avoid startup lag.
	// Use 'go run cmd/seeder/main.go' for that.
}

