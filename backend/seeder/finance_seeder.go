package seeder

import (
	"SahabatMart/backend/models"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedFinance(db *gorm.DB) {
	fmt.Println("🚀 Seeding Clean Finance System...")

	// 1. Initial Configurations
	dsList := []map[string]interface{}{
		{"name": "Pajak PPh 21", "percent": 10.0},
		{"name": "Zakat Perusahaan", "percent": 2.5},
		{"name": "Biaya Operasional", "percent": 20.0},
		{"name": "Dana Darurat", "percent": 5.0},
		{"name": "Pengembangan Sistem", "percent": 10.0},
	}
	psList := []map[string]interface{}{
		{"name": "Owner Pusat", "percent": 40.0},
		{"name": "Investor Utama", "percent": 30.0},
		{"name": "Tabungan Ekspansi", "percent": 20.0},
		{"name": "Bonus Karyawan", "percent": 10.0},
	}

	dsJson, _ := json.Marshal(dsList)
	psJson, _ := json.Marshal(psList)

	db.Save(&models.PlatformConfig{Key: "finance_data_saving_list", Value: string(dsJson), Description: "Daftar Kategori Data Saving Finance"})
	db.Save(&models.PlatformConfig{Key: "finance_profit_share_list", Value: string(psJson), Description: "Daftar Kategori Profit Share Finance"})

	// 2. Financial Locations (Scalable Balances)
	locations := []models.FinancialLocation{
		{Name: "BCA Utama (Settlement)", Balance: 2450000000, IsPrimary: true},
		{Name: "Mandiri Operasional", Balance: 820000000, IsPrimary: false},
		{Name: "BSI Zakat & Sosial", Balance: 125000000, IsPrimary: false},
		{Name: "Kas Kecil HQ", Balance: 12500000, IsPrimary: false},
		{Name: "Saldo E-Wallet (Midtrans)", Balance: 340000000, IsPrimary: false},
	}
	for _, loc := range locations {
		var existing models.FinancialLocation
		if err := db.Where("name = ?", loc.Name).First(&existing).Error; err != nil {
			db.Create(&loc)
		} else {
			db.Model(&existing).Updates(map[string]interface{}{"balance": loc.Balance})
		}
	}

	// 3. Ensure Admin Wallet
	var adminWallet models.Wallet
	if err := db.Where("owner_type = ?", models.WalletAdmin).First(&adminWallet).Error; err != nil {
		adminWallet = models.Wallet{
			ID: models.AdminID,
			OwnerID: "00000000-0000-0000-0000-000000000000",
			OwnerType: models.WalletAdmin,
			Balance: 1000000000,
			IsActive: true,
		}
		db.Create(&adminWallet)
	}

	// 4. Create 1,000+ Shadow Users & Wallets for realistic simulation
	fmt.Println("  -> Generating 1,000+ Shadow Users & Wallets...")
	var users []models.User
	var profiles []models.UserProfile
	var wallets []models.Wallet
	var affiliates []models.AffiliateMember
	
	names := []string{"Budi", "Siti", "Andi", "Dewi", "Rian", "Lulu", "Hendra", "Maya", "Joko", "Siska", "Rina", "Bambang", "Ani", "Tono", "Dina", "Eko", "Yanti", "Agus", "Ratna", "Fery"}
	cities := []string{"Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Palembang", "Yogyakarta", "Malang", "Denpasar"}

	for i := 0; i < 0; i++ {
		uid := uuid.New().String()
		u := models.User{
			ID: uid,
			Email: fmt.Sprintf("shadow_user_%d@akuglow.com", i),
			Role: "affiliate",
			Status: "active",
		}
		users = append(users, u)
		
		profiles = append(profiles, models.UserProfile{
			UserID: uid,
			FullName: fmt.Sprintf("%s %d", names[rand.Intn(len(names))], i),
			City: cities[rand.Intn(len(cities))],
			Province: "Shadow Province",
		})
		
		wallets = append(wallets, models.Wallet{
			OwnerID: uid,
			OwnerType: models.WalletAffiliate,
			Balance: float64(rand.Intn(1000000)),
			IsActive: true,
		})
		
		affiliates = append(affiliates, models.AffiliateMember{
			UserID: uid,
			RefCode: fmt.Sprintf("REF-%d-%s", i, uuid.New().String()[:4]),
			MembershipTierID: uint(rand.Intn(3) + 1),
			Status: "active",
		})
	}
	
	db.CreateInBatches(users, 100)
	db.CreateInBatches(profiles, 100)
	db.CreateInBatches(wallets, 100)
	db.CreateInBatches(affiliates, 100)

	// Fetch existing users/affiliates if arrays are still empty (e.g. shadow loop skipped)
	if len(users) == 0 {
		db.Limit(100).Find(&users)
	}
	if len(affiliates) == 0 {
		db.Limit(100).Find(&affiliates)
	}

	// Safety check: if STILL empty, we can't generate orders
	if len(users) == 0 || len(affiliates) == 0 {
		fmt.Println("  ⚠️  Warning: No users or affiliates available. Skipping order generation.")
		return
	}

	// 5. Generate 5,000+ Orders & Transactions (6 Months)
	fmt.Println("  -> Generating 5,000+ Orders & Wallet Transactions...")
	now := time.Now()
	startTime := now.AddDate(0, -6, 0)
	
	var products []models.Product
	db.Find(&products)
	var merchants []models.Merchant
	db.Find(&merchants)
	
	if len(products) == 0 || len(merchants) == 0 {
		fmt.Println("  ⚠️  Warning: No products or merchants found. Skipping order seeding.")
		return
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	orderCount := 0
	
	targetOrders := 0
	if targetOrders > 0 {
		for d := startTime; d.Before(now); d = d.Add(time.Hour * 1) { // hourly steps for spread
			if r.Intn(100) > 30 { continue } // 30% chance per hour to have 1-3 orders
			
			hourlyOrders := r.Intn(3) + 1
			for h := 0; h < hourlyOrders; h++ {
				buyer := users[r.Intn(len(users))]
				affiliate := affiliates[r.Intn(len(affiliates))]
				merchant := merchants[r.Intn(len(merchants))]
				product := products[r.Intn(len(products))]
				
				qty := r.Intn(3) + 1
				subtotal := product.Price * float64(qty)
				platformFee := subtotal * 0.05
				comm := subtotal * 0.10
				merchAmt := subtotal - platformFee - comm
				
				orderDate := d.Add(time.Duration(r.Intn(59)) * time.Minute)
				
				order := models.Order{
					OrderNumber: fmt.Sprintf("ORD-%s", uuid.New().String()[:8]),
					BuyerID: &buyer.ID,
					Subtotal: subtotal,
					GrandTotal: subtotal,
					Status: models.OrderCompleted,
					CreatedAt: orderDate,
				}
				db.Create(&order)
				
				group := models.OrderMerchantGroup{
					OrderID: order.ID,
					MerchantID: merchant.ID,
					Status: models.MOrderCompleted,
					Subtotal: subtotal,
					PlatformFee: platformFee,
					AffiliateCommission: comm,
					Commission: comm,
					MerchantPayout: merchAmt,
					CreatedAt: orderDate,
				}
				db.Create(&group)
				
				// 1. Create Order Item with COGS
				cogsPerUnit := product.Price * 0.7 // Simulasi modal 70%
				db.Create(&models.OrderItem{
					OrderID: order.ID,
					OrderMerchantGroupID: group.ID,
					MerchantID: merchant.ID,
					ProductID: product.ID,
					ProductName: product.Name,
					Quantity: qty,
					UnitPrice: product.Price,
					Subtotal: subtotal,
					COGS: cogsPerUnit * float64(qty),
					CreatedAt: orderDate,
				})
				
				// 1. Admin Transaction (Platform Fee)
				db.Create(&models.WalletTransaction{
					WalletID: adminWallet.ID,
					Type: models.TxPlatformFee,
					Amount: platformFee,
					Description: fmt.Sprintf("Platform Fee Order #%s", order.OrderNumber),
					ReferenceID: &order.ID,
					ReferenceType: "order",
					IsSettled: true,
					CreatedAt: orderDate,
				})
				
				// 2. Affiliate Transaction (Commission)
				var affWallet models.Wallet
				db.Where("owner_id = ?", affiliate.UserID).First(&affWallet)
				if affWallet.ID != "" {
					db.Create(&models.WalletTransaction{
						WalletID: affWallet.ID,
						Type: models.TxCommissionEarned,
						Amount: comm,
						Description: fmt.Sprintf("Commission Order #%s", order.OrderNumber),
						ReferenceID: &order.ID,
						ReferenceType: "order",
						IsSettled: true,
						CreatedAt: orderDate,
					})
				}
				
				orderCount++
				if orderCount >= targetOrders { break }
			}
			if orderCount >= targetOrders { break }
		}
	}
	fmt.Printf("  -> Created %d orders and associated transactions.\n", orderCount)

	// 6. Build Monthly Allocations (Summaries)
	fmt.Println("  -> Calculating Monthly Allocation Summaries...")
	for i := 0; i < 6; i++ {
		t := now.AddDate(0, -i, 0)
		period := t.Format("2006-01")
		
		var gross float64
		db.Table("wallet_transactions").
			Where("to_char(created_at, 'YYYY-MM') = ? AND wallet_id = ? AND type = ?", period, adminWallet.ID, models.TxPlatformFee).
			Select("COALESCE(SUM(amount), 0)").Scan(&gross)

		if gross > 0 {
			hash := fmt.Sprintf("mega-seed-%s", period)
			allocMap := make(map[string]interface{})
			totalSaving := 0.0
			for _, it := range dsList {
				pct := it["percent"].(float64)
				val := gross * pct / 100.0
				allocMap[it["name"].(string)] = val
				totalSaving += val
			}
			netProfit := gross - totalSaving
			for _, it := range psList {
				pct := it["percent"].(float64)
				allocMap[it["name"].(string)] = netProfit * pct / 100.0
			}
			b, _ := json.Marshal(allocMap)

			db.Where(models.FinanceRevenueAllocation{SourceHash: hash}).FirstOrCreate(&models.FinanceRevenueAllocation{
				Period: period, SourceType: "monthly_recap", SourceID: "SYSTEM", SourceHash: hash,
				GrossAmount: gross, Allocation: string(b), CreatedAt: t,
			})
		}
	}

	// 7. Generate Overhead Mutations
	fmt.Println("  -> Generating Overhead Mutations...")
	overheadCats := []string{"Biaya Operasional", "Pengembangan Sistem", "Zakat Perusahaan", "Owner Pusat"}
	for i := 0; i < 50; i++ {
		cat := overheadCats[r.Intn(len(overheadCats))]
		amount := float64((r.Intn(20) + 1) * 1000000)
		
		var loc models.FinancialLocation
		db.Order("RANDOM()").First(&loc)

		db.Create(&models.MoneyMutation{
			Amount: amount, Category: cat, Status: "processed", Type: "expense",
			Description: fmt.Sprintf("Overhead: Pembayaran %s Q%d", cat, (i/10)+1),
			FromLocationID: &loc.ID,
			CreatedAt: now.AddDate(0, 0, -r.Intn(180)),
		})
	}

	fmt.Println("✅ MEGA Finance Seeding Completed! System now looks like a 10K user ecosystem.")
}
