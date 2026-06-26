package main

import (
	"akuglow/backend/config"
	"akuglow/backend/models"
	"akuglow/backend/services"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 1. Setup DB
	config.InitConfig()
	dsn := "host=localhost user=muhfaiizr password=admin dbname=akuglow port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Gagal connect DB: %v", err)
	}

	cfgService := &services.ConfigService{DB: db}
	affService := &services.AffiliateService{DB: db, ConfigService: cfgService}
	orderService := &services.OrderService{DB: db, AffiliateService: affService, ConfigService: cfgService}

	// 2. Setup Data Simulator
	// Preset
	presetID := uuid.New().String()
	preset := models.CommissionPreset{
		ID:          presetID,
		Name:        "Simulasi Preset",
		IsActive:    true,
		Description: "Simulasi 10%",
	}
	db.Create(&preset)

	db.Create(&models.CommissionPresetLevel{
		PresetID: presetID,
		Level:    1,
		Rate:     0.10, // 10%
	})

	// Product
	productID := uuid.New().String()
	product := models.Product{
		ID:                 productID,
		Name:               "Produk Simulasi",
		Price:              100000,
		COGS:               50000,
		CommissionPresetID: &presetID,
	}
	db.Create(&product)

	// Admin Pusat Wallet if not exists
	var adminWallet models.WalletAdmin
	if err := db.Where("user_id = ?", models.PusatID).First(&adminWallet).Error; err != nil {
		db.Create(&models.WalletAdmin{UserID: models.PusatID, Balance: 0})
	}

	// Upline
	uplineID := uuid.New().String()
	upline := models.User{ID: uplineID, Name: "Upline Affiliate", Role: "affiliate"}
	db.Create(&upline)
	db.Create(&models.WalletAffiliate{UserID: uplineID})

	// Affiliate Profile
	affID := uuid.New().String()
	aff := models.AffiliateMember{
		ID:      affID,
		UserID:  uplineID,
		RefCode: "UPLINE-SIMULASI",
	}
	db.Create(&aff)

	// Buyer
	buyerID := uuid.New().String()
	buyer := models.User{ID: buyerID, Name: "Pembeli Simulasi", Role: "user"}
	db.Create(&buyer)

	// Order
	orderID := uuid.New().String()
	exp := time.Now().Add(1 * time.Hour)
	order := models.Order{
		ID:          orderID,
		OrderNumber: "ORD-SIMULASI-001",
		BuyerID:     &buyerID,
		AffiliateID: &affID,
		Status:      models.OrderPendingPayment,
		ExpiredAt:   &exp,
	}
	db.Create(&order)

	// Order Item
	itemID := uuid.New().String()
	item := models.OrderItem{
		ID:        itemID,
		OrderID:   orderID,
		ProductID: productID,
		Quantity:  1,
		Price:     100000,
		Subtotal:  100000,
	}
	db.Create(&item)

	// Payment Record
	payment := models.Payment{
		ID:      uuid.New().String(),
		OrderID: orderID,
		Amount:  100000,
		Status:  "UNPAID",
	}
	db.Create(&payment)

	fmt.Println(">> Setup simulasi selesai. Mulai membayar order...")

	// 3. Proses Pembayaran
	tx := db.Begin()
	err = orderService.CompletePayment(tx, orderID)
	if err != nil {
		tx.Rollback()
		fmt.Printf("❌ CompletePayment Gagal: %v\n", err)
		return
	}
	tx.Commit()

	fmt.Println(">> Pembayaran Berhasil! Memeriksa komisi...")

	// 4. Verifikasi Komisi
	var comms []models.AffiliateCommission
	db.Where("order_id = ?", orderID).Find(&comms)
	if len(comms) > 0 {
		fmt.Printf("✅ Ditemukan %d komisi afiliasi.\n", len(comms))
		for _, c := range comms {
			fmt.Printf("   -> Komisi (Level %d): Rp %.2f (Affiliate: %s)\n", c.Level, c.Amount, c.AffiliateID)
		}
	} else {
		fmt.Println("❌ Tidak ada komisi yang terdistribusi!")
	}

	// 5. Verifikasi Wallet Upline
	var w models.WalletAffiliate
	db.Where("user_id = ?", uplineID).First(&w)
	fmt.Printf("✅ Wallet Upline (Withdrawable): Rp %.2f\n", w.WithdrawableBalance)
	fmt.Printf("✅ Wallet Upline (Shopping): Rp %.2f\n", w.ShoppingBalance)

	// Cleanup
	fmt.Println(">> Membersihkan data simulasi...")
	db.Unscoped().Delete(&models.Payment{}, "order_id = ?", orderID)
	db.Unscoped().Delete(&models.OrderItem{}, "id = ?", itemID)
	db.Unscoped().Delete(&models.Order{}, "id = ?", orderID)
	db.Unscoped().Delete(&models.AffiliateCommission{}, "order_id = ?", orderID)
	db.Unscoped().Delete(&models.AffiliateMember{}, "id = ?", affID)
	db.Unscoped().Delete(&models.WalletAffiliate{}, "user_id = ?", uplineID)
	db.Unscoped().Delete(&models.User{}, "id IN ?", []string{buyerID, uplineID})
	db.Unscoped().Delete(&models.Product{}, "id = ?", productID)
	db.Unscoped().Delete(&models.CommissionPresetLevel{}, "preset_id = ?", presetID)
	db.Unscoped().Delete(&models.CommissionPreset{}, "id = ?", presetID)
	fmt.Println(">> Simulasi selesai dan dibersihkan.")
}
