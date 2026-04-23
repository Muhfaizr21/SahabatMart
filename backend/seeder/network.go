package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedNetwork(db *gorm.DB) {
	fmt.Println("  -> Seeding Merchant & Affiliate Network Data...")
	
	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)

	// 1. Get Tiers for reference
	var tiers []models.MembershipTier
	db.Order("level ASC").Find(&tiers)
	tierMap := make(map[int]uint)
	for _, t := range tiers {
		tierMap[t.Level] = t.ID
	}

		// 2. Identify Top Leaders (Uplines)
	// We use the existing 'mitra@akuglow.com' as a Master Leader
	var masterUser models.User
	db.Where("email = ?", "mitra@akuglow.com").First(&masterUser)
	
	var masterAffiliate models.AffiliateMember
	db.Where("user_id = ?", masterUser.ID).First(&masterAffiliate)

	// 3. Create 30 "Elite Mitra" (Silver/Gold)
	cities := []string{"Jakarta", "Bandung", "Surabaya", "Medan", "Makassar", "Semarang", "Yogyakarta", "Bali"}
	
	for i := 1; i <= 30; i++ {
		email := fmt.Sprintf("leader%d@akugrow.com", i)
		name := fmt.Sprintf("Elite Leader %d", i)
		city := cities[rand.Intn(len(cities))]
		
		u := models.User{
			ID: uuid.New().String(),
			Email: email,
			PasswordHash: &pwHash,
			Role: "affiliate",
			Status: "active",
		}
		db.Create(&u)
		db.Create(&models.UserProfile{UserID: u.ID, FullName: name, City: city})
		
		tierLevel := (i % 3) + 1 // Cycle through 1, 2, 3 (Dasar, Silver, Gold)
		refCode := fmt.Sprintf("ELITE-%d%d", i, rand.Intn(100))
		
		aff := models.AffiliateMember{
			UserID:           u.ID,
			RefCode:          refCode,
			MembershipTierID: tierMap[tierLevel],
			Status:           "active",
			UplineID:         &masterAffiliate.ID, // Correctly point to Affiliate ID
			UplineCode:       masterAffiliate.RefCode,
			TotalEarned:      float64(rand.Intn(5000000)),
			TotalClicks:      int64(rand.Intn(1000)),
		}
		db.Create(&aff)

		// Create Wallet for earnings visibility
		db.Create(&models.Wallet{
			OwnerID:        u.ID,
			OwnerType:      models.WalletAffiliate,
			Balance:        aff.TotalEarned * 0.8, // 80% ready for withdrawal
			PendingBalance: aff.TotalEarned * 0.2,
			TotalEarned:    aff.TotalEarned,
		})
	}

	// 4. Create 5 "Mitra + Merchant" (Users who have been approved)
	for i := 1; i <= 5; i++ {
		email := fmt.Sprintf("merchant_mitra%d@akugrow.com", i)
		storeName := fmt.Sprintf("Toko Cantik %d", i)
		slug := fmt.Sprintf("toko-cantik-%d", i)
		
		u := models.User{
			ID: uuid.New().String(),
			Email: email,
			PasswordHash: &pwHash,
			Role: "merchant", // IMPORTANT: Already upgraded to merchant
			Status: "active",
		}
		db.Create(&u)
		db.Create(&models.UserProfile{UserID: u.ID, FullName: fmt.Sprintf("Merchant Owner %d", i), City: "Bandung"})
		
		// Every Merchant is also an Affiliate Member
		aff := models.AffiliateMember{
			UserID:           u.ID,
			RefCode:          fmt.Sprintf("TR-MERCH-%d", i),
			MembershipTierID: tierMap[4], // Platinum for Merchants usually
			Status:           "active",
			TotalEarned:      float64(rand.Intn(20000000)),
		}
		db.Create(&aff)

		merch := models.Merchant{
			UserID:              u.ID,
			StoreName:           storeName,
			Slug:                slug,
			Status:              "active",
			IsVerified:          true,
			ActiveMitraCount:    rand.Intn(150),
			TeamMonthlyTurnover: float64(10000000 + rand.Intn(50000000)),
			Balance:             float64(rand.Intn(1000000)),
		}
		db.Create(&merch)

		// Create Wallet for merchant earnings
		db.Create(&models.Wallet{
			OwnerID:   u.ID,
			OwnerType: models.WalletMerchant,
			Balance:   merch.Balance,
		})
	}

	// 5. Create 3 "Pending Merchant Applications" (Users who meet requirements but not yet approved)
	for i := 1; i <= 3; i++ {
		email := fmt.Sprintf("waiting_merch%d@akugrow.com", i)
		
		u := models.User{
			ID: uuid.New().String(),
			Email: email,
			PasswordHash: &pwHash,
			Role: "affiliate", // Still affiliate
			Status: "active",
		}
		db.Create(&u)
		db.Create(&models.UserProfile{UserID: u.ID, FullName: fmt.Sprintf("High Achiever %d", i)})
		
		db.Create(&models.AffiliateMember{
			UserID:           u.ID,
			RefCode:          fmt.Sprintf("HIGH-%d", i),
			MembershipTierID: tierMap[3],
			Status:           "active",
		})

		merch := models.Merchant{
			UserID:              u.ID,
			StoreName:           fmt.Sprintf("Pending Store %d", i),
			Slug:                fmt.Sprintf("pending-store-%d", i),
			Status:              "pending", // WAITING APPROVAL
			IsVerified:          false,
			ActiveMitraCount:    100 + i,
			TeamMonthlyTurnover: 12000000,
		}
		db.Create(&merch)
	}

	fmt.Println("  -> Seeding Finished. Network contains elite leaders, active merchants, and pending candidates.")

	// 5.5 Create 50 "Regular Members" distributed among Elite Leaders
	var eliteAffiliates []models.AffiliateMember
	db.Find(&eliteAffiliates)

	for i := 1; i <= 50; i++ {
		email := fmt.Sprintf("mitra_reguler%d@akugrow.com", i)
		u := models.User{ID: uuid.New().String(), Email: email, PasswordHash: &pwHash, Role: "affiliate", Status: "active"}
		db.Create(&u)
		db.Create(&models.UserProfile{UserID: u.ID, FullName: fmt.Sprintf("Mitra Reguler %d", i)})
		
		parent := eliteAffiliates[rand.Intn(len(eliteAffiliates))]
		db.Create(&models.AffiliateMember{
			UserID: u.ID,
			RefCode: fmt.Sprintf("REG-%d", i),
			MembershipTierID: tierMap[1],
			Status: "active",
			UplineID: &parent.ID, // Correctly point to Affiliate ID
			UplineCode: parent.RefCode,
		})
	}

	// 5.6 Seed some dummy commissions for MITRA-BAIK (Master Leader)
	var mainMitra models.AffiliateMember
	db.Where("ref_code = ?", "MITRA-BAIK").First(&mainMitra)
	
	for i := 1; i <= 15; i++ {
		db.Create(&models.AffiliateCommission{
			AffiliateID: mainMitra.UserID,
			OrderID:     uuid.New().String(),
			OrderItemID: uuid.New().String(),
			ProductID:   uuid.New().String(),
			MerchantID:  uuid.New().String(),
			GrossAmount: 1000000,
			RateApplied: 0.1,
			Amount:      float64(50000 + rand.Intn(200000)),
			Status:      "approved",
			CreatedAt:   time.Now().AddDate(0, 0, -i),
		})
	}

	fmt.Println("  -> Network Seeding Finished Success!")
}
