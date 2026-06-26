import re

with open('models/cms.go', 'r') as f:
    content = f.read()

# Add diagnostic to home
home_content_search = r'("home": map\[string\]interface\{\{)'
home_content_replace = r'''\1
			"diagnostic": map[string]interface{}{
				"label": "Smart Diagnostic",
				"title": "Tampil Percaya Diri dengan Kulit Impian Anda.",
				"highlight": "Kulit Impian",
				"desc": "Bingung memilih produk yang tepat? Ikuti tes kesehatan kulit kami dan dapatkan rekomendasi produk yang dipersonalisasi khusus untuk Anda.",
				"image": "",
			},'''
content = re.sub(home_content_search, home_content_replace, content)

with open('models/cms.go', 'w') as f:
    f.write(content)

print("Done patching cms.go for diagnostic")
