package seeder

import (
	"SahabatMart/backend/models"
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedMerchants(db *gorm.DB) {
	// 1. Cek apakah sudah ada merchant (selain PUSAT)
	var count int64
	db.Model(&models.Merchant{}).Where("id != ?", models.PusatID).Count(&count)
	if count > 0 {
		return
	}

	log.Println("🏪 Seeding initial merchant...")

	// 2. Buat User Merchant
	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)
	
	merchantUser := models.User{
		ID:           uuid.New().String(),
		Email:        "merchant@akuglow.com",
		PasswordHash: &pwHash,
		Role:         "merchant",
		Status:       "active",
	}

	if err := db.Where("email = ?", merchantUser.Email).FirstOrCreate(&merchantUser).Error; err != nil {
		log.Printf("❌ Gagal buat user merchant: %v", err)
		return
	}

	// 3. Buat User Profile
	profile := models.UserProfile{
		UserID:   merchantUser.ID,
		FullName: "AkuGlow Official Merchant",
		City:     "Bandung",
		Province: "Jawa Barat",
	}
	db.Where("user_id = ?", profile.UserID).FirstOrCreate(&profile)

	// 4. Buat Merchant Record
	merchant := models.Merchant{
		ID:          uuid.New().String(),
		UserID:      merchantUser.ID,
		StoreName:   "AkuGlow Official Store",
		Slug:        "akuglow-official",
		Description: "Toko resmi AkuGlow Indonesia. Menyediakan produk kecantikan premium.",
		Status:      "active",
		IsVerified:  true,
		City:        "Bandung",
		JoinedAt:    time.Now(),
		EnabledCouriers: "jne,sicepat,jnt",
	}

	if err := db.Where("user_id = ?", merchant.UserID).FirstOrCreate(&merchant).Error; err != nil {
		log.Printf("❌ Gagal buat data merchant: %v", err)
		return
	}

	log.Println("✅ Merchant 'AkuGlow Official Store' (merchant@akuglow.com) berhasil di-seed.")
}
