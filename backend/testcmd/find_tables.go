package main

import (
	"fmt"
	"log"
	"akuglow/backend/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	config.InitConfig()
	db, err := gorm.Open(postgres.Open(config.Config.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var tables []string
	db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tables)
	fmt.Println("Tables:", tables)
}
