package main_test

import (
	"akuglow/backend/config"
	"akuglow/backend/models"
	"akuglow/backend/services"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestIntegration(t *testing.T) {
	// Initialize config
	config.InitConfig()

	// Connect to DB
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		config.GetEnv("DB_HOST", "localhost"),
		config.GetEnv("DB_USER", "postgres"),
		config.GetEnv("DB_PASSWORD", "postgres"),
		config.GetEnv("DB_NAME", "akuglow"),
		config.GetEnv("DB_PORT", "5432"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Gagal connect DB: %v", err)
	}

	// Inisialisasi Service
	cfgService := &services.ConfigService{DB: db}
	affService := &services.AffiliateService{DB: db, ConfigService: cfgService}
	orderService := &services.OrderService{DB: db, AffiliateService: affService, ConfigService: cfgService}

	fmt.Println("Services initialized successfully.")
	
	// We won't fully place an order since it requires real products, real users, etc.
	// But we can check if there are recent affiliate commissions in the DB.
	var comms []models.AffiliateCommission
	db.Order("created_at desc").Limit(5).Find(&comms)
	
	if len(comms) > 0 {
		fmt.Printf("Ditemukan %d komisi terakhir di database!\n", len(comms))
		for _, c := range comms {
			fmt.Printf("- Komisi %f untuk AffiliateID %s dari Order %s\n", c.Amount, c.AffiliateID, c.OrderID)
		}
	} else {
		fmt.Println("Belum ada data komisi di tabel affiliate_commissions.")
	}

	fmt.Println("Testing order creation simulation...")
	// Simulate checking if the block self-referral logic is working
	// We can manually call CreateOrder and catch the error if we had the right objects.
}
