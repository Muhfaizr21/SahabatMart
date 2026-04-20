package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=muhfaiizr dbname=SahabatMart port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var count int64
	db.Table("orders").Count(&count)
	fmt.Printf("Total Orders: %d\n", count)

	var ids []string
	db.Table("orders").Limit(10).Pluck("id", &ids)
	fmt.Println("Sample IDs:")
	for _, id := range ids {
		fmt.Println(id)
	}
}
