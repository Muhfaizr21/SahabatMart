package seeder

import (
	"SahabatMart/backend/models"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedAkuglowProducts(db *gorm.DB) {
	fmt.Println("🛍️ Seeding Akuglow Products (Deep Scraped)...")

	// 1. Get Categories & Supplier Mapping
	var cats []models.Category
	db.Find(&cats)
	
	var supplier models.Supplier
	db.First(&supplier)
	supplierID := supplier.ID
	if supplierID == "" {
		supplierID = uuid.New().String() // Fallback if no supplier exists yet
	}

	catMap := make(map[string]string)
	for _, c := range cats {
		catMap[c.Name] = c.Name
	}

	// Ensure our specific categories exist
	requiredCats := []string{"Face Care", "Body Care", "Package"}
	for _, c := range requiredCats {
		if _, ok := catMap[c]; !ok {
			slug := strings.ToLower(strings.ReplaceAll(c, " ", "-"))
			newCat := models.Category{Name: c, Slug: slug}
			db.Create(&newCat)
			catMap[c] = c
		}
	}

	// 2. Define Products
	products := []models.Product{
		{
			Name:        "Akuglow Body Lotion – Kulit Cerah & Lembap",
			Slug:        "akuglow-dna-salmon-lotion",
			SKU:         "AKU-BODY-001",
			Description: "✨ Manfaat Utama:\n- Mencerahkan kulit kusam & meratakan warna kulit\n- Menyamarkan noda hitam dan flek\n- Melembapkan kulit secara intensif\n- Menenangkan kulit sensitif\n- Membuat kulit halus, kenyal, dan glowing alami\n\n🧪 Kandungan Utama:\n- DNA Salmon Extract – Membantu regenerasi sel kulit\n- Niacinamide – Mengurangi noda hitam\n- Glycerin – Melembapkan kulit\n- Vitamin E – Antioxidant alami\n\n📝 Cara Pakai:\n1. Bersihkan kulit terlebih dahulu\n2. Ambil Akuglow DNA Salmon Lotion secukupnya\n3. Oleskan merata ke seluruh tubuh\n4. Pijat lembut hingga terserap sempurna",
			Price:       149500,
			Category:    "Body Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/dna-salmon-3.webp",
			Stock:       1000,
			Weight:      200,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "AkuGlow Calming Barrier Moisturizer Gel",
			Slug:        "akuglow-calming-barrier",
			SKU:         "AKU-FACE-001",
			Description: "🛡️ Manfaat Utama:\n- Memperbaiki skin barrier yang rusak\n- Mengurangi kemerahan & iritasi\n- Melembapkan tanpa menyumbat pori\n- Menenangkan kulit sensitif\n\n💎 Keunggulan:\n- Non-Comedogenic & Alcohol-Free\n- Paraben-Free & Aman untuk Bumil/Busui\n- BPOM & Halal Certified\n\n💡 Cara Pakai:\n1. Gunakan pagi dan malam hari setelah toner\n2. Aplikasikan secukupnya ke wajah dan leher\n3. Pijat lembut hingga meresap",
			Price:       119700,
			Category:    "Face Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/Calming-barier-4.webp",
			Stock:       1000,
			Weight:      50,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "AkuGlow Krim Malam",
			Slug:        "akuglow-krim-malam",
			SKU:         "AKU-FACE-002",
			Description: "🌙 Manfaat Utama:\n- Mencerahkan kulit saat tidur\n- Menyamarkan noda hitam & bekas jerawat\n- Memperbaiki tekstur kulit & pori-pori\n- Wajah glowing di pagi hari\n\n🔬 Kandungan Aktif:\n- Niacinamide & Collagen\n- Alpha Arbutin & Vitamin E\n\n✨ Cara Pakai:\n- Gunakan setiap malam sebelum tidur\n- Oleskan merata ke seluruh wajah & leher\n- Biarkan bekerja semalaman",
			Price:       94500,
			OldPrice:    100000,
			Category:    "Face Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/night-cream-boster-3.webp",
			Stock:       1000,
			Weight:      15,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "AkuGlow Krim Siang",
			Slug:        "akuglow-krim-siang",
			SKU:         "AKU-FACE-003",
			Description: "☀️ Manfaat Utama:\n- Instant brightening (Cerah seketika)\n- Perlindungan UV (UVA/UVB Protection)\n- Melembapkan tanpa rasa lengket\n- Menyamarkan noda hitam\n\n🧬 Kandungan Aktif:\n- Niacinamide & Alpha Arbutin\n- Vitamin C & DNA Salmon\n\n✅ Cara Pakai:\n1. Gunakan setiap pagi setelah membersihkan wajah\n2. Oleskan merata pada wajah dan leher\n3. Tunggu hingga meresap sebelum makeup",
			Price:       85000,
			OldPrice:    150000,
			Category:    "Face Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/daycream-2.webp",
			Stock:       1000,
			Weight:      15,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "AkuGlow Night Booster",
			Slug:        "akuglow-night-booster",
			SKU:         "AKU-FACE-004",
			Description: "🚀 Manfaat Utama:\n- Solusi wajah “badak” yang susah putih\n- Memudarkan flek hitam menahun\n- Mengangkat sel kulit mati\n- Membuat kulit licin & glowing\n\n🧪 Kandungan Aktif:\n- Hexylresorcinol & Alpha Arbutin\n- Niacinamide & Vitamin E\n- Marine Collagen\n\n⚠️ Cara Pakai:\n- Gunakan khusus pada malam hari\n- Oleskan tipis merata ke seluruh wajah",
			Price:       99500,
			Category:    "Face Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/night-cream-boster-3.webp",
			Stock:       1000,
			Weight:      15,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "Akuglow Sabun Wajah",
			Slug:        "akuglow-sabun-wajah",
			SKU:         "AKU-FACE-005",
			Description: "🧼 Manfaat Utama:\n- Membersihkan minyak & debu secara total\n- Menjaga kelembapan (Deep Hydration)\n- Menguatkan skin barrier\n\n🌿 Kandungan:\n- Glycerin & Butylene Glycol\n- Coco Glucoside (Pembersih Alami)",
			Price:       85000,
			Category:    "Face Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/facial-foam-4.webp",
			Stock:       1000,
			Weight:      100,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "Akuglow Toner Wajah",
			Slug:        "akuglow-toner-wajah",
			SKU:         "AKU-FACE-006",
			Description: "💧 Manfaat Utama:\n- Menyeimbangkan pH kulit\n- Mencerahkan kulit kusam\n- Membantu penyerapan skincare selanjutnya\n\n🌟 Kandungan:\n- Niacinamide & Hyaluronic Acid\n- Allantoin & Aloe Vera Extract",
			Price:       75000,
			Category:    "Face Care",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/toner-3.webp",
			Stock:       1000,
			Weight:      100,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "Paket Akuglow Whitening Cream",
			Slug:        "paket-akuglow-whitening",
			SKU:         "AKU-PKG-001",
			Description: "🎁 Isi Paket Lengkap:\n1. Day Cream SPF Hybrid (10gr)\n2. Night Cream (10gr)\n3. Facial Foam Brush (100ml)\n4. Toner (100ml)\n5. Pouch Eksklusif + Brosur\n\n🏆 Manfaat Utama:\n- Mencerahkan & memutihkan kulit kusam\n- Memudarkan flek hitam & bekas jerawat\n- Mengecilkan pori & mengontrol minyak\n- Wajah glowing, sehat, dan merona alami",
			Price:       274500,
			Category:    "Package",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2025/10/paketan-1.webp",
			Stock:       1000,
			Weight:      500,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
		{
			Name:        "Paket Skin Barrier",
			Slug:        "paket-skin-barrier-recovery",
			SKU:         "AKU-PKG-002",
			Description: "🚑 Solusi Terbaik Untuk:\n- Kulit sensitif & kemerahan\n- Breakout, Beruntusan, Jerawat meradang\n- Kulit rusak akibat over-eksfoliasi\n\n📦 Isi Paket:\n1. Gentle Facial Foam (SLS-Free)\n2. Calming Barrier Gel Soothing Moisturizer\n3. Day Cream Sunscreen (Non-comedogenic)",
			Price:       256000,
			Category:    "Package",
			Brand:       "AkuGlow",
			Image:       "https://akuglow.com/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-16-at-20.09.53.jpeg",
			Stock:       1000,
			Weight:      500,
			Status:      "active",
			IsMaster:    true,
			MerchantID:  models.PusatID,
			SupplierID:  supplierID,
		},
	}

	for _, p := range products {
		var existing models.Product
		db.Where("slug = ?", p.Slug).First(&existing)
		
		if existing.ID == "" {
			p.ID = uuid.New().String()
			db.Create(&p)
			existing = p
		} else {
			db.Model(&existing).Updates(p)
		}

		// Create Standard Variant
		db.Where(models.ProductVariant{ProductID: existing.ID, Name: "Standard"}).
			Assign(models.ProductVariant{
				ID:    uuid.New().String(),
				SKU:   existing.SKU + "-STD",
				Price: existing.Price,
				Stock: 1000,
			}).FirstOrCreate(&models.ProductVariant{})

		// Ensure Inventory for Pusat
		db.Where(models.Inventory{MerchantID: models.PusatID, ProductID: existing.ID}).
			Assign(models.Inventory{Stock: 1000}).
			FirstOrCreate(&models.Inventory{})
	}

	fmt.Println("✅ Akuglow Products Seeded Successfully!")
}
