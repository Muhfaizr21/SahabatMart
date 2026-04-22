package main

import (
	"SahabatMart/backend/models"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=muhfaiizr dbname=sahabatmart port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var count int64
	db.Model(&models.Product{}).Where("status = ?", "active").Count(&count)
	fmt.Printf("Active Products: %d\n", count)

	var products []models.Product
	db.Where("status = ?", "active").Limit(5).Find(&products)
	for _, p := range products {
		fmt.Printf("- %s (Status: %s)\n", p.Name, p.Status)
	}
}
