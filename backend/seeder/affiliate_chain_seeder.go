package seeder

import (
	"akuglow/backend/models"
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
	fmt.Println("  -> [SEEDING] Membuat rantai Affiliate LIVE (Hierarchy Only)...")
	
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
													{Name: "Ayi solina", IsValid: false},
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
			FullName: node.Name,
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
