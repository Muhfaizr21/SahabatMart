package main

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/seeder"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("⚠️  Warning: .env file not found, trying current directory")
		godotenv.Load(".env")
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	fmt.Println("🚀 Starting High-Fidelity Seeder (10K Users Simulation)...")
	fmt.Println("⚠️  This process may take 1-2 minutes. Please wait...")

	// Run AutoMigrate just in case
	db.AutoMigrate(
		&models.User{}, &models.UserProfile{}, &models.Wallet{}, &models.AffiliateMember{},
		&models.Merchant{}, &models.Product{}, &models.Order{}, &models.OrderMerchantGroup{},
		&models.OrderItem{}, &models.WalletTransaction{}, &models.MoneyMutation{},
		&models.FinancialLocation{}, &models.FinanceRevenueAllocation{},
	)

	seeder.SeedAll(db)

	// Create marker file for main.go (if we still want to keep it aware)
	os.Create("../../.mega_seed_done")

	fmt.Println("\n✅ SEEDING COMPLETE!")
	fmt.Println("📊 5,000+ Orders & 10,000+ Shadow Users generated.")
	fmt.Println("You can now run 'go run main.go' normally.")
}
