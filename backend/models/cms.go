package models

import (
	"encoding/json"
	"time"
)

type CMSPlatform string

const (
	PlatformLandingPage    CMSPlatform = "landing_page"
	PlatformAffiliateDash  CMSPlatform = "affiliate_dashboard"
	PlatformMerchantDash   CMSPlatform = "merchant_dashboard"
)

func (p CMSPlatform) Label() string {
	switch p {
	case PlatformLandingPage:
		return "Landing Page"
	case PlatformAffiliateDash:
		return "Affiliate Dashboard"
	case PlatformMerchantDash:
		return "Merchant Dashboard"
	}
	return string(p)
}

// ─── SiteTheme ─────────────────────────────────────────────────────────────────
type ThemeColors struct {
	Primary   string `json:"primary"`
	Secondary string `json:"secondary"`
	Accent    string `json:"accent"`
	Background string `json:"background"`
	Text       string `json:"text"`
	Muted      string `json:"muted"`
	Border     string `json:"border"`
	Card       string `json:"card"`
	Success    string `json:"success"`
	Warning    string `json:"warning"`
	Error      string `json:"error"`
}

type ThemeTypography struct {
	FontFamily   string            `json:"font_family"`
	HeadingFont  string            `json:"heading_font"`
	BaseSize     string            `json:"base_size"` // e.g. "16px"
	HeadingSizes map[string]string `json:"heading_sizes"` // h1-h6
}

type ThemeSpacing struct {
	SectionPadding string `json:"section_padding"`
	ContainerWidth string `json:"container_width"`
	BorderRadius   string `json:"border_radius"`
	Gap            string `json:"gap"`
}

type ThemeLogo struct {
	URL    string `json:"url"`
	Width  string `json:"width"`
	Height string `json:"height"`
	Alt    string `json:"alt"`
}

type SiteTheme struct {
	ID        string           `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Platform  CMSPlatform      `gorm:"type:varchar(50);uniqueIndex;not null" json:"platform"`
	Name      string           `gorm:"type:varchar(255)" json:"name"`

	Colors        ThemeColors     `gorm:"type:jsonb;serializer:json" json:"colors"`
	Typography    ThemeTypography `gorm:"type:jsonb;serializer:json" json:"typography"`
	Spacing       ThemeSpacing    `gorm:"type:jsonb;serializer:json" json:"spacing"`
	Logo          ThemeLogo       `gorm:"type:jsonb;serializer:json" json:"logo"`

	CustomCSS     string          `gorm:"type:text" json:"custom_css"`
	IsPublished   bool            `gorm:"default:false" json:"is_published"`

	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

func (SiteTheme) TableName() string { return "site_themes" }

// DefaultTheme returns sensible defaults for a platform
func DefaultTheme(platform CMSPlatform) *SiteTheme {
	return &SiteTheme{
		Platform: platform,
		Name:     "Default " + platform.Label(),
		Colors: ThemeColors{
			Primary:   "#4f46e5",
			Secondary: "#7c3aed",
			Accent:    "#f59e0b",
			Background: "#ffffff",
			Text:       "#1e1b4b",
			Muted:      "#64748b",
			Border:     "#e2e8f0",
			Card:       "#f8fafc",
			Success:    "#10b981",
			Warning:    "#f59e0b",
			Error:      "#ef4444",
		},
		Typography: ThemeTypography{
			FontFamily:  "Inter, system-ui, sans-serif",
			HeadingFont: "Inter, system-ui, sans-serif",
			BaseSize:    "16px",
			HeadingSizes: map[string]string{
				"h1": "2.5rem", "h2": "2rem", "h3": "1.5rem",
				"h4": "1.25rem", "h5": "1rem", "h6": "0.875rem",
			},
		},
		Spacing: ThemeSpacing{
			SectionPadding: "4rem",
			ContainerWidth: "1200px",
			BorderRadius:   "0.75rem",
			Gap:            "1.5rem",
		},
		Logo: ThemeLogo{
			Width:  "auto",
			Height: "40px",
			Alt:    "Logo",
		},
		IsPublished: false,
	}
}

// ─── SiteSection ───────────────────────────────────────────────────────────────
type SiteSection struct {
	ID        string       `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Platform  CMSPlatform  `gorm:"type:varchar(50);index;not null" json:"platform"`
	Page      string       `gorm:"type:varchar(100);index;not null;default:'home'" json:"page"` // page identifier
	Key       string       `gorm:"type:varchar(100);not null" json:"key"`                       // unique key per platform+page
	Title     string       `gorm:"type:varchar(255)" json:"title"`
	Subtitle  string       `gorm:"type:text" json:"subtitle"`
	Content   json.RawMessage `gorm:"type:jsonb;serializer:json" json:"content"`
	Variant   string       `gorm:"type:varchar(50);default:'default'" json:"variant"`
	Order     int          `gorm:"default:0" json:"order"`
	IsActive  bool         `gorm:"default:true" json:"is_active"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SiteSection) TableName() string { return "site_sections" }

// ─── SiteMenu ──────────────────────────────────────────────────────────────────
type MenuItem struct {
	Label    string      `json:"label"`
	URL      string      `json:"url"`
	Icon     string      `json:"icon,omitempty"`
	IsActive bool        `json:"is_active"`
	Order    int         `json:"order"`
	Children []*MenuItem `json:"children,omitempty"`
}

type SiteMenu struct {
	ID        string      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Platform  CMSPlatform `gorm:"type:varchar(50);index;not null" json:"platform"`
	Location  string      `gorm:"type:varchar(50);not null;default:'main'" json:"location"` // main, footer, sidebar
	Name      string      `gorm:"type:varchar(255)" json:"name"`
	Items     []*MenuItem `gorm:"type:jsonb;serializer:json" json:"items"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SiteMenu) TableName() string { return "site_menus" }

// ─── SiteAsset ─────────────────────────────────────────────────────────────────
type SiteAsset struct {
	ID        string      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Platform  CMSPlatform `gorm:"type:varchar(50);index" json:"platform"`
	Label     string      `gorm:"type:varchar(255)" json:"label"`
	FileName  string      `gorm:"type:varchar(255);not null" json:"file_name"`
	URL       string      `gorm:"type:text;not null" json:"url"`
	MimeType  string      `gorm:"type:varchar(100)" json:"mime_type"`
	FileSize  int64       `json:"file_size"`
	AltText   string      `gorm:"type:varchar(500)" json:"alt_text"`
	Category  string      `gorm:"type:varchar(100);default:'general'" json:"category"` // logo, background, icon, illustration

	CreatedAt time.Time `json:"created_at"`
}

func (SiteAsset) TableName() string { return "site_assets" }

// ─── SitePageContent — full page text content ──────────────────────────────────
// Stores all editable text for a page as structured JSON.
// Admin edits via PageContentEditor; frontend pages fetch via public API.
type SitePageContent struct {
	ID        string      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Platform  CMSPlatform `gorm:"type:varchar(50);index;not null" json:"platform"`
	Page      string      `gorm:"type:varchar(100);index;not null" json:"page"` // home, about, shop, business, blog, contact
	Content   json.RawMessage `gorm:"type:jsonb;serializer:json" json:"content"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

func (SitePageContent) TableName() string { return "site_page_contents" }

// DefaultPageContent returns starter content for a given page
func DefaultPageContent(page string) json.RawMessage {
	defaults := map[string]interface{}{
				"home": map[string]interface{}{
			"features": []map[string]interface{}{
				{"icon": "check-circle", "title": "Good Quality", "desc": "Bahan alami dan formula premium Korea."},
				{"icon": "user-voice", "title": "Best Service", "desc": "Layanan pelanggan 24 jam dan konsultasi gratis."},
				{"icon": "truck", "title": "Fast & Save", "desc": "Pengiriman cepat ke seluruh Indonesia dengan jaminan keaslian."},
				{"icon": "badge-check", "title": "BPOM Certified", "desc": "Produk kami telah terdaftar resmi dan aman digunakan."},
			},
			"stats": []map[string]interface{}{
				{"value": "5+", "label": "Tahun Pengalaman"},
				{"value": "20K+", "label": "Produk Terjual"},
				{"value": "7M+", "label": "Pengguna Puas"},
				{"value": "4+", "label": "Mitra Toko Resmi"},
			},
			"testimonials_title": "Apa Kata Mereka",
			"footer_copyright": "© 2024 AkuGlow. All rights reserved.",
		},
		"about": map[string]interface{}{
			"hero_title": "Kenalan Lebih Dekat dengan Akuglow",
			"hero_subtitle": "Perjalanan kami dalam menghadirkan kecantikan alami",
			"mission": "Memberikan edukasi kecantikan yang tepat, menyediakan produk berkualitas tinggi dengan harga terjangkau, dan membangun komunitas yang sehat.",
			"vision": "Menjadi brand skincare nomor satu yang dipercaya masyarakat Indonesia untuk solusi kecantikan kulit sehat alami yang berkelanjutan.",
			"story": `AkuGlow lahir dari semangat untuk memberdayakan setiap individu agar memiliki kepercayaan diri melalui kulit yang sehat dan bercahaya. Kami memahami bahwa kecantikan bukan sekadar tampilan luar, melainkan refleksi dari kesehatan dan kebahagiaan batin.

Dengan riset mendalam dan kolaborasi bersama para ahli dermatologi, kami menghadirkan rangkaian produk skincare premium yang diformulasikan khusus untuk iklim tropis. Setiap tetes produk kami mengandung bahan aktif berkualitas tinggi yang aman dan teruji.`,
			"team_title": "Tim Kami",
		},
		"shop": map[string]interface{}{
			"hero_title": "Koleksi Premium",
			"hero_subtitle": "Temukan rangkaian produk perawatan kulit terbaik yang diformulasikan khusus untuk kecantikan alami Anda.",
			"filter_title": "Filter Produk",
			"sort_title": "Urutkan",
		},
		"business": map[string]interface{}{
			"hero_title": "PELUANG BISNIS SKINCARE RESMI",
			"hero_headline": "Pelanggan Jadi Asetmu, Komisi Masuk Selamanya",
			"hero_subtitle": "Bisnis skincare premium tanpa modal, tanpa stok. Cukup bagikan link, ajak mitra, dan dapatkan penghasilan jutaan rupiah setiap bulan — bahkan saat tidur sekalipun.",
			"hero_cta_text": "Daftar Gratis Sekarang",
			"hero_cta_url": "/register?ref=",
			"hero_cta_secondary": "Lihat Simulasi Komisi",
			"hero_video_title": "VIDEO PRESENTASI BISNIS AKUGLOW !",
			"hero_video_url": "",
			"difference_title": "Kenapa Bisnis Ini Berbeda?",
			"difference_subtitle": "Tidak ada bisnis lain yang semudah dan sefleksibel ini.",
			"differences": []map[string]interface{}{
				{"icon": "money_off", "title": "Tanpa Modal", "desc": "Mulai bisnis 100% gratis, tidak ada biaya apapun."},
				{"icon": "inventory_2", "title": "Tanpa Stok", "desc": "Tidak perlu gudang atau menumpuk barang di rumah."},
				{"icon": "local_shipping", "title": "Tanpa Kirim", "desc": "Semua pengiriman ke pelanggan diurus oleh pusat."},
				{"icon": "smartphone", "title": "Cukup dari HP", "desc": "Kelola bisnis kapan saja dan di mana saja."},
			},
			"how_it_works_title": "Cara Kerjanya Sangat Simpel",
			"how_it_works_subtitle": "Hanya 4 langkah untuk mulai menghasilkan komisi",
			"steps": []map[string]interface{}{
				{"number": "01", "title": "Daftar Mitra Gratis", "desc": "Daftar sebagai mitra di AkuGlow.com tanpa biaya apapun. Tidak ada minimum pembelian."},
				{"number": "02", "title": "Ambil Link Unikmu", "desc": "Gunakan link produk atau link pendaftaran unik dari Dashboard Member Anda."},
				{"number": "03", "title": "Bagikan Konten", "desc": "Share ke WhatsApp, TikTok, atau Instagram. Foto & video promosi sudah kami siapkan."},
				{"number": "04", "title": "Komisi Masuk Otomatis", "desc": "Dapatkan komisi otomatis dari setiap transaksi yang terjadi melalui link Anda."},
			},
			"pricing_title": "Struktur Komisi Member",
			"pricing_subtitle": "Pilih paket yang sesuai dengan target penghasilan Anda",
			"plans": []map[string]interface{}{
				{
					"name": "FREE MEMBER", "badge": "", "price_label": "Gratis, tanpa biaya pendaftaran",
					"levels": []map[string]interface{}{
						{"level": "Level 1", "desc": "Komisi langsung dari jaringan Anda", "rate": "10%"},
						{"level": "Level 2", "desc": "Komisi dari jaringan level 2", "rate": "5%"},
						{"level": "Level 3–5", "desc": "Tidak tersedia untuk Free Member", "rate": "—"},
					},
					"potential": "Potensi Komisi Duplikasi 5 Orang",
					"potential_value": "Maks. Rp 175.000/bln",
					"cta_text": "Mulai Gratis", "cta_url": "/register?ref=", "popular": false,
				},
				{
					"name": "PREMIUM MEMBER", "badge": "PALING POPULER", "price_label": "Beli produk bundle, unlock 5 level komisi",
					"levels": []map[string]interface{}{
						{"level": "Level 1", "desc": "Komisi langsung lebih besar", "rate": "15%"},
						{"level": "Level 2", "desc": "Komisi dari jaringan level 2", "rate": "7%"},
						{"level": "Level 3", "desc": "Komisi dari jaringan level 3", "rate": "5%"},
						{"level": "Level 4", "desc": "Komisi dari jaringan level 4", "rate": "2%"},
						{"level": "Level 5", "desc": "Komisi dari jaringan level 5", "rate": "1%"},
					},
					"potential": "Potensi Komisi Duplikasi 5 Orang",
					"potential_value": "Hingga Rp 5.250.000/bln",
					"cta_text": "Upgrade ke Premium", "cta_url": "/shop", "popular": true,
				},
			},
			"simulation_title": "Simulasi Potensi Komisi",
			"simulation_subtitle": "Lihat berapa yang bisa Anda hasilkan dengan sistem duplikasi",
			"simulation_tabs": []map[string]interface{}{
				{"label": "Duplikasi 5 Orang", "value": "5"},
				{"label": "Duplikasi 10 Orang", "value": "10"},
			},
			"simulation_table_title": "Simulasi Duplikasi 5 Orang",
			"simulation_table_desc": "Asumsi setiap orang mengajak 5 mitra baru dan belanja Rp 250rb/bln.",
			"simulation_table_header": []string{"LEVEL", "FREE MEMBER", "PREMIUM MEMBER"},
			"simulation_rows": []map[string]interface{}{
				{"level": "Level 1 (5 org)", "free": "Rp 187.500", "premium": "Rp 187.500"},
				{"level": "Level 2 (25 org)", "free": "Rp 437.500", "premium": "Rp 437.500"},
				{"level": "Level 3 (125 org)", "free": "—", "premium": "Rp 1.562.500"},
				{"level": "Level 4 (625 org)", "free": "—", "premium": "Rp 3.125.000"},
				{"level": "Level 5 (3125 org)", "free": "—", "premium": "Rp 7.812.500"},
			},
			"simulation_footer": "TOTAL / BULAN\tMaks. Rp 175.000\tRp 5.250.000",
			"simulation_note": "Upgrade ke Premium dan buka akses ke 3 level komisi tambahan! Selisihnya bisa mencapai 30x lipat lebih besar dari Free Member.",
			"target_title": "Cocok untuk Siapa?",
			"target_subtitle": "Bisnis ini terbuka untuk semua kalangan",
			"target_groups": []string{"Ibu Rumah Tangga", "Mahasiswa", "Karyawan Kantoran", "Freelancer", "Pemilik Usaha", "Semua Orang!"},
			"cta_final_title": "Saatnya Bangun Masa Depanmu!",
			"cta_final_subtitle": "Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati komisinya.",
			"cta_final_text": "GABUNG SEKARANG",
			"cta_final_url": "/register?ref=",
			"cta_final_secondary": "Lihat Produk Dulu",
			"cta_final_secondary_url": "/shop",
		},
		"blog": map[string]interface{}{
			"hero_title": "Blog & Edukasi",
			"hero_subtitle": "Temukan berbagai tips kecantikan, panduan perawatan kulit, dan informasi terbaru seputar dunia skincare dari para ahli kami.",
			"recent_title": "Artikel Terbaru",
		},
		"contact": map[string]interface{}{
			"hero_title": "Hubungi Kami",
			"hero_subtitle": "Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja.",
			"address": "Jl. Kecantikan No. 123, Jakarta Selatan",
			"email": "hello@akuglow.com",
			"phone": "+62 812 3456 7890",
			"form_title": "Kirim Pesan",
			"form_name_label": "Nama Lengkap",
			"form_email_label": "Email",
			"form_subject_label": "Subjek",
			"form_message_label": "Pesan",
			"form_submit_text": "Kirim Pesan Sekarang",
		},
	}
	data, _ := json.Marshal(defaults[page])
	return data
}

// ─── Public CMS Response ───────────────────────────────────────────────────────
type PublicCMSData struct {
	Theme    *SiteTheme       `json:"theme"`
	Sections []SiteSection    `json:"sections"`
	Menus    []SiteMenu       `json:"menus"`
	Pages    []SitePageContent `json:"pages,omitempty"`
}
