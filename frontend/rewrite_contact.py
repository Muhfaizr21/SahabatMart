import re

with open('src/pages/ContactPage.jsx', 'r') as f:
    content = f.read()

# Add previewData prop
content = content.replace("export default function ContactPage() {", "import { useEffect } from 'react';\n\nexport default function ContactPage({ previewData }) {")

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
        const res = await fetchJson(`${PUBLIC_API_BASE}/cms/page-content?platform=landing_page&page=contact`);
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
content = content.replace("  const [loading, setLoading] = useState(false);", state_effect + "\n  const [loading, setLoading] = useState(false);")

# Replace texts
content = content.replace("Hubungi <span className=\"text-rose-600\">Kami</span>", "{str('hero_title', 'Hubungi Kami').split(' ').map((word, i, arr) => (\n          <React.Fragment key={i}>\n            {i < arr.length - 1 ? word + ' ' : <span className=\"text-rose-600\">{word}</span>}\n          </React.Fragment>\n        ))}")
content = content.replace("Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja.", "{str('hero_subtitle', 'Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja.')}")

content = content.replace("Kirim Pesan", "{str('form_title', 'Kirim Pesan')}")
content = content.replace(">Nama Lengkap</label>", ">{str('form_name_label', 'Nama Lengkap')}</label>")
content = content.replace(">Email</label>", ">{str('form_email_label', 'Email')}</label>")
content = content.replace(">Subjek</label>", ">{str('form_subject_label', 'Subjek')}</label>")
content = content.replace(">Pesan</label>", ">{str('form_message_label', 'Pesan')}</label>")
content = content.replace("Kirim Pesan Sekarang", "{str('form_submit_text', 'Kirim Pesan Sekarang')}")

content = content.replace("{config.contact_address || 'Jl. Sudirman No. 123, Jakarta Pusat'}", "{str('address', config.contact_address || 'Jl. Sudirman No. 123, Jakarta Pusat')}")
content = content.replace("{config.contact_phone || '+62 21 1234 5678'}", "{str('phone', config.contact_phone || '+62 21 1234 5678')}")
content = content.replace("{config.contact_email || 'support@akuglow.id'}", "{str('email', config.contact_email || 'support@akuglow.id')}")

with open('src/pages/ContactPage.jsx', 'w') as f:
    f.write(content)

print("Done")
