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
	"strings"
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

	if userID == "" {
		utils.JSONError(w, http.StatusUnauthorized, "User ID not found. Please login.")
		return
	}

	pretest.UserID = userID
	pretest.CreatedAt = time.Now()

	// Generate Barcode Token if missing
	if pretest.BarcodeToken == "" {
		// Use a safe slice or fallback
		shortID := "GUEST"
		if len(userID) >= 8 {
			shortID = userID[:8]
		}
		pretest.BarcodeToken = fmt.Sprintf("AKU-%s-%d", shortID, time.Now().Unix())
	}

	// Check if user already has a pretest - if so, update it
	var existing models.SkinPreTest
	if err := sc.DB.Where("user_id = ?", userID).First(&existing).Error; err == nil {
		log.Printf("ℹ️ [SkinJourney] Updating existing pretest for user %s", userID)
		pretest.ID = existing.ID // Maintain same ID
		if err := sc.DB.Save(&pretest).Error; err != nil {
			log.Printf("❌ [SkinJourney] UpdatePreTest DB Error: %v", err)
			utils.JSONError(w, http.StatusInternalServerError, "Gagal memperbarui data pretest: "+err.Error())
			return
		}
	} else {
		log.Printf("ℹ️ [SkinJourney] Creating new pretest for user %s", userID)
		if err := sc.DB.Create(&pretest).Error; err != nil {
			log.Printf("❌ [SkinJourney] SubmitPreTest DB Error: %v", err)
			utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan data pretest: "+err.Error())
			return
		}
	}

	// [CRITICAL] Reset user journey status for a fresh start
	// Ensure the record exists and is fully reset
	var journey models.UserSkinJourney
	if err := sc.DB.Where("user_id = ?", userID).First(&journey).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			sc.DB.Create(&models.UserSkinJourney{
				UserID: userID, ProgramID: 0, IsCompleted: false, StartedAt: time.Now(), CurrentWeek: 1,
			})
		}
	} else {
		sc.DB.Model(&journey).Updates(map[string]interface{}{
			"is_completed": false,
			"program_id":   0, // Reset to no program
			"current_week": 1,
			"started_at":   time.Now(),
			"skin_profile_json": "{}", // Clear old AI profile
		})
	}

	// [Point 2] Clear all previous progress logs to ensure a truly fresh start
	sc.DB.Exec("DELETE FROM skin_step_logs WHERE user_id = ?", userID)
	sc.DB.Exec("DELETE FROM skin_progresses WHERE user_id = ?", userID)

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
		PreTest           models.SkinPreTest                `json:"pretest"`
		ProgressLogs      []models.SkinProgress             `json:"progress_logs"`
		Journals          []models.SkinJournal              `json:"journals"`
		WarriorLevel      models.SkinWarriorLevel           `json:"warrior_level"`
		Education         []models.SkinEducation            `json:"education"`
		DayCount          int                               `json:"day_count"`
		Affirmations      []string                          `json:"affirmations"`
		Voucher           string                            `json:"voucher,omitempty"`
		VoucherMessage    string                            `json:"voucher_message,omitempty"`
		RitualInstruction string                            `json:"ritual_instruction,omitempty"`
		Program           *models.SkinJourneyProgram        `json:"program,omitempty"`
		Routines          []models.SkinJourneyRoutine       `json:"routines,omitempty"`
		Recommendations   []models.SkinJourneyProductMapping `json:"recommendations,omitempty"`
		CompletedStepsToday []uint                         `json:"completed_steps_today"`
		IsCompleted       bool                              `json:"is_completed"`
		FirstPhoto        string                            `json:"first_photo,omitempty"`
		LastPhoto         string                            `json:"last_photo,omitempty"`
		ConsistencyScore  int                               `json:"consistency_score"`
		UserName          string                            `json:"user_name"`
	}

	if pretest.ID != 0 {
		results.PreTest = pretest
	} else {
		sc.DB.Where("user_id = ?", userID).Order("created_at desc").First(&results.PreTest)
	}

	// Fetch User Name for synchronization (Priority: PreTest > UserProfile)
	results.UserName = results.PreTest.FullName
	if results.UserName == "" {
		var profile models.UserProfile
		if err := sc.DB.Where("user_id = ?", userID).First(&profile).Error; err == nil {
			results.UserName = profile.FullName
		}
	}
	if results.UserName == "" {
		results.UserName = "Sahabat Glow" // Fallback default
	}

	// Fetch active program
	var userJourney models.UserSkinJourney
	if err := sc.DB.Preload("Program").Where("user_id = ?", userID).Order("id desc").First(&userJourney).Error; err == nil {
		log.Printf("🔍 [SkinJourney] Data fetch for user %s: ProgramID=%d, IsCompleted=%v", userID, userJourney.ProgramID, userJourney.IsCompleted)
		if userJourney.ProgramID != 0 {
			results.Program = &userJourney.Program
		}
		results.IsCompleted = userJourney.IsCompleted // Sync status
		
		// Fetch Routines for this program
		sc.DB.Preload("Step").Where("program_id = ?", userJourney.ProgramID).Find(&results.Routines)
	}
	
	// Fetch Product Recommendations based on skin type and concern from PreTest
	if results.PreTest.ID != 0 {
		sc.DB.Preload("Product").Where("skin_type = ? OR skin_concern = ?", results.PreTest.SkinType, results.PreTest.SkinProblem).Order("priority desc").Find(&results.Recommendations)
	}
	
	// Auto-generate barcode if missing for existing user
	if results.PreTest.ID != 0 && results.PreTest.BarcodeToken == "" {
		shortID := "USER"
		if len(userID) >= 8 {
			shortID = userID[:8]
		}
		results.PreTest.BarcodeToken = fmt.Sprintf("AKU-%s-%d", shortID, time.Now().Unix())
		sc.DB.Model(&results.PreTest).Update("barcode_token", results.PreTest.BarcodeToken)
	}

	// Filter logs and journals based on the start date of the CURRENT program
	startTime := userJourney.StartedAt
	if startTime.IsZero() {
		startTime = results.PreTest.CreatedAt
	}

	sc.DB.Where("user_id = ? AND created_at >= ?", userID, startTime).Order("week_number desc").Find(&results.ProgressLogs)
	
	// Sanitize ProgressLogs (Fix W0 issue in old data)
	for i := range results.ProgressLogs {
		if results.ProgressLogs[i].WeekNumber < 1 {
			results.ProgressLogs[i].WeekNumber = 1
		}
	}

	sc.DB.Where("user_id = ? AND created_at >= ?", userID, startTime).Order("created_at desc").Find(&results.Journals)
	sc.DB.Where("user_id = ?", userID).Limit(1).Find(&results.WarriorLevel)
	sc.DB.Order("day_target asc").Find(&results.Education)

	// Hitung hari berdasarkan StartedAt program aktif (Bukan pretest)
	if !startTime.IsZero() {
		startDate := startTime.Truncate(24 * time.Hour)
		nowDate := time.Now().Truncate(24 * time.Hour)
		days := int(nowDate.Sub(startDate).Hours()/24) + 1
		results.DayCount = days
	} else {
		results.DayCount = 1
	}

	// Fetch completed steps for today
	var completedToday []models.SkinStepLog
	today := time.Now().Truncate(24 * time.Hour)
	sc.DB.Where("user_id = ? AND created_at >= ?", userID, today).Find(&completedToday)
	for _, log := range completedToday {
		results.CompletedStepsToday = append(results.CompletedStepsToday, log.RoutineID)
	}

	// --- DYNAMIC CONFIGURATION (Superadmin adjustable) ---
	var cfgAffirmations models.PlatformConfig
	if err := sc.DB.Where("key = ?", "skin_journey_affirmations").First(&cfgAffirmations).Error; err == nil && cfgAffirmations.Value != "" {
		json.Unmarshal([]byte(cfgAffirmations.Value), &results.Affirmations)
	}

	// Fallback jika belum diatur di config
	if len(results.Affirmations) == 0 {
		results.Affirmations = []string{
			"Kulitmu tidak rusak, dia hanya sedang beristirahat untuk lebih kuat.",
			"Terima kasih sudah bertahan hari ini. Proses penyembuhan memang tidak instan, tapi kamu sudah selangkah lebih dekat.",
			"I am healing everyday.",
			"Setiap jerawat yang sembuh adalah bukti kekuatan kulitmu.",
			"Hargai setiap perubahan kecil pada kulitmu, karena itu adalah progres.",
		}
	}

	// Dynamic Voucher & Ritual
	var cfgVoucherCode, cfgVoucherMsg, cfgRitual models.PlatformConfig
	sc.DB.Where("key = ?", "skin_journey_voucher_code").First(&cfgVoucherCode)
	sc.DB.Where("key = ?", "skin_journey_voucher_message").First(&cfgVoucherMsg)
	sc.DB.Where("key = ?", "skin_journey_ritual_instruction").First(&cfgRitual)

	if results.DayCount >= 25 {
		results.Voucher = cfgVoucherCode.Value
		if results.Voucher == "" { results.Voucher = "AKUGLOW25" }
		
		results.VoucherMessage = cfgVoucherMsg.Value
		if results.VoucherMessage == "" { 
			results.VoucherMessage = "Kamu sudah berjuang 25 hari! Ini diskon 5% untuk stok bulan depan agar perjalananmu tidak terputus." 
		}
	}

	// Completion Reward (Voucher Kelulusan)
	if results.IsCompleted {
		var cfgGradVoucher, cfgGradMsg models.PlatformConfig
		sc.DB.Where("key = ?", "skin_journey_grad_voucher_code").First(&cfgGradVoucher)
		sc.DB.Where("key = ?", "skin_journey_grad_voucher_message").First(&cfgGradMsg)

		results.Voucher = cfgGradVoucher.Value
		if results.Voucher == "" { results.Voucher = "GLOWGRADUATE" }
		
		results.VoucherMessage = cfgGradMsg.Value
		if results.VoucherMessage == "" { 
			results.VoucherMessage = "SELAMAT! Kamu telah lulus Skin Journey. Gunakan kode GLOWGRADUATE untuk diskon 15% pada pembelian berikutnya sebagai hadiah kelulusanmu! 🎓✨" 
		}
	}

	// Fetch Photos for Before vs After
	var firstProgress, lastProgress models.SkinProgress
	sc.DB.Where("user_id = ?", userID).Order("created_at asc").First(&firstProgress)
	sc.DB.Where("user_id = ?", userID).Order("created_at desc").First(&lastProgress)
	
	results.FirstPhoto = firstProgress.SelfieURL
	results.LastPhoto = lastProgress.SelfieURL

	// Calculate Consistency Score (based on journal count since program start)
	var journalCount int64
	sc.DB.Model(&models.SkinJournal{}).Where("user_id = ? AND created_at >= ?", userID, startTime).Count(&journalCount)
	// Example: total days since start vs journal count
	if results.DayCount > 0 {
		results.ConsistencyScore = int((journalCount * 100) / int64(results.DayCount))
		if results.ConsistencyScore > 100 { results.ConsistencyScore = 100 }
	}

	results.RitualInstruction = cfgRitual.Value
	if results.RitualInstruction == "" {
		results.RitualInstruction = "Sambil mengoleskan krim ini, ucapkan terimakasih kulitku sudah bertahan sejauh ini selama 60 detik."
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
	
	// Set DayNumber based on PreTest creation date
	var pretest models.SkinPreTest
	if err := sc.DB.Where("user_id = ?", userID).Order("created_at desc").First(&pretest).Error; err == nil {
		diff := time.Since(pretest.CreatedAt)
		journal.DayNumber = int(diff.Hours()/24) + 1
	} else {
		journal.DayNumber = 1
	}

	if err := sc.DB.Create(&journal).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create journal")
		return
	}

	// Update Warrior Level (Hanya jika belum kirim jurnal hari ini agar tidak eksploitasi EXP)
	var countToday int64
	today := time.Now().Truncate(24 * time.Hour)
	sc.DB.Model(&models.SkinJournal{}).Where("user_id = ? AND created_at >= ?", userID, today).Count(&countToday)
	
	giveExp := countToday <= 1 // Termasuk yang barusan dibuat
	sc.updateWarriorExperience(userID, 10, giveExp)

	utils.JSONResponse(w, http.StatusCreated, journal)
}

func (sc *SkinController) updateWarriorExperience(userID string, expToAdd int, giveExp bool) {
	var isJournal bool = false
	// check if this is from journal for stats
	if expToAdd == 10 { isJournal = true }
	
	var level models.SkinWarriorLevel
	err := sc.DB.Where("user_id = ?", userID).First(&level).Error
	if err != nil {
		level = models.SkinWarriorLevel{UserID: userID, LevelName: "Novice", Experience: 0}
		sc.DB.Create(&level)
	}

	if giveExp {
		level.Experience += expToAdd
	}
	if isJournal {
		level.TotalJournals += 1
	}

	// Dynamic Leveling Logic
	if level.Experience >= 1500 {
		level.LevelName = "Elite"
	} else if level.Experience >= 500 {
		level.LevelName = "Warrior"
	} else if level.Experience >= 100 {
		level.LevelName = "Survivor"
	} else {
		level.LevelName = "Novice"
	}

	sc.DB.Save(&level)
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
		if (progress.WeekNumber < 1) { progress.WeekNumber = 1 }
	}

	// --- FOR TESTING: Auto-increment week if already uploaded today ---
	var countToday int64
	sc.DB.Model(&models.SkinProgress{}).Where("user_id = ? AND created_at >= ?", userID, time.Now().Truncate(24*time.Hour)).Count(&countToday)
	if countToday > 0 {
		progress.WeekNumber += int(countToday)
	}
	// ------------------------------------------------------------------

	/* --- TEMPORARILY DISABLED FOR TESTING ---
	var existingThisWeek models.SkinProgress
	err := sc.DB.Where("user_id = ? AND week_number = ?", userID, progress.WeekNumber).First(&existingThisWeek).Error
	if err == nil {
		utils.JSONError(w, http.StatusConflict, fmt.Sprintf(
			"Kamu sudah upload progres minggu ke-%d! Tunggu minggu depan ya 💪",
			progress.WeekNumber,
		))
		return
	}
	*/

	if err := sc.DB.Create(&progress).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to save progress: "+err.Error())
		return
	}

	// Update Warrior Level (50 exp for weekly progress)
	sc.updateWarriorExperience(userID, 50, false)

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

	// --- WEEKLY LOCK CHECK (Save AI Tokens) ---
	userID, _ := r.Context().Value("user_id").(string)
	if userID != "" {
		/* --- TEMPORARILY DISABLED FOR TESTING ---
		var pretest models.SkinPreTest
		var weekNumber int = 1
		if err := sc.DB.Where("user_id = ?", userID).First(&pretest).Error; err == nil {
			daysSinceStart := int(time.Since(pretest.CreatedAt).Hours() / 24)
			weekNumber = (daysSinceStart / 7) + 1
		}
		*/

		/* --- TEMPORARILY DISABLED FOR TESTING ---
		var existingThisWeek models.SkinProgress
		if err := sc.DB.Where("user_id = ? AND week_number = ?", userID, weekNumber).First(&existingThisWeek).Error; err == nil {
			utils.JSONError(w, http.StatusConflict, fmt.Sprintf("Kamu sudah upload progres minggu ke-%d! Tunggu minggu depan ya 💪", weekNumber))
			return
		}
		*/
	}
	// ------------------------------------------

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

	// ── Real AI Analysis via OpenAI Vision (Dynamic Stage: analysis) ────────────────────
	result, err := sc.SkinAI.AnalyzeStage("analysis", nil, imageBytes)
	if err != nil {
		log.Printf("⚠️ [SkinJourney] AI Analysis failed: %v", err)
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

	log.Printf("✨ [SkinJourney] AI Analysis Result: %s", string(resBytes))
	log.Printf("🖼️ [SkinJourney] Photo URL: %s", photoURL)

	// Auto-save/update UserSkinJourney Profile
	if userID != "" {
		var userJourney models.UserSkinJourney
		sc.DB.Where("user_id = ?", userID).First(&userJourney)
		userJourney.UserID = userID
		userJourney.SkinProfileJSON = string(resBytes)
		sc.DB.Save(&userJourney)
	}

	utils.JSONResponse(w, http.StatusOK, resultMap)
}

// SetUserProgram - User memilih program setelah analisis
func (sc *SkinController) SetUserProgram(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ProgramID uint `json:"program_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	userID, _ := r.Context().Value("user_id").(string)
	
	// [CRITICAL FIX] Use direct Table update to ensure boolean synchronization
	var userJourney models.UserSkinJourney
	err := sc.DB.Where("user_id = ?", userID).First(&userJourney).Error
	
	updateData := map[string]interface{}{
		"program_id":   input.ProgramID,
		"started_at":   time.Now(),
		"current_week": 1,
		"is_completed": false,
	}

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("🆕 [SkinJourney] Creating fresh journey for user %s", userID)
			userJourney = models.UserSkinJourney{
				UserID:      userID,
				ProgramID:   input.ProgramID,
				StartedAt:   time.Now(),
				CurrentWeek: 1,
				IsCompleted: false,
			}
			if err := sc.DB.Create(&userJourney).Error; err != nil {
				utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat journey baru")
				return
			}
		} else {
			utils.JSONError(w, http.StatusInternalServerError, "Database error")
			return
		}
	} else {
		log.Printf("🔄 [SkinJourney] Forcing reset of existing journey for user %s to program %d", userID, input.ProgramID)
		// Use Table().Where() to bypass model instance issues
		if err := sc.DB.Table("user_skin_journeys").Where("user_id = ?", userID).Updates(updateData).Error; err != nil {
			utils.JSONError(w, http.StatusInternalServerError, "Gagal memperbarui program")
			return
		}
	}

	// [Point 3] Wipe all logs for this user to prevent state pollution from old programs
	sc.DB.Where("user_id = ?", userID).Delete(&models.SkinStepLog{})
	sc.DB.Where("user_id = ?", userID).Delete(&models.SkinProgress{})

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Program berhasil diaktifkan! ✨"})
}

// MarkStepComplete - Menandai langkah rutin sebagai selesai harian
func (sc *SkinController) MarkStepComplete(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RoutineID uint `json:"routine_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	userID, _ := r.Context().Value("user_id").(string)
	
	// Check if already completed today
	var existing models.SkinStepLog
	today := time.Now().Truncate(24 * time.Hour)
	err := sc.DB.Where("user_id = ? AND routine_id = ? AND created_at >= ?", userID, input.RoutineID, today).First(&existing).Error
	if err == nil {
		utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Sudah dikerjakan hari ini"})
		return
	}

	logEntry := models.SkinStepLog{
		UserID:    userID,
		RoutineID: input.RoutineID,
		Completed: true,
		CreatedAt: time.Now(),
	}

	if err := sc.DB.Create(&logEntry).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan progres")
		return
	}

	// Reward 5 EXP for each step completed
	sc.updateWarriorExperience(userID, 5, false)

	utils.JSONResponse(w, http.StatusCreated, map[string]string{"message": "Langkah selesai! +5 EXP"})
}

// GetUserRoutine - Ambil langkah rutin harian secara dinamis
func (sc *SkinController) GetUserRoutine(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)
	var userJourney models.UserSkinJourney
	if err := sc.DB.Preload("Program").Where("user_id = ?", userID).First(&userJourney).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Kamu belum memulai journey. Silakan analisis kulit dulu.")
		return
	}

	var routines []models.SkinJourneyRoutine
	sc.DB.Preload("Step").Where("program_id = ?", userJourney.ProgramID).Order("id asc").Find(&routines)

	// Fetch dynamic product recommendations for each step based on skin profile
	var profile models.SkinAnalysisResult
	json.Unmarshal([]byte(userJourney.SkinProfileJSON), &profile)

	type StepDetail struct {
		models.SkinJourneyRoutine
		RecommendedProduct *models.Product `json:"recommended_product,omitempty"`
	}

	var response []StepDetail
	for _, r := range routines {
		var mapping models.SkinJourneyProductMapping
		// Priority matching: SkinType + SkinConcern + StepType
		sc.DB.Preload("Product").
			Where("step_type = ? AND (skin_type = ? OR skin_concern = ?)", r.Step.Name, profile.SkinType, profile.PrimaryConcern).
			Order("priority desc").
			First(&mapping)

		var recProduct *models.Product
		if mapping.ProductID != "" {
			recProduct = &mapping.Product
		}

		response = append(response, StepDetail{
			SkinJourneyRoutine: r,
			RecommendedProduct: recProduct,
		})
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"program":  userJourney.Program,
		"week":     userJourney.CurrentWeek,
		"routines": response,
	})
}

// GetProgramRecommendations - AI merekomendasikan program berdasarkan profil
func (sc *SkinController) GetProgramRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)
	var userJourney models.UserSkinJourney
	if err := sc.DB.Where("user_id = ?", userID).First(&userJourney).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Profil kulit tidak ditemukan. Silakan analisis dulu.")
		return
	}

	params := map[string]string{
		"profile": userJourney.SkinProfileJSON,
	}

	result, err := sc.SkinAI.AnalyzeStage("set_program", params, nil)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mendapatkan rekomendasi program")
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
}

// GetProductUsageInstructions - AI memberikan cara pakai produk yang detail
func (sc *SkinController) GetProductUsageInstructions(w http.ResponseWriter, r *http.Request) {
	productName := r.URL.Query().Get("product_name")
	if productName == "" {
		utils.JSONError(w, http.StatusBadRequest, "Nama produk diperlukan")
		return
	}

	params := map[string]string{
		"product": productName,
	}

	result, err := sc.SkinAI.AnalyzeStage("cara_pakai", params, nil)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mendapatkan cara pakai")
		return
	}

	utils.JSONResponse(w, http.StatusOK, result)
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

// --- DYNAMIC JOURNEY ADMIN CRUD (see Flow implementations below) ---

// FinishJourney - User manually marks program as completed
func (sc *SkinController) FinishJourney(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)

	var userJourney models.UserSkinJourney
	if err := sc.DB.Where("user_id = ?", userID).First(&userJourney).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Journey tidak ditemukan")
		return
	}

	if userJourney.IsCompleted {
		utils.JSONError(w, http.StatusBadRequest, "Program sudah diselesaikan")
		return
	}

	if err := sc.DB.Model(&userJourney).Update("is_completed", true).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyelesaikan program")
		return
	}

	sc.DB.Preload("Program").First(&userJourney, userJourney.ID)

	var warrior models.SkinWarriorLevel
	sc.DB.Where("user_id = ?", userID).First(&warrior)

	history := models.UserSkinJourneyHistory{
		UserID:          userID,
		ProgramID:       userJourney.ProgramID,
		ProgramName:     userJourney.Program.Name,
		StartedAt:       userJourney.StartedAt,
		FinishedAt:      time.Now(),
		DayCount:        int(time.Since(userJourney.StartedAt).Hours()/24) + 1,
		FinalRank:       warrior.LevelName,
		SkinProfileJSON: userJourney.SkinProfileJSON,
	}
	var totalSteps, completedSteps int64
	sc.DB.Model(&models.SkinJourneyRoutine{}).Where("program_id = ?", userJourney.ProgramID).Count(&totalSteps)
	expectedTotalSteps := int64(history.DayCount) * totalSteps
	sc.DB.Model(&models.SkinStepLog{}).Where("user_id = ? AND created_at >= ?", userID, userJourney.StartedAt).Count(&completedSteps)
	if expectedTotalSteps > 0 {
		history.ConsistencyScore = int((float64(completedSteps) / float64(expectedTotalSteps)) * 100)
		if history.ConsistencyScore > 100 { history.ConsistencyScore = 100 }
	}
	sc.DB.Create(&history)
	sc.DB.Model(&warrior).Update("experience", warrior.Experience+500)

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message": "Selamat! Program kamu telah selesai! Kamu mendapatkan +500 XP Kelulusan! 🎓✨",
	})
}

// GetUserHistories - Ambil riwayat program yang sudah selesai untuk user saat ini
func (sc *SkinController) GetUserHistories(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)
	var histories []models.UserSkinJourneyHistory
	sc.DB.Where("user_id = ?", userID).Order("finished_at desc").Find(&histories)
	utils.JSONResponse(w, http.StatusOK, histories)
}

func (sc *SkinController) AdminGetHistories(w http.ResponseWriter, r *http.Request) {
	var histories []models.UserSkinJourneyHistory
	sc.DB.Order("finished_at desc").Find(&histories)
	utils.JSONResponse(w, http.StatusOK, histories)
}

func (sc *SkinController) AdminSaveProductMapping(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyProductMapping
	json.NewDecoder(r.Body).Decode(&item)
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminGetAIConfigs(w http.ResponseWriter, r *http.Request) {
	var list []models.SkinJourneyAIConfig
	sc.DB.Find(&list)
	utils.JSONResponse(w, http.StatusOK, list)
}

func (sc *SkinController) AdminUpdateAIConfig(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyAIConfig
	json.NewDecoder(r.Body).Decode(&item)
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

// GetPrograms - Ambil semua program yang tersedia (untuk user)
func (sc *SkinController) GetPrograms(w http.ResponseWriter, r *http.Request) {
	var programs []models.SkinJourneyProgram
	sc.DB.Where("is_active = ? AND status = ?", true, "active").Order("level asc").
		Preload("Phases").Preload("Benefits").Preload("Warnings").Preload("FAQs").Preload("ProductSteps.Product").
		Find(&programs)
	utils.JSONResponse(w, http.StatusOK, programs)
}

// ═══════════════════════════════════════════════════════════════
// FLOW 1 — BUAT PROGRAM (Enhanced Admin CRUD)
// ═══════════════════════════════════════════════════════════════

// AdminGetPrograms - List all programs with status filter
func (sc *SkinController) AdminGetPrograms(w http.ResponseWriter, r *http.Request) {
	statusFilter := r.URL.Query().Get("status") // draft, active, archived
	var list []models.SkinJourneyProgram
	q := sc.DB.Order("created_at desc")
	if statusFilter != "" {
		q = q.Where("status = ?", statusFilter)
	}
	q.Find(&list)
	utils.JSONResponse(w, http.StatusOK, list)
}

// AdminGetProgramDetail - Get full program with all sub-records (phases, benefits, warnings, faqs, product steps)
func (sc *SkinController) AdminGetProgramDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Program ID diperlukan")
		return
	}
	var program models.SkinJourneyProgram
	err := sc.DB.
		Preload("Phases", func(db *gorm.DB) *gorm.DB { return db.Order("\"order\" asc") }).
		Preload("Benefits", func(db *gorm.DB) *gorm.DB { return db.Order("\"order\" asc") }).
		Preload("Warnings", func(db *gorm.DB) *gorm.DB { return db.Order("\"order\" asc") }).
		Preload("FAQs", func(db *gorm.DB) *gorm.DB { return db.Order("\"order\" asc") }).
		Preload("ProductSteps", func(db *gorm.DB) *gorm.DB { return db.Order("step_number asc") }).
		Preload("ProductSteps.Product").
		First(&program, id).Error
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "Program tidak ditemukan")
		return
	}
	utils.JSONResponse(w, http.StatusOK, program)
}

// AdminSaveProgram - Create or update program (FLOW 1)
func (sc *SkinController) AdminSaveProgram(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyProgram
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}
	if item.Name == "" {
		utils.JSONError(w, http.StatusBadRequest, "Nama program wajib diisi")
		return
	}
	// Generate slug from name if not set
	if item.Slug == "" {
		ts := time.Now().Unix()
		item.Slug = fmt.Sprintf("%s-%d", sanitizeSlug(item.Name), ts)
	}
	if item.Status == "" {
		item.Status = "draft"
	}
	// Get admin user from context
	if userID, ok := r.Context().Value("user_id").(string); ok && item.CreatedBy == "" {
		item.CreatedBy = userID
	}
	item.UpdatedAt = time.Now()
	if err := sc.DB.Save(&item).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan program: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Program berhasil disimpan",
		"data":    item,
		"progress": map[string]interface{}{
			"completed": []string{"✅ Flow 1: Program Created"},
			"next":      "Flow 2: Add Detailed Description",
		},
	})
}

// AdminDeleteProgram - Delete program and all sub-records
func (sc *SkinController) AdminDeleteProgram(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID diperlukan")
		return
	}
	sc.DB.Where("program_id = ?", id).Delete(&models.SkinJourneyPhase{})
	sc.DB.Where("program_id = ?", id).Delete(&models.SkinJourneyBenefit{})
	sc.DB.Where("program_id = ?", id).Delete(&models.SkinJourneyWarning{})
	sc.DB.Where("program_id = ?", id).Delete(&models.SkinJourneyFAQ{})
	sc.DB.Where("program_id = ?", id).Delete(&models.SkinJourneyProductStep{})
	sc.DB.Delete(&models.SkinJourneyProgram{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Program dan semua data terkait berhasil dihapus"})
}

// AdminPublishProgram - Change program status to active
func (sc *SkinController) AdminPublishProgram(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if err := sc.DB.Model(&models.SkinJourneyProgram{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": "active", "is_active": true, "updated_at": time.Now()}).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mempublish program")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Program berhasil dipublish dan siap digunakan user"})
}

// AdminArchiveProgram - Change program status to archived
func (sc *SkinController) AdminArchiveProgram(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Model(&models.SkinJourneyProgram{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": "archived", "is_active": false, "updated_at": time.Now()})
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Program diarsipkan"})
}

// sanitizeSlug - convert name to url-friendly slug
func sanitizeSlug(name string) string {
	result := ""
	for _, ch := range strings.ToLower(name) {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			result += string(ch)
		} else if ch == ' ' || ch == '-' {
			result += "-"
		}
	}
	return result
}

// ═══════════════════════════════════════════════════════════════
// FLOW 2 — PENJELASAN DETAIL (Phases, Benefits, Warnings, FAQs)
// ═══════════════════════════════════════════════════════════════

func (sc *SkinController) AdminSavePhase(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyPhase
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format tidak valid")
		return
	}
	if item.ProgramID == 0 { utils.JSONError(w, http.StatusBadRequest, "program_id wajib"); return }
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminDeletePhase(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyPhase{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func (sc *SkinController) AdminSaveBenefit(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyBenefit
	json.NewDecoder(r.Body).Decode(&item)
	if item.ProgramID == 0 { utils.JSONError(w, http.StatusBadRequest, "program_id wajib"); return }
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminDeleteBenefit(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyBenefit{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func (sc *SkinController) AdminSaveWarning(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyWarning
	json.NewDecoder(r.Body).Decode(&item)
	if item.ProgramID == 0 { utils.JSONError(w, http.StatusBadRequest, "program_id wajib"); return }
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminDeleteWarning(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyWarning{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func (sc *SkinController) AdminSaveFAQ(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyFAQ
	json.NewDecoder(r.Body).Decode(&item)
	if item.ProgramID == 0 { utils.JSONError(w, http.StatusBadRequest, "program_id wajib"); return }
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminDeleteFAQ(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyFAQ{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "deleted"})
}

// ═══════════════════════════════════════════════════════════════
// FLOW 3 & 4 — PRODUCT STEPS WITH USAGE INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════

func (sc *SkinController) AdminGetProductSteps(w http.ResponseWriter, r *http.Request) {
	programID := r.URL.Query().Get("program_id")
	if programID == "" {
		utils.JSONError(w, http.StatusBadRequest, "program_id diperlukan")
		return
	}
	var steps []models.SkinJourneyProductStep
	sc.DB.Where("program_id = ?", programID).Preload("Product").Order("step_number asc").Find(&steps)
	utils.JSONResponse(w, http.StatusOK, steps)
}

func (sc *SkinController) AdminSaveProductStep(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyProductStep
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format tidak valid")
		return
	}
	if item.ProgramID == 0 {
		utils.JSONError(w, http.StatusBadRequest, "program_id wajib diisi")
		return
	}
	if item.StepName == "" {
		utils.JSONError(w, http.StatusBadRequest, "step_name wajib diisi")
		return
	}
	if err := sc.DB.Save(&item).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan product step: "+err.Error())
		return
	}
	// Reload with product info
	sc.DB.Preload("Product").First(&item, item.ID)
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Product step berhasil disimpan",
		"data":    item,
	})
}

func (sc *SkinController) AdminDeleteProductStep(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "ID diperlukan")
		return
	}
	sc.DB.Delete(&models.SkinJourneyProductStep{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Product step dihapus"})
}

// ═══════════════════════════════════════════════════════════════
// LEGACY ADMIN CRUD (Steps, Routines, Mappings — Delete methods)
// ═══════════════════════════════════════════════════════════════

func (sc *SkinController) AdminGetSteps(w http.ResponseWriter, r *http.Request) {
	var list []models.SkinJourneyStep
	sc.DB.Where("is_active = ?", true).Order("\"order\" asc").Find(&list)
	utils.JSONResponse(w, http.StatusOK, list)
}

func (sc *SkinController) AdminSaveStep(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyStep
	json.NewDecoder(r.Body).Decode(&item)
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminDeleteStep(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyStep{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Step dihapus"})
}

func (sc *SkinController) AdminGetRoutines(w http.ResponseWriter, r *http.Request) {
	programID := r.URL.Query().Get("program_id")
	var list []models.SkinJourneyRoutine
	q := sc.DB.Preload("Step")
	if programID != "" { q = q.Where("program_id = ?", programID) }
	q.Find(&list)
	utils.JSONResponse(w, http.StatusOK, list)
}

func (sc *SkinController) AdminSaveRoutine(w http.ResponseWriter, r *http.Request) {
	var item models.SkinJourneyRoutine
	json.NewDecoder(r.Body).Decode(&item)
	sc.DB.Save(&item)
	utils.JSONResponse(w, http.StatusOK, item)
}

func (sc *SkinController) AdminDeleteRoutine(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyRoutine{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Routine dihapus"})
}

func (sc *SkinController) AdminGetProductMappings(w http.ResponseWriter, r *http.Request) {
	var list []models.SkinJourneyProductMapping
	sc.DB.Preload("Product").Find(&list)
	utils.JSONResponse(w, http.StatusOK, list)
}

func (sc *SkinController) AdminDeleteProductMapping(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sc.DB.Delete(&models.SkinJourneyProductMapping{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Mapping dihapus"})
}
