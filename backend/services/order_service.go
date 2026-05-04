package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

type OrderService struct {
	OrderRepo      *repositories.OrderRepository
	UserRepo       *repositories.UserRepository
	FinanceService *FinanceService
	Affiliate      *AffiliateService
	Notification   *NotificationService
	ConfigService  *ConfigService
	DB             *gorm.DB
}

func NewOrderService(db *gorm.DB) *OrderService {
	notif := NewNotificationService(db)
	return &OrderService{
		OrderRepo:      repositories.NewOrderRepository(db),
		UserRepo:       repositories.NewUserRepository(db),
		FinanceService: NewFinanceService(db),
		Affiliate:      NewAffiliateService(db, notif),
		Notification:   notif,
		ConfigService:  NewConfigService(db),
		DB:             db,
	}
}

func (s *OrderService) CreateOrder(buyerID string, items []models.OrderItem, affiliateID *string, shippingInfo models.Order) (*models.Order, error) {
	var buyer models.User
	if err := s.DB.First(&buyer, "id = ?", buyerID).Error; err != nil {
		return nil, fmt.Errorf("user tidak ditemukan")
	}

	merchantItems := make(map[string][]models.OrderItem)
	var totalSubtotal, totalWeight float64

	for i := range items {
		// [Security & Sync] Fetch current product for price integrity
		var product models.Product
		if err := s.DB.First(&product, "id = ?", items[i].ProductID).Error; err != nil {
			return nil, fmt.Errorf("produk tidak ditemukan: %s", items[i].ProductID)
		}

		// Determine price based on role
		actualPrice := product.Price
		if (buyer.Role == "affiliate" || buyer.Role == "merchant") && product.WholesalePrice > 0 {
			actualPrice = product.WholesalePrice
		}

		// Handle variant price override
		if items[i].ProductVariantID != nil && *items[i].ProductVariantID != "" {
			var v models.ProductVariant
			if err := s.DB.First(&v, "id = ?", *items[i].ProductVariantID).Error; err == nil {
				actualPrice = v.Price
				if (buyer.Role == "affiliate" || buyer.Role == "merchant") && v.WholesalePrice > 0 {
					actualPrice = v.WholesalePrice
				}
			}
		} else {
			items[i].ProductVariantID = nil
		}

		// Standardize MerchantID
		if items[i].MerchantID == "" || items[i].MerchantID == "pusat" {
			items[i].MerchantID = "00000000-0000-0000-0000-000000000000"
		}

		items[i].UnitPrice = actualPrice
		items[i].Subtotal = actualPrice * float64(items[i].Quantity)
		items[i].Weight = product.Weight
		items[i].ProductName = product.Name

		totalSubtotal += items[i].Subtotal
		totalWeight += float64(items[i].Weight * items[i].Quantity)

		merchantItems[items[i].MerchantID] = append(merchantItems[items[i].MerchantID], items[i])
	}

	var resolvedAffiliate *models.AffiliateMember
	if affiliateID != nil && *affiliateID != "" {
		var aff models.AffiliateMember
		if err := s.DB.Preload("Tier").Where("id = ? OR ref_code = ?", *affiliateID, *affiliateID).First(&aff).Error; err == nil {
			resolvedAffiliate = &aff
		}
	}

	if affiliateID != nil && *affiliateID == "" {
		affiliateID = nil
	}

	timeout := s.ConfigService.GetInt("payment_timeout_minutes", 30)
	expiry := time.Now().Add(time.Duration(timeout) * time.Minute)
	order := &models.Order{
		BuyerID:            &buyerID,
		OrderNumber:        fmt.Sprintf("ORD-%d-%s", time.Now().Unix(), buyerID[:8]),
		Status:             models.OrderPendingPayment,
		AffiliateID:        affiliateID,
		ExpiredAt:          &expiry,
		ShippingName:       shippingInfo.ShippingName,
		ShippingPhone:      shippingInfo.ShippingPhone,
		ShippingAddress:    shippingInfo.ShippingAddress,
		ShippingDistrict:   shippingInfo.ShippingDistrict,
		ShippingCity:       shippingInfo.ShippingCity,
		ShippingProvince:   shippingInfo.ShippingProvince,
		ShippingPostalCode: shippingInfo.ShippingPostalCode,
		DestinationAreaID:  shippingInfo.DestinationAreaID,
		TotalShippingCost:  shippingInfo.TotalShippingCost,
		Notes:              shippingInfo.Notes,
	}
	if resolvedAffiliate != nil {
		order.AffiliateID = &resolvedAffiliate.ID
		refCode := resolvedAffiliate.RefCode
		order.AffiliateRefCode = &refCode
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		var totalPlatformFee, totalCommission float64

		for merchantID, gItems := range merchantItems {
			var merchant models.Merchant
			tx.First(&merchant, "id = ?", merchantID)

			var requestedCourier, requestedService string
			var groupShippingCost float64
			for _, mg := range shippingInfo.MerchantGroups {
				if mg.MerchantID == merchantID {
					requestedCourier = mg.CourierCode
					requestedService = mg.ServiceCode
					groupShippingCost = mg.ShippingCost
					break
				}
			}

			if requestedCourier == "" && len(shippingInfo.MerchantGroups) > 0 {
				requestedCourier = shippingInfo.MerchantGroups[0].CourierCode
				requestedService = shippingInfo.MerchantGroups[0].ServiceCode
				groupShippingCost = shippingInfo.MerchantGroups[0].ShippingCost
			}

			group := models.OrderMerchantGroup{
				OrderID:      order.ID,
				MerchantID:   merchantID,
				Status:       models.MOrderNew,
				CourierCode:  requestedCourier,
				ServiceCode:  requestedService,
				ShippingCost: groupShippingCost,
			}

			if err := tx.Create(&group).Error; err != nil {
				return err
			}

			var gSub, gPlat, gAffComm float64
			for _, item := range gItems {
				item.OrderID = order.ID
				item.OrderMerchantGroupID = group.ID

				affAmt, distAmt, platAmt, _, _ := s.CalculateCommissions(tx, item, affiliateID, merchantID)

				var inventory models.Inventory
				inventoryMerchantID := merchantID
				if err := tx.Set("gorm:query_option", "FOR UPDATE").
					Where("merchant_id = ? AND product_id = ?", merchantID, item.ProductID).
					First(&inventory).Error; err != nil {
					pusatFallback := "00000000-0000-0000-0000-000000000000"
					if err2 := tx.Set("gorm:query_option", "FOR UPDATE").
						Where("merchant_id = ? AND product_id = ?", pusatFallback, item.ProductID).
						First(&inventory).Error; err2 != nil {
						return fmt.Errorf("stok produk '%s' tidak tersedia", item.ProductName)
					}
					inventoryMerchantID = pusatFallback
				}

				if inventory.Stock < item.Quantity {
					pusatFallback := "00000000-0000-0000-0000-000000000000"
					if inventoryMerchantID != pusatFallback {
						if err2 := tx.Set("gorm:query_option", "FOR UPDATE").
							Where("merchant_id = ? AND product_id = ?", pusatFallback, item.ProductID).
							First(&inventory).Error; err2 == nil && inventory.Stock >= item.Quantity {
							inventoryMerchantID = pusatFallback
						} else {
							return fmt.Errorf("stok produk '%s' tidak mencukupi", item.ProductName)
						}
					} else {
						return fmt.Errorf("stok produk '%s' tidak mencukupi", item.ProductName)
					}
				}

				if err := tx.Model(&inventory).Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
					return err
				}

				if err := tx.Create(&item).Error; err != nil {
					return err
				}

				gSub += item.Subtotal
				gPlat += platAmt
				gAffComm += affAmt
				
				group.Subtotal += item.Subtotal
				group.PlatformFee += platAmt
				group.AffiliateCommission += affAmt
				group.MerchantPayout += (item.Subtotal - platAmt - affAmt)
				group.DistributionCommission += distAmt
			}

			if err := tx.Save(&group).Error; err != nil {
				return err
			}

			totalPlatformFee += gPlat
			totalCommission += gAffComm
		}

		order.Subtotal = totalSubtotal
		order.TotalPlatformFee = totalPlatformFee
		order.TotalCommission = totalCommission
		order.TotalWeight = totalWeight
		order.VoucherCode = shippingInfo.VoucherCode
		order.TotalDiscount = shippingInfo.TotalDiscount
		order.GrandTotal = order.Subtotal + order.TotalShippingCost - order.TotalDiscount
		if order.GrandTotal < 0 {
			order.GrandTotal = 0
		}
		
		if err := tx.Save(order).Error; err != nil {
			return err
		}

		return nil
	})

	if err == nil {
		adminID := "00000000-0000-0000-0000-000000000001"
		_ = s.Notification.Push(adminID, "admin", "order_new", "Pesanan Baru Masuk!", 
			fmt.Sprintf("Pesanan %s menunggu pembayaran.", order.OrderNumber), 
			fmt.Sprintf("/admin/orders/detail/%s", order.ID))
	}

	return order, err
}


func (s *OrderService) CompletePayment(tx *gorm.DB, orderID string) error {
	var order models.Order
	if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
		return err
	}

	if order.Status != models.OrderPendingPayment && order.Status != models.OrderCancelled {
		return fmt.Errorf("pesanan tidak dalam status menunggu pembayaran atau sudah dibatalkan/expired")
	}

		now := time.Now()
		order.Status = models.OrderPaid
		order.PaidAt = &now

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// [Akuglow Sync] Update all merchant groups to 'confirmed' status
		if err := tx.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", order.ID).Update("status", "confirmed").Error; err != nil {
			return err
		}

		// [Akuglow Sync] Update Payment Record status to PAID
		if err := tx.Model(&models.Payment{}).Where("order_id = ?", order.ID).Update("status", "PAID").Error; err != nil {
			return err
		}

		// Distribusikan dana otomatis ke Merchant & Affiliate
		if err := s.FinanceService.DistributeFunds(tx, order.ID); err != nil {
			return err
		}

		// Notifikasi ke Buyer
		if order.BuyerID != nil {
			_ = s.Notification.Push(*order.BuyerID, "buyer", "payment_success", "Pembayaran Berhasil", 
				fmt.Sprintf("Pembayaran untuk pesanan %s telah kami terima.", order.OrderNumber), 
				fmt.Sprintf("/order/%s", order.ID))
		}

		// [NOTIF] Kirim ke Admin Topbar (Pembayaran Masuk)
		adminID := "00000000-0000-0000-0000-000000000001"
		_ = s.Notification.Push(adminID, "admin", "payment_received", "Pembayaran Diterima!", 
			fmt.Sprintf("Pembayaran untuk pesanan %s telah divalidasi.", order.OrderNumber), 
			fmt.Sprintf("/admin/orders/detail/%s", order.ID))

		// [NOTIF] Kirim ke Merchant: SIAP KIRIM
		var groups []models.OrderMerchantGroup
		tx.Where("order_id = ?", order.ID).Find(&groups)
		for _, g := range groups {
			_ = s.Notification.Push(g.MerchantID, "merchant", "order_ready_to_ship", "📦 Pesanan Siap Kirim!", 
				fmt.Sprintf("Pesanan %s telah dibayar. Silakan segera packing dan kirim item pembeli.", order.OrderNumber), 
				"/merchant/orders")
		}

		// Cek Upgrade Tier Affiliate jika ada
		if order.AffiliateID != nil {
			// Increment Conversion Count
			tx.Model(&models.AffiliateMember{}).Where("id = ?", *order.AffiliateID).
				UpdateColumn("total_conversions", gorm.Expr("total_conversions + 1"))

			_ = s.Affiliate.TriggerTierUpgrade(*order.AffiliateID)
		}

		return nil
}

// PresetCommissionEntry: Hasil kalkulasi komisi untuk 1 affiliate di 1 level jaringan
type PresetCommissionEntry struct {
	AffiliateID string
	Level       int
	Amount      float64
	Rate        float64
}

// CalculateCommissions menghitung distribusi komisi untuk satu order item.
// Jika produk memiliki CommissionPreset, akan berjalan naik ke seluruh jaringan upline
// sesuai kedalaman preset. Jika tidak, hanya hitung untuk referrer langsung (Level 1).
func (s *OrderService) CalculateCommissions(db *gorm.DB, item models.OrderItem, affiliateID *string, merchantID string) (affAmt float64, distAmt float64, platAmt float64, cogs float64, err error) {
	subtotal := item.UnitPrice * float64(item.Quantity)

	// 1. Platform Fee
	var platRate float64
	var merchComm models.MerchantCommission
	var catComm models.CategoryCommission
	var product models.Product
	db.Where("id = ?", item.ProductID).First(&product)

	if err := db.Where("merchant_id = ?", merchantID).First(&merchComm).Error; err == nil {
		platRate = merchComm.FeePercent / 100.0
	} else if err := db.Where("category_name = ?", product.Category).First(&catComm).Error; err == nil {
		platRate = catComm.FeePercent / 100.0
	} else {
		rawFee := s.ConfigService.GetFloat("default_platform_fee", 5.0)
		if rawFee < 1 && rawFee > 0 {
			platRate = rawFee
		} else {
			platRate = rawFee / 100.0
		}
	}
	platAmt = subtotal * platRate

	// 2. COGS
	cogs = product.COGS
	if item.ProductVariantID != nil && *item.ProductVariantID != "" {
		var variant models.ProductVariant
		if err := db.Where("id = ?", *item.ProductVariantID).First(&variant).Error; err == nil {
			if variant.COGS > 0 {
				cogs = variant.COGS
			}
		}
	}

	var merchant models.Merchant
	db.Where("id = ?", merchantID).First(&merchant)

	// 3. Distribution Fee (Merchant cut)
	if product.MerchantCommissionPercent > 0 {
		distAmt = subtotal * (product.MerchantCommissionPercent / 100.0)
	} else if product.BaseDistributionFee > 0 {
		distAmt = subtotal * (product.BaseDistributionFee / 100.0)
	} else if product.BaseDistributionFeeNominal > 0 {
		distAmt = product.BaseDistributionFeeNominal * float64(item.Quantity)
	} else if merchComm.DistFee > 0 {
		distAmt = subtotal * (merchComm.DistFee / 100.0)
	} else if catComm.DistFee > 0 {
		distAmt = subtotal * (catComm.DistFee / 100.0)
	} else if merchant.DistributionFeePercent > 0 {
		distAmt = subtotal * (merchant.DistributionFeePercent / 100.0)
	}

	// 4. Affiliate Fee — hanya hitung total untuk backward compat (Level 1 saja)
	// Distribusi multi-level preset ditangani oleh DistributePresetCommissions
	if affiliateID != nil && *affiliateID != "" {
		if aff, err := s.UserRepo.GetAffiliateByID(*affiliateID); err == nil {
			// Cek apakah produk punya preset multi-level
			if product.CommissionPresetID != nil && *product.CommissionPresetID != "" {
				// Kalau ada preset, affAmt diisi dari Level 1 rate saja (untuk order total)
				// Distribusi lengkap akan dieksekusi via DistributePresetCommissions
				var presetLevel models.CommissionPresetLevel
				if err := db.Where("preset_id = ? AND level = 1", *product.CommissionPresetID).First(&presetLevel).Error; err == nil {
					affAmt = subtotal * presetLevel.Rate
				}
			} else {
				// Fallback ke logika lama (no preset)
				var tierComm models.ProductTierCommission
				var tpItem models.TierCommissionPresetItem
				
				if product.TierCommissionPresetID != nil && *product.TierCommissionPresetID != "" {
					// Gunakan Preset Matrix
					if err := db.Where("preset_id = ? AND membership_tier_id = ?", *product.TierCommissionPresetID, aff.MembershipTierID).First(&tpItem).Error; err == nil {
						affAmt = subtotal * tpItem.CommissionRate
					}
				}

				if affAmt == 0 {
					// Fallback ke manual matrix per produk
					if err := db.Where("product_id = ? AND membership_tier_id = ?", item.ProductID, aff.MembershipTierID).First(&tierComm).Error; err == nil {
						affAmt = subtotal * tierComm.CommissionRate
					} else if product.BaseAffiliateFee > 0 {
					affAmt = subtotal * (product.BaseAffiliateFee / 100.0)
				} else if product.BaseAffiliateFeeNominal > 0 {
					affAmt = product.BaseAffiliateFeeNominal * float64(item.Quantity)
				} else if merchComm.AffiliateFee > 0 {
					affAmt = subtotal * (merchComm.AffiliateFee / 100.0)
				} else if catComm.AffiliateFee > 0 {
					affAmt = subtotal * (catComm.AffiliateFee / 100.0)
				} else {
					var tier models.MembershipTier
					if err := db.First(&tier, "id = ?", aff.MembershipTierID).Error; err == nil {
						affAmt = subtotal * tier.BaseCommissionRate
					} else {
						// Final fallback from Admin Config with normalization
						rawComm := s.ConfigService.GetFloat("default_affiliate_commission", 3.0)
						var affRate float64
						if rawComm < 1 && rawComm > 0 {
							affRate = rawComm
						} else {
							affRate = rawComm / 100.0
						}
						affAmt = subtotal * affRate
					}
				}
			}
		}
	}

	return affAmt, distAmt, platAmt, cogs, nil
}

// DistributePresetCommissions: Jika produk memiliki CommissionPreset, fungsi ini
// berjalan naik ke jaringan upline dan membuat record AffiliateCommission per level.
// Dipanggil setelah order dibayar (ConfirmPayment).
func (s *OrderService) DistributePresetCommissions(tx *gorm.DB, order models.Order, item models.OrderItem, affiliateID string) ([]PresetCommissionEntry, error) {
	var product models.Product
	if err := tx.Where("id = ?", item.ProductID).First(&product).Error; err != nil {
		return nil, err
	}

	// Tidak ada preset? Skip — gunakan logika lama
	if product.CommissionPresetID == nil || *product.CommissionPresetID == "" {
		return nil, nil
	}

	// Load level-level dari preset
	var presetLevels []models.CommissionPresetLevel
	if err := tx.Where("preset_id = ?", *product.CommissionPresetID).Order("level ASC").Find(&presetLevels).Error; err != nil {
		return nil, err
	}
	if len(presetLevels) == 0 {
		return nil, nil
	}

	subtotal := item.UnitPrice * float64(item.Quantity)
	var results []PresetCommissionEntry

	// Mulai dari referrer langsung (Level 1), lalu naik ke upline
	currentAffiliateID := affiliateID
	for _, pl := range presetLevels {
		if currentAffiliateID == "" {
			break
		}

		var aff models.AffiliateMember
		if err := tx.Where("id = ?", currentAffiliateID).First(&aff).Error; err != nil {
			break // Upline tidak ditemukan, hentikan chain
		}

		commAmt := subtotal * pl.Rate
		if commAmt <= 0 {
			// Lanjut ke upline meskipun rate 0
			if aff.UplineID != nil {
				currentAffiliateID = *aff.UplineID
			} else {
				break
			}
			continue
		}

		// Hitung hold period berdasarkan tier affiliate
		holdDays := 7
		var tier models.MembershipTier
		if err := tx.First(&tier, "id = ?", aff.MembershipTierID).Error; err == nil {
			holdDays = tier.CommissionHoldDays
		}
		holdUntil := time.Now().AddDate(0, 0, holdDays)

		// Buat record AffiliateCommission untuk level ini
		commRecord := models.AffiliateCommission{
			AffiliateID: currentAffiliateID,
			OrderID:     order.ID,
			OrderItemID: item.ID,
			ProductID:   item.ProductID,
			MerchantID:  item.MerchantID,
			GrossAmount: subtotal,
			RateApplied: pl.Rate,
			Amount:      commAmt,
			Status:      models.CommissionPending,
			HoldUntil:   &holdUntil,
		}
		if err := tx.Create(&commRecord).Error; err != nil {
			return results, err
		}

		results = append(results, PresetCommissionEntry{
			AffiliateID: currentAffiliateID,
			Level:       pl.Level,
			Amount:      commAmt,
			Rate:        pl.Rate,
		})

		// [Akuglow Sync] Notify Affiliate of new commission
		s.Notification.Push(currentAffiliateID, "affiliate", "commission_pending", 
			"💸 Komisi Baru Masuk!", 
			fmt.Sprintf("Anda mendapatkan komisi Rp %.0f dari pesanan %s.", commAmt, order.OrderNumber), 
			"/affiliate/commissions")

		// Naik ke upline berikutnya
		if aff.UplineID != nil {
			currentAffiliateID = *aff.UplineID
		} else {
			break
		}
	}

	return results, nil
}

func (s *OrderService) CancelOrder(orderID string, reason string, cancelledBy string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
			return err
		}

		if order.Status == models.OrderCancelled || order.Status == models.OrderCompleted {
			return fmt.Errorf("pesanan sudah dalam status akhir")
		}

		// [Sync Fix] Return Stock to BOTH Inventory and Master Product Catalog
		for _, item := range order.Items {
			// 1. Restock Merchant's Warehouse
			if err := tx.Model(&models.Inventory{}).
				Where("merchant_id = ? AND product_id = ?", item.MerchantID, item.ProductID).
				UpdateColumn("stock", gorm.Expr("stock + ?", item.Quantity)).Error; err != nil {
				return err
			}

			// 2. Restock Master Catalog (The product listing)
			if err := tx.Model(&models.Product{}).
				Where("id = ?", item.ProductID).
				UpdateColumn("stock", gorm.Expr("stock + ?", item.Quantity)).Error; err != nil {
				return err
			}
		}

		now := time.Now()
		order.Status = models.OrderCancelled
		order.CancelReason = reason
		order.CancelledBy = &cancelledBy
		order.CancelledAt = &now

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Sync Merchant Group Status
		if err := tx.Model(&models.OrderMerchantGroup{}).Where("order_id = ?", order.ID).
			Update("status", models.MOrderCancelled).Error; err != nil {
			return err
		}

		// [Financial Audit Fix] Tarik kembali semua dana yang sudah dibagikan (Merchant, Affiliate, HQ)
		financeSvc := NewFinanceService(tx)
		if err := financeSvc.ReverseDistribution(tx, order.ID); err != nil {
			log.Printf("⚠️ Gagal menarik kembali dana pada pembatalan order %s: %v", order.ID, err)
		}

		return nil
	})
}

func (s *OrderService) ExpireOrders() error {
	// Find orders pending_payment that have passed their ExpiredAt time
	now := time.Now()
	var orders []models.Order
	if err := s.DB.Where("status = ? AND expired_at <= ?", models.OrderPendingPayment, now).Find(&orders).Error; err != nil {
		return err
	}

	for _, order := range orders {
		if err := s.CancelOrder(order.ID, "Sistem: Waktu pembayaran habis", "system"); err != nil {
			fmt.Printf("❌ Gagal membatalkan pesanan %s: %v\n", order.ID, err)
		}
	}
	return nil
}

// [Akuglow Sync] UpdateMerchantOrderStatus memperbarui status group dan melakukan agregasi ke status induk
func (s *OrderService) UpdateMerchantOrderStatus(groupID string, status models.MerchantOrderStatus) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var group models.OrderMerchantGroup
		if err := tx.First(&group, "id = ?", groupID).Error; err != nil {
			return err
		}

		group.Status = status
		if status == models.MOrderShipped {
			now := time.Now()
			group.ShippedAt = &now
		} else if status == models.MOrderDelivered {
			now := time.Now()
			group.DeliveredAt = &now
		}

		if err := tx.Save(&group).Error; err != nil {
			return err
		}

		// Sync ke Status Induk
		return s.SyncOrderStatusFromGroups(tx, group.OrderID)
	})
}

// [Akuglow Sync] SyncOrderStatusFromGroups mengagregasi status dari seluruh distributor ke status pesanan utama
func (s *OrderService) SyncOrderStatusFromGroups(tx *gorm.DB, orderID string) error {
	var groups []models.OrderMerchantGroup
	if err := tx.Where("order_id = ?", orderID).Find(&groups).Error; err != nil {
		return err
	}

	total := len(groups)
	shippedCount := 0
	deliveredCount := 0
	completedCount := 0
	cancelledCount := 0

	for _, g := range groups {
		switch g.Status {
		case models.MOrderShipped:
			shippedCount++
		case models.MOrderDelivered:
			deliveredCount++
		case models.MOrderCompleted:
			completedCount++
		case models.MOrderCancelled:
			cancelledCount++
		}
	}

	var newStatus models.OrderStatus
	if cancelledCount == total {
		newStatus = models.OrderCancelled
	} else if completedCount == total {
		newStatus = models.OrderCompleted
	} else if (deliveredCount + completedCount) == total {
		newStatus = models.OrderDelivered
	} else if (shippedCount + deliveredCount + completedCount) == total {
		newStatus = models.OrderShipped
	} else {
		// Tetap di status sebelumnya (Processing/Paid)
		return nil
	}

	// Jika status berubah menjadi COMPLETED, trigger turnover update & Reward Points
	if newStatus == models.OrderCompleted {
		var order models.Order
		tx.First(&order, "id = ?", orderID)
		if order.Status != models.OrderCompleted {
			// 1. Tambahkan Reward Points (Contoh: 1 poin per Rp 1.000)
			if order.BuyerID != nil {
				points := int64(order.GrandTotal / 1000)
				if points > 0 {
					tx.Model(&models.UserProfile{}).Where("user_id = ?", *order.BuyerID).
						UpdateColumn("reward_points", gorm.Expr("reward_points + ?", points))
					
					_ = s.Notification.Push(*order.BuyerID, "buyer", "reward_earned", "🎁 Poin AkuGlow!", 
						fmt.Sprintf("Selamat! Anda mendapatkan %d poin dari pesanan %s.", points, order.OrderNumber), "/profile?tab=points")
				}
			}

			// 2. Trigger Turnover Snapshot Update untuk Affiliate secara Rekursif
			if order.AffiliateID != nil {
				go s.Affiliate.UpdateUplineSnapshotsRecursive(*order.AffiliateID)
			}
		}
	}

	return tx.Model(&models.Order{}).Where("id = ?", orderID).Update("status", newStatus).Error
}

