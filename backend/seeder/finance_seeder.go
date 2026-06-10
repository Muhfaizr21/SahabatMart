package seeder

import (
	"akuglow/backend/models"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

func SeedFinance(db *gorm.DB) {
	fmt.Println("🚀 Seeding Clean Finance System...")

	// 1. Initial Configurations (Essential for UI)
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

	// 2. Financial Locations (Clean State: Balance 0)
	locations := []models.FinancialLocation{
		{Name: "BCA Utama (Settlement)", Balance: 0, IsPrimary: true},
		{Name: "Mandiri Operasional", Balance: 0, IsPrimary: false},
		{Name: "BSI Zakat & Sosial", Balance: 0, IsPrimary: false},
		{Name: "Kas Kecil HQ", Balance: 0, IsPrimary: false},
		{Name: "Saldo E-Wallet (Midtrans)", Balance: 0, IsPrimary: false},
	}
	for _, loc := range locations {
		var existing models.FinancialLocation
		if err := db.Where("name = ?", loc.Name).First(&existing).Error; err != nil {
			db.Create(&loc)
		} else {
			// Do not override balance if already exists, or set to 0 if user wants absolute clean
			// For "up server", usually we want to preserve real data if any, 
			// but since this is a seeder clean up, we set to 0 for new setup.
			db.Model(&existing).Updates(map[string]interface{}{"balance": 0})
		}
	}

	// 3. Ensure Admin Wallet (Admin ID 1)
	var adminWallet models.Wallet
	if err := db.Where("owner_type = ?", models.WalletAdmin).First(&adminWallet).Error; err != nil {
		adminWallet = models.Wallet{
			ID: models.AdminID,
			OwnerID: "00000000-0000-0000-0000-000000000000",
			OwnerType: models.WalletAdmin,
			Balance: 0,
			IsActive: true,
		}
		db.Create(&adminWallet)
	}

	fmt.Println("✅ Finance System Initialized with Clean State (0 Balance).")
}
