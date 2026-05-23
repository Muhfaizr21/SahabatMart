package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load(".env")
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_PORT"))
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("1. Setting target settlement dates for all pending transactions to the past...")
	past := time.Now().Add(-24 * time.Hour)
	if err := db.Model(&models.WalletTransaction{}).Where("is_settled = ?", false).Update("target_settlement_date", past).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Println("2. Running ProcessSettlements through FinanceService...")
	financeSvc := services.NewFinanceService(db)
	settledCount, err := financeSvc.ProcessSettlements()
	if err != nil {
		log.Fatalf("Settlement failed: %v", err)
	}
	fmt.Printf("Settlement succeeded! Settled %d transactions.\n", settledCount)

	fmt.Println("\n3. Checking updated balances for Agam Gusriyandi...")
	var agamUser models.User
	if err := db.Where("email = ? OR id IN (SELECT user_id FROM user_profiles WHERE full_name LIKE ?)", "agam@akuglow.com", "%Agam%").First(&agamUser).Error; err == nil {
		var wallet models.Wallet
		if err := db.Where("owner_id = ? AND owner_type = ?", agamUser.ID, models.WalletAffiliate).First(&wallet).Error; err == nil {
			fmt.Printf("Balance (Withdrawable): Rp %.2f (Should be 70%% of 12800 = 8960)\n", wallet.Balance)
			fmt.Printf("PendingBalance: Rp %.2f\n", wallet.PendingBalance)
			fmt.Printf("ShoppingBalance (Bonus): Rp %.2f (Should be 30%% of 12800 = 3840)\n", wallet.ShoppingBalance)
			fmt.Printf("TotalEarned: Rp %.2f\n", wallet.TotalEarned)
		}
	}
}
