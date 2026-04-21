package seeder

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Valid UUIDs for Seeding
const (
	AdminID    = "00000000-0000-0000-0000-000000000001"
	MerchantID = "00000000-0000-0000-0000-000000000002"
	BuyerID    = "00000000-0000-0000-0000-000000000003"
	AffiliateID = "00000000-0000-0000-0000-000000000004"
)

func SeedAll(db *gorm.DB) {
	// 0. RESET ALL DATA (MEGA CLEAN)
	// [MONSTER FIX] Drop legacy trigger that causes errors with missing average_rating column
	db.Exec("DROP TRIGGER IF EXISTS update_average_rating ON reviews")
	
	tables := []string{
		"reviews", "cart_items", "carts", "wishlists",
		"order_items", "order_merchant_groups", "orders",
		"wallet_transactions", "wallets", "payout_requests",
		"affiliate_commissions", "affiliate_withdrawals", "affiliate_click_logs",
		"product_variants", "products", "vouchers", "banners",
		"affiliate_members", "membership_tiers", "categories", "brands",
		"user_profiles", "users",
	}

	for _, table := range tables {
		db.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table))
	}

	// 1. Seed Categories (Matches UI)
	seedCategories(db)

	// 2. Seed Tiers
	seedTiers(db)

	// 3. Seed Users & Merchants
	seedUsers(db)

	// 4. Seed Products
	seedProducts(db)

	// 5. Seed Orders (NEW: To fix Super Admin Empty Stats)
	seedOrders(db)

	// 6. Seed Reviews
	seedReviews(db)

	// 7. Seed Marketing (Banners & Vouchers)
	seedMarketing(db)

	fmt.Println("✅ Seeding Completed Successfully! All data is fresh and active.")
}

func seedOrders(db *gorm.DB) {
	fmt.Println("  -> Seeding Sample Orders...")

	var merchant models.Merchant
	db.First(&merchant)

	// Create a Wallet for Merchant so stats look good
	db.Create(&models.Wallet{
		OwnerID:   merchant.ID,
		OwnerType: models.WalletMerchant,
		Balance:   45000000,
	})

	orderID := "00000000-0000-0000-0000-000000000001"
	buyerIDVar := BuyerID
	order := models.Order{
		ID:          orderID,
		OrderNumber: "ORD-2026-0001",
		BuyerID:     &buyerIDVar,
		GrandTotal:  45000000,
		Subtotal:    45000000,
		Status:      models.OrderCompleted,
		ShippingName: "Budi SahabatMart",
		ShippingPhone: "08123456789",
		ShippingAddress: "Jl. Merdeka No. 10",
		ShippingCity: "Jakarta",
		ShippingProvince: "DKI Jakarta",
		ShippingPostalCode: "12345",
	}
	db.Create(&order)

	omgID := "00000000-0000-0000-0000-000000000001"
	omg := models.OrderMerchantGroup{
		ID:             omgID,
		OrderID:        orderID,
		MerchantID:     merchant.ID,
		Status:         models.MOrderCompleted,
		Subtotal:       45000000,
		PlatformFee:    450000, // 1%
	}
	db.Create(&omg)

	db.Create(&models.OrderItem{
		OrderMerchantGroupID: omgID,
		OrderID:              orderID,
		MerchantID:           merchant.ID,
		ProductID:            "00000000-1111-0000-0000-000000000001",
		ProductVariantID:     utils.ToStringPtr("00000000-2222-0000-0000-000000000001"),
		ProductName:          "MacBook Pro M3 Max - 14 Inch",
		UnitPrice:            45000000,
		Quantity:             1,
		Subtotal:             45000000,
	})
}

func seedCategories(db *gorm.DB) {
	fmt.Println("  -> Seeding Categories...")
	categories := []models.Category{
		{Name: "Elektronik", Slug: "elektronik", Order: 1},
		{Name: "Fashion", Slug: "fashion", Order: 2},
		{Name: "Kebutuhan Pokok", Slug: "kebutuhan-pokok", Order: 3},
		{Name: "Kesehatan", Slug: "kesehatan", Order: 4},
		{Name: "Hobi & Hiburan", Slug: "hobi-hiburan", Order: 5},
	}
	for _, c := range categories {
		db.Create(&c)
	}
}

func seedMarketing(db *gorm.DB) {
	fmt.Println("  -> Seeding Marketing Assets...")
	// Banners
	banners := []models.Banner{
		{Title: "Gadget Impian Jadi Kenyataan", SubTitle: "Dapatkan MacBook Pro M3 terbaru dengan promo cicilan 0%", Badge: "NEW ARRIVAL", Offer: "Potongan 10%", Image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", BgColor: "#1e293b", IsActive: true},
		{Title: "Gaya Sultan Harga Teman", SubTitle: "Koleksi Air Jordan 1 Original hanya di SahabatMart", Badge: "TRENDING", Offer: "Diskon 20%", Image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800", BgColor: "#1d4ed8", IsActive: true},
	}
	for _, b := range banners {
		db.Create(&b)
	}

	// Vouchers
	vouchers := []models.Voucher{
		{Code: "SAHABATBARU", Title: "Diskon Pengguna Baru", DiscountType: "fixed", DiscountValue: 50000, MinOrder: 200000, Quota: 100, Status: "active"},
		{Code: "PROMOGADGET", Title: "Cashback Elektronik", DiscountType: "percent", DiscountValue: 10, MinOrder: 5000000, Quota: 50, Status: "active"},
	}
	for _, v := range vouchers {
		db.Create(&v)
	}

	// Clicks for Security Audit (Fraud/Bot Detection)
	affiliates := []models.AffiliateMember{}
	db.Find(&affiliates)
	if len(affiliates) > 0 {
		clicks := []models.AffiliateClick{
			{AffiliateID: affiliates[0].ID, IPAddress: "114.124.200.15", Referrer: "google.com", IsFraud: false, IsBot: false},
			{AffiliateID: affiliates[0].ID, IPAddress: "114.124.200.15", Referrer: "google.com", IsFraud: false, IsBot: false},
			{AffiliateID: affiliates[0].ID, IPAddress: "139.192.112.50", Referrer: "unknown", IsFraud: true, IsBot: false}, // High speed duplicate from different region
			{AffiliateID: affiliates[0].ID, IPAddress: "23.45.67.89", Referrer: "facebook.com", IsFraud: false, IsBot: true}, // Data center IP
		}
		for _, c := range clicks {
			db.Create(&c)
		}
	}
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
			ID: "00000000-1111-0000-0000-000000000001",
			MerchantID: merchant.ID,
			Name: "MacBook Pro M3 Max - 14 Inch",
			Slug: "macbook-pro-m3-max",
			Description: "Prosesor paling kencang untuk profesional kreatif. Chip M3 Max memberikan performa ekstrem untuk workflow berat.",
			Price: 45000000,
			OldPrice: 48000000,
			Stock: 10,
			Category: "Elektronik",
			Brand: "Apple",
			Image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
			Status: "active",
			Rating: 5.0,
			Reviews: 2,
			Variants: []models.ProductVariant{
				{
					ID: "00000000-2222-0000-0000-000000000001",
					ProductID: "00000000-1111-0000-0000-000000000001",
					Name: "Space Black - 1TB",
					SKU: "MBP-M3-SB-1TB",
					Price: 45000000,
					Stock: 5,
				},
			},
		},
		{
			ID: "00000000-1111-0000-0000-000000000002",
			MerchantID: merchant.ID,
			Name: "Air Jordan 1 Retro High OG",
			Slug: "air-jordan-1-retro",
			Description: "Sneakers legendaris dengan balutan kulit premium.",
			Price: 3500000,
			OldPrice: 4000000,
			Stock: 20,
			Category: "Fashion",
			Brand: "Nike",
			Image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80",
			Status: "active",
			Rating: 0,
			Reviews: 0,
		},
	}

	for i := range products {
		if err := db.Create(&products[i]).Error; err != nil {
			log.Printf("    [!] Error seeding product %s: %v", products[i].Name, err)
		} else {
			log.Printf("    [+] Created product: %s", products[i].Name)
		}
	}
}

func seedTiers(db *gorm.DB) {
	fmt.Println("  -> Seeding Membership Tiers...")
	tiers := []models.MembershipTier{
		{ID: 1, Name: "Bronze", Level: 1, BaseCommissionRate: 0.03, MinWithdrawalAmount: 50000, CommissionHoldDays: 14, IsActive: true},
		{ID: 2, Name: "Silver", Level: 2, BaseCommissionRate: 0.05, MinWithdrawalAmount: 100000, CommissionHoldDays: 10, IsActive: true},
		{ID: 3, Name: "Gold", Level: 3, BaseCommissionRate: 0.08, MinWithdrawalAmount: 200000, CommissionHoldDays: 7, IsActive: true},
		{ID: 4, Name: "Platinum", Level: 4, BaseCommissionRate: 0.12, MinWithdrawalAmount: 500000, CommissionHoldDays: 3, IsActive: true},
	}

	for _, t := range tiers {
		db.Create(&t)
	}
}

func seedUsers(db *gorm.DB) {
	fmt.Println("  -> Seeding Professional Accounts...")

	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)

	accounts := []struct {
		id   string
		user models.User
		name string
		slug string
	}{
		{
			id:   AdminID,
			user: models.User{Email: "admin@sahabatmart.com", PasswordHash: pwHash, Role: "superadmin", AdminRole: "super", Status: "active"},
			name: "Super Administrator",
		},
		{
			id:   MerchantID,
			user: models.User{Email: "merchant@sahabatmart.com", PasswordHash: pwHash, Role: "merchant", Status: "active"},
			name: "Modern Gadget Store",
			slug: "modern-gadget",
		},
		{
			id:   BuyerID,
			user: models.User{Email: "buyer@sahabatmart.com", PasswordHash: pwHash, Role: "buyer", Status: "active"},
			name: "Budi SahabatMart",
		},
	}

	for _, acc := range accounts {
		acc.user.ID = acc.id
		db.Create(&acc.user)

		db.Create(&models.UserProfile{
			UserID:   acc.user.ID,
			FullName: acc.name,
		})

		if acc.user.Role == "merchant" {
			db.Create(&models.Merchant{
				UserID:     acc.user.ID,
				StoreName:  acc.name,
				Slug:       acc.slug,
				Status:     "active",
				IsVerified: true,
			})
		}
		log.Printf("    [+] Created: %s", acc.user.Email)
	}
}

func seedReviews(db *gorm.DB) {
	fmt.Println("  -> Seeding Reviews...")
	
	reviews := []models.Review{
		{
			ProductID: "00000000-1111-0000-0000-000000000001",
			MerchantID: MerchantID,
			BuyerID:   BuyerID,
			OrderID:   "00000000-0000-0000-0000-000000000001", // Valid UUID
			OrderItemID: "00000000-0000-0000-0000-000000000001",
			Rating:    5,
			Comment:   "Barang original, pengiriman super cepat!",
		},
		{
			ProductID: "00000000-1111-0000-0000-000000000001",
			MerchantID: MerchantID,
			BuyerID:   BuyerID,
			OrderID:   "00000000-0000-0000-0000-000000000002", // Valid UUID
			OrderItemID: "00000000-0000-0000-0000-000000000002",
			Rating:    5,
			Comment:   "Seller responsif, MacBook aman sampai tujuan.",
		},
	}

	for _, r := range reviews {
		db.Create(&r)
	}
}
