package seeder

import (
	"akuglow/backend/models"
	"fmt"
	"log"

	"gorm.io/gorm"
)

func SeedSkinJourneyComplete(db *gorm.DB) {
	log.Println("🌱 Seeding Skin Journey ULTIMATE configurations...")

	// 1. Seed AI Configs (Comprehensive)
	aiConfigs := []models.SkinJourneyAIConfig{
		{
			Stage:       "analysis",
			PromptTitle: "Analisis Wajah & Profil Kulit (Akuglow Engine)",
			SystemRole: `Anda adalah "Sahabat Glow", AI Skincare Expert untuk platform Akuglow.
Analisis foto kulit wajah secara mendalam, teknis, dan empatis.
Bahasa: Bahasa Indonesia yang hangat dan memotivasi.
=== PRODUCT KNOWLEDGE AKUGLOW ===
{{product_knowledge}}
=== ATURAN ===
- Gunakan format BOLD (**Nama Produk**)
- Identifikasi masalah: Jerawat, Kemerahan, Kusam, atau Dehidrasi.
- Berikan skor kulit 0-100.
- Respon HANYA JSON.`,
			PromptBody: `Analisis foto ini. Kembalikan JSON: { "skin_score": 85, "skin_type": "Oily", "primary_concern": "Jerawat", "summary": "Kulit terlihat berminyak di T-zone...", "recommendations": ["Gunakan sabun lembut", "Hindari scrub"] }`,
		},
		{
			Stage:       "set_program",
			PromptTitle: "Penentuan Program Perjalanan",
			SystemRole:  `Anda bertugas memilihkan program Skin Journey yang paling cocok berdasarkan profil kulit user.`,
			PromptBody:  `Berdasarkan data user: {{user_profile}}, pilih program ID dari list: {{programs}}. Berikan alasan singkat dalam JSON.`,
		},
		{
			Stage:       "cara_pakai",
			PromptTitle: "Edukasi Cara Pakai Produk",
			SystemRole:  `Anda adalah instruktur skincare. Jelaskan cara pakai produk tertentu secara detail.`,
			PromptBody:  `Bagaimana cara pakai **{{product_name}}** dalam program {{program_name}}? Berikan tips tambahan.`,
		},
	}
	for _, cfg := range aiConfigs {
		db.Where("stage = ?", cfg.Stage).Updates(&cfg)
		db.Where("stage = ?", cfg.Stage).FirstOrCreate(&cfg)
	}

	// 2. Seed Basic Library Steps (The "What")
	steps := []models.SkinJourneyStep{
		{Name: "Cleansing", Icon: "soap", Description: "Pembersihan wajah dari debu dan minyak.", Order: 1},
		{Name: "Toning", Icon: "waves", Description: "Menyeimbangkan pH kulit dan mempersiapkan penyerapan.", Order: 2},
		{Name: "Treating", Icon: "science", Description: "Pengobatan target (Jerawat/Flek).", Order: 3},
		{Name: "Moisturizing", Icon: "spa", Description: "Menjaga kelembapan dan barrier.", Order: 4},
		{Name: "Protecting", Icon: "light_mode", Description: "Melindungi dari sinar UV (Wajib Siang).", Order: 5},
		{Name: "Repairing", Icon: "nightlight", Description: "Nutrisi malam hari untuk pemulihan.", Order: 6},
	}
	for _, s := range steps {
		db.Where("name = ?", s.Name).FirstOrCreate(&s)
	}

	// 3. Seed Programs (The "How Long")
	programs := []models.SkinJourneyProgram{
		{
			Name: "Acne Defense & Oil Control",
			Slug: "acne-defense",
			Category: "acne_treatment",
			Level: 1,
			DurationWeeks: 4,
			DurationDays: 28,
			Status: "active",
			IsActive: true,
			TargetSkinType: `["oily", "combination"]`,
			TargetConcerns: `["acne", "large_pores", "excess_sebum"]`,
			ExpectedOutcome: "Jerawat mereda, produksi minyak terkontrol, dan pori-pori tampak lebih bersih.",
			AiScoreFocus: `{"acne": true, "oiliness": true}`,
		},
		{
			Name: "Barrier Recovery & Hydration",
			Slug: "barrier-recovery",
			Category: "recovery",
			Level: 1,
			DurationWeeks: 4,
			DurationDays: 28,
			Status: "active",
			IsActive: true,
			TargetSkinType: `["dry", "sensitive"]`,
			TargetConcerns: `["redness", "dehydration", "damaged_barrier"]`,
			ExpectedOutcome: "Kemerahan berkurang, kulit lebih kenyal, dan barrier kulit lebih kuat terhadap iritasi.",
			AiScoreFocus: `{"redness": true, "moisture": true}`,
		},
		{
			Name: "Ultimate Glow & Brightening",
			Slug: "ultimate-glow",
			Category: "brightening",
			Level: 2,
			DurationWeeks: 4,
			DurationDays: 28,
			Status: "active",
			IsActive: true,
			TargetSkinType: `["normal", "combination"]`,
			TargetConcerns: `["dullness", "dark_spots", "uneven_tone"]`,
			ExpectedOutcome: "Wajah tampak lebih cerah merata, bercahaya (glowing), dan noda hitam memudar.",
			AiScoreFocus: `{"brightness": true, "texture": true}`,
		},
	}
	for _, p := range programs {
		db.Where("slug = ?", p.Slug).Updates(&p)
		db.Where("slug = ?", p.Slug).FirstOrCreate(&p)
	}

	// Fetch Programs for relations
	var progAcne, progBarrier, progGlow models.SkinJourneyProgram
	db.Where("slug = ?", "acne-defense").First(&progAcne)
	db.Where("slug = ?", "barrier-recovery").First(&progBarrier)
	db.Where("slug = ?", "ultimate-glow").First(&progGlow)

	// 4. Seed Phases (The Timeline)
	seedPhases(db, progAcne.ID, "Acne Defense")
	seedPhases(db, progBarrier.ID, "Barrier Recovery")
	seedPhases(db, progGlow.ID, "Ultimate Glow")

	// 5. Seed Benefits, Warnings, FAQs
	seedContent(db, progAcne.ID, "acne")
	seedContent(db, progBarrier.ID, "barrier")
	seedContent(db, progGlow.ID, "glow")

	// 6. Seed Product Steps (The "With What")
	// Get real products seeded in SeedAkuglowProducts
	var pSabun, pToner, pDay, pNight, pMoistBarrier, pNightBooster models.Product
	db.Where("slug = ?", "akuglow-sabun-wajah").First(&pSabun)
	db.Where("slug = ?", "akuglow-toner-wajah").First(&pToner)
	db.Where("slug = ?", "akuglow-krim-siang").First(&pDay)
	db.Where("slug = ?", "akuglow-krim-malam").First(&pNight)
	db.Where("slug = ?", "akuglow-calming-barrier").First(&pMoistBarrier)
	db.Where("slug = ?", "akuglow-night-booster").First(&pNightBooster)

	if pSabun.ID == "" {
		log.Println("⚠️  WARNING: Product 'akuglow-sabun-wajah' not found. Steps will be empty!")
	}

	// Acne Program Steps
	acneSteps := []models.SkinJourneyProductStep{
		{
			ProgramID: progAcne.ID, ProductID: pSabun.ID, StepNumber: 1, StepName: "Deep Cleansing", Phase: "both", Frequency: "daily",
			Purpose: "Mengangkat minyak berlebih dan bakteri penyebab jerawat.",
			AmountText: "1 pump", AmountNote: "Jangan terlalu banyak agar kulit tidak kering.",
			StepByStepJSON: `["Basahi wajah dengan air hangat kuku", "Busakan sabun di telapak tangan", "Pijat lembut area T-Zone selama 30 detik", "Bilas hingga bersih"]`,
			TipsJSON: `["Gunakan air suhu ruang untuk bilas terakhir", "Keringkan dengan tisu wajah bersih (tap-tap)"]`,
			MechanismExplain: "Salicylic Acid masuk ke dalam pori untuk membersihkan sumbatan lemak.",
			WaitTimeSecs: 0,
		},
		{
			ProgramID: progAcne.ID, ProductID: pMoistBarrier.ID, StepNumber: 2, StepName: "Moisturize & Calm", Phase: "both", Frequency: "daily",
			Purpose: "Menghidrasi tanpa menyumbat pori.",
			AmountText: "Sebiji jagung",
			StepByStepJSON: `["Ambil sedikit produk", "Aplikasikan tipis merata", "Fokus pada area yang sedang meradang"]`,
			WaitTimeSecs: 60,
		},
		{
			ProgramID: progAcne.ID, ProductID: pDay.ID, StepNumber: 3, StepName: "Protect", Phase: "morning", Frequency: "daily",
			Purpose: "Melindungi bekas jerawat agar tidak menghitam terkena matahari.",
			AmountText: "2 ruas jari",
			StepByStepJSON: `["Aplikasikan setelah moisturizer menyerap sempurna", "Ratakan ke seluruh wajah dan leher"]`,
			WaitTimeSecs: 120,
		},
	}

	// Barrier Program Steps
	barrierSteps := []models.SkinJourneyProductStep{
		{
			ProgramID: progBarrier.ID, ProductID: pSabun.ID, StepNumber: 1, StepName: "Gentle Cleanse", Phase: "both", Frequency: "daily",
			Purpose: "Membersihkan tanpa merusak lapisan pelindung kulit.",
			AmountText: "Setengah pump",
			StepByStepJSON: `["Gunakan air biasa", "Pijat sangat lembut", "Bilas dalam waktu kurang dari 60 detik"]`,
			WaitTimeSecs: 0,
		},
		{
			ProgramID: progBarrier.ID, ProductID: pMoistBarrier.ID, StepNumber: 2, StepName: "Intensive Repair", Phase: "both", Frequency: "daily",
			Purpose: "Membangun kembali struktur Ceramide kulit.",
			AmountText: "2 layer tipis",
			StepByStepJSON: `["Gunakan saat kulit masih lembap (damp skin)", "Layer pertama tipis merata", "Layer kedua pada area yang sangat kering/merah"]`,
			MechanismExplain: "5x Ceramide Complex mengisi celah pada barrier kulit yang rusak.",
			WaitTimeSecs: 90,
		},
	}

	// Glow Program Steps
	glowSteps := []models.SkinJourneyProductStep{
		{
			ProgramID: progGlow.ID, ProductID: pSabun.ID, StepNumber: 1, StepName: "Face Wash", Phase: "both", Frequency: "daily",
			Purpose: "Basic cleansing untuk mengangkat kusam.",
			StepByStepJSON: `["Basahi wajah", "Pijat lembut", "Bilas"]`,
		},
		{
			ProgramID: progGlow.ID, ProductID: pToner.ID, StepNumber: 2, StepName: "Hydrating Toner", Phase: "both", Frequency: "daily",
			Purpose: "Memberikan kelembapan awal agar cerah.",
			StepByStepJSON: `["Tuang ke kapas", "Usap ke wajah"]`,
		},
		{
			ProgramID: progGlow.ID, ProductID: pDay.ID, StepNumber: 3, StepName: "Brightening Day", Phase: "morning", Frequency: "daily",
			Purpose: "Mencerahkan dan melindungi.",
			StepByStepJSON: `["Oleskan merata", "Gunakan sebelum keluar ruangan"]`,
		},
		{
			ProgramID: progGlow.ID, ProductID: pNightBooster.ID, StepNumber: 4, StepName: "Booster Night", Phase: "evening", Frequency: "daily",
			Purpose: "Nutrisi intensif dosis tinggi untuk wajah 'badak' yang susah cerah.",
			StepByStepJSON: `["Oleskan tipis merata", "Fokus pada area flek/noda hitam", "Gunakan sebagai langkah terakhir"]`,
			MechanismExplain: "Hexylresorcinol bekerja 4x lebih efektif dari Hydroquinone dalam mencerahkan tanpa efek samping.",
		},
	}

	allSteps := append(acneSteps, barrierSteps...)
	allSteps = append(allSteps, glowSteps...)

	for _, ps := range allSteps {
		if ps.ProductID != "" {
			// Gunakan Save untuk memastikan data terupdate jika sudah ada
			var existing models.SkinJourneyProductStep
			db.Where("program_id = ? AND step_number = ?", ps.ProgramID, ps.StepNumber).First(&existing)
			if existing.ID != 0 {
				ps.ID = existing.ID
				db.Save(&ps)
			} else {
				db.Create(&ps)
			}
		}
	}

	// 7. Seed Community Groups
	groups := []models.SkinCommunityGroup{
		{Name: "Acne Warriors", Description: "Pejuang jerawat berkumpul di sini untuk saling dukung.", Icon: "healing"},
		{Name: "Barrier Squad", Description: "Tips dan trik memulihkan kulit sensitif & rusak.", Icon: "shield_heart"},
		{Name: "Glow Getter", Description: "Komunitas pemburu wajah cerah dan sehat ala Akuglow.", Icon: "auto_awesome"},
		{Name: "Skincare Science", Description: "Diskusi mendalam tentang bahan aktif dan cara kerja produk.", Icon: "science"},
	}
	for _, g := range groups {
		db.Where("name = ?", g.Name).FirstOrCreate(&g)
	}

	fmt.Println("✅ Skin Journey ULTIMATE Seeding Finished!")
}

func seedPhases(db *gorm.DB, programID uint, name string) {
	phases := []models.SkinJourneyPhase{
		{ProgramID: programID, PhaseNumber: 1, WeekLabel: "MINGGU 1", Title: "Fase Adaptasi", Description: "Kulit menyesuaikan diri dengan bahan aktif baru.", Expectations: `["Mungkin terasa sedikit cekit-cekit", "Kulit mulai terasa lebih bersih"]`, Order: 1},
		{ProgramID: programID, PhaseNumber: 2, WeekLabel: "MINGGU 2", Title: "Fase Purging/Penyesuaian", Description: "Kotoran di bawah kulit mulai diangkat ke permukaan.", Expectations: `["Muncul jerawat kecil (purging)", "Tekstur kulit mulai merata"]`, Order: 2},
		{ProgramID: programID, PhaseNumber: 3, WeekLabel: "MINGGU 3", Title: "Fase Perbaikan", Description: "Bahan aktif mulai bekerja maksimal memperbaiki masalah.", Expectations: `["Kemerahan/Jerawat berkurang drastis", "Kulit terasa lebih kenyal"]`, Order: 3},
		{ProgramID: programID, PhaseNumber: 4, WeekLabel: "MINGGU 4", Title: "Fase Stabilisasi", Description: "Mengunci hasil dan menjaga kesehatan kulit.", Expectations: `["Hasil nyata terlihat", "Kulit stabil dan sehat"]`, Order: 4},
	}
	for _, ph := range phases {
		db.Where("program_id = ? AND phase_number = ?", ph.ProgramID, ph.PhaseNumber).FirstOrCreate(&ph)
	}
}

func seedContent(db *gorm.DB, programID uint, pType string) {
	// Benefits
	var benefits []models.SkinJourneyBenefit
	if pType == "acne" {
		benefits = []models.SkinJourneyBenefit{
			{ProgramID: programID, Title: "Pori-pori Bersih", Description: "Mengecilkan tampilan pori.", Icon: "grid_view", Order: 1},
			{ProgramID: programID, Title: "Bebas Minyak", Description: "Matte finish seharian.", Icon: "back_hand", Order: 2},
		}
	} else if pType == "barrier" {
		benefits = []models.SkinJourneyBenefit{
			{ProgramID: programID, Title: "Anti-Iritasi", Description: "Kulit lebih tenang.", Icon: "sentiment_satisfied", Order: 1},
			{ProgramID: programID, Title: "Kenyal & Plumpy", Description: "Hidrasi mengunci air.", Icon: "water_drop", Order: 2},
		}
	} else {
		benefits = []models.SkinJourneyBenefit{
			{ProgramID: programID, Title: "Efek Glass Skin", Description: "Wajah glowing alami.", Icon: "flare", Order: 1},
			{ProgramID: programID, Title: "Warna Merata", Description: "Noda hitam memudar.", Icon: "palette", Order: 2},
		}
	}
	for _, b := range benefits {
		db.Where("program_id = ? AND title = ?", b.ProgramID, b.Title).FirstOrCreate(&b)
	}

	// Warnings
	warning := models.SkinJourneyWarning{
		ProgramID: programID, Title: "Konsistensi adalah Kunci", WarningType: "info", Badge: "TIPS",
		Description: "Skincare bukan sulap. Gunakan rutin pagi dan malam untuk hasil maksimal.", Order: 1,
	}
	db.Where("program_id = ? AND title = ?", warning.ProgramID, warning.Title).FirstOrCreate(&warning)

	// FAQs
	faq := models.SkinJourneyFAQ{
		ProgramID: programID, Question: "Kapan hasil terlihat?", Answer: "Hasil awal biasanya terlihat di hari ke-14, dan hasil maksimal di hari ke-28.", Order: 1,
	}
	db.Where("program_id = ? AND question = ?", faq.ProgramID, faq.Question).FirstOrCreate(&faq)
}
