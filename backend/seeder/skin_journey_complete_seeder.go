package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"log"

	"gorm.io/gorm"
)

func SeedSkinJourneyComplete(db *gorm.DB) {
	log.Println("🌱 Seeding Skin Journey COMPLETE configurations...")

	// 1. Seed AI Configs
	aiConfigs := []models.SkinJourneyAIConfig{
		{
			Stage:       "analysis",
			PromptTitle: "Face Analysis & Skin Profile (Akuglow Superpower)",
			SystemRole: `Anda adalah "Sahabat Glow", AI Skincare Expert untuk platform Akuglow.
Analisis foto kulit wajah secara mendalam, teknis, dan empatis.
Bahasa: Bahasa Indonesia yang hangat dan memotivasi.
=== PRODUCT KNOWLEDGE AKUGLOW ===
{{product_knowledge}}
=== ATURAN ===
- Gunakan format BOLD (**Nama Produk**)
- Respon HANYA JSON.`,
			PromptBody: `Analisis foto ini. Kembalikan JSON: { skin_score, skin_type, primary_concern, summary, recommendations: [] }`,
		},
	}
	for _, cfg := range aiConfigs {
		db.Where("stage = ?", cfg.Stage).FirstOrCreate(&cfg)
	}

	// 2. Seed Basic Library Steps
	steps := []models.SkinJourneyStep{
		{Name: "Cleansing", Icon: "soap", Description: "Pembersihan wajah dari debu dan minyak.", Order: 1},
		{Name: "Toning", Icon: "waves", Description: "Menyeimbangkan pH kulit.", Order: 2},
		{Name: "Moisturizing", Icon: "spa", Description: "Menjaga kelembapan dan barrier.", Order: 3},
		{Name: "Protecting", Icon: "light_mode", Description: "Melindungi dari sinar UV.", Order: 4},
		{Name: "Repairing", Icon: "nightlight", Description: "Nutrisi malam hari.", Order: 5},
	}
	for _, s := range steps {
		db.Where("name = ?", s.Name).FirstOrCreate(&s)
	}

	// 3. Seed Programs
	programs := []models.SkinJourneyProgram{
		{
			Name: "Essential Barrier Recovery",
			Slug: "essential-barrier",
			Category: "recovery",
			Level: 1,
			StepCount: 3,
			DurationDays: 28,
			Status: "active",
			IsActive: true,
			ExpectedOutcome: "Skin barrier pulih, kemerahan berkurang, dan kulit lebih lembap.",
		},
		{
			Name: "Advanced Glow Booster",
			Slug: "advanced-glow",
			Category: "brightening",
			Level: 2,
			StepCount: 5,
			DurationDays: 30,
			Status: "active",
			IsActive: true,
			ExpectedOutcome: "Wajah lebih cerah, tekstur halus, dan bekas jerawat memudar.",
		},
	}
	for _, p := range programs {
		db.Where("slug = ?", p.Slug).FirstOrCreate(&p)
	}

	// Fetch Programs for relations
	var progEssential, progAdvanced models.SkinJourneyProgram
	db.Where("slug = ?", "essential-barrier").First(&progEssential)
	db.Where("slug = ?", "advanced-glow").First(&progAdvanced)

	// 4. Flow 2: Phases, Benefits, Warnings, FAQs
	// --- Essential ---
	phases := []models.SkinJourneyPhase{
		{
			ProgramID: progEssential.ID, PhaseNumber: 1, Title: "Adaptasi & Pembersihan", WeekLabel: "MINGGU 1",
			Description: "Fokus membersihkan kotoran tanpa merusak barrier.", Order: 1,
		},
		{
			ProgramID: progEssential.ID, PhaseNumber: 2, Title: "Recovery & Penguatan", WeekLabel: "MINGGU 2-4",
			Description: "Nutrisi intensif Ceramide untuk membangun ulang lapisan kulit.", Order: 2,
		},
	}
	for _, ph := range phases {
		db.Where("program_id = ? AND title = ?", ph.ProgramID, ph.Title).FirstOrCreate(&ph)
	}

	benefits := []models.SkinJourneyBenefit{
		{ProgramID: progEssential.ID, Title: "Barrier Kuat", Description: "Kulit tidak mudah iritasi.", Icon: "shield", Order: 1},
		{ProgramID: progEssential.ID, Title: "Lembap Maksimal", Description: "Bebas kulit kering ketarik.", Icon: "water_drop", Order: 2},
	}
	for _, b := range benefits {
		db.Where("program_id = ? AND title = ?", b.ProgramID, b.Title).FirstOrCreate(&b)
	}

	warnings := []models.SkinJourneyWarning{
		{
			ProgramID: progEssential.ID, Title: "Jangan Skip Sunscreen", Description: "Barrier rusak sangat sensitif terhadap UV.",
			WarningType: "danger", Badge: "PENTING", Order: 1,
		},
	}
	for _, w := range warnings {
		db.Where("program_id = ? AND title = ?", w.ProgramID, w.Title).FirstOrCreate(&w)
	}

	faqs := []models.SkinJourneyFAQ{
		{ProgramID: progEssential.ID, Question: "Boleh pakai scrub?", Answer: "Tidak disarankan selama barrier masih merah.", Order: 1},
	}
	for _, f := range faqs {
		db.Where("program_id = ? AND question = ?", f.ProgramID, f.Question).FirstOrCreate(&f)
	}

	// 5. Flow 3 & 4: Product Steps
	var pFoam, pToner, pMoist, pDay, pNight models.Product
	db.Where("slug = ?", "akuglow-sabun-wajah").First(&pFoam)
	db.Where("slug = ?", "akuglow-toner-wajah").First(&pToner)
	db.Where("slug = ?", "akuglow-calming-barrier").First(&pMoist)
	db.Where("slug = ?", "akuglow-krim-siang").First(&pDay)
	db.Where("slug = ?", "akuglow-krim-malam").First(&pNight)

	productSteps := []models.SkinJourneyProductStep{
		// Essential
		{
			ProgramID: progEssential.ID, ProductID: pFoam.ID, StepNumber: 1, StepName: "Gentle Cleanse", Phase: "both", Frequency: "daily",
			Purpose: "Membersihkan kotoran tanpa membuat kulit kering.",
			AmountText: "1 pump", AmountNote: "Busakan di tangan terlebih dahulu.",
			StepByStepJSON: `["Basahi wajah","Busakan produk","Pijat lembut 60 detik","Bilas air suhu ruang"]`,
			TipsJSON: `["Gunakan brush halus yang tersedia","Jangan gosok terlalu keras"]`,
			MechanismExplain: "PHA mengangkat sel kulit mati secara ultra-gentle.",
			WaitTimeSecs: 0, AdditionalNotes: "Wajib pagi dan malam.",
		},
		{
			ProgramID: progEssential.ID, ProductID: pMoist.ID, StepNumber: 2, StepName: "Barrier Repair", Phase: "both", Frequency: "daily",
			Purpose: "Menutrisi kembali lapisan lipid kulit.",
			AmountText: "Sebiji jagung", AmountNote: "Ratakan ke seluruh wajah.",
			StepByStepJSON: `["Ambil produk","Titikkan di 5 area wajah","Ratakan ke arah atas","Tap-tap sampai meresap"]`,
			TipsJSON: `["Gunakan saat kulit masih agak lembap","Bisa dilayer di area yang sangat kering"]`,
			MechanismExplain: "5x Ceramide membangun ulang skin barrier.",
			WaitTimeSecs: 60, AdditionalNotes: "Kunci utama pemulihan.",
		},
		{
			ProgramID: progEssential.ID, ProductID: pDay.ID, StepNumber: 3, StepName: "Protect", Phase: "morning", Frequency: "daily",
			Purpose: "Melindungi dari sinar matahari.",
			AmountText: "2 ruas jari",
			StepByStepJSON: `["Aplikasikan setelah moisturizer","Ratakan ke wajah dan leher"]`,
			WaitTimeSecs: 120,
		},
	}

	for _, ps := range productSteps {
		if ps.ProductID != "" {
			db.Where("program_id = ? AND product_id = ? AND step_number = ?", ps.ProgramID, ps.ProductID, ps.StepNumber).FirstOrCreate(&ps)
		}
	}

	// 6. Community Groups
	groups := []models.SkinCommunityGroup{
		{Name: "Pejuang Barrier", Description: "Tempat berbagi tips pulihkan barrier kulit.", Icon: "health_and_safety"},
		{Name: "Glow Up Academy", Description: "Diskusi rutin mencerahkan wajah secara sehat.", Icon: "auto_awesome"},
	}
	for _, g := range groups {
		db.Where("name = ?", g.Name).FirstOrCreate(&g)
	}

	fmt.Println("✅ Complete Skin Journey Seeding Finished!")
}
