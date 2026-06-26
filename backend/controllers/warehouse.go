package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/services"
	"akuglow/backend/utils"

	"gorm.io/gorm"
)

type WarehouseController struct {
	DB *gorm.DB
}

func NewWarehouseController(db *gorm.DB) *WarehouseController {
	return &WarehouseController{DB: db}
}

// ── SUPPLIER MANAGEMENT ──────────────────────────────────────────

func (ctrl *WarehouseController) GetSuppliers(w http.ResponseWriter, r *http.Request) {
	var suppliers []models.Supplier
	if err := ctrl.DB.Order("created_at desc").Find(&suppliers).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data supplier")
		return
	}
	utils.JSONResponse(w, http.StatusOK, suppliers)
}

func (ctrl *WarehouseController) CreateSupplier(w http.ResponseWriter, r *http.Request) {
	var supplier models.Supplier
	if err := json.NewDecoder(r.Body).Decode(&supplier); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	if err := ctrl.DB.Create(&supplier).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat supplier")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, supplier)
}

func (ctrl *WarehouseController) UpdateSupplier(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/admin/warehouse/suppliers/update/")
	if id == "" || id == r.URL.Path {
		utils.JSONError(w, http.StatusBadRequest, "ID Supplier diperlukan")
		return
	}

	var input models.Supplier
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}

	var supplier models.Supplier
	if err := ctrl.DB.First(&supplier, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Supplier tidak ditemukan")
		return
	}

	supplier.Name = input.Name
	supplier.Contact = input.Contact
	supplier.Phone = input.Phone
	supplier.Email = input.Email
	supplier.Address = input.Address

	if err := ctrl.DB.Save(&supplier).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengupdate supplier")
		return
	}

	utils.JSONResponse(w, http.StatusOK, supplier)
}

func (ctrl *WarehouseController) DeleteSupplier(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/admin/warehouse/suppliers/delete/")
	if id == "" || id == r.URL.Path {
		utils.JSONError(w, http.StatusBadRequest, "ID Supplier diperlukan")
		return
	}

	if err := ctrl.DB.Delete(&models.Supplier{}, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus supplier")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Supplier berhasil dihapus"})
}

// ── INBOUND STOCK (TRUK MASUK DARI SUPPLIER) ─────────────────────

func (ctrl *WarehouseController) CreateInbound(w http.ResponseWriter, r *http.Request) {
	var input struct {
		SupplierID  string `json:"supplier_id"`
		ReferenceNo string `json:"reference_no"`
		Note        string `json:"note"`
		Items       []struct {
			ProductID        string  `json:"product_id"`
			ProductVariantID *string `json:"product_variant_id"`
			Quantity         int     `json:"quantity"`
			CostPrice        float64 `json:"cost_price"`
		} `json:"items"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}

	tx := ctrl.DB.Begin()

	inbound := models.InboundStock{
		SupplierID:  input.SupplierID,
		ReferenceNo: input.ReferenceNo,
		Note:        input.Note,
		TotalItems:  0,
	}

	if err := tx.Create(&inbound).Error; err != nil {
		tx.Rollback()
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat record inbound")
		return
	}

	totalItems := 0
	for _, item := range input.Items {
		inboundItem := models.InboundItem{
			InboundID:        inbound.ID,
			ProductID:        item.ProductID,
			ProductVariantID: item.ProductVariantID,
			Quantity:         item.Quantity,
			CostPrice:        item.CostPrice,
		}
		if err := tx.Create(&inboundItem).Error; err != nil {
			tx.Rollback()
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mencatat item inbound")
			return
		}

		// UPDATE STOK DI GUDANG PUSAT (Variant Aware)
		var inventory models.Inventory
		dbInv := tx.Where("product_id = ? AND merchant_id = ?", item.ProductID, models.PusatID)
		if item.ProductVariantID != nil && *item.ProductVariantID != "" {
			dbInv = dbInv.Where("product_variant_id = ?", *item.ProductVariantID)
		} else {
			dbInv = dbInv.Where("product_variant_id IS NULL OR product_variant_id = ''")
		}

		err := dbInv.First(&inventory).Error

		stockBefore := 0
		if err == gorm.ErrRecordNotFound {
			inventory = models.Inventory{
				ProductID:        item.ProductID,
				ProductVariantID: item.ProductVariantID,
				MerchantID:       models.PusatID,
				Stock:            item.Quantity,
				BasePrice:        item.CostPrice,
			}
			if err := tx.Create(&inventory).Error; err != nil {
				tx.Rollback()
				utils.JSONError(w, http.StatusInternalServerError, "Gagal inisialisasi inventori pusat")
				return
			}
		} else {
			stockBefore = inventory.Stock
			inventory.Stock += item.Quantity
			inventory.BasePrice = item.CostPrice // Update COGS terbaru
			tx.Save(&inventory)
		}

		// Update Product/Variant Global Stock (Sync for legacy visibility)
		if item.ProductVariantID != nil && *item.ProductVariantID != "" {
			tx.Model(&models.ProductVariant{}).Where("id = ?", *item.ProductVariantID).Update("stock", inventory.Stock)
			// [FIX #15] Sync parent product stock = sum of all variant stocks
			var totalVariantStock int64
			tx.Table("product_variants").Where("product_id = ?", item.ProductID).Select("COALESCE(SUM(stock), 0)").Scan(&totalVariantStock)
			tx.Model(&models.Product{}).Where("id = ?", item.ProductID).Update("stock", totalVariantStock)
		} else {
			tx.Model(&models.Product{}).Where("id = ?", item.ProductID).Update("stock", inventory.Stock)
		}

		// LOG MUTATION (Mata Elang)
		mutation := models.StockMutation{
			ProductID:        item.ProductID,
			ProductVariantID: item.ProductVariantID,
			MerchantID:       models.PusatID,
			Type:             "IN",
			Quantity:         item.Quantity,
			Reference:        inbound.ID,
			StockBefore:      stockBefore,
			StockAfter:       inventory.Stock,
			Note:             "Inbound from Supplier: " + input.ReferenceNo,
		}
		tx.Create(&mutation)

		totalItems += item.Quantity
	}

	tx.Model(&inbound).Update("total_items", totalItems)
	tx.Commit()

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Stok berhasil masuk ke Gudang Pusat", "inbound_id": inbound.ID})
}

func (ctrl *WarehouseController) GetInbounds(w http.ResponseWriter, r *http.Request) {
	var inbounds []models.InboundStock
	if err := ctrl.DB.Preload("Supplier").Preload("Items").Order("created_at desc").Find(&inbounds).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data inbound")
		return
	}
	utils.JSONResponse(w, http.StatusOK, inbounds)
}

// ── AUDIT LOG (MATA ELANG) ───────────────────────────────────────

func (ctrl *WarehouseController) GetStockHistory(w http.ResponseWriter, r *http.Request) {
	productID := r.URL.Query().Get("product_id")
	var mutations []models.StockMutation
	query := ctrl.DB.Order("created_at desc")

	if productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	if err := query.Find(&mutations).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil riwayat stok")
		return
	}
	utils.JSONResponse(w, http.StatusOK, mutations)
}

// ── RESTOCK APPROVAL (OUTBOUND PUSAT TO CABANG) ──────────────────

func (ctrl *WarehouseController) ApproveRestock(w http.ResponseWriter, r *http.Request) {
	restockID := strings.TrimPrefix(r.URL.Path, "/api/admin/warehouse/restock/approve/")
	if restockID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Restock ID diperlukan")
		return
	}

	var input struct {
		AdminNote string `json:"admin_note"`
	}
	json.NewDecoder(r.Body).Decode(&input)

	tx := ctrl.DB.Begin()

	var restock models.RestockRequest
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Preload("Items").First(&restock, "id = ?", restockID).Error; err != nil {
		tx.Rollback()
		utils.JSONError(w, http.StatusNotFound, "Request restock tidak ditemukan")
		return
	}

	// Status requested is standard for new requests
	if restock.Status != "requested" && restock.Status != "pending" {
		tx.Rollback()
		utils.JSONError(w, http.StatusBadRequest, "Request ini sudah diproses sebelumnya (Status: "+restock.Status+")")
		return
	}

	// 1. Kurangi stok di Pusat (Variant Aware)
	for _, item := range restock.Items {
		var pusatInv models.Inventory
		dbInv := tx.Set("gorm:query_option", "FOR UPDATE").Where("product_id = ? AND merchant_id = ?", item.ProductID, models.PusatID)
		if item.ProductVariantID != nil && *item.ProductVariantID != "" {
			dbInv = dbInv.Where("product_variant_id = ?", *item.ProductVariantID)
		} else {
			dbInv = dbInv.Where("product_variant_id IS NULL OR product_variant_id = ''")
		}

		if err := dbInv.First(&pusatInv).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Initialize missing inventory record at Pusat
				pusatInv = models.Inventory{
					ProductID:        item.ProductID,
					ProductVariantID: item.ProductVariantID,
					MerchantID:       models.PusatID,
					Stock:            0,
				}
				if err := tx.Create(&pusatInv).Error; err != nil {
					tx.Rollback()
					utils.JSONError(w, http.StatusInternalServerError, "Gagal inisialisasi stok pusat")
					return
				}
			} else {
				tx.Rollback()
				utils.JSONError(w, http.StatusInternalServerError, "Gagal akses database inventori")
				return
			}
		}

		if pusatInv.Stock < item.Quantity {
			tx.Rollback()
			utils.JSONError(w, http.StatusBadRequest, fmt.Sprintf("Stok Pusat tidak mencukupi untuk item %s (Stok: %d, Dibutuhkan: %d)", item.ProductID, pusatInv.Stock, item.Quantity))
			return
		}

		stockBefore := pusatInv.Stock
		pusatInv.Stock -= item.Quantity
		if err := tx.Save(&pusatInv).Error; err != nil {
			tx.Rollback()
			utils.JSONError(w, http.StatusInternalServerError, "Gagal update stok pusat")
			return
		}

		// 1.2 Deduct from Master Tables (Sync for Admin UI)
		if item.ProductVariantID != nil && *item.ProductVariantID != "" {
			if err := tx.Model(&models.ProductVariant{}).Where("id = ?", *item.ProductVariantID).
				Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
				tx.Rollback()
				utils.JSONError(w, http.StatusInternalServerError, "Gagal update stok varian produk master: "+err.Error())
				return
			}

			// Sync parent product stock if not variable
			var parentProduct models.Product
			if err := tx.Select("id, product_type").First(&parentProduct, "id = ?", item.ProductID).Error; err == nil {
				if parentProduct.ProductType != "variable" {
					if err := tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
						Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
						tx.Rollback()
						utils.JSONError(w, http.StatusInternalServerError, "Gagal update stok produk master: "+err.Error())
						return
					}
				}
			}
		} else {
			if err := tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
				Update("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
				tx.Rollback()
				utils.JSONError(w, http.StatusInternalServerError, "Gagal update stok produk master: "+err.Error())
				return
			}
		}

		// 2. Log Mutasi (Mata Elang) - Tracking Stock OUT from Pusat
		mutation := models.StockMutation{
			ProductID:        item.ProductID,
			ProductVariantID: item.ProductVariantID,
			MerchantID:       models.PusatID,
			Type:             "RESTOCK_OUT",
			Quantity:         -item.Quantity,
			StockBefore:      stockBefore,
			StockAfter:       pusatInv.Stock,
			Reference:        restock.ID,
			Note:             fmt.Sprintf("Restock untuk merchant %s (Req: %s)", restock.MerchantID, restock.ID),
			CreatedAt:        time.Now(),
		}
		if err := tx.Create(&mutation).Error; err != nil {
			tx.Rollback()
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mencatat mutasi stok")
			return
		}
	}

	// 3. Update Request Status
	if err := tx.Model(&restock).Updates(map[string]interface{}{
		"status":     "approved",
		"admin_note": input.AdminNote,
		"updated_at": time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update status restock")
		return
	}

	tx.Commit()

	// 3. Notify Merchant
	notif := services.NewNotificationService(ctrl.DB)
	_ = notif.Push(restock.MerchantID, "merchant", "restock_update", "✅ Restock Disetujui",
		fmt.Sprintf("Permintaan restock %s Anda telah disetujui.", restock.ID), "/merchant/restock")

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Restock disetujui, stok pusat telah dikurangi"})
}

func (ctrl *WarehouseController) ShipRestock(w http.ResponseWriter, r *http.Request) {
	restockID := strings.TrimPrefix(r.URL.Path, "/api/admin/warehouse/restock/ship/")
	if restockID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Restock ID diperlukan")
		return
	}

	var input struct {
		CourierCode string `json:"courier_code"`
		AdminNote   string `json:"admin_note"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}

	var restock models.RestockRequest
	if err := ctrl.DB.Preload("Items").Preload("Merchant").First(&restock, "id = ?", restockID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Restock request tidak ditemukan")
		return
	}

	shippingSvc := services.NewShippingService(ctrl.DB)
	biteshipOrderID, waybillID, biteshipLabelURL, err := shippingSvc.CreateBiteshipOrderForRestock(restock, input.CourierCode)
	if err != nil {
		utils.JSONErrorInternal(w, err, "Gagal membuat resi Biteship otomatis")
		return
	}

	if err := ctrl.DB.Model(&restock).Updates(map[string]interface{}{
		"status":             "shipped",
		"tracking_number":    waybillID,
		"courier_code":       input.CourierCode,
		"admin_note":         input.AdminNote,
		"biteship_order_id":  biteshipOrderID,
		"shipping_label_url": biteshipLabelURL,
		"updated_at":         time.Now(),
	}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update status pengiriman")
		return
	}

	// Notify Merchant
	notif := services.NewNotificationService(ctrl.DB)
	_ = notif.Push(restock.MerchantID, "merchant", "restock_update", "🚚 Restock Dikirim",
		fmt.Sprintf("Restock %s sedang dalam pengiriman B2B via %s (Resi: %s).", restock.ID, strings.ToUpper(input.CourierCode), waybillID), "/merchant/restock")

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":           "Pengiriman berhasil diproses & resi terbit otomatis",
		"tracking_number":   waybillID,
		"biteship_order_id": biteshipOrderID,
	})
}

func (ctrl *WarehouseController) SyncInventory(w http.ResponseWriter, r *http.Request) {
	var products []models.Product
	ctrl.DB.Find(&products)
	var variants []models.ProductVariant
	ctrl.DB.Find(&variants)

	count := 0
	for _, p := range products {
		var variantCount int64
		ctrl.DB.Model(&models.ProductVariant{}).Where("product_id = ?", p.ID).Count(&variantCount)

		initialStock := 1000
		if variantCount > 0 {
			initialStock = 0 // Base stock should be 0 if variants exist
		}

		var inv models.Inventory
		err := ctrl.DB.Where("product_id = ? AND merchant_id = ? AND (product_variant_id IS NULL OR product_variant_id = '')", p.ID, models.PusatID).First(&inv).Error
		if err == gorm.ErrRecordNotFound {
			ctrl.DB.Create(&models.Inventory{
				ProductID:  p.ID,
				MerchantID: models.PusatID,
				Stock:      initialStock,
			})
			count++
		} else if variantCount > 0 && inv.Stock > 0 {
			// If it already exists but should be 0 because variants exist
			ctrl.DB.Model(&inv).Update("stock", 0)
		}
	}

	for _, v := range variants {
		var inv models.Inventory
		idCopy := v.ID
		err := ctrl.DB.Where("product_id = ? AND product_variant_id = ? AND merchant_id = ?", v.ProductID, idCopy, models.PusatID).First(&inv).Error
		if err == gorm.ErrRecordNotFound {
			ctrl.DB.Create(&models.Inventory{
				ProductID:        v.ProductID,
				ProductVariantID: &idCopy,
				MerchantID:       models.PusatID,
				Stock:            1000,
			})
			count++
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Sync complete", "created": count})
}

func (ctrl *WarehouseController) BulkDeleteSuppliers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada ID yang dipilih")
		return
	}

	if err := ctrl.DB.Delete(&models.Supplier{}, "id IN ?", req.IDs).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus supplier secara massal")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Supplier terpilih berhasil dihapus"})
}

func (ctrl *WarehouseController) BulkDeleteInbounds(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if len(req.IDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Tidak ada ID yang dipilih")
		return
	}

	err := ctrl.DB.Transaction(func(tx *gorm.DB) error {
		// Clean related items
		if err := tx.Where("inbound_id IN ?", req.IDs).Delete(&models.InboundItem{}).Error; err != nil {
			return err
		}
		// Delete main inbounds
		if err := tx.Delete(&models.InboundStock{}, "id IN ?", req.IDs).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus inbound secara massal: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Catatan inbound terpilih berhasil dihapus"})
}
