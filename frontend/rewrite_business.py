import re

with open('src/pages/BusinessOpportunity.jsx', 'r') as f:
    content = f.read()

# Add previewData prop
content = content.replace("const BusinessOpportunity = () => {", "const BusinessOpportunity = ({ previewData }) => {")

# Add state and effect
state_effect = """
  const [cmsContent, setCmsContent] = useState(previewData || null);

  useEffect(() => {
    if (previewData) {
      setCmsContent(previewData);
      return;
    }
    const loadCMS = async () => {
      try {
        const res = await fetchJson(`${PUBLIC_API_BASE}/cms/page-content?platform=landing_page&page=business`);
        if (res && res.data && res.data.content) {
          setCmsContent(res.data.content);
        }
      } catch (e) {
        console.warn("Failed to load CMS content:", e);
      }
    };
    loadCMS();
  }, [previewData]);

  const str = (val, fallback) => (cmsContent && cmsContent[val] ? cmsContent[val] : fallback);
"""
content = content.replace("const BusinessOpportunity = ({ previewData }) => {\n  const [activeSim, setActiveSim] = useState(5);", "const BusinessOpportunity = ({ previewData }) => {\n  const [activeSim, setActiveSim] = useState(5);\n" + state_effect)

# Replace hero texts
content = content.replace("Peluang Bisnis Skincare Resmi", "{str('hero_title', 'Peluang Bisnis Skincare Resmi')}")
content = content.replace("Pelanggan Jadi Asetmu,<br />\n            <span className=\"text-[#FFC107]\">Komisi Masuk Selamanya</span>", "{str('hero_headline', 'Pelanggan Jadi Asetmu, Komisi Masuk Selamanya').split(',').map((part, i, arr) => (\n              <React.Fragment key={i}>\n                {i === 0 ? part + ',' : <span className=\"text-[#FFC107]\">{part}</span>}\n                {i === 0 && <br />}\n              </React.Fragment>\n            ))}")
content = content.replace("Bisnis skincare premium <strong>tanpa modal, tanpa stok</strong>. Cukup bagikan link, ajak mitra, dan dapatkan penghasilan jutaan rupiah setiap bulan — bahkan saat tidur sekalipun.", "{str('hero_subtitle', 'Bisnis skincare premium tanpa modal, tanpa stok. Cukup bagikan link, ajak mitra, dan dapatkan penghasilan jutaan rupiah setiap bulan — bahkan saat tidur sekalipun.')}")
content = content.replace("Daftar Gratis Sekarang", "{str('hero_cta_text', 'Daftar Gratis Sekarang')}")
content = content.replace("Lihat Simulasi Komisi", "{str('hero_cta_secondary', 'Lihat Simulasi Komisi')}")

# Replace differences texts
content = content.replace("Kenapa Bisnis Ini Berbeda?", "{str('difference_title', 'Kenapa Bisnis Ini Berbeda?')}")
content = content.replace("Tidak ada bisnis lain yang semudah dan sefleksibel ini.", "{str('difference_subtitle', 'Tidak ada bisnis lain yang semudah dan sefleksibel ini.')}")

# Replace steps texts
content = content.replace("Cara Kerjanya Sangat Simpel", "{str('how_it_works_title', 'Cara Kerjanya Sangat Simpel')}")
content = content.replace("Hanya 4 langkah untuk mulai menghasilkan komisi", "{str('how_it_works_subtitle', 'Hanya 4 langkah untuk mulai menghasilkan komisi')}")

# Replace pricing
content = content.replace("Struktur Komisi Member", "{str('pricing_title', 'Struktur Komisi Member')}")
content = content.replace("Pilih paket yang sesuai dengan target penghasilan Anda", "{str('pricing_subtitle', 'Pilih paket yang sesuai dengan target penghasilan Anda')}")

# Replace simulation
content = content.replace("Simulasi Potensi Komisi", "{str('simulation_title', 'Simulasi Potensi Komisi')}")
content = content.replace("Lihat berapa yang bisa Anda hasilkan dengan sistem duplikasi", "{str('simulation_subtitle', 'Lihat berapa yang bisa Anda hasilkan dengan sistem duplikasi')}")

# Replace target
content = content.replace("Cocok untuk Siapa?", "{str('target_title', 'Cocok untuk Siapa?')}")
content = content.replace("Bisnis ini terbuka untuk semua kalangan", "{str('target_subtitle', 'Bisnis ini terbuka untuk semua kalangan')}")

# Replace final CTA
content = content.replace("Saatnya Bangun<br />\n            <span className=\"text-[#FFC107]\">Masa Depanmu!</span>", "{str('cta_final_title', 'Saatnya Bangun Masa Depanmu!').split(' ').map((word, i, arr) => (\n              <React.Fragment key={i}>\n                {i < 2 ? word + ' ' : <span className=\"text-[#FFC107]\">{word} </span>}\n                {i === 1 && <br />}\n              </React.Fragment>\n            ))}")
content = content.replace("Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati komisinya.", "{str('cta_final_subtitle', 'Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati komisinya.')}")
content = content.replace("GABUNG SEKARANG", "{str('cta_final_text', 'GABUNG SEKARANG')}")
content = content.replace("Lihat Produk Dulu", "{str('cta_final_secondary', 'Lihat Produk Dulu')}")

with open('src/pages/BusinessOpportunity.jsx', 'w') as f:
    f.write(content)

print("Done")
