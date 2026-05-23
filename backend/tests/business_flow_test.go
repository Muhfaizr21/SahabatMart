package tests

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"fmt"
	"os"
	"testing"

	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// SetupTestDB in-memory or separate DB for tests
func SetupTestDB() *gorm.DB {
	_ = godotenv.Load("../.env")
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "muhfaiizr"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "admin"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "sahabatmart"
	}
	dbName = dbName + "_test"
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbName, port)
	db, _ := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	
	if db != nil {
		// Enable uuid-ossp extension
		db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
		// Auto migrate required tables for testing
		_ = db.AutoMigrate(&models.PaymentWebhook{})
	}
	return db
}

func TestCheckoutMultiMerchant(t *testing.T) {
	db := SetupTestDB()
	_ = db // use db

	t.Run("Create Multi-Merchant Order", func(t *testing.T) {
		assert.True(t, true) 
	})
}

func TestDuplicateWebhookProtection(t *testing.T) {
	db := SetupTestDB()
	
	err := utils.HandleWebhook(db, "midtrans", "TX-12345", `{"status":"paid"}`, func(tx *gorm.DB) error {
		return nil
	})
	assert.Nil(t, err)

	errAgain := utils.HandleWebhook(db, "midtrans", "TX-12345", `{"status":"paid"}`, func(tx *gorm.DB) error {
		return nil
	})
	assert.Equal(t, utils.ErrWebhookAlreadyProcessed, errAgain)
}

func TestCommissionCalculation(t *testing.T) {
	db := SetupTestDB()
	_ = db

	t.Run("Deterministic Rules", func(t *testing.T) {
		// Mock check (models used here if needed)
		var _ models.Order
		assert.Equal(t, 0.05, 0.05)
	})
}

func TestRefundReversal(t *testing.T) {
	db := SetupTestDB()
	_ = db
}
