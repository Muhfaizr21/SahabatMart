package controllers

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/repositories"
	"akuglow/backend/services"
	"akuglow/backend/utils"

	"gorm.io/gorm"
)

type MediaController struct {
	DB      *gorm.DB
	Storage *services.StorageService
	Audit   *services.AuditService
}

func NewMediaController(db *gorm.DB) *MediaController {
	audit := services.NewAuditService(repositories.NewAuditRepository(db))
	return &MediaController{
		DB:      db,
		Storage: services.NewStorageService("", "uploads"),
		Audit:   audit,
	}
}

// GET /api/admin/media
func (mc *MediaController) GetMedia(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 24
	}
	offset := (page - 1) * limit

	query := mc.DB.Model(&models.Media{})
	if search != "" {
		query = query.Where("filename ILIKE ?", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var mediaList []models.Media
	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&mediaList).Error
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data media: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"total":  total,
		"page":   page,
		"limit":  limit,
		"data":   mediaList,
	})
}

// POST /api/admin/media/upload
func (mc *MediaController) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	adminID, _ := r.Context().Value("user_id").(string)

	err := r.ParseMultipartForm(50 << 20) // max 50MB
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Ukuran file terlalu besar")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Gagal mengambil gambar dari payload")
		return
	}
	defer file.Close()

	url, err := mc.Storage.SaveImage(file, header)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan file: "+err.Error())
		return
	}

	media := models.Media{
		Filename:   header.Filename,
		URL:        url,
		Size:       header.Size,
		MimeType:   header.Header.Get("Content-Type"),
		UploadedBy: adminID,
		CreatedAt:  time.Now(),
	}

	if err := mc.DB.Create(&media).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mencatat media ke database: "+err.Error())
		return
	}

	mc.Audit.Log(adminID, "upload_media", "media", media.ID, media.Filename, r.RemoteAddr)

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data":   media,
	})
}

// DELETE /api/admin/media/delete?id=...
func (mc *MediaController) DeleteMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	adminID, _ := r.Context().Value("user_id").(string)
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Missing ID parameter")
		return
	}

	var media models.Media
	if err := mc.DB.First(&media, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Media tidak ditemukan")
		return
	}

	// Delete from DB first
	if err := mc.DB.Delete(&media).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menghapus data media: "+err.Error())
		return
	}

	// Try deleting physical file
	filename := filepath.Base(media.URL)
	filePath := filepath.Join("uploads", filename)
	
	// Check if file exists and remove it
	if _, err := os.Stat(filePath); err == nil {
		_ = os.Remove(filePath)
	}

	mc.Audit.Log(adminID, "delete_media", "media", media.ID, media.Filename, r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"status": "success",
	})
}
