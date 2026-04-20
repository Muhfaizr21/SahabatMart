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

	type Trigger struct {
		TriggerName string `gorm:"column:trigger_name"`
		EventTable  string `gorm:"column:event_object_table"`
	}
	var triggers []Trigger
	db.Raw("SELECT trigger_name, event_object_table FROM information_schema.triggers").Scan(&triggers)
	
	fmt.Println("List of Triggers:")
	for _, t := range triggers {
		fmt.Printf("Table: %s, Trigger: %s\n", t.EventTable, t.TriggerName)
	}
}
