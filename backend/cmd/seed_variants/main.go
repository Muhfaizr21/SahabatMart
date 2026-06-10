package main

import (
	"akuglow/backend/models"
	"akuglow/backend/seeder"
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

	sslMode := "disable"
	dbHost := getEnv("DB_HOST", "localhost")
	if os.Getenv("APP_ENV") == "production" && dbHost != "localhost" && dbHost != "127.0.0.1" {
		sslMode = "require"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		dbHost,
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "akuglow"),
		getEnv("DB_PORT", "5432"),
		sslMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	// AutoMigrate for product type fields (idempotent)
	db.AutoMigrate(&models.Product{}, &models.ProductVariant{}, &models.Inventory{}, &models.Category{})

	fmt.Println("🚀 Running Variant Products Seeder...")
	seeder.SeedVariantProducts(db)
	fmt.Println("✅ Done!")
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
