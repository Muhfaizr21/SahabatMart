package main

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
    "akuglow/backend/config"
)

type SitePageContent struct {
	Page string `gorm:"primaryKey"`
}

func main() {
    config.LoadConfig()
	db, err := gorm.Open(postgres.Open(config.Config.DatabaseURL), &gorm.Config{})
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	res := db.Exec("DELETE FROM site_page_contents WHERE page IN ('home', 'about', 'shop', 'business', 'contact', 'blog');")
	if res.Error != nil {
		fmt.Println(res.Error)
		os.Exit(1)
	}
	fmt.Printf("Deleted %d records\n", res.RowsAffected)
}
