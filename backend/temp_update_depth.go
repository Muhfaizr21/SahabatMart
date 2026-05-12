package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=muhfaiizr password=admin dbname=sahabatmart port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	result := db.Exec("UPDATE membership_tiers SET min_commission_depth = 1 WHERE min_commission_depth = 0 OR min_commission_depth IS NULL; UPDATE membership_tiers SET max_commission_depth = 1 WHERE max_commission_depth = 0 OR max_commission_depth IS NULL;")
	if result.Error != nil {
		log.Fatal(result.Error)
	}

	fmt.Printf("Updated %d records.\n", result.RowsAffected)
}
