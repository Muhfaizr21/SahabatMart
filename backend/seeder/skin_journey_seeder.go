package seeder

import (
	"akuglow/backend/models"
	"fmt"
	"log"

	"gorm.io/gorm"
)

func SeedSkinJourney(db *gorm.DB) {
	log.Println("🌱 Starting 100% Complete Skin Journey Seeding (Premium Content)...")

	// 1. Seed AI Configs (PRO LEVEL - Highly Detailed)
	seedAIConfigs(db)

	// 2. Seed Community Groups (Engaging Descriptions)
	seedCommunityGroups(db)

	// 3. Seed Generic Library of Steps (Comprehensive)
	seedJourneySteps(db)

	// 4. Seed Programs with Full Lifecycle (The Core Flow)
	seedPrograms(db)

	// 5. Seed Platform Configs for Journey (Rewards & Affirmations)
	seedJourneyConfigs(db)

	log.Println("✅ Skin Journey seeding completed 100% with Premium content.")
}

func seedAIConfigs(db *gorm.DB) {
	configs := []models.SkinJourneyAIConfig{
		{
			Stage:       "analysis",
			PromptTitle: "Face Analysis & Skin Profile (Akuglow Engine V2)",
			SystemRole: `Anda adalah "Sahabat Glow", AI Skincare Expert tercanggih dari Akuglow.
Tugas Anda adalah menganalisis foto wajah dengan akurasi klinis namun tetap memberikan dukungan emosional kepada pengguna.
Gunakan Bahasa Indonesia yang hangat, empatis, dan profesional.

=== PRODUCT KNOWLEDGE AKUGLOW ===
{{product_knowledge}}
==============================

STRUKTUR ANALISIS:
1. Identifikasi Skin Type (Oily/Dry/Comb/Sensitive).
2. Deteksi Skin Concern (Acne, Barrier, Hyperpigmentation, Texture).
3. Hubungkan masalah tersebut dengan bahan aktif dalam produk Akuglow.

ATURAN WAJIB:
- Nama produk Akuglow WAJIB di-bold (**Nama Produk**).
- Respon HANYA dalam JSON valid. DILARANG ada teks di luar JSON.`,
			PromptBody: `{
  "skin_score": 1-10,
  "emotion_score": 1-10,
  "redness": 0-100,
  "acne_count": integer,
  "moisture": 0-100,
  "skin_type": "oily/dry/combination/normal/sensitive",
  "skin_tone": "fair/medium/tan/dark",
  "primary_concern": "Masalah utama (misal: Jerawat Meradang & Barrier Lemah)",
  "summary": "Analisis teknis namun hangat. Jelaskan kondisi barrier saat ini dan bagaimana produk Akuglow akan membantu proses penyembuhan.",
  "recommendations": ["Akuglow Sabun Wajah", "Akuglow Calming Barrier Moisturizer", "Akuglow Krim Siang"],
  "positive_notes": "Sebutkan satu hal positif, misal: 'Area dahi terlihat sangat bersih' atau 'Tekstur kulit di pipi mulai membaik'.",
  "healing_message": "Kalimat penyemangat untuk memulai perjalanan transformasi kulit hari ini."
}`,
		},
		{
			Stage:       "set_program",
			PromptTitle: "Dynamic Program Selector",
			SystemRole:  "Chief Dermatologist. Menentukan rute transformasi kulit terbaik bagi pengguna.",
			PromptBody:  "Analisis profil {{profile}} dan rekomendasikan satu dari 3 program: BARRIER RECOVERY (untuk kulit sensitif/merah), ACNE WARRIOR (untuk jerawat aktif), atau BRIGHTENING ULTIMATE (untuk kusam/flek). Berikan alasan medis singkat.",
		},
	}

	for _, cfg := range configs {
		db.Where("stage = ?", cfg.Stage).FirstOrCreate(&cfg)
	}
}

func seedCommunityGroups(db *gorm.DB) {
	groups := []models.SkinCommunityGroup{
		{Name: "Acne Warrior", Description: "Tempat berkumpulnya para pejuang jerawat. Tidak ada penilaian, hanya dukungan dan solusi nyata.", Icon: "healing"},
		{Name: "Glow Up Squad", Description: "Komunitas pencinta kulit cerah, sehat, dan bercahaya. Bagikan rutinitas harianmu di sini!", Icon: "auto_awesome"},
		{Name: "Sensitive Soul", Description: "Ruang aman untuk Anda yang memiliki kulit reaktif dan mudah iritasi. Belajar tentang barrier bersama.", Icon: "spa"},
		{Name: "Anti-Aging Club", Description: "Investasi masa depan untuk kulit tetap kencang dan awet muda. Tips dari para ahli.", Icon: "history"},
		{Name: "Skincare Newbie", Description: "Baru di dunia skincare? Jangan malu bertanya! Kami semua mulai dari sini.", Icon: "school"},
	}
	for _, g := range groups {
		db.Where("name = ?", g.Name).FirstOrCreate(&g)
	}
}

func seedJourneySteps(db *gorm.DB) {
	steps := []models.SkinJourneyStep{
		{Name: "Double Cleanse", Icon: "water_drop", Description: "Tahap awal pembersihan untuk mengangkat sisa makeup dan sunscreen.", Order: 1},
		{Name: "Pembersih Wajah", Icon: "soap", Description: "Membersihkan pori-pori secara mendalam dengan busa lembut.", Order: 2},
		{Name: "Toner", Icon: "waves", Description: "Menyegarkan dan mengembalikan pH alami kulit.", Order: 3},
		{Name: "Serum Aktif", Icon: "colorize", Description: "Nutrisi konsentrasi tinggi untuk target masalah spesifik.", Order: 4},
		{Name: "Moisturizer", Icon: "spa", Description: "Langkah krusial untuk mengunci kelembapan dan memperbaiki barrier.", Order: 5},
		{Name: "Eye Care", Icon: "visibility", Description: "Perawatan lembut untuk area mata agar terlihat segar.", Order: 6},
		{Name: "Sunscreen", Icon: "light_mode", Description: "Perisai utama dari penuaan dini dan flek akibat sinar UV.", Order: 7},
		{Name: "Night Treatment", Icon: "nightlight", Description: "Membantu regenerasi sel kulit saat Anda beristirahat.", Order: 8},
	}
	for _, s := range steps {
		db.Where("name = ?", s.Name).FirstOrCreate(&s)
	}
}

func seedPrograms(db *gorm.DB) {
	// --- 1. PROGRAM: BARRIER RECOVERY ---
	progBarrier := models.SkinJourneyProgram{
		Name:            "Barrier Recovery Express",
		Slug:            "barrier-recovery",
		Category:        "sensitivity",
		DurationWeeks:   4,
		DurationDays:    28,
		Status:          "active",
		IsActive:        true,
		Level:           1,
		StepCount:       3,
		ExpectedOutcome: "Skin barrier kembali kuat, kulit tidak lagi perih, dan kemerahan reda total.",
		AiScoreFocus:    `{"redness": true, "moisture": true}`,
		Tags:            `["Sensitive Skin", "Starter Pack", "Bumil Friendly"]`,
	}
	db.Where("slug = ?", progBarrier.Slug).FirstOrCreate(&progBarrier)
	seedFullLifecycle(db, progBarrier, "barrier")

	// --- 2. PROGRAM: ACNE WARRIOR ---
	progAcne := models.SkinJourneyProgram{
		Name:            "Acne Warrior Advanced",
		Slug:            "acne-warrior",
		Category:        "acne_treatment",
		DurationWeeks:   4,
		DurationDays:    30,
		Status:          "active",
		IsActive:        true,
		Level:           2,
		StepCount:       5,
		ExpectedOutcome: "Jerawat meradang terkendali, bekas jerawat memudar, dan produksi minyak seimbang.",
		AiScoreFocus:    `{"acneScore": true, "redness": true}`,
		Tags:            `["Acne-Prone", "Oil Control", "Deep Cleanse"]`,
	}
	db.Where("slug = ?", progAcne.Slug).FirstOrCreate(&progAcne)
	seedFullLifecycle(db, progAcne, "acne")

	// --- 3. PROGRAM: BRIGHTENING ULTIMATE ---
	progBright := models.SkinJourneyProgram{
		Name:            "Brightening Ultimate Transformation",
		Slug:            "brightening-ultimate",
		Category:        "brightening",
		DurationWeeks:   6,
		DurationDays:    42,
		Status:          "active",
		IsActive:        true,
		Level:           3,
		StepCount:       6,
		ExpectedOutcome: "Wajah cerah merata, glowing permanen, dan tekstur kulit halus seperti bayi.",
		AiScoreFocus:    `{"brightness": true, "texture": true}`,
		Tags:            `["Glass Skin", "Flek Recovery", "Premium"]`,
	}
	db.Where("slug = ?", progBright.Slug).FirstOrCreate(&progBright)
	seedFullLifecycle(db, progBright, "bright")
}

func seedFullLifecycle(db *gorm.DB, prog models.SkinJourneyProgram, pType string) {
	// 1. PHASES (Weeks 1-4)
	phaseData := []struct {
		Title string
		Desc  string
	}{
		{"Fase Penenangan (Soothing)", "Minggu pertama difokuskan untuk meredakan inflamasi dan adaptasi produk."},
		{"Fase Perbaikan (Repairing)", "Minggu kedua fokus pada perbaikan jaringan kulit dan penguatan barrier."},
		{"Fase Peningkatan (Enhancing)", "Minggu ketiga mulai terlihat perubahan pada kecerahan dan tekstur."},
		{"Fase Hasil (Final Glow)", "Minggu keempat kulit mencapai kondisi optimal dan stabil."},
	}
	for i, pd := range phaseData {
		ph := models.SkinJourneyPhase{
			ProgramID: prog.ID, PhaseNumber: i + 1, Title: pd.Title, WeekLabel: fmt.Sprintf("MINGGU %d", i+1),
			Description:  pd.Desc,
			Expectations: `["Kemerahan berkurang","Tekstur lebih halus","Kulit terasa lembap"]`,
			Tips:         "Gunakan air biasa untuk cuci muka, hindari air panas.",
		}
		db.Where("program_id = ? AND phase_number = ?", ph.ProgramID, ph.PhaseNumber).FirstOrCreate(&ph)
	}

	// 2. BENEFITS
	benefits := []struct {
		Title string
		Desc  string
		Icon  string
	}{
		{"Teknologi 5x Ceramide", "Memperbaiki barier kulit dari lapisan terdalam.", "security"},
		{"Eksfoliasi Tanpa Perih", "Mengangkat sel kulit mati dengan PHA yang ultra-lembut.", "auto_fix_high"},
		{"Hidrasi 24 Jam", "Menjaga wajah tetap fresh meski beraktivitas seharian.", "opacity"},
	}
	for i, b := range benefits {
		benefit := models.SkinJourneyBenefit{ProgramID: prog.ID, Title: b.Title, Description: b.Desc, Icon: b.Icon, Order: i + 1}
		db.Where("program_id = ? AND title = ?", benefit.ProgramID, benefit.Title).FirstOrCreate(&benefit)
	}

	// 3. WARNINGS
	warnings := []models.SkinJourneyWarning{
		{ProgramID: prog.ID, WarningType: "danger", Badge: "⚠️ PENTING", Title: "Dilarang Campur Produk", Description: "Jangan campur dengan skincare yang mengandung merkuri atau zat pemutih instan selama program.", Action: "Gunakan Akuglow secara eksklusif.", Order: 1},
		{ProgramID: prog.ID, WarningType: "caution", Badge: "ℹ️ INFO", Title: "Proses Purging", Description: "Beberapa kulit mungkin mengalami adaptasi berupa munculnya jerawat kecil di awal.", Action: "Tetap lanjutkan, ini tanda kulit sedang detox.", Order: 2},
	}
	for _, w := range warnings {
		db.Where("program_id = ? AND title = ?", w.ProgramID, w.Title).FirstOrCreate(&w)
	}

	// 4. FAQs
	faqs := []struct {
		Q string
		A string
	}{
		{"Apakah produk ini sudah BPOM?", "Tentu saja! Semua produk Akuglow sudah resmi terdaftar di BPOM dan Halal."},
		{"Bisa digunakan pria?", "Sangat bisa. Formula Akuglow dirancang untuk semua jenis kelamin."},
	}
	for i, f := range faqs {
		faq := models.SkinJourneyFAQ{ProgramID: prog.ID, Question: f.Q, Answer: f.A, Order: i + 1}
		db.Where("program_id = ? AND question = ?", faq.ProgramID, faq.Question).FirstOrCreate(&faq)
	}

	// 5. PRODUCT STEPS (Flow 3 & 4)
	var prodFoam, prodMoist, prodDay, prodNight models.Product
	db.Where("slug = ?", "akuglow-sabun-wajah").First(&prodFoam)
	db.Where("slug = ?", "akuglow-calming-barrier").First(&prodMoist)
	db.Where("slug = ?", "akuglow-krim-siang").First(&prodDay)
	db.Where("slug = ?", "akuglow-krim-malam").First(&prodNight)

	pSteps := []models.SkinJourneyProductStep{
		{
			ProgramID: prog.ID, ProductID: prodFoam.ID, StepNumber: 1, StepName: "Langkah 1: Pembersihan", Phase: "both", Frequency: "daily",
			Purpose: "Membersihkan polusi dan sisa minyak tanpa membuat kulit ketarik.",
			AmountText: "1-2 Pump", AmountNote: "Gunakan silicone brush bawaan.",
			StepByStepJSON: `["Basahi wajah","Tekan busa","Gosok melingkar dengan brush","Bilas"]`,
			TipsJSON: `["Brush bisa dicuci setelah pakai","Pijat area T-zone lebih lama"]`,
			Order: 1,
		},
		{
			ProgramID: prog.ID, ProductID: prodMoist.ID, StepNumber: 2, StepName: "Langkah 2: Nutrisi Barrier", Phase: "both", Frequency: "daily",
			Purpose: "Mengunci kelembapan dan menenangkan sel kulit yang meradang.",
			AmountText: "Sebiji jagung", AmountNote: "Tipis-tipis tapi merata.",
			StepByStepJSON: `["Ambil gel","Titikkan di 5 area wajah","Ratakan ke arah atas","Tepuk sampai meresap"]`,
			TipsJSON: `["Gunakan saat kulit masih lembap","Area merah bisa dioles sedikit lebih tebal"]`,
			Order: 2,
		},
		{
			ProgramID: prog.ID, ProductID: prodDay.ID, StepNumber: 3, StepName: "Langkah 3: Proteksi Pagi", Phase: "morning", Frequency: "daily",
			Purpose: "Melindungi dari sinar matahari dan memberikan efek cerah seketika.",
			AmountText: "Secukupnya", AmountNote: "Hanya untuk pagi hari.",
			StepByStepJSON: `["Oleskan merata","Tepuk perlahan","Tunggu 5 menit sebelum makeup"]`,
			TipsJSON: `["Bisa re-apply jam 12 siang","Jangan lupa area leher"]`,
			Order: 3,
		},
	}
	if pType == "bright" || pType == "acne" {
		pSteps = append(pSteps, models.SkinJourneyProductStep{
			ProgramID: prog.ID, ProductID: prodNight.ID, StepNumber: 4, StepName: "Langkah 4: Booster Malam", Phase: "evening", Frequency: "daily",
			Purpose: "Membantu mencerahkan bekas jerawat dan meregenerasi sel saat tidur.",
			AmountText: "Ujung jari", AmountNote: "Khusus malam hari.",
			Order: 4,
		})
	}

	for _, ps := range pSteps {
		if ps.ProductID != "" {
			db.Where("program_id = ? AND product_id = ?", ps.ProgramID, ps.ProductID).FirstOrCreate(&ps)
		}
	}
}

func seedJourneyConfigs(db *gorm.DB) {
	configs := []models.PlatformConfig{
		{Key: "skin_journey_affirmations", Value: `["Kulitmu unik, hargai setiap prosesnya.","Transformasi butuh waktu, tetaplah konsisten.","I am radiant and healthy.","Hari ini adalah langkah baru menuju kulit glowing impian."]`, Description: "Daftar afirmasi harian"},
		{Key: "skin_journey_voucher_code", Value: "WARRIOR25", Description: "Voucher reward hari ke-25"},
		{Key: "skin_journey_min_days", Value: "25", Description: "Minimal hari penyelesaian program"},
	}
	for _, c := range configs {
		db.Where("key = ?", c.Key).FirstOrCreate(&c)
	}
	updateProductKnowledge(db)
}

func updateProductKnowledge(db *gorm.DB) {
	knowledge := `=== KATALOG PRODUK UTAMA AKUGLOW ===
1. FACIAL FOAM: Pembersih mild dengan PHA & Silicone Brush. Aman untuk semua jenis kulit.
2. CALMING MOISTURIZER: 5x Ceramide & 5% Panthenol. Hero untuk barrier & jerawat meradang.
3. DAY CREAM: Instant tone-up, Niacinamide, UV Filter.
4. NIGHT CREAM: Alpha Arbutin & Collagen untuk mencerahkan flek/bekas jerawat.`
	db.Model(&models.PlatformConfig{}).Where("key = ?", "skin_ai_product_knowledge").Update("value", knowledge)
}
