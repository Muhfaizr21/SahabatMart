package main

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/chai2010/webp"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func buildDSN() string {
	sslMode := "disable"
	if os.Getenv("APP_ENV") == "production" && os.Getenv("DB_HOST") != "localhost" && os.Getenv("DB_HOST") != "127.0.0.1" {
		sslMode = "require"
	}
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "akuglow"),
		getEnv("DB_PORT", "5432"),
		sslMode,
	)
}

func main() {
	godotenv.Load()
	dsn := buildDSN()
	DB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Gagal konek DB:", err)
	}

	uploadDir := "uploads"
	files, err := os.ReadDir(uploadDir)
	if err == nil {
		for _, file := range files {
			if file.IsDir() {
				continue
			}

			name := file.Name()
			ext := strings.ToLower(filepath.Ext(name))

			if ext == ".png" || ext == ".jpg" || ext == ".jpeg" {
				oldPath := filepath.Join(uploadDir, name)
				baseName := strings.TrimSuffix(name, filepath.Ext(name))
				newPath := filepath.Join(uploadDir, baseName+".webp")

				f, err := os.Open(oldPath)
				if err != nil {
					log.Printf("Gagal baca %s: %v", oldPath, err)
					continue
				}

				img, _, err := image.Decode(f)
				f.Close()
				if err != nil {
					log.Printf("Gagal decode %s: %v", oldPath, err)
					continue
				}

				out, err := os.Create(newPath)
				if err != nil {
					log.Printf("Gagal create %s: %v", newPath, err)
					continue
				}

				err = webp.Encode(out, img, &webp.Options{Lossless: false, Quality: 85})
				out.Close()
				if err != nil {
					log.Printf("Gagal encode %s: %v", newPath, err)
					continue
				}

				log.Printf("Converted %s -> %s", oldPath, newPath)
				os.Remove(oldPath)
			}
		}
	} else {
		log.Println("Upload dir not found or empty")
	}

	// Update DB tables
	extensions := []string{".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"}
    
	updates := map[string][]string{
		"media":          {"url", "filename"},
		"users":          {"avatar_url"},
		"user_profiles":  {"avatar_url", "identity_card_url"},
		"products":       {"image_url", "thumbnail_url"},
		"categories":     {"icon_url", "banner_url"},
		"blog_posts":     {"cover_url"},
		"banners":        {"image_url"},
		"product_images": {"image_url"},
		"merchants":      {"logo_url", "banner_url", "identity_card_url"},
		"skin_pre_tests": {"face_image_url"},
		"skin_progress":  {"face_image_url"},
		"skin_educations":{"image_url", "video_url"},
	}

	for table, columns := range updates {
		for _, col := range columns {
			for _, ext := range extensions {
				query := fmt.Sprintf("UPDATE %s SET %s = REPLACE(%s, '%s', '.webp') WHERE %s LIKE '%%%s'", table, col, col, ext, col, ext)
				err := DB.Exec(query).Error
				if err != nil {
					// Ignore errors like table not found, just proceed
					log.Printf("Warning: failed to update %s.%s for %s", table, col, ext)
				}
			}
		}
	}
	
	DB.Exec("UPDATE media SET mime_type = 'image/webp' WHERE mime_type IN ('image/png', 'image/jpeg', 'image/jpg')")

	log.Println("Database records updated successfully!")
}
