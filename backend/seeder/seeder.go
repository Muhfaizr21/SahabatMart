package seeder

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	AdminID = models.AdminID
	PusatID = models.PusatID
)

func SeedAll(db *gorm.DB) {
	fmt.Println("🚀 Starting Mega Seeding Process...")

	// [IMPORTANT] Ensure the extensions and tables are ready
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
	
	// Re-run migration to ensure all tables exist with new schema
	db.AutoMigrate(
		&models.User{}, &models.UserProfile{},
		&models.Merchant{}, &models.AffiliateMember{}, &models.MembershipTier{},
		&models.Category{}, &models.Product{}, &models.ProductVariant{},
		&models.ProductTierCommission{},
		&models.Inventory{}, &models.RestockRequest{}, &models.RestockItem{},
		&models.Order{}, &models.OrderMerchantGroup{}, &models.OrderItem{},
		&models.Cart{}, &models.CartItem{},
		&models.Voucher{}, &models.Banner{},
		&models.Permission{}, &models.Role{},
	)

	// DROP TRIGGER if exists
	db.Exec("DROP TRIGGER IF EXISTS update_average_rating ON reviews")
	
	tables := []string{
		"reviews", "cart_items", "carts", "wishlists",
		"order_items", "order_merchant_groups", "orders",
		"wallet_transactions", "wallets", "payout_requests",
		"affiliate_commissions", "affiliate_withdrawals", "affiliate_click_logs",
		"skin_pre_tests", "skin_progress", "skin_journals", 
		"skin_community_posts", "skin_community_comments", "skin_community_likes",
		"skin_community_groups", "skin_educations",
		"inventories", "restock_requests", "restock_items",
		"product_tier_commissions", "product_variants", "products", "vouchers", "banners",
		"affiliate_members", "membership_tiers", "categories", "brands",
		"user_profiles", "users",
		"roles", "permissions", "role_permissions",
	}

	for _, table := range tables {
		db.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table))
	}

	fmt.Println("  -> Database Cleaned & Schema Adjusted.")

	// 1. Seed Categories
	categories := seedCategories(db)

	// 2. Seed Membership Tiers
	seedTiers(db)

	// 3. Seed Users & Merchants
	merchants := seedUsers(db)

	// 4. Seed Warehouse (Suppliers)
	suppliers := seedWarehouse(db)

	// 5. Seed 40 Products
	seedProducts(db, categories, merchants, suppliers)

	// 6. Seed Marketing & RBAC
	seedMarketing(db)
	seedRBAC(db)
	SeedConfigs(db)

	// 7. Seed Network (Merchant & Affiliate relationship)
	SeedNetwork(db)

	// 8. Mega Simulation (200+ Users & Real Activity)
	SeedRealWorldData(db)

	fmt.Println("✅ Seeding Completed! 200+ Users created with full ecosystem activity.")
}

func seedWarehouse(db *gorm.DB) []models.Supplier {
	fmt.Println("  -> Seeding Warehouse Operations (Mata Elang)...")
	
	// 1. Seed Suppliers
	suppliers := []models.Supplier{
		{ID: uuid.New().String(), Name: "PT. Kimia Farma (Skincare Div)", Contact: "Bp. Ahmad", Phone: "08123456789", Email: "supply@kimiafarma.co.id", Address: "Jakarta Industrial Estate"},
		{ID: uuid.New().String(), Name: "Cosmax Indonesia (Global Supply)", Contact: "Ms. Kim", Phone: "08998877665", Email: "production@cosmax.id", Address: "Jababeka Cikarang"},
		{ID: uuid.New().String(), Name: "Herbalindo Utama", Contact: "Bp. Slamet", Phone: "087712344321", Email: "slamet@herbalindo.com", Address: "Solo, Jawa Tengah"},
	}
	for i := range suppliers { 
		db.FirstOrCreate(&suppliers[i], models.Supplier{Name: suppliers[i].Name}) 
	}

	// 2. Mark Master Products & Set Wholesale Prices
	var products []models.Product
	db.Find(&products).Limit(10)
	for i, p := range products {
		db.Model(&p).Updates(map[string]interface{}{
			"is_master":       true,
			"wholesale_price": p.Price * 0.75, // Harga merchant diskon 25%
			"cogs":            p.Price * 0.50, // Harga modal pusat 50%
		})

		// 3. Create Initial Inbound for Master Products
		if i < 3 { // Just for the first 3 products
			inbound := models.InboundStock{
				SupplierID:  suppliers[0].ID,
				ReferenceNo: fmt.Sprintf("TRK-IN-%d", 1000+i),
				Note:        "Initial Master Seeding",
				TotalItems:  500,
			}
			db.Create(&inbound)

			db.Create(&models.InboundItem{
				InboundID: inbound.ID,
				ProductID: p.ID,
				Quantity:  500,
				CostPrice: p.Price * 0.50,
			})

			// Update Pusat Inventory
			var inv models.Inventory
			err := db.Where("product_id = ? AND merchant_id = ?", p.ID, models.PusatID).First(&inv).Error
			if err == gorm.ErrRecordNotFound {
				inv = models.Inventory{
					ProductID:  p.ID,
					MerchantID: models.PusatID,
					Stock:      500,
					BasePrice:  p.Price * 0.50,
				}
				db.Create(&inv)
			} else {
				db.Model(&inv).Update("stock", inv.Stock + 500)
			}

			// Update Global Stock
			db.Model(&models.Product{}).Where("id = ?", p.ID).Update("stock", inv.Stock)

			// Log Mutation (Mata Elang)
			db.Create(&models.StockMutation{
				ProductID:   p.ID,
				MerchantID:  models.PusatID,
				Type:        "IN",
				Quantity:    500,
				Reference:   inbound.ID,
				StockBefore: 0,
				StockAfter:  500,
				Note:        "Auto-seeded Inbound",
			})
		}
	}
	return suppliers
}

func seedCategories(db *gorm.DB) map[string]uint {
	fmt.Println("  -> Seeding Categories...")
	catData := []models.Category{
		{Name: "Serum & Essence", Slug: "serum-essence", Order: 1},
		{Name: "Moisturizer", Slug: "moisturizer", Order: 2},
		{Name: "Sunscreen", Slug: "sunscreen", Order: 3},
		{Name: "Cleanser", Slug: "cleanser", Order: 4},
		{Name: "Body Lotion", Slug: "body-lotion", Order: 5},
		{Name: "Hair Care", Slug: "hair-care", Order: 6},
		{Name: "Vitamin & Suplemen", Slug: "vitamin", Order: 7},
		{Name: "Eye Care", Slug: "eye-care", Order: 8},
	}

	res := make(map[string]uint)
	for i := range catData {
		db.Create(&catData[i])
		res[catData[i].Name] = catData[i].ID
	}
	return res
}

func seedTiers(db *gorm.DB) {
	fmt.Println("  -> Seeding Membership Tiers...")
	tiers := []models.MembershipTier{
		{Name: "Mitra Dasar", Level: 1, BaseCommissionRate: 0.05, MinWithdrawalAmount: 50000, CommissionHoldDays: 14, IsActive: true},
		{Name: "Mitra Silver", Level: 2, BaseCommissionRate: 0.10, MinWithdrawalAmount: 100000, CommissionHoldDays: 10, IsActive: true, MinEarningsUpgrade: 5000000},
		{Name: "Mitra Gold", Level: 3, BaseCommissionRate: 0.15, MinWithdrawalAmount: 250000, CommissionHoldDays: 7, IsActive: true, MinEarningsUpgrade: 25000000},
		{Name: "Mitra Platinum", Level: 4, BaseCommissionRate: 0.20, MinWithdrawalAmount: 500000, CommissionHoldDays: 3, IsActive: true, MinEarningsUpgrade: 100000000},
	}
	for _, t := range tiers {
		db.Create(&t)
	}
}

func seedUsers(db *gorm.DB) []models.Merchant {
	fmt.Println("  -> Seeding Roles & Professional Accounts...")
	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	pwHash := string(password)

	// 1. Super Admin (Linked to Pusat for Stock Management)
	admin := models.User{
		ID: AdminID, Email: "admin@akugrow.com", PasswordHash: &pwHash, Role: "superadmin", Status: "active",
	}
	db.Create(&admin)
	db.Create(&models.UserProfile{UserID: admin.ID, FullName: "Super Admin (Pusat)"})
	
	// Create Pusat Merchant record owned by Super Admin
	pusatMerch := models.Merchant{
		ID: PusatID, 
		UserID: admin.ID, 
		StoreName: "Gudang Pusat SahabatMart", 
		Slug: "pusat", 
		Status: "active", 
		IsVerified: true,
	}
	db.Create(&pusatMerch)

	// [Akuglow] Admin/Pusat is also a top-tier affiliate
	db.Create(&models.AffiliateMember{
		UserID:           admin.ID,
		RefCode:          "PUSAT-HQ",
		MembershipTierID: 4, // Platinum
		Status:           "active",
	})
	
	// Buyers (Test Location Tracking)
	buyerSby := models.User{Email: "buyer@akuglow.com", PasswordHash: &pwHash, Role: "affiliate", Status: "active"}
	db.Create(&buyerSby)
	db.Create(&models.UserProfile{UserID: buyerSby.ID, FullName: "Buyer Surabaya", City: "Surabaya", Province: "Jawa Timur"})

	buyerJkt := models.User{Email: "buyer_jkt@akuglow.com", PasswordHash: &pwHash, Role: "affiliate", Status: "active"}
	db.Create(&buyerJkt)
	db.Create(&models.UserProfile{UserID: buyerJkt.ID, FullName: "Buyer Jakarta", City: "Jakarta Pusat", Province: "DKI Jakarta"})

	// Mitra (Test Affiliate Sharing)
	mitra := models.User{Email: "mitra@akuglow.com", PasswordHash: &pwHash, Role: "affiliate", Status: "active"}
	db.Create(&mitra)
	db.Create(&models.UserProfile{UserID: mitra.ID, FullName: "Mitra Akuglow Utama", City: "Bandung"})
	db.Create(&models.AffiliateMember{
		UserID:           mitra.ID,
		RefCode:          "MITRA-BAIK",
		MembershipTierID: 1,
		Status:           "active",
	})

	// 2. Pusat Staff (Secondary access to same warehouse)
	pusatUser := models.User{ID: uuid.New().String(), Email: "pusat@akugrow.com", PasswordHash: &pwHash, Role: "merchant", Status: "active"}
	db.Create(&pusatUser)
	db.Create(&models.UserProfile{UserID: pusatUser.ID, FullName: "Staf Gudang Pusat"})
	
	// Note: We don't create a new merchant for pusatUser because they share the PusatID logic

	// Merchants (Distributors)
	merchantLocs := []struct{ name, email, slug, city string }{
		{"AkuGrow Jakarta Distro", "jakarta@akugrow.com", "jakarta-distro", "Jakarta Pusat"},
		{"Surabaya Beauty Hub", "surabaya@akugrow.com", "surabaya-beauty", "Surabaya"},
		{"Medan Glow Center", "medan@akugrow.com", "medan-glow", "Medan"},
	}

	var mList []models.Merchant
	for _, m := range merchantLocs {
		u := models.User{Email: m.email, PasswordHash: &pwHash, Role: "merchant", Status: "active"}
		db.Create(&u)
		db.Create(&models.UserProfile{UserID: u.ID, FullName: m.name, City: m.city})
		merch := models.Merchant{UserID: u.ID, StoreName: m.name, Slug: m.slug, Status: "active", IsVerified: true, City: m.city}
		db.Create(&merch)

		// [Akuglow] Every distributor is also a top-tier affiliate
		refCode := "MTR-" + strings.ToUpper(m.slug)
		if len(refCode) > 20 {
			refCode = refCode[:20]
		}
		db.Create(&models.AffiliateMember{
			UserID:           u.ID,
			RefCode:          refCode,
			MembershipTierID: 3, // Gold Tier
			Status:           "active",
		})

		mList = append(mList, merch)
	}

	return mList
}

func seedProducts(db *gorm.DB, categories map[string]uint, merchants []models.Merchant, suppliers []models.Supplier) {
	fmt.Println("  -> Seeding 40 Premium Products...")

	productTemplates := []struct {
		name     string
		cat      string
		brand    string
		price    float64
		desc     string
		img      string
	}{
		{"Brightening Vitamin C Serum", "Serum & Essence", "GlowLab", 185000, "Serum untuk mencerahkan wajah dalam 7 hari.", "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800"},
		{"Hyaluronic Acid Booster", "Serum & Essence", "AquaSkin", 210000, "Menghidrasi kulit hingga lapisan terdalam.", "https://images.unsplash.com/photo-1617897903246-719242758050?w=800"},
		{"Retinol Rejuvenating Cream", "Moisturizer", "AntiAge", 275000, "Krim malam untuk meremajakan sel kulit.", "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800"},
		{"Ceramide Barrier Saver", "Moisturizer", "PureSkin", 165000, "Memperbaiki skin barrier yang rusak.", "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800"},
		{"Centella Soothing Gel", "Moisturizer", "GlowLab", 125000, "Menenangkan kulit kemerahan dan jerawat.", "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c22?w=800"},
		{"Physical Sunscreen SPF 50", "Sunscreen", "Shield", 145000, "Perlindungan maksimal dari sinar UV.", "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=800"},
		{"Watery Sun Essence", "Sunscreen", "AquaSkin", 130000, "Sunscreen ringan seperti air, tidak lengket.", "https://images.unsplash.com/photo-1624454002302-36b824d7bd0a?w=800"},
		{"Gentle Jelly Cleanser", "Cleanser", "PureSkin", 95000, "Pembersih wajah dengan pH seimbang.", "https://images.unsplash.com/photo-1556228578-8c89e6ada893?w=800"},
		{"Salicylic Acid Acne Wash", "Cleanser", "ClearUp", 110000, "Melawan bakteri penyebab jerawat.", "https://images.unsplash.com/photo-1556228443-72213c9af372?w=800"},
		{"Coco Butter Body Lotion", "Body Lotion", "BodyLux", 85000, "Kulit lembab dan wangi coklat sepanjang hari.", "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800"},
		{"Keratin Smooth Shampoo", "Hair Care", "HairPro", 120000, "Rambut lembut dan mudah diatur.", "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c22?w=800"},
		{"Rosehip Facial Oil", "Serum & Essence", "Naturals", 195000, "Minyak alami untuk menutrisi kulit kering.", "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800"},
		{"Green Tea Face Mist", "Cleanser", "GlowLab", 65000, "Penyegar wajahinstan di mana saja.", "https://images.unsplash.com/photo-1556229010-aa7f95ee3d27?w=800"},
		{"Niacinamide 10% + Zinc", "Serum & Essence", "ClearUp", 155000, "Mengecilkan pori-pori dan mengontrol minyak.", "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800"},
		{"Bakuchiol Night Oil", "Moisturizer", "AntiAge", 245000, "Alternatif retinol yang aman untuk kulit sensitif.", "https://images.unsplash.com/photo-1617897903246-719242758050?w=800"},
		{"Berry Lip Mask", "Eye Care", "LipLove", 75000, "Bibir lembut dan kenyal di pagi hari.", "https://images.unsplash.com/photo-1590156221122-c746e753e50b?w=800"},
		{"Daily Multivitamin", "Vitamin & Suplemen", "HealthFirst", 145000, "Menjaga daya tahan tubuh tetap prima.", "https://images.unsplash.com/photo-1584017947282-e3d3075776a2?w=800"},
		{"Marine Collagen Powder", "Vitamin & Suplemen", "HealthFirst", 350000, "Kolagen laut untuk kulit elastis.", "https://images.unsplash.com/photo-1550572017-ed20836c7454?w=800"},
		{"Vitamin E Softgels", "Vitamin & Suplemen", "HealthFirst", 120000, "Antioksidan tinggi untuk kesehatan kulit.", "https://images.unsplash.com/photo-1471864190281-ad5f9f81ce4c?w=800"},
		{"Hair Growth Serum", "Hair Care", "HairPro", 185000, "Mempercepat pertumbuhan rambut.", "https://images.unsplash.com/photo-1527799822394-4d1a49f2737a?w=800"},
		{"Peppermint Scalp Scrub", "Hair Care", "BodyLux", 135000, "Membersihkan kulit kepala secara mendalam.", "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800"},
		{"Charcoal Clay Mask", "Moisturizer", "ClearUp", 115000, "Detoksifikasi kulit dari polusi.", "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800"},
		{"AHA BHA Peeling Solution", "Serum & Essence", "GlowLab", 165000, "Eksfoliasi mingguan untuk kulit halus.", "https://images.unsplash.com/photo-1610411707577-6f68c3bede8c?w=800"},
		{"Micellar Water Sensitive", "Cleanser", "Shield", 85000, "Menghapus makeup dengan sekali usap.", "https://images.unsplash.com/photo-1556228578-8c89e6ada893?w=800"},
		{"Eye Awakening Gel", "Eye Care", "AntiAge", 145000, "Menghilangkan mata panda dan bengkak.", "https://images.unsplash.com/photo-1590156221122-c746e753e50b?w=800"},
		{"Golden Snail Essence", "Serum & Essence", "LuxeSkin", 315000, "Lendir siput emas untuk regenerasi kulit.", "https://images.unsplash.com/photo-1610411707577-6f68c3bede8c?w=800"},
		{"Manuka Honey Moisturizer", "Moisturizer", "Naturals", 210000, "Kelembaban alami dari madu Manuka.", "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800"},
		{"Bamboo Charcoal Soap", "Cleanser", "PureSkin", 45000, "Sabun batang untuk kulit berminyak.", "https://images.unsplash.com/photo-1600857062241-99e5daec63cc?w=800"},
		{"Lavender Sleep Mist", "Body Lotion", "BodyLux", 75000, "Wangi lavender untuk tidur nyenyak.", "https://images.unsplash.com/photo-1556228578-8c89e6ada893?w=800"},
		{"Matte Lip Liquid", "Makeup", "GlowLab", 95000, "Lipstik cair tahan lama 12 jam.", "https://images.unsplash.com/photo-1586776108064-f3590abcaf75?w=800"},
		{"Cushion Foundation SPF 35", "Makeup", "GlowLab", 175000, "Base makeup praktis dengan hasil glowing.", "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800"},
		{"Waterproof Mascara", "Makeup", "GlowLab", 110000, "Melentikkan bulu mata tanpa luntur.", "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800"},
		{"Eyebrow Definer Pencil", "Makeup", "GlowLab", 65000, "Pensil alis presisi untuk hasil natural.", "https://images.unsplash.com/photo-1599733589046-10c005739ef0?w=800"},
		{"Glitter Liquid Eyeshadow", "Makeup", "LuxeSkin", 85000, "Eyeliner cair berkilau untuk pesta.", "https://images.unsplash.com/photo-1515688598190-82927888647b?w=800"},
		{"Peach Scented Hand Cream", "Body Lotion", "Naturals", 35000, "Melembutkan tangan dengan aroma buah.", "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?w=800"},
		{"Scalp Massage Oil", "Hair Care", "HairPro", 125000, "Mengurangi ketombe dan gatal.", "https://images.unsplash.com/photo-1527799822394-4d1a49f2737a?w=800"},
		{"Antioxidant Berry Drink", "Vitamin & Suplemen", "HealthFirst", 195000, "Minuman bubuk kaya antioksidan.", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"},
		{"Sleeping Eye Mask Silk", "Eye Care", "LuxeSkin", 185000, "Penutup mata sutra untuk tidur berkualitas.", "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800"},
		{"Rose Water Toner", "Cleanser", "Naturals", 55000, "Penyegar wajah dari kelopak bunga mawar.", "https://images.unsplash.com/photo-1556228578-8c89e6ada893?w=800"},
		{"SPF 30 Lip Balm", "Eye Care", "Shield", 45000, "Melindungi bibir dari pecah-pecah.", "https://images.unsplash.com/photo-1590156221122-c746e753e50b?w=800"},
	}

	for i, t := range productTemplates {
		prod := models.Product{
			ID:          uuid.New().String(),
			Name:        t.name,
			Slug:        fmt.Sprintf("%s-%d", utils.Slugify(t.name), i+1),
			SKU:         fmt.Sprintf("AKU-%d%d", i+1, time.Now().Unix()%1000),
			Description: t.desc,
			Price:       t.price,
			Category:    t.cat,
			Brand:       t.brand,
			Image:       t.img,
			Status:      "active",
			MerchantID:  PusatID, // Set Pusat as the official owner of Master Products
			SupplierID:  suppliers[i%len(suppliers)].ID,
			Stock:       100,     // Initial master stock
			Rating:      0,
			Reviews:     0,
		}
		db.Create(&prod)

		// Create Variant
		variant := models.ProductVariant{
			ProductID: prod.ID,
			Name:      "Standard Pack",
			SKU:       prod.SKU + "-STD",
			Price:     prod.Price,
			Stock:     100,
		}
		db.Create(&variant)

		// Seed Inventory: PUSAT
		db.Create(&models.Inventory{
			MerchantID: PusatID,
			ProductID:  prod.ID,
			Stock:      5000,
		})

		// Seed Inventory: Random Merchants
		for _, m := range merchants {
			db.Create(&models.Inventory{
				MerchantID: m.ID,
				ProductID:  prod.ID,
				Stock:      int(10 + (i % 50)),
			})
		}
	}
}

func seedMarketing(db *gorm.DB) {
	fmt.Println("  -> Seeding Marketing & Promo...")
	banners := []models.Banner{
		{Title: "Lebaran Glow Up", SubTitle: "Diskon hingga 50% untuk semua paket skincare", Badge: "LIMIT TIME", Offer: "S/D 50%", Image: "https://images.unsplash.com/photo-1570172619380-adb36674cc65?w=1200", IsActive: true},
		{Title: "Official Store Medan", SubTitle: "Buka sekarang! Nikmati promo pengiriman gratis", Badge: "NEW STORE", Offer: "FREE ONGKIR", Image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200", IsActive: true},
	}
	for _, b := range banners {
		db.Create(&b)
	}

	vouchers := []models.Voucher{
		{Code: "RAMADANGLOW", Title: "Berkah Ramadan", DiscountType: "fixed", DiscountValue: 25000, MinOrder: 150000, Quota: 1000, Status: "active"},
		{Code: "AKUGROWMEDAN", Title: "Grand Opening Medan", DiscountType: "percent", DiscountValue: 15, MinOrder: 200000, Quota: 500, Status: "active"},
	}
	for _, v := range vouchers {
		db.Create(&v)
	}

	// [Akuglow] Seed Affiliate Materials
	fmt.Println("  -> Seeding Affiliate Resources (Edu, Events, Promo)...")
	
	edus := []models.AffiliateEducation{
		{Title: "Cara Mencapai 100 Mitra Pertama", Slug: "sukses-100-mitra", Category: "Marketing", Content: "Panduan...", VideoURL: "https://www.youtube.com/embed/dQw4w9WgXcQ", IsActive: true},
		{Title: "Strategi Duplicate Leader", Slug: "duplicate-leader", Category: "Leadership", Content: "Panduan...", VideoURL: "https://www.youtube.com/embed/dQw4w9WgXcQ", IsActive: true},
		{Title: "E-Book: 10 Teknik Closing WhatsApp", Slug: "ebook-closing-wa", Category: "Marketing", Content: "Panduan...", FileURL: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", IsActive: true},
	}
	for _, e := range edus {
		db.FirstOrCreate(&e, models.AffiliateEducation{Slug: e.Slug})
	}

	events := []models.AffiliateEvent{
		{Title: "Webinar: Rahasia Omset 10 JT/Bulan", Description: "Live coaching bersama CEO AkuGrow.", Type: "online", Location: "Zoom Meeting", StartTime: time.Now().Add(48 * time.Hour), EndTime: time.Now().Add(50 * time.Hour), Status: "upcoming", IsActive: true},
		{Title: "Kopdar Akbar Jakarta", Description: "Temu kangen dan sharing session offline.", Type: "offline", Location: "Kuningan City, Jakarta", StartTime: time.Now().Add(168 * time.Hour), EndTime: time.Now().Add(172 * time.Hour), Status: "upcoming", IsActive: true},
	}
	for _, ev := range events { db.Create(&ev) }

	promos := []models.PromoMaterial{
		{Title: "Story Instagram: Brightening Series", Type: "image", Category: "Instagram", FileURL: "https://images.unsplash.com/photo-1590156221122-c746e753e50b?w=800", Caption: "Glow up bareng AkuGrow! 💎", IsActive: true},
		{Title: "Banner Facebook: Open Mitra", Type: "image", Category: "Facebook", FileURL: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800", Caption: "Join komunitas kecantikan terbesar!", IsActive: true},
	}
	for _, p := range promos { db.Create(&p) }
}

func seedRBAC(db *gorm.DB) {
	fmt.Println("  -> Seeding RBAC Configuration...")
	perms := []models.Permission{
		{Code: "view_dashboard", Name: "Dashboard", Group: "General"},
		{Code: "manage_products", Name: "Produk", Group: "Catalog"},
		{Code: "manage_orders", Name: "Pesanan", Group: "Sales"},
		{Code: "manage_users", Name: "Pengguna", Group: "Users"},
		{Code: "manage_merchants", Name: "Merchant", Group: "Users"},
		{Code: "view_finance", Name: "Keuangan", Group: "Finance"},
		{Code: "manage_marketing", Name: "Marketing", Group: "Marketing"},
	}
	for _, p := range perms {
		db.FirstOrCreate(&p, models.Permission{Code: p.Code})
	}
}

func SeedConfigs(db *gorm.DB) {
	fmt.Println("  -> Seeding Platform Configs...")
	configs := []models.PlatformConfig{
		{Key: "platform_name", Value: "SahabatMart", Description: "Nama Platform"},
		{Key: "platform_maintenance", Value: "false", Description: "Mode Pemeliharaan"},
		{Key: "platform_maint_msg", Value: "Maaf, SahabatMart sedang dalam pemeliharaan rutin.", Description: "Pesan Maintenance"},
		{Key: "default_platform_fee", Value: "0.05", Description: "Fee Platform Default (%)"},
		{Key: "platform_currency", Value: "IDR", Description: "Mata Uang"},
		{Key: "platform_min_order", Value: "10000", Description: "Minimum Order (Rp)"},
		{Key: "merchant_min_active_mitra", Value: "100", Description: "Minimal affiliate aktif untuk menjadi merchant"},
		{Key: "merchant_min_team_turnover", Value: "10000000", Description: "Minimal omset tim (Rp) per bulan untuk menjadi merchant"},
		{Key: "payout_min_amount", Value: "50000", Description: "Minimum Payout (Rp)"},
		{Key: "payout_schedule", Value: "weekly", Description: "Jadwal Payout (daily/weekly/monthly)"},
		{Key: "payout_day", Value: "friday", Description: "Hari Payout (jika weekly)"},
		{Key: "payment_gateway", Value: "tripay", Description: "Payment Gateway Aktif (tripay/midtrans)"},
		{Key: "payment_tripay_merchant", Value: "", Description: "Tripay Merchant Code"},
		{Key: "payment_tripay_key", Value: "", Description: "Tripay API Key"},
		{Key: "payment_tripay_private", Value: "", Description: "Tripay Private Key"},
		{Key: "payment_tripay_url", Value: "https://tripay.co.id/api-sandbox", Description: "Tripay Base URL"},
		{Key: "payment_sandbox_mode", Value: "true", Description: "Payment Sandbox Mode"},
		{Key: "notif_email_enabled", Value: "true", Description: "Email Notifikasi Aktif"},
		{Key: "notif_smtp_port", Value: "587", Description: "SMTP Port"},
	}

	for _, c := range configs {
		db.Where("key = ?", c.Key).FirstOrCreate(&c)
	}
}
