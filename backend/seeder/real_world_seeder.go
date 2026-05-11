package seeder

import (
	"SahabatMart/backend/models"
	"fmt"

	"gorm.io/gorm"
)

// SeedRealWorldData mensimulasikan aktivitas nyata dengan 200+ user (Cleaned for Production)
func SeedRealWorldData(db *gorm.DB) {
	fmt.Println("🌟 Initializing Core Community Data...")

	// 1. Community Groups (Essential for UI)
	var groups []models.SkinCommunityGroup
	db.Find(&groups)
	if len(groups) == 0 {
		groups = []models.SkinCommunityGroup{
			{Name: "Acne Fighters", Description: "Pejuang jerawat berkumpul di sini.", Icon: "coronavirus"},
			{Name: "Glow Up Squad", Description: "Tips mencerahkan kulit secara alami.", Icon: "auto_awesome"},
			{Name: "Sensitive Skin", Description: "Sharing produk aman untuk kulit sensitif.", Icon: "verified_user"},
		}
		for i := range groups {
			db.Create(&groups[i])
		}
	}

	fmt.Println("✅ Core Community Groups Initialized.")
}
