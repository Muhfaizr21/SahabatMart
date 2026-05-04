package controllers

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
	"gorm.io/gorm"
)

type SkinController struct {
	DB      *gorm.DB
	SkinAI  *services.SkinAIService
	Storage *services.StorageService
}

func NewSkinController(db *gorm.DB) *SkinController {
	baseURL := os.Getenv("APP_URL")
	if baseURL == "" {
		baseURL = os.Getenv("BASE_URL")
	}
	return &SkinController{
		DB:      db,
		SkinAI:  services.NewSkinAIService(db),
		Storage: services.NewStorageService(baseURL, "uploads/skin"),
	}
}

// SubmitPreTest - Simpan hasil pre-test (Awal Journey)
func (sc *SkinController) SubmitPreTest(w http.ResponseWriter, r *http.Request) {
	var pretest models.SkinPreTest
	if err := json.NewDecoder(r.Body).Decode(&pretest); err != nil {
		log.Printf("⚠️ [SkinJourney] PostPreTest decode error: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	userID, _ := r.Context().Value("user_id").(string)
	if userID == "" {
		tokenStr := r.Header.Get("Authorization")
		claims, err := utils.ParseJWT(tokenStr)
		if err == nil { userID = claims.UserID }
	}

	pretest.UserID = userID
	pretest.CreatedAt = time.Now()

	// Generate Barcode Token if missing
	if pretest.BarcodeToken == "" {
		pretest.BarcodeToken = fmt.Sprintf("AKU-%s-%d", userID[:8], time.Now().Unix())
	}

	if err := sc.DB.Save(&pretest).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to save pretest")
		return
	}
	utils.JSONResponse(w, http.StatusOK, pretest)
}

// GetJourneyData - Ambil semua data journey user
func (sc *SkinController) GetJourneyData(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)
	tokenParam := r.URL.Query().Get("token")

	var pretest models.SkinPreTest
	if tokenParam != "" {
		if err := sc.DB.Where("barcode_token = ?", tokenParam).First(&pretest).Error; err == nil {
			userID = pretest.UserID
		}
	}

	if userID == "" {
		claims, _ := utils.ParseJWT(r.Header.Get("Authorization"))
		if claims != nil {
			userID = claims.UserID
		}
	}

	if userID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var results struct {
		PreTest      models.SkinPreTest      `json:"pretest"`
		ProgressLogs []models.SkinProgress   `json:"progress_logs"`
		Journals     []models.SkinJournal    `json:"journals"`
		WarriorLevel models.SkinWarriorLevel `json:"warrior_level"`
		Education    []models.SkinEducation  `json:"education"`
		DayCount     int                     `json:"day_count"`
		Affirmations []string                `json:"affirmations"`
		Voucher      string                  `json:"voucher,omitempty"`
	}

	if pretest.ID != 0 {
		results.PreTest = pretest
	} else {
		sc.DB.Where("user_id = ?", userID).Limit(1).Find(&results.PreTest)
	}
	
	// Auto-generate barcode if missing for existing user
	if results.PreTest.ID != 0 && results.PreTest.BarcodeToken == "" {
		results.PreTest.BarcodeToken = fmt.Sprintf("AKU-%s-%d", userID[:8], time.Now().Unix())
		sc.DB.Model(&results.PreTest).Update("barcode_token", results.PreTest.BarcodeToken)
	}

	sc.DB.Where("user_id = ?", userID).Order("week_number desc").Find(&results.ProgressLogs)
	
	// Sanitize ProgressLogs (Fix W0 issue in old data)
	for i := range results.ProgressLogs {
		if results.ProgressLogs[i].WeekNumber < 1 {
			results.ProgressLogs[i].WeekNumber = 1
		}
	}

	sc.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&results.Journals)
	sc.DB.Where("user_id = ?", userID).Limit(1).Find(&results.WarriorLevel)
	sc.DB.Order("day_target asc").Find(&results.Education)

	// Hitung hari
	if results.PreTest.ID != 0 {
		diff := time.Since(results.PreTest.CreatedAt)
		results.DayCount = int(diff.Hours()/24) + 1
	} else {
		results.DayCount = 1
	}

	// Reward Hari ke-25
	if results.DayCount >= 25 {
		results.Voucher = "AKUGLOW25 - Diskon 5% untuk Stok Bulan Depan!"
	}

	results.Affirmations = []string{
		"Kulitmu tidak rusak, dia hanya sedang beristirahat untuk lebih kuat.",
		"Terima kasih sudah bertahan hari ini. Kamu selangkah lebih dekat.",
		"I am healing everyday.",
		"Proses penyembuhan memang tidak instan, tapi kamu hebat!",
		"Hargai setiap perubahan kecil pada kulitmu.",
	}

	utils.JSONResponse(w, http.StatusOK, results)
}

// PostDailyJournal - Catat jurnal harian
func (sc *SkinController) PostDailyJournal(w http.ResponseWriter, r *http.Request) {
	var journal models.SkinJournal
	if err := json.NewDecoder(r.Body).Decode(&journal); err != nil {
		log.Printf("⚠️ [SkinJourney] PostDailyJournal decode error: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}
	userID, _ := r.Context().Value("user_id").(string)
	journal.UserID = userID
	if err := sc.DB.Create(&journal).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create journal")
		return
	}
	utils.JSONResponse(w, http.StatusCreated, journal)
}

// PostWeeklyProgress - Catat progres mingguan dengan auto week_number & weekly lock
func (sc *SkinController) PostWeeklyProgress(w http.ResponseWriter, r *http.Request) {
	var progress models.SkinProgress
	if err := json.NewDecoder(r.Body).Decode(&progress); err != nil {
		log.Printf("⚠️ [SkinJourney] PostWeeklyProgress decode error: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}
	userID, _ := r.Context().Value("user_id").(string)
	progress.UserID = userID

	// Auto-hitung week_number berdasarkan tanggal pre-test
	var pretest models.SkinPreTest
	if err := sc.DB.Where("user_id = ?", userID).First(&pretest).Error; err == nil {
		daysSinceStart := int(time.Since(pretest.CreatedAt).Hours() / 24)
		progress.WeekNumber = (daysSinceStart / 7) + 1
	} else {
		// Fallback: lanjut dari log terakhir
		var lastLog models.SkinProgress
		sc.DB.Where("user_id = ?", userID).Order("week_number desc").First(&lastLog)
		progress.WeekNumber = lastLog.WeekNumber + 1
		if progress.WeekNumber < 1 { progress.WeekNumber = 1 }
	}

	// Cek: sudah upload minggu ini? (weekly lock)
	var existingThisWeek models.SkinProgress
	err := sc.DB.Where("user_id = ? AND week_number = ?", userID, progress.WeekNumber).First(&existingThisWeek).Error
	if err == nil {
		utils.JSONError(w, http.StatusConflict, fmt.Sprintf(
			"Kamu sudah upload progres minggu ke-%d! Tunggu minggu depan ya 💪",
			progress.WeekNumber,
		))
		return
	}

	if err := sc.DB.Create(&progress).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to save progress")
		return
	}

	message := fmt.Sprintf("Progres Minggu ke-%d berhasil disimpan! Skor Kulit: %d/10 💖", progress.WeekNumber, progress.SkinScore)
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message":     message,
		"week_number": progress.WeekNumber,
		"data":        progress,
	})
}

// AnalyzeSkinPhoto - AI Skin Analyzer dari upload foto langsung
// Endpoint: POST /api/skin/analyze (multipart/form-data, field: "photo")
func (sc *SkinController) AnalyzeSkinPhoto(w http.ResponseWriter, r *http.Request) {
	log.Printf("📥 [SkinJourney] AnalyzeSkinPhoto called. Method: %s", r.Method)
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("⚠️ [SkinJourney] ParseMultipartForm error: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "Gagal membaca file (Max 10MB): "+err.Error())
		return
	}

	file, handler, err := r.FormFile("photo")
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Field 'photo' tidak ditemukan")
		return
	}
	defer file.Close()

	// Read image bytes
	imageBytes, err := io.ReadAll(file)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membaca file gambar")
		return
	}

	_ = handler // suppress unused warning

	// Save temp file for backward compat (jika ada fitur yg perlu disk path)
	tmpPath := fmt.Sprintf("/tmp/skin_analyze_%d.jpg", time.Now().UnixNano())
	if f, err := os.Create(tmpPath); err == nil {
		f.Write(imageBytes)
		f.Close()
		defer os.Remove(tmpPath)
	}

	// ── Real AI Analysis via OpenAI Vision ────────────────────
	result, err := sc.SkinAI.AnalyzeImageBytes(imageBytes)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menganalisis foto: "+err.Error())
		return
	}

	// Save file permanently to storage
	file.Seek(0, 0) // Reset reader for Storage service
	photoURL, err := sc.Storage.SaveImage(file, handler)
	if err != nil {
		log.Printf("⚠️ [SkinJourney] Failed to save photo to storage: %v", err)
	}

	// Attach URL to result
	resultMap := make(map[string]interface{})
	resBytes, _ := json.Marshal(result)
	json.Unmarshal(resBytes, &resultMap)
	resultMap["photo_url"] = photoURL

	utils.JSONResponse(w, http.StatusOK, resultMap)
}

// --- COMMUNITY FEATURES ---

func (sc *SkinController) GetCommunityGroups(w http.ResponseWriter, r *http.Request) {
	var groups []models.SkinCommunityGroup
	sc.DB.Order("created_at asc").Find(&groups)
	utils.JSONResponse(w, http.StatusOK, groups)
}

func (sc *SkinController) GetCommunityFeed(w http.ResponseWriter, r *http.Request) {
	groupID := r.URL.Query().Get("group_id")
	var posts []models.SkinCommunityPost
	query := sc.DB.Preload("User.Profile").Preload("Comments.User.Profile").Order("created_at desc")
	if groupID != "" { query = query.Where("group_id = ?", groupID) }
	query.Limit(50).Find(&posts)
	utils.JSONResponse(w, http.StatusOK, posts)
}

func (sc *SkinController) PostCommunityPost(w http.ResponseWriter, r *http.Request) {
	var post models.SkinCommunityPost
	json.NewDecoder(r.Body).Decode(&post)
	userID, _ := r.Context().Value("user_id").(string)
	if userID == "" {
		claims, _ := utils.ParseJWT(r.Header.Get("Authorization"))
		if claims != nil { userID = claims.UserID }
	}
	post.UserID = userID
	sc.DB.Create(&post)
	sc.DB.Preload("User.Profile").First(&post, post.ID)
	utils.JSONResponse(w, http.StatusCreated, post)
}

func (sc *SkinController) PostCommunityComment(w http.ResponseWriter, r *http.Request) {
	var comment models.SkinCommunityComment
	json.NewDecoder(r.Body).Decode(&comment)
	userID, _ := r.Context().Value("user_id").(string)
	if userID == "" {
		claims, _ := utils.ParseJWT(r.Header.Get("Authorization"))
		if claims != nil { userID = claims.UserID }
	}
	comment.UserID = userID
	sc.DB.Create(&comment)
	sc.DB.Preload("User.Profile").First(&comment, comment.ID)
	utils.JSONResponse(w, http.StatusCreated, comment)
}

func (sc *SkinController) DeleteCommunityPost(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	userID, _ := r.Context().Value("user_id").(string)
	userRole, _ := r.Context().Value("user_role").(string)
	var post models.SkinCommunityPost
	if err := sc.DB.First(&post, id).Error; err == nil {
		if post.UserID == userID || userRole == "admin" || userRole == "superadmin" {
			sc.DB.Delete(&post)
			utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
			return
		}
	}
	utils.JSONError(w, http.StatusForbidden, "Unauthorized")
}

func (sc *SkinController) DeleteCommunityComment(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	userID, _ := r.Context().Value("user_id").(string)
	userRole, _ := r.Context().Value("user_role").(string)
	var comment models.SkinCommunityComment
	if err := sc.DB.First(&comment, id).Error; err == nil {
		if comment.UserID == userID || userRole == "admin" || userRole == "superadmin" {
			sc.DB.Delete(&comment)
			utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
			return
		}
	}
	utils.JSONError(w, http.StatusForbidden, "Unauthorized")
}

func (sc *SkinController) LikeCommunityPost(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Model(&models.SkinCommunityPost{}).Where("id = ?", id).Update("likes", gorm.Expr("likes + 1"))
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// UploadCommunityImage - Menangani upload gambar dari lokal
func (sc *SkinController) UploadCommunityImage(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // Max 10MB
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "File terlalu besar (Max 10MB)")
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Gagal mengambil file")
		return
	}
	defer file.Close()

	// Buat nama file unik (WebP dari Frontend)
	fileName := fmt.Sprintf("%d-%s", time.Now().Unix(), handler.Filename)
	filePath := "uploads/community/" + fileName

	dst, err := os.Create(filePath)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan file di server")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menulis file")
		return
	}

	// Return URL absolut agar frontend bisa akses
	url := fmt.Sprintf("/uploads/community/%s", fileName)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"url": url})
}

// --- ADMIN FEATURES ---

func (sc *SkinController) AdminGetAllPreTests(w http.ResponseWriter, r *http.Request) {
	var tests []models.SkinPreTest
	sc.DB.Order("created_at desc").Find(&tests)
	utils.JSONResponse(w, http.StatusOK, tests)
}

func (sc *SkinController) AdminGetAllJournals(w http.ResponseWriter, r *http.Request) {
	var journals []models.SkinJournal
	sc.DB.Order("created_at desc").Find(&journals)
	utils.JSONResponse(w, http.StatusOK, journals)
}

func (sc *SkinController) AdminGetAllProgress(w http.ResponseWriter, r *http.Request) {
	var progress []models.SkinProgress
	sc.DB.Order("created_at desc").Find(&progress)
	utils.JSONResponse(w, http.StatusOK, progress)
}

func (sc *SkinController) AdminGetAllEducation(w http.ResponseWriter, r *http.Request) {
	var edu []models.SkinEducation
	sc.DB.Order("day_target asc").Find(&edu)
	utils.JSONResponse(w, http.StatusOK, edu)
}

func (sc *SkinController) AdminCreateEducation(w http.ResponseWriter, r *http.Request) {
	var edu models.SkinEducation
	json.NewDecoder(r.Body).Decode(&edu)
	sc.DB.Create(&edu)
	utils.JSONResponse(w, http.StatusCreated, edu)
}

func (sc *SkinController) AdminDeleteEducation(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinEducation{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func (sc *SkinController) AdminCreateGroup(w http.ResponseWriter, r *http.Request) {
	var group models.SkinCommunityGroup
	json.NewDecoder(r.Body).Decode(&group)
	sc.DB.Create(&group)
	utils.JSONResponse(w, http.StatusCreated, group)
}
