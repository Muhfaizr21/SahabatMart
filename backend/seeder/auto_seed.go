package seeder

import (
	"log"

	"akuglow/backend/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func AutoSeedLogisticChannels(db *gorm.DB) {
	var count int64
	db.Model(&models.LogisticChannel{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("📦 Menambahkan logistic channels default...")
	channels := []models.LogisticChannel{
		{Code: "jne", Name: "JNE", IsActive: true, LogoURL: ""},
		{Code: "sicepat", Name: "SiCepat", IsActive: true, LogoURL: ""},
		{Code: "jnt", Name: "J&T Express", IsActive: true, LogoURL: ""},
		{Code: "anteraja", Name: "Anteraja", IsActive: true, LogoURL: ""},
		{Code: "pos", Name: "Pos Indonesia", IsActive: true, LogoURL: ""},
		{Code: "tiki", Name: "TIKI", IsActive: true, LogoURL: ""},
		{Code: "lion", Name: "Lion Parcel", IsActive: true, LogoURL: ""},
		{Code: "idexpress", Name: "ID Express", IsActive: true, LogoURL: ""},
		{Code: "sentralcargo", Name: "Sentral Cargo", IsActive: true, LogoURL: ""},
		{Code: "rpx", Name: "RPX", IsActive: true, LogoURL: ""},
		{Code: "wahana", Name: "Wahana", IsActive: true, LogoURL: ""},
		{Code: "ninja", Name: "Ninja Xpress", IsActive: true, LogoURL: ""},
	}

	for _, ch := range channels {
		db.Where("code = ?", ch.Code).FirstOrCreate(&ch)
	}
	log.Printf("✅ %d logistic channels seeded", len(channels))
}

func AutoSeedCriticalData(db *gorm.DB) {
	var tierCount int64
	db.Model(&models.MembershipTier{}).Count(&tierCount)
	if tierCount == 0 {
		log.Println("⚠️  Tabel membership_tiers kosong. Membuat tier Bronze sebagai bootstrap...")
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
			log.Println("✅ Bronze (bootstrap) selesai.")
		}
	}

	var admin models.User
	if err := db.Where("email = ?", "admin@akuglow.com").First(&admin).Error; err != nil {
		password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		pwHash := string(password)
		admin = models.User{
			ID:           models.PusatID,
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
		log.Println("✅ Akun admin@akuglow.com berhasil dibuat.")
	} else {
		db.Model(&models.User{}).Where("email = ?", "admin@akuglow.com").Update("status", "active")
	}
}
