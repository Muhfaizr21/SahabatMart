package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AffiliateNode struct {
	Name     string
	IsValid  bool
	Children []AffiliateNode
}

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
	db.Exec("DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE role IN ('affiliate', 'merchant') OR email LIKE '%@akuglow.com')")
	db.Exec("DELETE FROM users WHERE role IN ('affiliate', 'merchant') OR email LIKE '%@akuglow.com'")

	fmt.Println("  -> [SEEDING] Membuat rantai Affiliate kustom...")
	
	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)

	// Ambil tier pertama sebagai default
	var tier models.MembershipTier
	db.Order("level ASC").First(&tier)

	// Definisi hierarki affiliate sesuai permintaan
	tree := AffiliateNode{
		Name: "Official AkuGlow",
		IsValid: true,
		Children: []AffiliateNode{
			{
				Name: "Agam Gusriyandi",
				IsValid: true,
				Children: []AffiliateNode{
					{
						Name: "ASEP SETIAWAN",
						IsValid: true,
						Children: []AffiliateNode{
							{
								Name: "Anmita zulaika",
								IsValid: true,
								Children: []AffiliateNode{
									{
										Name: "Aku Glow x ADT",
										IsValid: true,
										Children: []AffiliateNode{
											{
												Name: "Yuliana Tanujaya",
												IsValid: true,
												Children: []AffiliateNode{
													{Name: "ANDI MANHARTA", IsValid: true},
													{Name: "Maria", IsValid: true},
													{Name: "Nani suryani", IsValid: false},
													{Name: "Ayi solina", IsValid: true},
													{Name: "Dwi Rachmanto", IsValid: true},
													{Name: "Harnanik Sayudi", IsValid: false},
													{Name: "Ayi solina 2", IsValid: false}, // Variasi nama untuk membedakan email
													{Name: "Miranti Juliana", IsValid: true},
												},
											},
											{Name: "Sutisna", IsValid: true},
											{Name: "Khosnul khuluq", IsValid: true},
											{
												Name: "Arrum Liyani Nur Qulbi",
												IsValid: true,
												Children: []AffiliateNode{
													{Name: "Aminah", IsValid: true},
													{Name: "NURMI", IsValid: true},
													{Name: "Rizky Kurnia Syaban", IsValid: true},
												},
											},
										},
									},
								},
							},
							{Name: "aldevanisa", IsValid: false},
							{Name: "Cecep Wahyudin", IsValid: true},
						},
					},
				},
			},
		},
	}

	var processNode func(node AffiliateNode, upline *models.AffiliateMember, level int)
	processNode = func(node AffiliateNode, upline *models.AffiliateMember, level int) {
		// Buat email dan refcode
		cleanName := strings.ReplaceAll(strings.ToLower(node.Name), " ", "")
		cleanName = strings.ReplaceAll(cleanName, "x", "")
		email := fmt.Sprintf("%s_%s@akuglow.com", cleanName, uuid.New().String()[:4])
		
		refBase := strings.ToUpper(cleanName)
		if len(refBase) > 6 {
			refBase = refBase[:6]
		}
		refCode := fmt.Sprintf("%s%s", refBase, uuid.New().String()[:4])

		status := models.AffiliateActive
		if !node.IsValid {
			status = models.AffiliatePendingVerification
		}

		u := models.User{
			ID:           uuid.New().String(),
			Email:        email,
			PasswordHash: &pwHash,
			Role:         "affiliate",
			Status:       "active", // User login status tetap active
		}
		
		if err := db.Create(&u).Error; err != nil {
			fmt.Printf("❌ Gagal membuat user %s: %v\n", email, err)
			return
		}

		db.Create(&models.UserProfile{
			UserID:   u.ID,
			FullName: strings.ReplaceAll(node.Name, " 2", ""),
		})

		aff := models.AffiliateMember{
			UserID:           u.ID,
			RefCode:          refCode,
			MembershipTierID: tier.ID,
			Status:           status,
			CreatedAt:        time.Now(),
		}

		if upline != nil {
			aff.UplineID = &upline.ID
			aff.UplineCode = upline.RefCode
		}

		if err := db.Create(&aff).Error; err != nil {
			fmt.Printf("❌ Gagal membuat affiliate member %s: %v\n", refCode, err)
			return
		}

		// Berikan wallet
		db.Create(&models.Wallet{
			OwnerID:   u.ID,
			OwnerType: models.WalletAffiliate,
			Balance:   0,
		})

		// Log formatting for hierarchy view
		indent := strings.Repeat("  ", level)
		validMark := "✅"
		if !node.IsValid {
			validMark = "⏳ (Blm Valid)"
		}
		fmt.Printf("%s%s %s (Ref: %s)\n", indent, validMark, node.Name, refCode)

		for _, child := range node.Children {
			processNode(child, &aff, level+1)
		}
	}

	processNode(tree, nil, 1)

	fmt.Println("  -> Rantai Affiliate hierarki kustom berhasil dibuat!")
}
