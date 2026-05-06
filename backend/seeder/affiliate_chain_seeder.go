package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedAffiliateChain(db *gorm.DB) {
	fmt.Println("  -> [CLEANUP] Menghapus seluruh data affiliate lama...")
	
	// Gunakan TRUNCATE CASCADE agar constraint foreign key ikut dibersihkan secara otomatis
	tables := []string{
		"affiliate_commissions", "affiliate_click_logs", "affiliate_links", 
		"affiliate_withdrawals", "affiliate_members", "merchants", "wallets",
		"orders", "order_items", "order_merchant_groups", "carts", "cart_items",
		"reviews", "user_skin_journeys", "skin_step_logs", "skin_progress_logs",
		"skin_journals", "skin_community_posts", "notifications",
	}
	for _, table := range tables {
		db.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table))
	}
	
	// Hapus User profil & User yang terkait dengan affiliate/merchant atau email upline
	db.Exec("DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE role IN ('affiliate', 'merchant') OR email LIKE 'upline%@akuglow.com')")
	db.Exec("DELETE FROM users WHERE role IN ('affiliate', 'merchant') OR email LIKE 'upline%@akuglow.com'")

	fmt.Println("  -> [SEEDING] Membuat rantai 5 level: Upline 5 -> 4 -> 3 -> 2 -> 1")
	
	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)

	// Ambil tier pertama sebagai default
	var tier models.MembershipTier
	db.Order("level ASC").First(&tier)

	var lastAffiliate *models.AffiliateMember

	// Kita buat dari Upline 1 (Top) sampai Upline 5 (Bottom)
	for i := 1; i <= 5; i++ {
		email := fmt.Sprintf("upline%d@akuglow.com", i)
		fullName := fmt.Sprintf("Upline %d", i)
		refCode := fmt.Sprintf("LEVEL%d", i)

		u := models.User{
			ID:           uuid.New().String(),
			Email:        email,
			PasswordHash: &pwHash,
			Role:         "affiliate",
			Status:       "active",
		}
		
		if err := db.Create(&u).Error; err != nil {
			fmt.Printf("❌ Gagal membuat user %s: %v\n", email, err)
			continue
		}

		db.Create(&models.UserProfile{
			UserID:   u.ID,
			FullName: fullName,
		})

		aff := models.AffiliateMember{
			UserID:           u.ID,
			RefCode:          refCode,
			MembershipTierID: tier.ID,
			Status:           "active",
			CreatedAt:        time.Now(),
		}

		// Jika ini bukan orang pertama, pasang upline-nya ke orang sebelumnya
		if lastAffiliate != nil {
			aff.UplineID = &lastAffiliate.ID
			aff.UplineCode = lastAffiliate.RefCode
		}

		if err := db.Create(&aff).Error; err != nil {
			fmt.Printf("❌ Gagal membuat affiliate member %s: %v\n", refCode, err)
			continue
		}

		// Berikan wallet
		db.Create(&models.Wallet{
			OwnerID:   u.ID,
			OwnerType: models.WalletAffiliate,
			Balance:   0,
		})

		// Simpan reference untuk looping selanjutnya (sebagai parent)
		// Kita perlu mengambil ID yang di-generate DB (jika UUID generate dilakukan di DB)
		// GORM biasanya mengisi ID jika kita passing object pointer
		currentAff := aff 
		lastAffiliate = &currentAff
		
		fmt.Printf("   ✅ Created %s (Ref: %s) -> Upline: %s\n", fullName, refCode, aff.UplineCode)
	}

	fmt.Println("  -> Rantai Affiliate berhasil dibuat!")
}
