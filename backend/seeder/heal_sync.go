package seeder

import (
	"akuglow/backend/models"
	"akuglow/backend/utils"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
)

// HealAndSyncDatabase runs automated audits and heals data conflicts between Users, Affiliates, and Merchants
func HealAndSyncDatabase(db *gorm.DB) {
	log.Println("🔧 [AUTO-HEAL] Memulai audit sinkronisasi PENGGUNA, ANGGOTA & MERCHANT...")

	HealAndSyncMerchantSlugs(db)
	HealAndSyncMerchantWallets(db)
	HealAndSyncMissingProfiles(db)

	HealAndSyncLegacyData(db)

	log.Println("✅ [AUTO-HEAL] Audit sinkronisasi selesai.")
}

// HealAndSyncLegacyData runs one-time or recurring patches for legacy database states.
func HealAndSyncLegacyData(db *gorm.DB) {
	log.Println("🩹 [AUTO-HEAL] Memulai perbaikan data legacy (Stock, Images, Hold Days, Biteship)...")

	// [Stock Sync Heal] Sync GORM products/variants stock with actual Central Warehouse Inventory
	if err := db.Exec(`
		UPDATE product_variants pv
		SET stock = COALESCE(
			(SELECT inv.stock FROM inventories inv
			 WHERE inv.product_id = pv.product_id 
			   AND inv.product_variant_id = pv.id 
			   AND inv.merchant_id = '00000000-0000-0000-0000-000000000000'), 0)
	`).Error; err != nil {
		log.Printf("⚠️ Failed to heal product_variants stock: %v", err)
	}
	if err := db.Exec(`
		UPDATE products p
		SET stock = COALESCE(
			(SELECT SUM(pv.stock) FROM product_variants pv WHERE pv.product_id = p.id), 0)
		WHERE (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) > 0
	`).Error; err != nil {
		log.Printf("⚠️ Failed to heal aggregated products stock: %v", err)
	}
	if err := db.Exec(`
		UPDATE products p
		SET stock = COALESCE(
			(SELECT inv.stock FROM inventories inv
			 WHERE inv.product_id = p.id 
			   AND inv.product_variant_id IS NULL 
			   AND inv.merchant_id = '00000000-0000-0000-0000-000000000000'), 0)
		WHERE (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) = 0
	`).Error; err != nil {
		log.Printf("⚠️ Failed to heal base products stock: %v", err)
	}

	// Patch existing order items to populate product_image_url from products table
	if err := db.Exec("UPDATE order_items SET product_image_url = (SELECT image FROM products WHERE products.id = order_items.product_id) WHERE product_image_url = '' OR product_image_url IS NULL").Error; err != nil {
		log.Printf("⚠️ Failed to patch product_image_url: %v", err)
	}

	// [Financial Sync] Force set all existing membership tiers hold days to 0
	if err := db.Exec("UPDATE membership_tiers SET commission_hold_days = 0 WHERE commission_hold_days > 0").Error; err != nil {
		log.Printf("⚠️ Failed to patch membership_tiers commission_hold_days: %v", err)
	}

	// [Referral Code Sync] Force uppercase all existing referral codes & references
	if err := db.Exec("UPDATE affiliate_members SET ref_code = UPPER(ref_code), upline_code = UPPER(upline_code)").Error; err != nil {
		log.Printf("⚠️ Failed to patch affiliate_members ref_code uppercase: %v", err)
	}
	if err := db.Exec("UPDATE orders SET affiliate_ref_code = UPPER(affiliate_ref_code) WHERE affiliate_ref_code IS NOT NULL").Error; err != nil {
		log.Printf("⚠️ Failed to patch orders affiliate_ref_code uppercase: %v", err)
	}

	// Patch standard Biteship Area IDs to fully-qualified ones (with IDZ suffix)
	if err := db.Exec("UPDATE merchants SET biteship_area_id = 'IDNP6IDNC147IDND829IDZ10110' WHERE biteship_area_id = 'IDNP6IDNC147IDND829'").Error; err != nil {
		log.Printf("⚠️ Failed to patch merchant area id: %v", err)
	}
	if err := db.Exec("UPDATE platform_configs SET value = 'IDNP6IDNC147IDND829IDZ10110' WHERE key = 'default_biteship_area_id' AND value = 'IDNP6IDNC147IDND829'").Error; err != nil {
		log.Printf("⚠️ Failed to patch default platform config area id: %v", err)
	}
	if err := db.Exec("UPDATE user_profiles SET area_id = 'IDNP6IDNC147IDND829IDZ10110' WHERE area_id = 'IDNP6IDNC147IDND829'").Error; err != nil {
		log.Printf("⚠️ Failed to patch user profile Gambir area id: %v", err)
	}
	if err := db.Exec("UPDATE user_profiles SET area_id = 'IDNP9IDNC105IDND171IDZ45171' WHERE area_id = 'IDNP9IDNC105IDND171'").Error; err != nil {
		log.Printf("⚠️ Failed to patch user profile Cirebon area id: %v", err)
	}
}

// HealAndSyncMerchantSlugs checks and ensures every merchant has a valid unique slug.
func HealAndSyncMerchantSlugs(db *gorm.DB) {
	log.Println("🩹 [AUTO-HEAL] Memulai audit dan perbaikan slug Merchant...")
	var merchants []models.Merchant
	if err := db.Find(&merchants).Error; err != nil {
		log.Printf("❌ [AUTO-HEAL] Gagal mengambil data merchants untuk perbaikan slug: %v", err)
		return
	}

	for _, m := range merchants {
		if m.Slug == "" {
			slugName := utils.Slugify(m.StoreName)
			if slugName == "" {
				slugName = "mitra-merchant"
			}
			m.Slug = fmt.Sprintf("%s-%s", slugName, strings.ToLower(utils.GenerateShortCode(6)))
			db.Model(&m).Update("slug", m.Slug)
			log.Printf("🩹 [AUTO-HEAL] Memperbaiki slug kosong untuk Merchant %s -> %s", m.StoreName, m.Slug)
		}
	}
}

// HealAndSyncMerchantWallets audits and merges duplicate/misaligned wallets.
func HealAndSyncMerchantWallets(db *gorm.DB) {
	log.Println("🩹 [AUTO-HEAL] Memulai audit dan sinkronisasi Wallet Merchant...")
	var merchants []models.Merchant
	if err := db.Find(&merchants).Error; err != nil {
		log.Printf("❌ [AUTO-HEAL] Gagal membaca data merchants untuk sinkronisasi wallet: %v", err)
		return
	}

	for _, m := range merchants {
		if m.UserID == "" {
			continue
		}

		// Cari wallet yang pakai merchant.ID (salah)
		var wrongWallet models.Wallet
		errWrong := db.Where("owner_id = ? AND owner_type = ?", m.ID, models.WalletMerchant).First(&wrongWallet).Error

		// Cari wallet yang pakai merchant.UserID (benar)
		var correctWallet models.Wallet
		errCorrect := db.Where("owner_id = ? AND owner_type = ?", m.UserID, models.WalletMerchant).First(&correctWallet).Error

		if errWrong == nil {
			if errCorrect == gorm.ErrRecordNotFound {
				// Cukup update owner_id dari m.ID ke m.UserID
				if err := db.Model(&wrongWallet).Update("owner_id", m.UserID).Error; err != nil {
					log.Printf("❌ [AUTO-HEAL] Gagal update owner_id untuk wallet %s: %v", wrongWallet.ID, err)
				} else {
					log.Printf("✅ [AUTO-HEAL] Berhasil memindahkan wallet %s dari merchant_id (%s) ke user_id (%s)", wrongWallet.ID, m.ID, m.UserID)
				}
			} else if errCorrect == nil {
				// MERGE!
				log.Printf("⚠️ [AUTO-HEAL] Menemukan duplikasi wallet untuk Merchant %s. Menggabungkan...", m.StoreName)
				errMerge := db.Transaction(func(tx *gorm.DB) error {
					// 1. Tambahkan saldo
					newBalance := correctWallet.Balance + wrongWallet.Balance
					newPending := correctWallet.PendingBalance + wrongWallet.PendingBalance
					newEarned := correctWallet.TotalEarned + wrongWallet.TotalEarned
					newShopping := correctWallet.ShoppingBalance + wrongWallet.ShoppingBalance

					if err := tx.Model(&correctWallet).Updates(map[string]interface{}{
						"balance":          newBalance,
						"pending_balance":  newPending,
						"total_earned":     newEarned,
						"shopping_balance": newShopping,
					}).Error; err != nil {
						return err
					}

					// 2. Arahkan semua transaksi dari wallet salah ke wallet benar
					if err := tx.Model(&models.WalletTransaction{}).Where("wallet_id = ?", wrongWallet.ID).Update("wallet_id", correctWallet.ID).Error; err != nil {
						return err
					}

					// 3. Hapus wallet yang salah
					if err := tx.Delete(&wrongWallet).Error; err != nil {
						return err
					}

					return nil
				})
				if errMerge != nil {
					log.Printf("❌ [AUTO-HEAL] Gagal menggabungkan wallet untuk Merchant %s: %v", m.StoreName, errMerge)
				} else {
					log.Printf("✅ [AUTO-HEAL] Penggabungan wallet Merchant %s selesai.", m.StoreName)
				}
			}
		} else {
			// Pastikan wallet yang benar terbuat jika belum ada sama sekali
			if errCorrect == gorm.ErrRecordNotFound {
				log.Printf("⚠️ [AUTO-HEAL] Merchant %s (%s) tidak memiliki wallet. Membuat baru...", m.StoreName, m.UserID)
				db.Create(&models.Wallet{
					OwnerID:   m.UserID,
					OwnerType: models.WalletMerchant,
					Balance:   0,
				})
			}
		}
	}
}

// HealAndSyncMissingProfiles audits users and auto-creates missing Affiliate or Merchant records.
func HealAndSyncMissingProfiles(db *gorm.DB) {
	log.Println("🩹 [AUTO-HEAL] Memulai audit kecocokan profil pengguna...")

	// 1. Audit user dengan role 'merchant'
	var merchantUsers []models.User
	if err := db.Where("role = ?", "merchant").Find(&merchantUsers).Error; err == nil {
		for _, u := range merchantUsers {
			// Pastikan punya record Merchant
			var merch models.Merchant
			errMerch := db.Where("user_id = ?", u.ID).First(&merch).Error
			
			// Ambil nama lengkap untuk nama toko
			var profile models.UserProfile
			db.Where("user_id = ?", u.ID).First(&profile)
			storeName := "Toko " + profile.FullName
			if profile.FullName == "" {
				storeName = "Toko Merchant " + u.Email
			}

			if errMerch == gorm.ErrRecordNotFound {
				log.Printf("⚠️ [AUTO-HEAL] User %s (%s) ber-role merchant tapi tidak memiliki record Merchant. Membuat baru...", u.ID, u.Email)
				
				slugName := utils.Slugify(storeName)
				if slugName == "" {
					slugName = "mitra-merchant"
				}
				slug := fmt.Sprintf("%s-%s", slugName, strings.ToLower(utils.GenerateShortCode(6)))
				
				defaultArea := "IDNP3CL10"
				var isMaint models.PlatformConfig
				if err := db.Where("key = ?", "default_biteship_area_id").First(&isMaint).Error; err == nil {
					defaultArea = isMaint.Value
				}
				defaultCouriers := "jne,tiki,sicepat,jnt"
				if err := db.Where("key = ?", "default_couriers").First(&isMaint).Error; err == nil {
					defaultCouriers = isMaint.Value
				}

				newMerch := models.Merchant{
					UserID:          u.ID,
					StoreName:       storeName,
					Slug:            slug,
					Status:          "active",
					IsVerified:      true,
					City:            profile.City,
					JoinedAt:        time.Now(),
					BiteshipAreaID:  defaultArea,
					EnabledCouriers: defaultCouriers,
				}
				if err := db.Create(&newMerch).Error; err != nil {
					log.Printf("❌ [AUTO-HEAL] Gagal membuat Merchant untuk %s: %v", u.Email, err)
				} else {
					log.Printf("✅ [AUTO-HEAL] Berhasil membuat Merchant untuk %s", u.Email)
				}
			}

			// Pastikan punya AffiliateMember juga (semua merchant/upline adalah mitra)
			var aff models.AffiliateMember
			errAff := db.Where("user_id = ?", u.ID).First(&aff).Error
			if errAff == gorm.ErrRecordNotFound {
				log.Printf("⚠️ [AUTO-HEAL] Merchant %s (%s) tidak memiliki record AffiliateMember. Membuat baru...", u.ID, u.Email)
				var tier models.MembershipTier
				db.Order("level ASC").First(&tier)
				
				fullName := profile.FullName
				if fullName == "" {
					fullName = "Merchant Member"
				}

				newAff := models.AffiliateMember{
					UserID:           u.ID,
					MembershipTierID: tier.ID,
					Status:           models.AffiliateActive,
					RefCode:          utils.GenerateRefCode(fullName),
				}
				db.Create(&newAff)
			}
		}
	}

	// 2. Audit user dengan role 'affiliate'
	var affiliateUsers []models.User
	if err := db.Where("role = ?", "affiliate").Find(&affiliateUsers).Error; err == nil {
		for _, u := range affiliateUsers {
			// Pastikan punya AffiliateMember
			var aff models.AffiliateMember
			errAff := db.Where("user_id = ?", u.ID).First(&aff).Error
			
			var profile models.UserProfile
			db.Where("user_id = ?", u.ID).First(&profile)
			fullName := profile.FullName
			if fullName == "" {
				fullName = "Affiliate User"
			}

			if errAff == gorm.ErrRecordNotFound {
				log.Printf("⚠️ [AUTO-HEAL] User %s (%s) ber-role affiliate tapi tidak memiliki record AffiliateMember. Membuat baru...", u.ID, u.Email)
				var tier models.MembershipTier
				db.Order("level ASC").First(&tier)
				
				newAff := models.AffiliateMember{
					UserID:           u.ID,
					MembershipTierID: tier.ID,
					Status:           models.AffiliateActive,
					RefCode:          utils.GenerateRefCode(fullName),
				}
				if err := db.Create(&newAff).Error; err != nil {
					log.Printf("❌ [AUTO-HEAL] Gagal membuat AffiliateMember untuk %s: %v", u.Email, err)
				} else {
					log.Printf("✅ [AUTO-HEAL] Berhasil membuat AffiliateMember untuk %s", u.Email)
				}
			}

			// Pastikan punya Wallet Affiliate
			var wallet models.Wallet
			errWallet := db.Where("owner_id = ? AND owner_type = ?", u.ID, models.WalletAffiliate).First(&wallet).Error
			if errWallet == gorm.ErrRecordNotFound {
				log.Printf("⚠️ [AUTO-HEAL] Affiliate %s tidak memiliki Wallet. Membuat baru...", u.Email)
				db.Create(&models.Wallet{
					OwnerID:   u.ID,
					OwnerType: models.WalletAffiliate,
					Balance:   0,
				})
			}
		}
	}
}
