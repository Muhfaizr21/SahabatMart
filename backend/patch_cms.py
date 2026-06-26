import re

with open('models/cms.go', 'r') as f:
    content = f.read()

# Add about_mission to home
home_content_search = r'("home": map\[string\]interface\{\{)'
home_content_replace = r'''\1
			"about_mission": map[string]interface{}{
				"label": "Tentang AkuGlow",
				"title": "Formula Premium Korea untuk Kecantikan Alami Anda.",
				"highlight": "Kecantikan Alami",
				"desc": "Kami percaya bahwa setiap orang berhak memiliki kulit sehat dan bercahaya. Dengan standar formulasi dari Korea, kami menghadirkan rangkaian perawatan kulit yang aman, lembut, namun sangat efektif.",
				"image": "",
			},'''
content = re.sub(home_content_search, home_content_replace, content)

# Add hero_image to about
about_search = r'("about": map\[string\]interface\{\{)'
about_replace = r'''\1
			"hero_image": "",'''
content = re.sub(about_search, about_replace, content)

# Add hero_image to shop
shop_search = r'("shop": map\[string\]interface\{\{)'
shop_replace = r'''\1
			"hero_image": "",'''
content = re.sub(shop_search, shop_replace, content)

# Add hero_image to business
business_search = r'("business": map\[string\]interface\{\{)'
business_replace = r'''\1
			"hero_image": "",'''
content = re.sub(business_search, business_replace, content)

# Add hero_image to contact
contact_search = r'("contact": map\[string\]interface\{\{)'
contact_replace = r'''\1
			"hero_image": "",'''
content = re.sub(contact_search, contact_replace, content)

# Add hero_image to blog
blog_search = r'("blog": map\[string\]interface\{\{)'
blog_replace = r'''\1
			"hero_image": "",'''
content = re.sub(blog_search, blog_replace, content)

with open('models/cms.go', 'w') as f:
    f.write(content)

print("Done patching cms.go")
