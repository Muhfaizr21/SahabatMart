import re

with open('models/cms.go', 'r') as f:
    content = f.read()

# Replace About
content = re.sub(
    r'"hero_title":\s*"Tentang AkuGlow"',
    '"hero_title": "Kenalan Lebih Dekat dengan Akuglow"',
    content
)
content = re.sub(
    r'"hero_subtitle":\s*"Perjalanan kami dalam menghadirkan kecantikan alami"',
    '"hero_subtitle": "Perjalanan kami dalam menghadirkan kecantikan alami"', # no frontend match so leave it
    content
)
content = re.sub(
    r'"mission":\s*"[^"]+"',
    '"mission": "Memberikan edukasi kecantikan yang tepat, menyediakan produk berkualitas tinggi dengan harga terjangkau, dan membangun komunitas yang sehat."',
    content
)
content = re.sub(
    r'"vision":\s*"[^"]+"',
    '"vision": "Menjadi brand skincare nomor satu yang dipercaya masyarakat Indonesia untuk solusi kecantikan kulit sehat alami yang berkelanjutan."',
    content
)
content = re.sub(
    r'"story":\s*"[^"]+"',
    '"story": "AkuGlow lahir dari semangat untuk memberdayakan setiap individu agar memiliki kepercayaan diri melalui kulit yang sehat dan bercahaya. Kami memahami bahwa kecantikan bukan sekadar tampilan luar, melainkan refleksi dari kesehatan dan kebahagiaan batin.\\n\\nDengan riset mendalam dan kolaborasi bersama para ahli dermatologi, kami menghadirkan rangkaian produk skincare premium yang diformulasikan khusus untuk iklim tropis. Setiap tetes produk kami mengandung bahan aktif berkualitas tinggi yang aman dan teruji."',
    content
)

# Replace Shop
content = re.sub(
    r'"hero_title":\s*"Belanja Produk"',
    '"hero_title": "Koleksi Premium"',
    content
)
content = re.sub(
    r'"hero_subtitle":\s*"Temukan produk favorit Anda"',
    '"hero_subtitle": "Temukan rangkaian produk perawatan kulit terbaik yang diformulasikan khusus untuk kecantikan alami Anda."',
    content
)

# Replace Blog
content = re.sub(
    r'"hero_title":\s*"Blog & Artikel"',
    '"hero_title": "Blog & Edukasi"',
    content
)
content = re.sub(
    r'"hero_subtitle":\s*"Tips, tutorial, dan berita terbaru seputar skin care"',
    '"hero_subtitle": "Temukan berbagai tips kecantikan, panduan perawatan kulit, dan informasi terbaru seputar dunia skincare dari para ahli kami."',
    content
)

# Replace Contact
content = re.sub(
    r'"hero_subtitle":\s*"Tim AkuGlow siap membantu Anda"',
    '"hero_subtitle": "Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja."',
    content
)
content = re.sub(
    r'"form_submit_text":\s*"Kirim Pesan"',
    '"form_submit_text": "Kirim Pesan Sekarang"',
    content
)
content = content.replace(
    '"form_email_label": "Email",',
    '"form_email_label": "Email",\n\t\t\t"form_subject_label": "Subjek",'
)

with open('models/cms.go', 'w') as f:
    f.write(content)

print("Done")
