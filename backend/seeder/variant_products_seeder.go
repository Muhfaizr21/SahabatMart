package seeder

import (
	"akuglow/backend/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SeedVariantProducts membuat 5 produk demo dengan tipe berbeda-beda
// untuk mengetes tampilan Admin Product List (ProductList.jsx)
func SeedVariantProducts(db *gorm.DB) {
	fmt.Println("🧪 Seeding 5 Variant-Type Demo Products...")

	var supplier models.Supplier
	db.First(&supplier)
	supplierID := supplier.ID
	if supplierID == "" {
		supplierID = uuid.New().String()
	}

	// Pastikan kategori ada
	cats := []string{"Skincare", "Digital", "Bundle", "Afiliasi"}
	for _, cat := range cats {
		var existing models.Category
		db.Where("name = ?", cat).First(&existing)
		if existing.ID == 0 {
			db.Create(&models.Category{
				Name: cat,
				Slug: cat,
			})
		}
	}

	type productSeed struct {
		Product  models.Product
		Variants []models.ProductVariant
	}

	seeds := []productSeed{
		// 1. Produk Sederhana (simple)
		{
			Product: models.Product{
				Name:             "Serum Vitamin C — Brightening Glow",
				Slug:             "demo-serum-vitamin-c-brightening",
				SKU:              "DEMO-SIMPLE-001",
				ProductType:      "simple",
				Description:      "## Serum Vitamin C Premium\n\nSerum dengan kandungan **Vitamin C 15%** yang membantu:\n- Mencerahkan kulit kusam\n- Meratakan warna kulit\n- Melindungi dari radikal bebas\n\n### Cara Pakai\n1. Bersihkan wajah\n2. Oleskan 2-3 tetes ke wajah\n3. Tunggu terserap, lanjutkan dengan moisturizer",
				ShortDescription: "Serum Vitamin C 15% untuk kulit cerah glowing, bebas flek hitam.",
				Price:            135000,
				OldPrice:         175000,
				COGS:             65000,
				Category:         "Skincare",
				Brand:            "DemoGlow",
				Image:            "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
				Stock:            500,
				Weight:           30,
				Status:           "active",
				IsMaster:         true,
				MerchantID:       models.PusatID,
				SupplierID:       supplierID,
				SEOTitle:         "Serum Vitamin C Brightening | DemoGlow",
				SEOKeywords:      "serum vitamin c, brightening, glowing skin",
				Visibility:       "public",
			},
			Variants: []models.ProductVariant{
				{Name: "Standard (30ml)", SKU: "DEMO-SIMPLE-001-STD", Price: 135000, COGS: 65000, Stock: 500, Weight: 30},
			},
		},

		// 2. Produk Variabel (variable) — dengan multiple varian ukuran
		{
			Product: models.Product{
				Name:             "Moisturizer Hydra Boost — Multi Ukuran",
				Slug:             "demo-moisturizer-hydra-boost-variabel",
				SKU:              "DEMO-VAR-001",
				ProductType:      "variable",
				Description:      "## Moisturizer Hydra Boost\n\nTersedia dalam **3 ukuran berbeda** sesuai kebutuhan:\n\n### Keunggulan\n- Formula **Hyaluronic Acid + Ceramide**\n- Cocok untuk semua jenis kulit\n- Non-comedogenic, bebas paraben\n- **BPOM** & **Halal** certified\n\n### Varian Ukuran\n| Ukuran | Ketahanan |\n|--------|-----------|\n| 30ml | ~1 bulan |\n| 60ml | ~2 bulan |\n| 100ml | ~3 bulan |",
				ShortDescription: "Moisturizer Hyaluronic Acid tersedia 3 ukuran: 30ml, 60ml, 100ml.",
				Price:            89000,
				COGS:             40000,
				Category:         "Skincare",
				Brand:            "DemoGlow",
				Image:            "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
				Stock:            300,
				Weight:           50,
				Status:           "active",
				IsMaster:         true,
				MerchantID:       models.PusatID,
				SupplierID:       supplierID,
				Visibility:       "public",
			},
			Variants: []models.ProductVariant{
				{Name: "30ml", SKU: "DEMO-VAR-001-30ML", Price: 89000, COGS: 40000, Stock: 200, Weight: 50},
				{Name: "60ml", SKU: "DEMO-VAR-001-60ML", Price: 159000, COGS: 70000, Stock: 150, Weight: 90},
				{Name: "100ml", SKU: "DEMO-VAR-001-100ML", Price: 239000, COGS: 105000, Stock: 100, Weight: 140},
			},
		},

		// 3. Produk Digital / Unduhan
		{
			Product: models.Product{
				Name:             "E-Book: Panduan Lengkap Skincare Rutinitas Pagi & Malam",
				Slug:             "demo-ebook-panduan-skincare-rutinitas",
				SKU:              "DEMO-DIG-001",
				ProductType:      "digital",
				IsVirtual:        true,
				IsDownloadable:   true,
				Description:      "## E-Book Panduan Skincare Premium\n\n📚 **72 Halaman** panduan lengkap perawatan kulit:\n\n### Isi Konten\n- **Bab 1**: Mengenal Jenis Kulit\n- **Bab 2**: Rutinitas Pagi (AM Routine)\n- **Bab 3**: Rutinitas Malam (PM Routine)\n- **Bab 4**: Ingredient Aktif Wajib\n- **Bab 5**: Cara Memilih Produk\n- **Bab 6**: Common Skincare Mistakes\n\n> Akses langsung setelah pembayaran via link download.\n\n📧 Link juga dikirim ke email pembeli.",
				ShortDescription: "E-book 72 halaman panduan skincare lengkap. Akses langsung setelah bayar.",
				Price:            49000,
				COGS:             0,
				Category:         "Digital",
				Brand:            "DemoGlow Academy",
				Image:            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
				Stock:            99999,
				Weight:           0,
				Status:           "active",
				IsMaster:         true,
				MerchantID:       models.PusatID,
				SupplierID:       supplierID,
				Visibility:       "public",
				Note:             "Digital product — tidak perlu pengiriman fisik.",
			},
			Variants: []models.ProductVariant{
				{Name: "E-Book PDF", SKU: "DEMO-DIG-001-PDF", Price: 49000, COGS: 0, Stock: 99999, Weight: 0},
			},
		},

		// 4. Produk Bundel / Grup
		{
			Product: models.Product{
				Name:             "Paket Starter Skincare Lengkap — 5-in-1",
				Slug:             "demo-paket-starter-skincare-5in1",
				SKU:              "DEMO-GRP-001",
				ProductType:      "grouped",
				Description:      "## Paket Starter Skincare 5-in-1\n\n🎁 **Hemat 30%** dari beli satuan!\n\n### Isi Paket\n1. ✅ Facial Wash (100ml)\n2. ✅ Toner Niacinamide (100ml)\n3. ✅ Serum Vitamin C (15ml)\n4. ✅ Moisturizer SPF (30ml)\n5. ✅ Sunscreen PA++++ (30ml)\n\n### Manfaat Paket\n- **Pagi**: Facial Wash → Toner → Serum → Moisturizer SPF → Sunscreen\n- **Malam**: Facial Wash → Toner → Serum → Moisturizer\n\n🚚 Gratis ongkir untuk pembelian paket ini!",
				ShortDescription: "Paket 5 produk skincare lengkap: cleanser, toner, serum, moisturizer & sunscreen.",
				Price:            349000,
				OldPrice:         499000,
				COGS:             175000,
				Category:         "Bundle",
				Brand:            "DemoGlow",
				Image:            "https://images.unsplash.com/photo-1608248597481-496100c80836?w=400",
				Stock:            100,
				Weight:           350,
				Status:           "active",
				IsMaster:         true,
				MerchantID:       models.PusatID,
				SupplierID:       supplierID,
				Visibility:       "public",
			},
			Variants: []models.ProductVariant{
				{Name: "Paket Lengkap", SKU: "DEMO-GRP-001-FULL", Price: 349000, COGS: 175000, Stock: 100, Weight: 350},
			},
		},

		// 5. Produk Eksternal / Afiliasi
		{
			Product: models.Product{
				Name:             "Sunscreen SPF50 PA++++ (Referral Shopee)",
				Slug:             "demo-sunscreen-spf50-eksternal-afiliasi",
				SKU:              "DEMO-EXT-001",
				ProductType:      "external",
				Description:      "## Sunscreen SPF50 PA++++ (Produk Afiliasi)\n\n☀️ Perlindungan UV terbaik dengan formula **Invisible + Lightweight**.\n\n### Keunggulan\n- SPF 50 PA++++\n- Tidak meninggalkan white cast\n- Cocok sebagai base makeup\n- Tahan air 80 menit\n\n### Cara Beli\nKlik tombol **\"Beli Sekarang\"** untuk diarahkan ke halaman Shopee.\n\n> Produk ini adalah produk afiliasi. Pembelian dilakukan di platform eksternal dan komisi akan dikreditkan ke akun mitra Anda.",
				ShortDescription: "Sunscreen SPF50 PA++++ via afiliasi Shopee. Klik untuk beli langsung.",
				Price:            85000,
				COGS:             0,
				Category:         "Afiliasi",
				Brand:            "Brand Eksternal",
				Image:            "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400",
				Stock:            0,
				Weight:           0,
				Status:           "active",
				IsMaster:         true,
				MerchantID:       models.PusatID,
				SupplierID:       supplierID,
				Visibility:       "public",
				Note:             "External affiliate product — link ke Shopee.",
			},
			Variants: []models.ProductVariant{
				{Name: "External Link", SKU: "DEMO-EXT-001-LINK", Price: 85000, COGS: 0, Stock: 0, Weight: 0},
			},
		},
	}

	for _, seed := range seeds {
		var existing models.Product
		db.Where("slug = ?", seed.Product.Slug).First(&existing)

		var productID string
		if existing.ID == "" {
			seed.Product.ID = uuid.New().String()
			if err := db.Create(&seed.Product).Error; err != nil {
				fmt.Printf("  ❌ Gagal buat produk '%s': %v\n", seed.Product.Name, err)
				continue
			}
			productID = seed.Product.ID
			fmt.Printf("  ✅ Produk baru: [%s] %s\n", seed.Product.ProductType, seed.Product.Name)
		} else {
			productID = existing.ID
			db.Model(&existing).Updates(map[string]interface{}{
				"product_type":      seed.Product.ProductType,
				"is_virtual":        seed.Product.IsVirtual,
				"is_downloadable":   seed.Product.IsDownloadable,
				"short_description": seed.Product.ShortDescription,
			})
			fmt.Printf("  🔄 Update: [%s] %s\n", seed.Product.ProductType, seed.Product.Name)
		}

		// Seed variants
		for _, v := range seed.Variants {
			var ev models.ProductVariant
			db.Where("product_id = ? AND name = ?", productID, v.Name).First(&ev)
			if ev.ID == "" {
				v.ID = uuid.New().String()
				v.ProductID = productID
				if err := db.Create(&v).Error; err != nil {
					fmt.Printf("    ❌ Gagal buat varian '%s': %v\n", v.Name, err)
					continue
				}
				fmt.Printf("    ↳ Varian: %s (Rp %.0f)\n", v.Name, v.Price)

				// Create inventory for this variant
				variantID := v.ID
				db.Where(models.Inventory{MerchantID: models.PusatID, ProductID: productID, ProductVariantID: &variantID}).
					Assign(models.Inventory{Stock: v.Stock}).
					FirstOrCreate(&models.Inventory{})
			} else {
				db.Model(&ev).Updates(map[string]interface{}{
					"price": v.Price,
					"cogs":  v.COGS,
				})
			}
		}

		// Base product inventory (set to 0 since we have variants)
		db.Where(models.Inventory{MerchantID: models.PusatID, ProductID: productID, ProductVariantID: nil}).
			Assign(models.Inventory{Stock: 0}).
			FirstOrCreate(&models.Inventory{})
	}

	fmt.Println("✅ 5 Demo Variant Products seeded successfully!")
}
