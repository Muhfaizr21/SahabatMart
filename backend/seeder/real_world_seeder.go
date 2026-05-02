package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SeedRealWorldData mensimulasikan aktivitas nyata dengan 200+ user
func SeedRealWorldData(db *gorm.DB) {
	fmt.Println("🌟 Starting Real World Simulation (200+ Users)...")

	// 1. Ambil Data Referensi
	var tiers []models.MembershipTier
	db.Find(&tiers)

	var products []models.Product
	db.Find(&products)

	var merchants []models.Merchant
	db.Find(&merchants)

	var groups []models.SkinCommunityGroup
	db.Find(&groups)
	if len(groups) == 0 {
		// Buat grup default jika belum ada
		groups = []models.SkinCommunityGroup{
			{Name: "Acne Fighters", Description: "Pejuang jerawat berkumpul di sini.", Icon: "coronavirus"},
			{Name: "Glow Up Squad", Description: "Tips mencerahkan kulit secara alami.", Icon: "auto_awesome"},
			{Name: "Sensitive Skin", Description: "Sharing produk aman untuk kulit sensitif.", Icon: "verified_user"},
		}
		for i := range groups { db.Create(&groups[i]) }
	}

	names := []string{"Budi", "Siti", "Andi", "Dewi", "Rian", "Lulu", "Hendra", "Maya", "Joko", "Siska", "Rina", "Bambang", "Ani", "Tono", "Dina", "Eko", "Yanti", "Agus", "Ratna", "Fery"}
	cities := []string{"Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Palembang", "Yogyakarta", "Malang", "Denpasar"}

	fmt.Println("  -> Creating 200 Users & Profiles...")
	for i := 1; i <= 200; i++ {
		email := fmt.Sprintf("user%d@example.com", i)
		fullName := fmt.Sprintf("%s %s", names[rand.Intn(len(names))], names[rand.Intn(len(names))])
		
		user := models.User{
			Email:    email,
			Role:     "affiliate",
			Status:   "active",
		}
		db.Create(&user)

		db.Create(&models.UserProfile{
			UserID:   user.ID,
			FullName: fullName,
			City:     cities[rand.Intn(len(cities))],
			Province: "Indonesia",
		})

		// Jadi Mitra Affiliate dengan Tier Random
		tier := tiers[rand.Intn(len(tiers))]
		affiliate := models.AffiliateMember{
			UserID:           user.ID,
			RefCode:          fmt.Sprintf("REF-%d%s", i, uuid.New().String()[:4]),
			MembershipTierID: tier.ID,
			Status:           "active",
		}
		db.Create(&affiliate)

		// --- Simulasi Aktivitas Member ---

		// A. Skin Journey (Pre-test)
		pretest := models.SkinPreTest{
			UserID:       user.ID,
			FullName:     fullName,
			SkinType:     []string{"Oily", "Dry", "Sensitive", "Combination"}[rand.Intn(4)],
			SkinProblem:   "Jerawat dan Kemerahan",
			BarcodeToken: uuid.New().String(),
		}
		db.Create(&pretest)

		// B. Skin Journey (Progress & Journal)
		for week := 1; week <= rand.Intn(4)+1; week++ {
			db.Create(&models.SkinProgress{
				UserID:         user.ID,
				WeekNumber:     week,
				SkinScore:      rand.Intn(5) + 5,
				EmotionalScore: rand.Intn(5) + 5,
				RednessScore:   rand.Intn(30) + 10,
				AcneCount:      rand.Intn(10),
				Notes:          "Progres semakin baik!",
				CreatedAt:      time.Now().AddDate(0, 0, - (7 * week)),
			})
			
			db.Create(&models.SkinJournal{
				UserID:     user.ID,
				DayNumber:  week * 7,
				Content:    "Hari ini kulit terasa lebih lembab setelah pakai serum.",
				CreatedAt:  time.Now().AddDate(0, 0, - (week * 7)),
			})
		}

		// C. Community Post
		if i % 5 == 0 {
			post := models.SkinCommunityPost{
				UserID:  user.ID,
				GroupID: groups[rand.Intn(len(groups))].ID,
				Content: "Halo teman-teman! Baru gabung Akuglow nih, mohon bimbingannya ya. 😊",
				Likes:   rand.Intn(50),
			}
			db.Create(&post)
			
			// Tambah komen random
			if i % 10 == 0 {
				db.Create(&models.SkinCommunityComment{
					PostID:  post.ID,
					UserID:  user.ID,
					Content: "Wah semangat kak! Proses emang gak instan.",
				})
			}
		}

		// D. Transaksi & Klik (Simulation)
		for click := 0; click < rand.Intn(50); click++ {
			db.Create(&models.AffiliateClickLog{
				AffiliateID: affiliate.ID,
				IPAddress:   "127.0.0.1",
				UserAgent:   "Mozilla/5.0",
				ReferrerURL: "Instagram",
				RefCode:     affiliate.RefCode,
				ClickedAt:   time.Now().AddDate(0, 0, -rand.Intn(30)),
			})
		}

		// Simulasi Order Selesai
		if i % 2 == 0 && len(merchants) > 0 && len(products) > 0 {
			merchant := merchants[rand.Intn(len(merchants))]
			product := products[rand.Intn(len(products))]
			
			orderNum := fmt.Sprintf("ORD-%d%s", i, uuid.New().String()[:6])
			subtotal := float64(rand.Intn(500000) + 100000)
			platformFee := subtotal * 0.05
			affComm := subtotal * 0.1
			merchantPayout := subtotal - platformFee - affComm

			order := models.Order{
				ID:          uuid.New().String(),
				OrderNumber: orderNum,
				BuyerID:     &user.ID,
				Subtotal:    subtotal,
				GrandTotal:  subtotal,
				Status:      models.OrderCompleted,
				CreatedAt:   time.Now().AddDate(0, 0, -rand.Intn(20)),
			}
			db.Create(&order)

			// Wajib: Create OrderMerchantGroup (Tanpa ini Dashboard Merchant KOSONG)
			group := models.OrderMerchantGroup{
				ID:                  uuid.New().String(),
				OrderID:             order.ID,
				MerchantID:          merchant.ID,
				Status:              models.MOrderCompleted,
				Subtotal:            subtotal,
				PlatformFee:         platformFee,
				AffiliateCommission: affComm,
				Commission:          affComm,
				MerchantPayout:      merchantPayout,
				CreatedAt:           order.CreatedAt,
			}
			db.Create(&group)

			// Buat OrderItem (Linked to Group)
			item := models.OrderItem{
				ID:                    uuid.New().String(),
				OrderID:               order.ID,
				OrderMerchantGroupID:  group.ID,
				MerchantID:            merchant.ID,
				ProductID:             product.ID,
				ProductName:           product.Name,
				ProductImageURL:       product.Image,
				Quantity:              1,
				UnitPrice:             subtotal,
				Subtotal:              subtotal,
				PlatformFeeAmount:     platformFee,
				CommissionAmount:      affComm,
				MerchantAmount:        merchantPayout,
				CreatedAt:             order.CreatedAt,
			}
			db.Create(&item)

			// Komisi Affiliate
			db.Create(&models.AffiliateCommission{
				AffiliateID: affiliate.ID,
				OrderID:     order.ID,
				OrderItemID: item.ID,
				ProductID:   product.ID,
				MerchantID:  merchant.ID,
				GrossAmount: subtotal,
				Amount:      affComm,
				Status:      models.CommissionApproved,
			})

			// --- [NEW] Generate Review for completed order ---
			if rand.Float32() > 0.3 { // 70% chance to have a review
				rating := rand.Intn(2) + 4 // 4 or 5 stars
				comments := []string{
					"Produknya bagus banget, cocok di kulit aku!",
					"Pengiriman cepat, packing rapi. Recomended!",
					"Sudah langganan di sini, selalu puas.",
					"Kualitas premium, worth the price.",
					"Mantap Akuglow, sukses terus!",
				}
				review := models.Review{
					ID:          uuid.New().String(),
					ProductID:   product.ID,
					MerchantID:  merchant.ID,
					OrderID:     order.ID,
					OrderItemID: item.ID,
					BuyerID:     user.ID,
					Rating:      rating,
					Comment:     comments[rand.Intn(len(comments))],
					IsHidden:    false,
				}
				db.Create(&review)
			}
		}
	}

	// 2. Sync Ratings for all products after seeding reviews
	fmt.Println("  -> Synchronizing Product Ratings...")
	for _, p := range products {
		var stats struct {
			AvgRating float64
			Count     int
		}
		db.Model(&models.Review{}).
			Where("product_id = ? AND is_hidden = ?", p.ID, false).
			Select("AVG(rating) as avg_rating, COUNT(id) as count").
			Scan(&stats)

		db.Model(&models.Product{}).Where("id = ?", p.ID).Updates(map[string]interface{}{
			"rating":         stats.AvgRating,
			"average_rating": stats.AvgRating,
			"reviews":        stats.Count,
			"total_reviews":  stats.Count,
		})
	}

	// 2. Isi Stok Merchant (Distributor)
	fmt.Println("  -> Stocking up 3 Main Distros...")
	for _, m := range merchants {
		for _, p := range products {
			// Pastikan ada stok di inventory
			db.Where(models.Inventory{MerchantID: m.ID, ProductID: p.ID}).
				Assign(models.Inventory{Stock: rand.Intn(100) + 50}).
				FirstOrCreate(&models.Inventory{})
		}
	}

	fmt.Println("✅ Simulation Complete! Web is now alive with 200+ active users.")
}
