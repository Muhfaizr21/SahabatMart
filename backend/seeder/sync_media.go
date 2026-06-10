package seeder

import (
	"encoding/json"
	"log"
	"path/filepath"
	"strings"
	"time"

	"akuglow/backend/models"
	"gorm.io/gorm"
)

// SyncExistingImagesToMediaLibrary scans all existing tables for image URLs and syncs them to the Media Library
func SyncExistingImagesToMediaLibrary(db *gorm.DB) {
	log.Println("🔄 Mensinkronisasikan gambar yang ada ke Pustaka Media...")

	// Collect unique URLs to avoid inserting duplicates
	urlSet := make(map[string]bool)

	// 1. Scan products
	var products []models.Product
	if err := db.Select("image, images").Find(&products).Error; err == nil {
		for _, p := range products {
			if p.Image != "" {
				urlSet[p.Image] = true
			}
			if p.Images != "" {
				var imgs []string
				if err := json.Unmarshal([]byte(p.Images), &imgs); err == nil {
					for _, img := range imgs {
						if img != "" {
							urlSet[img] = true
						}
					}
				}
			}
		}
	}

	// 2. Scan product variants
	var variants []models.ProductVariant
	if err := db.Select("image").Find(&variants).Error; err == nil {
		for _, v := range variants {
			if v.Image != "" {
				urlSet[v.Image] = true
			}
		}
	}

	// 3. Scan banners
	var banners []models.Banner
	if err := db.Select("image").Find(&banners).Error; err == nil {
		for _, b := range banners {
			if b.Image != "" {
				urlSet[b.Image] = true
			}
		}
	}

	// 4. Scan blog posts
	var blogs []models.BlogPost
	if err := db.Select("image").Find(&blogs).Error; err == nil {
		for _, bl := range blogs {
			if bl.Image != "" {
				urlSet[bl.Image] = true
			}
		}
	}

	// 5. Scan brands
	var brands []models.Brand
	if err := db.Select("logo_url").Find(&brands).Error; err == nil {
		for _, br := range brands {
			if br.LogoURL != "" {
				urlSet[br.LogoURL] = true
			}
		}
	}

	// 6. Scan promo materials
	var promos []models.PromoMaterial
	if err := db.Where("type = ?", "image").Select("file_url").Find(&promos).Error; err == nil {
		for _, pr := range promos {
			if pr.FileURL != "" {
				urlSet[pr.FileURL] = true
			}
		}
	}

	count := 0
	for url := range urlSet {
		// Clean URL to get filename
		cleanURL := url
		if idx := strings.Index(url, "?"); idx != -1 {
			cleanURL = url[:idx]
		}
		filename := filepath.Base(cleanURL)
		if filename == "." || filename == "/" || filename == "" {
			filename = "unnamed_media.jpg"
		}

		// Detect MimeType
		mime := "image/jpeg"
		ext := strings.ToLower(filepath.Ext(cleanURL))
		switch ext {
		case ".png":
			mime = "image/png"
		case ".webp":
			mime = "image/webp"
		case ".gif":
			mime = "image/gif"
		case ".jpg", ".jpeg":
			mime = "image/jpeg"
		}

		// Check if it already exists
		var exists int64
		db.Model(&models.Media{}).Where("url = ?", url).Count(&exists)
		if exists == 0 {
			// Superadmin ID: "00000000-0000-0000-0000-000000000000"
			media := models.Media{
				Filename:   filename,
				URL:        url,
				Size:       204800, // 200 KB dummy size
				MimeType:   mime,
				UploadedBy: "00000000-0000-0000-0000-000000000000",
				CreatedAt:  time.Now(),
			}
			if err := db.Create(&media).Error; err == nil {
				count++
			} else {
				log.Printf("⚠️ Gagal mensinkronkan media untuk %s: %v", url, err)
			}
		}
	}

	if count > 0 {
		log.Printf("✅ Sinkronisasi berhasil! Berhasil memasukkan %d aset gambar baru ke Pustaka Media.", count)
	} else {
		log.Println("✅ Pustaka Media sudah sinkron. Tidak ada aset baru yang perlu ditambahkan.")
	}
}
