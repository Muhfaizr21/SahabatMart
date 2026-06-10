package seeder

import (
	"akuglow/backend/models"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

func SeedDemographics(db *gorm.DB) {
	// Auto migrate tables first
	db.AutoMigrate(&models.UserLocationLog{}, &models.IPLocationCache{})

	// Fetch all users to link
	var seededUsers []models.User
	db.Find(&seededUsers)

	var count int64
	db.Model(&models.UserLocationLog{}).Count(&count)
	if count > 0 {
		// Retroactively assign some logs to seeded users if all are currently Guests
		var userLogsCount int64
		db.Model(&models.UserLocationLog{}).Where("user_id IS NOT NULL").Count(&userLogsCount)
		if userLogsCount == 0 && len(seededUsers) > 0 {
			log.Println("🌍 Retroactively linking seeded demographics logs to users...")
			var logs []models.UserLocationLog
			db.Find(&logs)
			r := rand.New(rand.NewSource(time.Now().UnixNano()))
			for _, logEntry := range logs {
				if r.Float32() < 0.40 {
					user := seededUsers[r.Intn(len(seededUsers))]
					db.Model(&logEntry).Update("user_id", user.ID)
				}
			}
		}
		return
	}

	log.Println("🌍 Seeding mock demographics and location logs...")

	cities := []struct {
		City        string
		Region      string
		CountryName string
		CountryCode string
		Lat         float64
		Lng         float64
	}{
		{"Jakarta", "DKI Jakarta", "Indonesia", "ID", -6.2088, 106.8456},
		{"Surabaya", "Jawa Timur", "Indonesia", "ID", -7.2575, 112.7521},
		{"Bandung", "Jawa Barat", "Indonesia", "ID", -6.9175, 107.6191},
		{"Medan", "Sumatera Utara", "Indonesia", "ID", 3.5952, 98.6722},
		{"Denpasar", "Bali", "Indonesia", "ID", -8.6705, 115.2126},
		{"Semarang", "Jawa Tengah", "Indonesia", "ID", -6.9667, 110.4167},
		{"Makassar", "Sulawesi Selatan", "Indonesia", "ID", -5.1477, 119.4327},
		{"Tokyo", "Tokyo", "Japan", "JP", 35.6762, 139.6503},
		{"Singapore", "Singapore", "Singapore", "SG", 1.3521, 103.8198},
		{"New York", "New York", "United States", "US", 40.7128, -74.0060},
	}

	urls := []string{
		"/",
		"/shop",
		"/products/brightening-vitamin-c-serum-1",
		"/products/retinol-rejuvenating-cream-3",
		"/cart",
		"/checkout",
	}

	devices := []string{"desktop", "mobile", "tablet"}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i := 0; i < 45; i++ {
		city := cities[r.Intn(len(cities))]
		ip := fmt.Sprintf("182.253.%d.%d", r.Intn(254)+1, r.Intn(254)+1)
		if city.CountryCode != "ID" {
			if city.CountryCode == "SG" {
				ip = fmt.Sprintf("111.65.%d.%d", r.Intn(254)+1, r.Intn(254)+1)
			} else if city.CountryCode == "JP" {
				ip = fmt.Sprintf("122.211.%d.%d", r.Intn(254)+1, r.Intn(254)+1)
			} else {
				ip = fmt.Sprintf("104.244.%d.%d", r.Intn(254)+1, r.Intn(254)+1)
			}
		}

		hash := sha256.Sum256([]byte(ip))
		ipHash := hex.EncodeToString(hash[:])

		logTime := time.Now().Add(-time.Duration(r.Intn(720)) * time.Hour) // up to 30 days ago

		var userID *string = nil
		if len(seededUsers) > 0 && r.Float32() < 0.40 {
			user := seededUsers[r.Intn(len(seededUsers))]
			uid := user.ID
			userID = &uid
		}

		// Create log
		logEntry := models.UserLocationLog{
			IPHash:      ipHash,
			UserID:      userID,
			Latitude:    city.Lat,
			Longitude:   city.Lng,
			City:        city.City,
			Region:      city.Region,
			CountryName: city.CountryName,
			CountryCode: city.CountryCode,
			UserAgent:   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			DeviceType:  devices[r.Intn(len(devices))],
			VisitedURL:  urls[r.Intn(len(urls))],
			IsConverted: r.Float32() < 0.25, // 25% conversion rate
			CreatedAt:   logTime,
		}

		db.Create(&logEntry)
	}

	log.Println("🌍 Seeding complete. 45 visitor logs generated.")
}
