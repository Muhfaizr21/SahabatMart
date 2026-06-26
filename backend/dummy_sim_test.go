package main

import (
	"akuglow/backend/models"
	"akuglow/backend/services"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestEndToEndAffiliateCommission(t *testing.T) {
	dsn := "host=localhost user=muhfaiizr password=admin dbname=akuglow port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("Gagal connect DB: %v", err)
	}

	orderService := services.NewOrderService(db)

	presetID := uuid.New().String()
	preset := models.CommissionPreset{
		ID:          presetID,
		Name:        "Simulasi Preset E2E",
		IsActive:    true,
		Description: "Simulasi 10%",
	}
	db.Create(&preset)

	db.Create(&models.CommissionPresetLevel{
		PresetID: presetID,
		Level:    1,
		Rate:     0.10, // 10%
	})

	productID := uuid.New().String()
	db.Create(&models.Product{
		ID:                 productID,
		Name:               "Produk Simulasi",
		Price:              100000,
		COGS:               50000,
		CommissionPresetID: &presetID,
		Status:             "active",
		MerchantID:         models.PusatID, // Fix empty UUID error
		SupplierID:         models.PusatID, // Fix empty UUID error
	})

	var adminWallet models.Wallet
	if err := db.Where("owner_id = ? AND owner_type = ?", models.PusatID, models.WalletAdmin).First(&adminWallet).Error; err != nil {
		db.Create(&models.Wallet{OwnerID: models.PusatID, OwnerType: models.WalletAdmin, Balance: 0})
	}

	// Create Membership Tier if not exists
	var tier models.MembershipTier
	if err := db.First(&tier, 1).Error; err != nil {
		db.Create(&models.MembershipTier{
			ID:                 1,
			Name:               "Basic",
			Level:              1,
			BaseCommissionRate: 0.05,
		})
	}

	uplineID := uuid.New().String()
	upline := models.User{ID: uplineID, Role: "buyer", Email: uuid.New().String() + "@test.com"}
	db.Create(&upline)
	db.Create(&models.Wallet{OwnerID: uplineID, OwnerType: models.WalletAffiliate})

	affID := uuid.New().String()
	aff := models.AffiliateMember{
		ID:               affID,
		UserID:           uplineID,
		MembershipTierID: 1,
		RefCode:          "UPLINE-SIMULASI-E2E",
	}
	db.Create(&aff)

	buyerID := uuid.New().String()
	buyer := models.User{ID: buyerID, Role: "buyer", Email: uuid.New().String() + "@test.com"}
	db.Create(&buyer)

	orderID := uuid.New().String()
	exp := time.Now().Add(1 * time.Hour)
	order := models.Order{
		ID:          orderID,
		OrderNumber: "ORD-SIMULASI-E2E",
		BuyerID:     &buyerID,
		AffiliateID: &affID,
		Status:      models.OrderPendingPayment,
		ExpiredAt:   &exp,
	}
	db.Create(&order)

	omgID := uuid.New().String()
	omg := models.OrderMerchantGroup{
		ID:         omgID,
		OrderID:    orderID,
		MerchantID: models.PusatID,
		Status:     "new",
		Subtotal:   100000,
	}
	db.Create(&omg)

	itemID := uuid.New().String()
	item := models.OrderItem{
		ID:                   itemID,
		OrderID:              orderID,
		OrderMerchantGroupID: omgID,
		ProductID:            productID,
		MerchantID:           models.PusatID,
		Quantity:             1,
		UnitPrice:            100000,
		Subtotal:             100000,
		CommissionRate:       0.05,
		CommissionAmount:     5000, // Important for DistributePresetCommissions
	}
	db.Create(&item)

	payment := models.Payment{
		ID:      uuid.New().String(),
		OrderID: orderID,
		Amount:  100000,
		Status:  "UNPAID",
	}
	db.Create(&payment)

	fmt.Println(">> Setup simulasi selesai. Mulai membayar order...")

	tx := db.Begin()
	err = orderService.CompletePayment(tx, orderID)
	if err != nil {
		tx.Rollback()
		t.Fatalf("CompletePayment Gagal: %v", err)
	}
	tx.Commit()

	fmt.Println(">> Pembayaran Berhasil! Memeriksa komisi...")

	var comms []models.AffiliateCommission
	db.Where("order_id = ?", orderID).Find(&comms)
	if len(comms) > 0 {
		fmt.Printf("✅ Ditemukan %d komisi afiliasi.\n", len(comms))
		for _, c := range comms {
			fmt.Printf("   -> Komisi: Rp %.2f (Affiliate: %s)\n", c.Amount, c.AffiliateID)
		}
	} else {
		t.Errorf("❌ Tidak ada komisi yang terdistribusi!")
	}

	var w models.Wallet
	db.Where("owner_id = ? AND owner_type = ?", uplineID, models.WalletAffiliate).First(&w)
	fmt.Printf("✅ Wallet Upline (Balance): Rp %.2f\n", w.Balance)
	fmt.Printf("✅ Wallet Upline (Shopping): Rp %.2f\n", w.ShoppingBalance)

	db.Unscoped().Delete(&models.Payment{}, "order_id = ?", orderID)
	db.Unscoped().Delete(&models.OrderItem{}, "id = ?", itemID)
	db.Unscoped().Delete(&models.OrderMerchantGroup{}, "id = ?", omgID)
	db.Unscoped().Delete(&models.Order{}, "id = ?", orderID)
	db.Unscoped().Delete(&models.AffiliateCommission{}, "order_id = ?", orderID)
	db.Unscoped().Delete(&models.AffiliateMember{}, "id = ?", affID)
	db.Unscoped().Delete(&models.Wallet{}, "owner_id = ?", uplineID)
	db.Unscoped().Delete(&models.User{}, "id IN ?", []string{buyerID, uplineID})
	db.Unscoped().Delete(&models.Product{}, "id = ?", productID)
	db.Unscoped().Delete(&models.CommissionPresetLevel{}, "preset_id = ?", presetID)
	db.Unscoped().Delete(&models.CommissionPreset{}, "id = ?", presetID)
	fmt.Println(">> Simulasi selesai dan dibersihkan.")
}
