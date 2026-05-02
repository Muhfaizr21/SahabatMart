package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

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
			ProductID string  `json:"product_id"`
			Quantity  int     `json:"quantity"`
			CostPrice float64 `json:"cost_price"`
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
			InboundID: inbound.ID,
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			CostPrice: item.CostPrice,
		}
		if err := tx.Create(&inboundItem).Error; err != nil {
			tx.Rollback()
			utils.JSONError(w, http.StatusInternalServerError, "Gagal mencatat item inbound")
			return
		}

		// UPDATE STOK DI GUDANG PUSAT
		var inventory models.Inventory
		err := tx.Where("product_id = ? AND merchant_id = ?", item.ProductID, models.PusatID).First(&inventory).Error
		
		stockBefore := 0
		if err == gorm.ErrRecordNotFound {
			inventory = models.Inventory{
				ProductID:  item.ProductID,
				MerchantID: models.PusatID,
				Stock:      item.Quantity,
				BasePrice:  item.CostPrice,
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

		// Update Product Global Stock
		tx.Model(&models.Product{}).Where("id = ?", item.ProductID).Update("stock", inventory.Stock)

		// LOG MUTATION (Mata Elang)
		mutation := models.StockMutation{
			ProductID:   item.ProductID,
			MerchantID:  models.PusatID,
			Type:        "IN",
			Quantity:    item.Quantity,
			Reference:   inbound.ID,
			StockBefore: stockBefore,
			StockAfter:  inventory.Stock,
			Note:        "Inbound from Supplier: " + input.ReferenceNo,
		}
		tx.Create(&mutation)

		totalItems += item.Quantity
	}

	tx.Model(&inbound).Update("total_items", totalItems)
	tx.Commit()

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Stok berhasil masuk ke Gudang Pusat", "inbound_id": inbound.ID})
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

	var restock models.RestockRequest
	if err := ctrl.DB.Preload("Items").First(&restock, "id = ?", restockID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Request restock tidak ditemukan")
		return
	}

	if restock.Status != "requested" {
		utils.JSONError(w, http.StatusBadRequest, "Request ini sudah diproses sebelumnya")
		return
	}

	tx := ctrl.DB.Begin()

	// 1. Kurangi stok di Pusat
	for _, item := range restock.Items {
		var pusatInv models.Inventory
		if err := tx.Where("product_id = ? AND merchant_id = ?", item.ProductID, models.PusatID).First(&pusatInv).Error; err != nil {
			tx.Rollback()
			utils.JSONError(w, http.StatusBadRequest, "Stok produk tidak ditemukan di Pusat")
			return
		}

		if pusatInv.Stock < item.Quantity {
			tx.Rollback()
			utils.JSONError(w, http.StatusBadRequest, "Stok Pusat tidak mencukupi untuk item "+item.ProductID)
			return
		}

		stockBefore := pusatInv.Stock
		pusatInv.Stock -= item.Quantity
		tx.Save(&pusatInv)

		// Log Mutation Pusat (OUT)
		tx.Create(&models.StockMutation{
			ProductID:   item.ProductID,
			MerchantID:  models.PusatID,
			Type:        "RESTOCK_OUT",
			Quantity:    item.Quantity,
			Reference:   restock.ID,
			StockBefore: stockBefore,
			StockAfter:  pusatInv.Stock,
			Note:        "Pengiriman ke Merchant: " + restock.MerchantID,
		})
	}

	// 2. Update Status Restock
	tx.Model(&restock).Updates(map[string]interface{}{
		"status":     "approved",
		"updated_at": time.Now(),
	})

	tx.Commit()
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Restock disetujui, stok pusat telah dikurangi"})
}

func (ctrl *WarehouseController) ShipRestock(w http.ResponseWriter, r *http.Request) {
	restockID := strings.TrimPrefix(r.URL.Path, "/api/admin/warehouse/restock/ship/")
	if restockID == "" {
		utils.JSONError(w, http.StatusBadRequest, "Restock ID diperlukan")
		return
	}

	var input struct {
		TrackingNumber string `json:"tracking_number"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}

	if err := ctrl.DB.Model(&models.RestockRequest{}).Where("id = ?", restockID).Updates(map[string]interface{}{
		"status":          "shipped",
		"tracking_number": input.TrackingNumber,
		"updated_at":      time.Now(),
	}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update status pengiriman")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{"message": "Barang dalam pengiriman B2B", "tracking_number": input.TrackingNumber})
}
