package main

import (
	"SahabatMart/backend/models"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=muhfaiizr dbname=sahabatmart port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("🚀 Starting Database Sync & Stock Fixer...")

	// 1. Ensure Pusat Merchant exists
	var pusat models.Merchant
	if err := db.First(&pusat, "id = ?", models.PusatID).Error; err != nil {
		fmt.Println("📦 Creating Pusat Merchant record...")
		pusat = models.Merchant{
			ID:          models.PusatID,
			UserID:      models.AdminID,
			StoreName:   "SahabatMart Pusat",
			Slug:        "sahabatmart-pusat",
			Description: "Gudang Distribusi Utama SahabatMart",
			Status:      "active",
			IsVerified:  true,
			City:        "Jakarta Pusat",
			JoinedAt:    time.Now(),
		}
		if err := db.Create(&pusat).Error; err != nil {
			log.Fatalf("Failed to create Pusat Merchant: %v", err)
		}
	} else {
		fmt.Println("✅ Pusat Merchant already exists.")
	}

	// 2. Fix Inventory for all products
	var products []models.Product
	db.Find(&products)
	fmt.Printf("🔍 Checking %d products...\n", len(products))

	fixedCount := 0
	for _, p := range products {
		var inv models.Inventory
		err := db.Where("product_id = ? AND merchant_id = ?", p.ID, models.PusatID).First(&inv).Error
		if err != nil {
			// Create inventory
			fmt.Printf("➕ Adding stock for: %s\n", p.Name)
			newInv := models.Inventory{
				ProductID:  p.ID,
				MerchantID: models.PusatID,
				Stock:      100,
			}
			if err := db.Create(&newInv).Error; err == nil {
				fixedCount++
			}
		} else if inv.Stock <= 0 {
			// Update empty stock
			db.Model(&inv).Update("stock", 100)
			fixedCount++
		}
	}

	fmt.Printf("✨ Finished! Fixed/Added stock for %d products.\n", fixedCount)
}
