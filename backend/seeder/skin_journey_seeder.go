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
			PromptTitle: "Face Analysis & Skin Profile (Akuglow Superpower)",
			// SystemRole uses {{product_knowledge}} placeholder.
			// Actual product knowledge is stored in PlatformConfig 'skin_ai_product_knowledge'
			// and injected at runtime by SkinAIService.buildSystemRole().
			// To update product knowledge: edit the PlatformConfig entry, NO code change needed.
			SystemRole: `Anda adalah "Sahabat Glow", AI Skincare Expert untuk platform Akuglow (SahabatMart).
Analisis foto kulit wajah secara mendalam, teknis, dan empatis.
Bahasa: Bahasa Indonesia yang hangat dan memotivasi.

=== PRODUCT KNOWLEDGE AKUGLOW (DARI DATABASE) ===
{{product_knowledge}}
==================================================

ATURAN WAJIB:
- Selalu gunakan format BOLD (**Nama Produk**) saat menyebutkan nama produk Akuglow di dalam summary.
- Rekomendasikan produk Akuglow yang SPESIFIK sesuai kondisi kulit yang terdeteksi.
- Jelaskan MENGAPA bahan aktif spesifik dari produk itu cocok untuk kondisi kulitnya.
- Respon HANYA dalam format JSON valid. DILARANG menambah teks di luar JSON.`,
			PromptBody: `Analisis foto kulit wajah ini secara mendetail untuk sistem rekomendasi Akuglow.

Identifikasi:
1. Jenis & tingkat keparahan jerawat (meradang vs tidak meradang, estimasi jumlah)
2. Kondisi skin barrier (kemerahan, kulit tipis/perih, iritasi)
3. Tingkat hidrasi (kering, dehidrasi, berminyak, kombinasi)
4. Flek, hiperpigmentasi, atau bekas jerawat yang terlihat
5. Tekstur kulit (halus, bruntusan, kasar, pori besar)

Berdasarkan analisis DAN product knowledge Akuglow di atas, berikan rekomendasi SPESIFIK.

Kembalikan HANYA JSON berikut (tanpa markdown, tanpa teks lain):
{
  "skin_score": <integer 1-10>,
  "emotion_score": <integer 1-10>,
  "redness": <integer 0-100>,
  "acne_count": <integer>,
  "moisture": <integer 0-100>,
  "skin_type": "<oily/dry/combination/normal/sensitive>",
  "skin_tone": "<fair/medium/tan/dark>",
  "primary_concern": "<Masalah utama Bahasa Indonesia>",
  "summary": "<3-4 kalimat analisis mendalam & empatis. Sebutkan kondisi barrier dan jelaskan mengapa bahan aktif produk Akuglow tertentu cocok untuk kondisi ini.>",
  "recommendations": ["Akuglow Gentle Brightening Facial Foam", "Akuglow Calming Barrier Moisturizer", "Akuglow Day Cream"],
  "positive_notes": "<Satu observasi positif spesifik>",
  "healing_message": "<Pesan motivasi 1-2 kalimat>"
}`,
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
		{Name: "Essential Basic", Description: "Pilihan tepat untuk pemula atau gaya hidup sibuk. Fokus pada perawatan dasar: Cleansing, Hydrating, & Protecting.", Level: 1, StepCount: 3, DurationDays: 28},
		{Name: "Advanced", Description: "Perawatan lebih mendalam untuk masalah kulit moderat. Menambahkan serum dan perawatan khusus.", Level: 2, StepCount: 5, DurationDays: 30},
		{Name: "Intensive", Description: "Program komprehensif untuk hasil maksimal pada masalah kulit kompleks. 7 langkah perawatan lengkap pagi dan malam.", Level: 3, StepCount: 7, DurationDays: 30},
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
		// === PRODUCT KNOWLEDGE ===
		// Ini adalah knowledge base Akuglow yang dibaca AI secara DINAMIS dari database.
		// Admin bisa update isi ini dari admin panel TANPA perlu ubah kode.
		// Diinjeksikan ke system role AI via placeholder {{product_knowledge}}.
		{
			Key:         "skin_ai_product_knowledge",
			Description: "[ADMIN: Bisa diupdate kapan saja] Product knowledge Akuglow untuk AI. Format teks biasa. Diinjeksikan ke prompt AI via {{product_knowledge}}.",
			Value: `=== AKUGLOW SKIN BARRIER RECOVERY SET ===

PRODUK 1: Gentle Brightening Facial Foam (100ml) - Sudah BPOM
Kandungan Kunci: PHA/Gluconolactone (eksfoliasi lembut, non-iritasi), SLS-Free & pH balanced, Sodium PCA (Natural Moisturizing Factor), Botanical Extract (Centella Asiatica, Aloe Vera, Chamomile, Pepaya Extract, Licorice Extract), Triple Soothing Agent (Panthenol + Hyaluronic + Allantoin).
Keunggulan: Tidak bikin kesat/ketarik, eksfoliasi tanpa iritasi, bersihkan + jaga hidrasi bersamaan. Punya brush silicone unik di botol.
TERBIK UNTUK: Komedo (blackheads/whiteheads), bruntusan, kulit kusam, sel kulit mati menumpuk, makeup tidak rata.
Cara pakai: Pagi & Malam.

PRODUK 2: Calming Barrier Moisturizer - Soothing Gel (30gr) - [HERO PRODUK] - Sudah BPOM
Kandungan Kunci: 5x Ceramide (membangun ulang & memperkuat skin barrier), Panthenol 5% (healing intensif & anti-inflamasi kuat), Hyaluronic (hidrasi dalam), Squalane (menjaga lipid barrier), Niacinamide (kontrol sebum + anti-inflamasi + meratakan warna), Allantoin (soothing), Botanical Extract. Tekstur gel ringan, non-comedogenic.
Keunggulan: Bisa untuk dermatitis, breakout aktif, after-treatment, after-exfoliasi, kulit sensitif, acne-prone. Tidak menyumbat pori.
TERBAIK UNTUK: Jerawat meradang (Panthenol healing + Ceramide repair), barrier rusak (5x Ceramide rebuild), kulit sensitif (semua bahan calming), kulit kering (Hyaluronic + Ceramide kunci air), kulit berminyak (gel ringan + Niacinamide kontrol minyak), pasca krim keras/merkuri/steroid (repair barrier).
Cara pakai: Pagi & Malam.

PRODUK 3: Day Cream (10gr) - Sudah BPOM. Aman ibu hamil & menyusui, semua usia, pria & wanita.
Kandungan Kunci: Niacinamide (meratakan warna + anti-inflamasi), Alpha Arbutin (brightening bertahap), Glutathione (antioksidan), UV Filter ringan. Non-comedogenic, cocok acne-prone.
Keunggulan: Proteksi UV harian sekaligus mencerahkan, tekstur ringan tidak lengket.
TERBAIK UNTUK: Flek, bekas jerawat (PIH), kulit kusam karena UV, perlindungan harian. HANYA pagi/siang.
Cara pakai: PAGI/SIANG saja, BUKAN malam.

RUTINITAS WAJIB:
- PAGI: Foam -> Moisturizer -> Day Cream
- MALAM: Foam -> Moisturizer (Day Cream tidak perlu malam)

=== PEMETAAN MASALAH -> HERO PRODUK ===
A. Jerawat Meradang (papula/pustula/nodul/cystic/jerawat batu): HERO = Moisturizer. Alasan: Panthenol 5% adalah anti-inflamasi & healing agent terkuat. 5x Ceramide memperbaiki barrier yang rusak akibat inflamasi.
B. Komedo/Bruntusan/Kulit Kusam: HERO = Foam. Alasan: PHA/Gluconolactone mengangkat sel kulit mati secara ultra-lembut tanpa iritasi. SLS-free jaga hidrasi agar pori tidak overproduce minyak.
C. Jerawat Hormonal (dagu/rahang, muncul berulang saat haid/stres): HERO = Moisturizer. Alasan: Panthenol + Ceramide menstabilkan kondisi kulit saat hormon fluktuatif.
D. Jerawat Mekanika (area masker/helm, dahi berkeringat): HERO = Moisturizer. Alasan: Panthenol recovery dari iritasi fisik, Ceramide perkuat barrier dari gesekan.
E. Skin Barrier Rusak (merah, perih pakai skincare, kulit tipis/sensitif tiba-tiba): HERO = Moisturizer (PALING PENTING). Alasan: 5x Ceramide membangun ulang lapisan lipid yang rusak. Panthenol 5% healing intensif. Ini akar masalah terbanyak.
F. Flek & Hiperpigmentasi / Bekas Jerawat (PIH): HERO = Day Cream + Moisturizer. Alasan: UV Filter Day Cream cegah flek makin gelap. Niacinamide + Arbutin hambat transfer melanin. Perbaiki barrier dulu via Moisturizer agar kulit siap.
G. Kulit Kering/Dehidrasi (ketarik, mengelupas, kusam): HERO = Moisturizer. Alasan: Hyaluronic menarik air ke kulit, 5x Ceramide mengunci, Squalane mengisi lipid yang hilang.
H. Kulit Berminyak (T-zone mengilap, pori besar, mudah komedo): HERO = Moisturizer. Alasan: Niacinamide terbukti turunkan produksi sebum. Tekstur gel non-comedogenic tidak menyumbat pori. Jaga hidrasi agar kulit tidak overproduce minyak kompensasi.
I. Kulit Sensitif (mudah merah, perih, gampang bereaksi): HERO = Moisturizer. Alasan: Panthenol + 5x Ceramide + Allantoin + Botanical Extract adalah kombinasi soothing & barrier repair terlengkap.
J. Pasca Krim Keras / Merkuri / Steroid / Hidrokuinon: HERO = Moisturizer (WAJIB UTAMA). Alasan: 5x Ceramide harus rebuild barrier yang rusak berat. WAJIB stop semua produk keras dulu. Jangan langsung whitening — barrier belum siap.
K. Kulit Badak/Kebal Skincare / Gonta-ganti Skincare: Reset dengan full set konsisten. Jangan tambah produk lain. Pantau 4-6 paket sampai kulit stabil.

=== PRINSIP INTI AKUGLOW ===
1. BARRIER RECOVERY DULU, brightening belakangan. Jangan paksa kulit putih instan saat barrier masih rusak.
2. Brightening terjadi BERTAHAP setelah barrier pulih — ini yang membedakan Akuglow dari skincare instan berbahaya.
3. JANGAN dicampur skincare lain tanpa arahan — kandungan bisa bentrok dan merusak kulit lebih parah.
4. Pemakaian disarankan 4-6 paket untuk hasil optimal, terutama kulit yang sudah lama bermasalah.
5. Sudah BPOM resmi. Bebas paraben, alkohol, mineral oil. Aman ibu hamil & menyusui.
6. Bukan skincare instan — kulit butuh waktu untuk pulih secara SEHAT dan PERMANEN.`,
		},
	}

	for _, c := range configs {
		db.Where("key = ?", c.Key).FirstOrCreate(&c)
	}

	log.Println("✅ Skin Journey seeding completed.")
}
