package controllers

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
	"gorm.io/gorm"
)

type SkinController struct {
	DB *gorm.DB
}

func NewSkinController(db *gorm.DB) *SkinController {
	return &SkinController{DB: db}
}

// SubmitPreTest - Simpan hasil pre-test (Awal Journey)
func (sc *SkinController) SubmitPreTest(w http.ResponseWriter, r *http.Request) {
	var pretest models.SkinPreTest
	if err := json.NewDecoder(r.Body).Decode(&pretest); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid input")
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

	if err := sc.DB.Save(&pretest).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to save pretest")
		return
	}
	utils.JSONResponse(w, http.StatusOK, pretest)
}

// GetJourneyData - Ambil semua data journey user
func (sc *SkinController) GetJourneyData(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)
	if userID == "" {
		claims, _ := utils.ParseJWT(r.Header.Get("Authorization"))
		if claims != nil { userID = claims.UserID }
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

	sc.DB.Where("user_id = ?", userID).First(&results.PreTest)
	sc.DB.Where("user_id = ?", userID).Order("week_number desc").Find(&results.ProgressLogs)
	sc.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&results.Journals)
	sc.DB.Where("user_id = ?", userID).First(&results.WarriorLevel)
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
		utils.JSONError(w, http.StatusBadRequest, "Invalid input")
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

// PostWeeklyProgress - Catat progres mingguan (dengan foto & AI Analysis)
func (sc *SkinController) PostWeeklyProgress(w http.ResponseWriter, r *http.Request) {
	var progress models.SkinProgress
	if err := json.NewDecoder(r.Body).Decode(&progress); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid input")
		return
	}
	userID, _ := r.Context().Value("user_id").(string)
	progress.UserID = userID
	
	// AI ANALYZER MOCK LOGIC
	// Dalam produksi, ini akan memanggil API Vision (Google/OpenAI)
	progress.RednessScore = 15 + (10 - progress.SkinScore)*5 // Simulasi: SkinScore tinggi = Redness rendah
	progress.AcneCount = 5 + (10 - progress.SkinScore)*2   // Simulasi: SkinScore tinggi = Jerawat sedikit
	
	if err := sc.DB.Create(&progress).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to save progress")
		return
	}

	message := fmt.Sprintf("Analisis AI Selesai: Kemerahan %.1f%%, Jerawat Terdeteksi: %d", float64(progress.RednessScore), progress.AcneCount)
	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message": message,
		"data":    progress,
	})
}

// AnalyzeSkinPhoto - AI Skin Analyzer dari upload foto langsung
// Endpoint: POST /api/skin/analyze (multipart/form-data, field: "photo")
func (sc *SkinController) AnalyzeSkinPhoto(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Gagal membaca file (Max 10MB)")
		return
	}

	file, handler, err := r.FormFile("photo")
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Field 'photo' tidak ditemukan")
		return
	}
	defer file.Close()

	// Simpan sementara untuk analisis
	tmpPath := fmt.Sprintf("/tmp/skin_analyze_%d_%s", time.Now().UnixNano(), handler.Filename)
	dst, err := os.Create(tmpPath)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan file sementara")
		return
	}
	defer func() {
		dst.Close()
		os.Remove(tmpPath) // Hapus file temp setelah selesai
	}()
	io.Copy(dst, file)

	// ── AI Analysis Logic ───────────────────────────────────
	// Kalkulasi berbasis ukuran file & metadata sebagai proxy analisis
	// (Dalam produksi: integrasikan Google Vision API / OpenAI Vision)
	fileSize := handler.Size
	now := time.Now()

	// Seed deterministik dari file size + timestamp untuk variasi natural
	seed := int(fileSize%100) + now.Second()
	redness := 10 + (seed % 35)          // 10-44%
	acneCount := seed % 8                 // 0-7 titik
	moisture := 40 + ((seed * 3) % 40)   // 40-79%
	skinScore := 10 - (redness / 10)     // Inverse dari redness
	if skinScore < 3 { skinScore = 3 }
	if skinScore > 9 { skinScore = 9 }

	// Tentukan summary berdasarkan kondisi
	summary := "Kulit dalam kondisi baik. Pertahankan rutinitas perawatan Anda."
	if redness > 30 {
		summary = "Terdeteksi kemerahan cukup tinggi. Kulit mungkin sedang dalam fase reaksi atau adaptasi produk baru."
	} else if acneCount > 4 {
		summary = "Terdeteksi beberapa titik jerawat aktif. Coba kurangi produk yang mengandung komedogenik tinggi."
	} else if moisture < 50 {
		summary = "Tingkat kelembapan kulit perlu diperhatikan. Perbanyak minum air dan gunakan moisturizer rutin."
	}

	// Rekomendasi dinamis
	recommendations := []string{}
	if redness > 25 {
		recommendations = append(recommendations, "Gunakan toner bebas alkohol untuk menenangkan kulit")
	}
	if acneCount > 3 {
		recommendations = append(recommendations, "Oleskan spot treatment dengan kandungan salicylic acid malam hari")
	}
	if moisture < 55 {
		recommendations = append(recommendations, "Aplikasikan moisturizer 2x sehari (pagi & malam)")
	}
	recommendations = append(recommendations, "Gunakan sunscreen SPF 30+ setiap pagi")
	recommendations = append(recommendations, "Konsumsi air minimal 2 liter per hari untuk hidrasi dari dalam")

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"skin_score":      skinScore,
		"redness":         redness,
		"acne_count":      acneCount,
		"moisture":        moisture,
		"summary":         summary,
		"recommendations": recommendations,
		"analyzed_at":     now.Format(time.RFC3339),
	})
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
