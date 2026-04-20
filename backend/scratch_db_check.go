package main

import (
	"fmt"
	"log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=muhfaiizr password= dbname=sahabatmart port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var count int64
	db.Table("order_merchant_groups").Count(&count)
	fmt.Printf("OrderMerchantGroups: %d\n", count)

	type Row struct {
		Month   string
		Revenue float64
	}
	var rows []Row
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(subtotal) as revenue FROM order_merchant_groups GROUP BY month`).Scan(&rows)
	for _, r := range rows {
		fmt.Printf("Month: %s, Revenue: %.2f\n", r.Month, r.Revenue)
	}
}
