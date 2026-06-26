import re

with open('models/cms.go', 'r') as f:
    content = f.read()

home_block = """		"home": map[string]interface{}{
			"hero": map[string]interface{}{
				"title": "Wujudkan Kulit Glowing Impian Anda",
				"subtitle": "Rahasia Kecantikan Alami Setiap Hari",
				"cta_text": "Diskon Spesial",
				"cta_url": "/shop",
			},
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
		},"""

# Use regex to replace the entire "home" block
content = re.sub(
    r'"home":\s*map\[string\]interface\{\}\{.*?\},\s*"about":',
    home_block + '\n\t\t"about":',
    content,
    flags=re.DOTALL
)

with open('models/cms.go', 'w') as f:
    f.write(content)

print("Done")
