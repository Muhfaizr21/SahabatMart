package main

import (
	"fmt"
	"log"
	"os"

	"SahabatMart/backend/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func MainFixSeed() {
	godotenv.Load(".env")
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_PORT"))
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var count int64
	db.Model(&models.LogisticChannel{}).Count(&count)
	fmt.Printf("Channels: %d\n", count)

	if count == 0 {
		channels := []models.LogisticChannel{
			{Code: "jne", Name: "JNE", IsActive: true},
			{Code: "sicepat", Name: "SiCepat", IsActive: true},
			{Code: "jnt", Name: "J&T", IsActive: true},
			{Code: "tiki", Name: "TIKI", IsActive: true},
			{Code: "anteraja", Name: "AnterAja", IsActive: true},
		}
		for _, c := range channels {
			db.Create(&c)
		}
		fmt.Println("Seeded LogisticChannels")
	}

	// Set all users to have default couriers if empty
	db.Model(&models.Merchant{}).Where("enabled_couriers = ?", "").Update("enabled_couriers", "jne,sicepat,jnt,tiki,anteraja")
	
	// Set default biteship area for merchants
	db.Model(&models.Merchant{}).Where("biteship_area_id = ?", "").Update("biteship_area_id", "IDNP3CL10")
	fmt.Println("Updated Merchants with couriers and biteship area id")

}
