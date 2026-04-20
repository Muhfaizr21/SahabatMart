package main
import (
	"log"
	"os"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"fmt"
)

func main() {
	godotenv.Load(".env")
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_PORT"))
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Dropping stale columns...")
	db.Exec("ALTER TABLE carts DROP COLUMN IF EXISTS user_id")
	db.Exec("ALTER TABLE cart_items DROP COLUMN IF EXISTS user_id")
	log.Println("Done!")
}
