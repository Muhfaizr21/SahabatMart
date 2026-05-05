package services

import (
	"SahabatMart/backend/models"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"

	"gorm.io/gorm"
)

type SkinAIService struct {
	DB *gorm.DB
}

func NewSkinAIService(db *gorm.DB) *SkinAIService {
	return &SkinAIService{DB: db}
}

// getAPIKey retrieves OpenAI API key from DB config or environment fallback
func (s *SkinAIService) getAPIKey() string {
	var cfg models.PlatformConfig
	if err := s.DB.Where("key = ?", "skin_ai_openai_key").First(&cfg).Error; err == nil && cfg.Value != "" {
		return cfg.Value
	}
	return os.Getenv("OPENAI_API_KEY")
}

// isAIEnabled checks if AI skin analysis is enabled in platform config
func (s *SkinAIService) isAIEnabled() bool {
	var cfg models.PlatformConfig
	if err := s.DB.Where("key = ?", "skin_ai_enabled").First(&cfg).Error; err == nil {
		return cfg.Value == "true"
	}
	return false
}

// getModel retrieves the AI model to use from config
func (s *SkinAIService) getModel() string {
	var cfg models.PlatformConfig
	if err := s.DB.Where("key = ?", "skin_ai_model").First(&cfg).Error; err == nil && cfg.Value != "" {
		return cfg.Value
	}
	return "gpt-4o"
}

// getProductKnowledge dynamically reads the Akuglow product knowledge from DB.
// This allows admins to update the knowledge base without redeploying the app.
func (s *SkinAIService) getProductKnowledge() string {
	var cfg models.PlatformConfig
	if err := s.DB.Where("key = ?", "skin_ai_product_knowledge").First(&cfg).Error; err == nil && cfg.Value != "" {
		return cfg.Value
	}
	log.Println("⚠️ [SkinAI] 'skin_ai_product_knowledge' not found in DB, using empty knowledge base.")
	return ""
}

// buildSystemRole builds the final system role by injecting product knowledge
// into the template from the stage config. Uses {{product_knowledge}} placeholder.
func (s *SkinAIService) buildSystemRole(templateRole string) string {
	knowledge := s.getProductKnowledge()
	if knowledge == "" {
		return templateRole
	}
	return strings.ReplaceAll(templateRole, "{{product_knowledge}}", knowledge)
}

// --- Prompt Templates ---
// These are TEMPLATES only. Product knowledge is injected dynamically from DB.
// Do NOT hardcode product details here. Use {{product_knowledge}} placeholder.

const systemRoleTemplate = `Anda adalah "Sahabat Glow", AI Skincare Expert untuk platform Akuglow (SahabatMart).
Analisis foto kulit wajah secara mendalam, teknis, dan empatis.
Bahasa: Bahasa Indonesia yang hangat dan memotivasi.

=== PRODUCT KNOWLEDGE (DARI DATABASE) ===
{{product_knowledge}}
==========================================

ATURAN WAJIB:
- Selalu rekomendasikan produk Akuglow yang SPESIFIK sesuai kondisi kulit yang terdeteksi.
- Jelaskan MENGAPA bahan aktif spesifik dari produk itu cocok untuk kondisi kulitnya.
- Respon HANYA dalam format JSON valid. DILARANG menambah teks di luar JSON.`

const defaultPromptTemplate = `Analisis foto kulit wajah ini secara mendetail untuk sistem rekomendasi Akuglow.

Identifikasi:
1. Jenis & tingkat keparahan jerawat (meradang vs tidak meradang, jumlah estimasi)
2. Kondisi skin barrier (tanda kemerahan, kulit tipis/perih, iritasi)
3. Tingkat hidrasi (kering, dehidrasi, berminyak, kombinasi)
4. Flek, hiperpigmentasi, atau bekas jerawat yang terlihat
5. Tekstur kulit (halus, bruntusan, kasar, pori besar)

Berdasarkan analisis DAN product knowledge Akuglow di atas, berikan rekomendasi yang SPESIFIK.

Kembalikan HANYA JSON berikut (tanpa markdown, tanpa teks lain):
{
  "skin_score": <integer 1-10, 10=sangat sehat>,
  "emotion_score": <integer 1-10, 10=sangat positif>,
  "redness": <integer 0-100, persentase kemerahan>,
  "acne_count": <integer, estimasi jumlah jerawat/blemish>,
  "moisture": <integer 0-100, tingkat hidrasi>,
  "skin_type": "<oily/dry/combination/normal/sensitive>",
  "skin_tone": "<fair/medium/tan/dark>",
  "primary_concern": "<Masalah utama dalam Bahasa Indonesia, contoh: Jerawat Meradang & Barrier Rusak>",
  "summary": "<3-4 kalimat analisis mendalam & empatis. Sebutkan kondisi barrier dan jelaskan mengapa produk Akuglow tertentu menjadi solusi kunci berdasarkan kandungannya.>",
  "recommendations": ["Akuglow Gentle Brightening Facial Foam", "Akuglow Calming Barrier Moisturizer", "Akuglow Day Cream"],
  "positive_notes": "<Satu observasi positif spesifik tentang kondisi kulit user>",
  "healing_message": "<Pesan motivasi 1-2 kalimat yang mendukung user untuk konsisten dengan Akuglow>"
}`

// AnalyzeImageFromFile reads file and delegates to AnalyzeImageBytes
func (s *SkinAIService) AnalyzeImageFromFile(filePath string) (*models.SkinAnalysisResult, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca file: %w", err)
	}
	return s.AnalyzeImageBytes(data)
}

// AnalyzeStage sends image bytes and context data to OpenAI Vision using dynamic stage config.
// Product knowledge is loaded from DB and injected into the system role at runtime.
func (s *SkinAIService) AnalyzeStage(stage string, params map[string]string, imageData []byte) (*models.SkinAnalysisResult, error) {
	var cfg models.SkinJourneyAIConfig
	if err := s.DB.Where("stage = ?", stage).First(&cfg).Error; err != nil {
		log.Printf("⚠️ [SkinAI] Stage config '%s' not found, using default templates", stage)
		cfg.SystemRole = systemRoleTemplate
		cfg.PromptBody = defaultPromptTemplate
		cfg.Temperature = 0.1
	}

	// Inject product knowledge from DB into system role template
	builtSystemRole := s.buildSystemRole(cfg.SystemRole)

	// Replace any additional template parameters in the prompt body
	prompt := cfg.PromptBody
	for k, v := range params {
		prompt = strings.ReplaceAll(prompt, "{{"+k+"}}", v)
	}

	aiEnabled := s.isAIEnabled()
	if !aiEnabled {
		log.Println("ℹ️ [SkinAI] AI disabled in config, using smart mock.")
		return s.smartMockAnalysis(imageData), nil
	}

	apiKey := s.getAPIKey()
	if apiKey == "" {
		log.Println("ℹ️ [SkinAI] No API key configured, using smart mock.")
		return s.smartMockAnalysis(imageData), nil
	}

	model := s.getModel()
	b64Image := ""
	if imageData != nil {
		b64Image = base64.StdEncoding.EncodeToString(imageData)
	}

	contentParts := []map[string]interface{}{
		{
			"type": "text",
			"text": prompt,
		},
	}

	if b64Image != "" {
		contentParts = append(contentParts, map[string]interface{}{
			"type": "image_url",
			"image_url": map[string]string{
				"url":    "data:image/jpeg;base64," + b64Image,
				"detail": "high",
			},
		})
	}

	payload := map[string]interface{}{
		"model": model,
		"messages": []map[string]interface{}{
			{
				"role":    "system",
				"content": builtSystemRole,
			},
			{
				"role":    "user",
				"content": contentParts,
			},
		},
		"max_tokens":  1500,
		"temperature": cfg.Temperature,
		"response_format": map[string]string{
			"type": "json_object",
		},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("⚠️ [SkinAI] HTTP error: %v. Falling back to smart mock.", err)
		return s.smartMockAnalysis(imageData), nil
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("OpenAI API error: %s", string(respBody))
	}

	var openAIResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	json.Unmarshal(respBody, &openAIResp)

	if len(openAIResp.Choices) == 0 {
		log.Println("⚠️ [SkinAI] No choices returned. Falling back to smart mock.")
		return s.smartMockAnalysis(imageData), nil
	}

	content := openAIResp.Choices[0].Message.Content
	log.Printf("🤖 [SkinAI] Raw OpenAI Content: %s", content)

	var result models.SkinAnalysisResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		extracted := extractJSON(content)
		log.Printf("🤖 [SkinAI] Extracted JSON fallback: %s", extracted)
		json.Unmarshal([]byte(extracted), &result)
	}

	if result.Summary == "" {
		log.Printf("⚠️ [SkinAI] Empty summary after parse. Falling back to smart mock.")
		return s.smartMockAnalysis(imageData), nil
	}

	result.AIProvider = "openai/" + model
	result.IsMock = false
	return &result, nil
}

// AnalyzeImageBytes is kept for backward compatibility, now uses AnalyzeStage
func (s *SkinAIService) AnalyzeImageBytes(imageData []byte) (*models.SkinAnalysisResult, error) {
	return s.AnalyzeStage("analysis", nil, imageData)
}

// smartMockAnalysis returns a realistic analysis based on image characteristics.
// Recommendations always reference Akuglow products for consistency.
// The specific "hero" product is highlighted based on the detected skin condition.
func (s *SkinAIService) smartMockAnalysis(imageData []byte) *models.SkinAnalysisResult {
	// Derive a pseudo-random but consistent seed from image bytes
	size := len(imageData)
	seed := int64(size)
	if size > 100 {
		for i := 0; i < 10; i++ {
			seed += int64(imageData[size/10*i]) * int64(i+1)
		}
	}
	rng := rand.New(rand.NewSource(seed))

	redness := 5 + rng.Intn(65)  // 5-70
	moisture := 25 + rng.Intn(60) // 25-85
	acneCount := rng.Intn(15)     // 0-14

	skinScore := 10 - (redness / 15) - (acneCount / 4)
	if skinScore < 1 {
		skinScore = 1
	}
	if skinScore > 10 {
		skinScore = 10
	}

	skinTypes := []string{"oily", "combination", "normal", "dry", "sensitive"}
	skinTones := []string{"fair", "medium", "tan", "dark"}
	skinType := skinTypes[rng.Intn(len(skinTypes))]
	skinTone := skinTones[rng.Intn(len(skinTones))]

	// All cases recommend the full set, but highlight the HERO product for the condition
	recs := []string{
		"Akuglow Gentle Brightening Facial Foam",
		"Akuglow Calming Barrier Moisturizer",
		"Akuglow Day Cream",
	}

	var primaryConcern, summary, positiveNotes, healingMessage string

	switch {
	case redness > 50 && acneCount > 7:
		primaryConcern = "Jerawat Meradang & Skin Barrier Rusak"
		summary = fmt.Sprintf(
			"Terdeteksi sekitar %d titik jerawat meradang dengan tingkat kemerahan %d%%. Kondisi ini menunjukkan skin barrier sedang sangat lemah dan butuh recovery segera. HERO-mu adalah **Akuglow Calming Barrier Moisturizer** — kandungan Panthenol 5%%-nya bekerja sebagai anti-inflamasi kuat, sementara 5x Ceramide membantu membangun ulang lapisan pelindung kulitmu.",
			acneCount, redness,
		)
		positiveNotes = "Kulitmu memiliki kemampuan regenerasi yang masih aktif — itu pertanda baik untuk proses penyembuhan."
		healingMessage = "Jangan menyerah, Sahabat Glow! Jerawat ini hanya fase sementara. Fokus pada pemulihan barrier dulu, brightening menyusul setelahnya! 💪"

	case redness > 35:
		primaryConcern = "Iritasi & Kemerahan — Barrier Sensitif"
		summary = fmt.Sprintf(
			"Kulit terlihat reaktif dengan kemerahan %d%%. Ini tanda kulit sedang dalam kondisi stres dan barrier-nya melemah. **Akuglow Calming Barrier Moisturizer** dengan 5x Ceramide akan membantu membangun kembali 'benteng' kulitmu, sementara Panthenol 5%% meredakan kemerahan dari dalam.",
			redness,
		)
		positiveNotes = "Warna dasar kulitmu sebenarnya sangat cerah — potensi glowing-nya besar begitu barrier pulih!"
		healingMessage = "Kulitmu lagi minta istirahat dari skincare keras. Berikan kedamaian lewat Akuglow, dan lihat perubahannya! 🌸"

	case moisture < 40:
		primaryConcern = "Dehidrasi & Kulit Kusam"
		summary = fmt.Sprintf(
			"Tingkat kelembapan terdeteksi hanya %d%%. Kulit kusam dan terasa ketarik biasanya karena penumpukan sel kulit mati + kulit yang kekurangan air. **Akuglow Gentle Foam** dengan PHA-nya akan mengangkat sel mati secara lembut, lalu **Calming Barrier Moisturizer** (Hyaluronic + Ceramide + Squalane) mengunci kelembapannya.",
			moisture,
		)
		positiveNotes = "Tekstur dasar kulitmu cukup rata — dengan hidrasi yang tepat, kulitmu bisa glowing dalam waktu singkat."
		healingMessage = "Hidrasi adalah kunci glow. Yuk konsisten dengan Akuglow dan biarkan kulitmu menemukan kilau alaminya! 💧"

	case acneCount > 5:
		primaryConcern = "Bruntusan & Komedo"
		summary = fmt.Sprintf(
			"Terdeteksi sekitar %d titik blemish/bruntusan. Ini umumnya terjadi karena pori tersumbat sel kulit mati. **Akuglow Gentle Foam** dengan PHA (Gluconolactone) adalah solusinya — mengeksfoliasi sel kulit mati secara ultra-lembut tanpa mengiritasi, dibantu brush silicone unik untuk membersihkan hingga ke dalam pori.",
			acneCount,
		)
		positiveNotes = "Kadar minyak wajahmu cukup stabil dan tidak ada tanda-tanda inflamasi serius — ini modal bagus untuk kulit bersih!"
		healingMessage = "Satu langkah kecil setiap hari membawa perubahan besar. Semangat rutinitas Akuglow-nya! ✨"

	default:
		primaryConcern = "Maintenance — Jaga Barrier Tetap Sehat"
		summary = fmt.Sprintf(
			"Luar biasa! Skor kulitmu %d/10 dengan kondisi yang cukup stabil. Kulit sehat pun tetap butuh perlindungan harian. **Akuglow Day Cream** dengan UV Filter + Niacinamide + Arbutin menjaga kulitmu dari paparan sinar matahari yang bisa merusak barrier dan memicu flek.",
			skinScore,
		)
		positiveNotes = "Skin barrier-mu terlihat sehat dan kuat — pertahankan dengan rutinitas yang konsisten!"
		healingMessage = "Kulit sehat adalah investasi jangka panjang. Kamu sudah di jalur yang benar, Sahabat Glow! 🌟"
	}

	return &models.SkinAnalysisResult{
		SkinScore:       skinScore,
		EmotionScore:    rng.Intn(5) + 5, // 5-10
		Redness:         redness,
		AcneCount:       acneCount,
		Moisture:        moisture,
		SkinType:        skinType,
		SkinTone:        skinTone,
		PrimaryConcern:  primaryConcern,
		Summary:         summary,
		Recommendations: recs,
		PositiveNotes:   positiveNotes,
		HealingMessage:  healingMessage,
		AIProvider:      "akuglow/smart-mock-v3",
		IsMock:          true,
	}
}

// extractJSON tries to extract JSON from markdown code blocks or raw text
func extractJSON(s string) string {
	start := -1
	end := -1
	depth := 0
	for i, c := range s {
		if c == '{' {
			if start == -1 {
				start = i
			}
			depth++
		}
		if c == '}' {
			depth--
			if depth == 0 && start != -1 {
				end = i
				break
			}
		}
	}
	if start != -1 && end != -1 && end > start {
		return s[start : end+1]
	}
	return s
}

// truncate returns at most n characters of s
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
