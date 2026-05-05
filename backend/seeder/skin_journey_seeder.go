package seeder

import (
	"SahabatMart/backend/models"
	"gorm.io/gorm"
	"log"
)

func SeedSkinJourney(db *gorm.DB) {
	log.Println("🌱 Seeding Skin Journey complete configurations...")

	// 1. Seed AI Configs
	aiConfigs := []models.SkinJourneyAIConfig{
		{
			Stage:       "analysis",
			PromptTitle: "Face Analysis & Skin Profile",
			SystemRole:  "You are a professional skincare AI analyst. You must analyze the user's skin description and return a detailed profile in JSON format.",
			PromptBody: `Analyze my skin using AI. Based on the user input or photo, please identify:
1. Skin type (oily/dry/combination/sensitive/normal)
2. Main skin concerns (acne, dark spots, wrinkles, texture, redness, etc)
3. Skin condition (baseline health assessment)
4. Sensitivity Level (low/medium/high)
5. Hydration Status (dehydrated/normal/over-hydrated)

Return the profile as a structured Skin Profile JSON.`,
		},
		{
			Stage:       "set_program",
			PromptTitle: "Program Selection",
			SystemRole:  "You are a skincare routine planner. Recommend programs based on the user's skin profile.",
			PromptBody: `Based on the skin profile: {{profile}}, recommend one of the following programs:
1. ESSENTIAL BASIC - for beginners or busy lifestyle (3 steps)
2. ADVANCED - for moderate concerns (5 steps)
3. INTENSIVE - for complex concerns (7 steps)

Explain why this program fits the user's profile.`,
		},
		{
			Stage:       "recommendation",
			PromptTitle: "Product Recommendations",
			SystemRole:  "You are an expert in skincare products and ingredients. Recommend specific products based on the skin type and concerns.",
			PromptBody: `Based on skin type {{type}} and concerns {{concerns}}, recommend products for each step of the {{program}} program. Include key ingredients, function, and texture.`,
		},
		{
			Stage:       "cara_pakai",
			PromptTitle: "Product Usage Instructions",
			SystemRole:  "You are a beauty therapist providing detailed application techniques.",
			PromptBody: `Provide detailed instructions for using {{product}}. Include amount needed, technique, absorption time, and pro tips.`,
		},
	}

	for _, cfg := range aiConfigs {
		db.Where("stage = ?", cfg.Stage).FirstOrCreate(&cfg)
	}

	// 2. Seed Programs
	programs := []models.SkinJourneyProgram{
		{Name: "Essential Basic", Description: "Pilihan tepat untuk pemula atau gaya hidup sibuk. Fokus pada perawatan dasar: Cleansing, Hydrating, & Protecting.", Level: 1, StepCount: 3},
		{Name: "Advanced", Description: "Perawatan lebih mendalam untuk masalah kulit moderat. Menambahkan serum dan perawatan khusus.", Level: 2, StepCount: 5},
		{Name: "Intensive", Description: "Program komprehensif untuk hasil maksimal pada masalah kulit kompleks. 7 langkah perawatan lengkap pagi dan malam.", Level: 3, StepCount: 7},
	}

	for _, p := range programs {
		db.Where("name = ?", p.Name).FirstOrCreate(&p)
	}

	// 3. Seed Steps
	steps := []models.SkinJourneyStep{
		{Name: "First Cleanse", Icon: "water_drop", Description: "Membersihkan makeup dan sunscreen berbasis minyak.", Order: 1},
		{Name: "Second Cleanse", Icon: "soap", Description: "Membersihkan kotoran berbasis air dan sisa minyak.", Order: 2},
		{Name: "Toner", Icon: "waves", Description: "Menyeimbangkan pH kulit dan mempersiapkan untuk langkah selanjutnya.", Order: 3},
		{Name: "Exfoliate", Icon: "skincare", Description: "Mengangkat sel kulit mati (1-2x seminggu).", Order: 4},
		{Name: "Serum", Icon: "colorize", Description: "Perawatan intensif dengan bahan aktif untuk masalah spesifik.", Order: 5},
		{Name: "Eye Cream", Icon: "visibility", Description: "Merawat area sensitif di sekitar mata.", Order: 6},
		{Name: "Moisturizer", Icon: "spa", Description: "Mengunci kelembapan dan menjaga barier kulit.", Order: 7},
		{Name: "Sunscreen", Icon: "light_mode", Description: "Perlindungan wajib dari sinar UV (pagi hari).", Order: 8},
		{Name: "Night Mask", Icon: "nightlight", Description: "Nutrisi ekstra saat tidur.", Order: 9},
	}

	for _, s := range steps {
		db.Where("name = ?", s.Name).FirstOrCreate(&s)
	}

	// 4. Seed Routines for each Program
	var progEssential, progAdvanced, progIntensive models.SkinJourneyProgram
	db.Where("name = ?", "Essential Basic").First(&progEssential)
	db.Where("name = ?", "Advanced").First(&progAdvanced)
	db.Where("name = ?", "Intensive").First(&progIntensive)

	var stepFirst, stepSecond, stepToner, stepSerum, stepEye, stepMoist, stepSPF, stepMask models.SkinJourneyStep
	db.Where("name = ?", "First Cleanse").First(&stepFirst)
	db.Where("name = ?", "Second Cleanse").First(&stepSecond)
	db.Where("name = ?", "Toner").First(&stepToner)
	db.Where("name = ?", "Serum").First(&stepSerum)
	db.Where("name = ?", "Eye Cream").First(&stepEye)
	db.Where("name = ?", "Moisturizer").First(&stepMoist)
	db.Where("name = ?", "Sunscreen").First(&stepSPF)
	db.Where("name = ?", "Night Mask").First(&stepMask)

	routines := []models.SkinJourneyRoutine{
		// Essential Basic
		{ProgramID: progEssential.ID, StepID: stepSecond.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Gunakan face wash lembut, pijat selama 60 detik."},
		{ProgramID: progEssential.ID, StepID: stepMoist.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Gunakan seukuran biji jagung, ratakan."},
		{ProgramID: progEssential.ID, StepID: stepSPF.ID, TimeOfDay: "morning", DurationMin: 1, Instructions: "Gunakan 2 ruas jari penuh setiap pagi."},

		// Advanced
		{ProgramID: progAdvanced.ID, StepID: stepSecond.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Gunakan face wash sesuai jenis kulit."},
		{ProgramID: progAdvanced.ID, StepID: stepToner.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Tap-tap ke wajah sampai meresap."},
		{ProgramID: progAdvanced.ID, StepID: stepSerum.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Gunakan 2-3 tetes, fokus pada area bermasalah."},
		{ProgramID: progAdvanced.ID, StepID: stepMoist.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Kunci kelembapan."},
		{ProgramID: progAdvanced.ID, StepID: stepSPF.ID, TimeOfDay: "morning", DurationMin: 1, Instructions: "Sunscreen is a MUST."},

		// Intensive
		{ProgramID: progIntensive.ID, StepID: stepFirst.ID, TimeOfDay: "evening", DurationMin: 2, Instructions: "Gunakan cleansing oil atau balm."},
		{ProgramID: progIntensive.ID, StepID: stepSecond.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Deep cleaning."},
		{ProgramID: progIntensive.ID, StepID: stepToner.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Hidrasi maksimal."},
		{ProgramID: progIntensive.ID, StepID: stepSerum.ID, TimeOfDay: "both", DurationMin: 2, Instructions: "Layering serum jika perlu."},
		{ProgramID: progIntensive.ID, StepID: stepEye.ID, TimeOfDay: "evening", DurationMin: 1, Instructions: "Gunakan jari manis, tap lembut."},
		{ProgramID: progIntensive.ID, StepID: stepMoist.ID, TimeOfDay: "both", DurationMin: 1, Instructions: "Barrier protection."},
		{ProgramID: progIntensive.ID, StepID: stepSPF.ID, TimeOfDay: "morning", DurationMin: 1, Instructions: "Wajib re-apply setiap 3-4 jam."},
		{ProgramID: progIntensive.ID, StepID: stepMask.ID, TimeOfDay: "evening", DurationMin: 1, Instructions: "Gunakan 2-3x seminggu sebagai penutup."},
	}

	for _, r := range routines {
		if r.ProgramID != 0 && r.StepID != 0 {
			db.Where("program_id = ? AND step_id = ? AND time_of_day = ?", r.ProgramID, r.StepID, r.TimeOfDay).FirstOrCreate(&r)
		}
	}

	// 5. Seed Community Groups
	groups := []models.SkinCommunityGroup{
		{Name: "Acne Warrior", Description: "Komunitas pejuang jerawat. Berbagi tips dan semangat.", Icon: "healing"},
		{Name: "Glow Up Squad", Description: "Fokus pada kulit cerah dan sehat bercahaya.", Icon: "auto_awesome"},
		{Name: "Sensitive Soul", Description: "Perawatan khusus untuk kulit mudah iritasi dan kemerahan.", Icon: "spa"},
		{Name: "Anti-Aging Club", Description: "Menjaga elastisitas dan keremajaan kulit.", Icon: "history"},
	}

	for _, g := range groups {
		db.Where("name = ?", g.Name).FirstOrCreate(&g)
	}

	// 6. Seed Platform Configs for Skin Journey
	configs := []models.PlatformConfig{
		{Key: "skin_journey_affirmations", Value: `["Kulitmu tidak rusak, dia hanya sedang berproses.","Hargai setiap perubahan kecil hari ini.","I am beautiful with or without filters.","Setiap jerawat yang sembuh adalah bukti kekuatan kulitmu.","Skin journey is a marathon, not a sprint."]`, Description: "Daftar afirmasi harian skin journey"},
		{Key: "skin_journey_voucher_code", Value: "JOURNEY25", Description: "Kode voucher reward hari ke-25"},
		{Key: "skin_journey_voucher_message", Value: "Selamat! Kamu telah mencapai hari ke-25. Ini hadiah kecil untukmu.", Description: "Pesan reward hari ke-25"},
		{Key: "skin_journey_ritual_instruction", Value: "Pijat wajahmu dengan lembut selama 60 detik menggunakan teknik memutar untuk meningkatkan sirkulasi darah.", Description: "Instruksi ritual 60 detik"},
		{Key: "skin_ai_enabled", Value: "true", Description: "Aktifkan analisis kulit berbasis AI"},
		{Key: "skin_ai_model", Value: "gpt-4o", Description: "Model AI yang digunakan untuk analisis foto"},
		{Key: "skin_ai_openai_key", Value: "", Description: "OpenAI API Key (Opsional, gunakan ENV jika kosong)"},
	}

	for _, c := range configs {
		db.Where("key = ?", c.Key).FirstOrCreate(&c)
	}

	log.Println("✅ Skin Journey seeding completed.")
}
