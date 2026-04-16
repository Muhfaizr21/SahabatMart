package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedAll(db *gorm.DB) {
	fmt.Println("🌱 Starting Seeding Process...")

	// 1. Seed Tiers
	seedTiers(db)

	// 2. Seed Users & Merchants
	seedUsers(db)

	// 3. Seed Products
	seedProducts(db)

	fmt.Println("✅ Seeding Completed Successfully!")
}

func seedProducts(db *gorm.DB) {
	fmt.Println("  -> Seeding Premium Product Samples...")
	
	var merchant models.Merchant
	if err := db.Where("slug = ?", "modern-gadget").First(&merchant).Error; err != nil {
		log.Println("    [!] Merchant not found, skipping product seeding")
		return
	}

	products := []models.Product{
		{
			ID: "p1-uuid-gadget-001",
			MerchantID: merchant.ID,
			Name: "MacBook Pro M3 Max - 14 Inch",
			Slug: "macbook-pro-m3-max",
			Description: "The most advanced chips ever built for a personal computer. M3 Max brings massive performance and capability for the most extreme workflows.",
			Price: 45000000,
			OldPrice: 48000000,
			Stock: 10,
			Category: "Electronics",
			Brand: "Apple",
			Image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
			Status: "active",
			Rating: 4.9,
			Reviews: 128,
		},
		{
			ID: "p2-uuid-gadget-002",
			MerchantID: merchant.ID,
			Name: "iPhone 15 Pro Titanium",
			Slug: "iphone-15-pro-titanium",
			Description: "Forged in titanium. Featuring the groundbreaking A17 Pro chip, a customizable Action button, and a more versatile Pro camera system.",
			Price: 20000000,
			OldPrice: 21000000,
			Stock: 25,
			Category: "Electronics",
			Brand: "Apple",
			Image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800&q=80",
			Status: "active",
			Rating: 4.8,
			Reviews: 540,
		},
		{
			ID: "p3-uuid-fashion-001",
			MerchantID: merchant.ID,
			Name: "Air Jordan 1 Retro High OG",
			Slug: "air-jordan-1-retro",
			Description: "Classic style meets legendary performance. The Air Jordan 1 Retro High OG features luxury leather and iconic branding.",
			Price: 2500000,
			OldPrice: 3000000,
			Stock: 5,
			Category: "Fashion",
			Brand: "Nike",
			Image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80",
			Status: "active",
			Rating: 5.0,
			Reviews: 89,
		},
	}

	for _, p := range products {
		var existing models.Product
		if err := db.Where("slug = ?", p.Slug).First(&existing).Error; err != nil {
			db.Create(&p)
			log.Printf("    [+] Created product: %s", p.Name)
		}
	}
}

func seedTiers(db *gorm.DB) {
	fmt.Println("  -> Seeding Membership Tiers...")
	tiers := []models.MembershipTier{
		{ID: 1, Name: "Bronze", Level: 1, BaseCommissionRate: 0.03},
		{ID: 2, Name: "Silver", Level: 2, BaseCommissionRate: 0.05, MinEarningsUpgrade: 5000000},
		{ID: 3, Name: "Gold", Level: 3, BaseCommissionRate: 0.08, MinEarningsUpgrade: 20000000},
		{ID: 4, Name: "Platinum", Level: 4, BaseCommissionRate: 0.12, MinEarningsUpgrade: 100000000},
	}

	for _, t := range tiers {
		db.FirstOrCreate(&t, models.MembershipTier{ID: t.ID})
	}
}

func seedUsers(db *gorm.DB) {
	fmt.Println("  -> Seeding Professional Account Samples...")

	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)

	accounts := []struct {
		user models.User
		name string
	}{
		{
			user: models.User{
				Email:        "admin@sahabatmart.com",
				PasswordHash: pwHash,
				Role:         "superadmin",
				AdminRole:    "super",
				Status:       "active",
			},
			name: "Super Administrator",
		},
		{
			user: models.User{
				Email:        "merchant@sahabatmart.com",
				PasswordHash: pwHash,
				Role:         "merchant",
				Status:       "active",
			},
			name: "Modern Gadget Store",
		},
		{
			user: models.User{
				Email:        "affiliate@sahabatmart.com",
				PasswordHash: pwHash,
				Role:         "affiliate",
				Status:       "active",
			},
			name: "Budi Affiliator",
		},
		{
			user: models.User{
				Email:        "buyer@sahabatmart.com",
				PasswordHash: pwHash,
				Role:         "buyer",
				Status:       "active",
			},
			name: "Rizky Pembeli Amanah",
		},
	}

	for _, acc := range accounts {
		var existing models.User
		if err := db.Where("email = ?", acc.user.Email).First(&existing).Error; err != nil {
			// Create User
			db.Create(&acc.user)

			// Create Profile
			db.Create(&models.UserProfile{
				UserID:   acc.user.ID,
				FullName: acc.name,
			})

			// Create extra relations based on role
			switch acc.user.Role {
			case "merchant":
				db.Create(&models.Merchant{
					UserID:     acc.user.ID,
					StoreName:  acc.name,
					Slug:       "modern-gadget",
					Status:     "active",
					IsVerified: true,
				})
			case "affiliate":
				db.Create(&models.AffiliateMember{
					UserID:           acc.user.ID,
					MembershipTierID: 1,
					RefCode:          "BUDI123",
					Status:           models.AffiliateActive,
				})
			}
			log.Printf("    [+] Created account: %s", acc.user.Email)
		}
	}
}
