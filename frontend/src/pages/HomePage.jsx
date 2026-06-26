import React, { useState, useEffect } from 'react';
import HeroSlider from '../components/HeroSlider';
import FeatureBar from '../components/FeatureBar';
import CategoryGrid from '../components/CategoryGrid';
import AboutMission from '../components/AboutMission';
import ProductSection from '../components/ProductSection';
import StatsSection from '../components/StatsSection';
import Testimonials from '../components/Testimonials';
import DiagnosticCTA from '../components/DiagnosticCTA';
import PromoBanner from '../components/PromoBanner';
import RecommendedSection from '../components/RecommendedSection';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { fetchJson, PUBLIC_API_BASE } from '../lib/api';

/**
 * HomePage Component
 * 
 * Landing page utama untuk AkuGlow.
 * Implementasi rinci dengan arsitektur clean code.
 * Setiap section dipisahkan menjadi komponen mandiri untuk maintainability tinggi.
 */
const HomePage = () => {
  const { theme } = useTheme();
  const siteUrl = window.location.origin;
  const finalLogo = theme?.platform_logo || '/akuglow.webp';
  const logoUrl = finalLogo.startsWith('http') ? finalLogo : `${siteUrl}${finalLogo}`;

  const [cmsContent, setCmsContent] = useState(null);

  useEffect(() => {
    const loadCMS = async () => {
      try {
        const res = await fetchJson(`${PUBLIC_API_BASE}/cms/page-content?platform=landing_page&page=home`);
        if (res && res.content) {
          setCmsContent(res.content);
        }
      } catch (err) {
        console.error('Failed to load CMS content:', err);
      }
    };
    loadCMS();
  }, []);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AkuGlow",
    "alternateName": "AkuGlow Premium",
    "url": siteUrl,
    "logo": logoUrl,
    "sameAs": [
      "https://facebook.com/akuglow",
      "https://instagram.com/akuglow"
    ],
    "description": "AkuGlow - Platform marketplace kecantikan dan kesehatan premium terpercaya di Indonesia."
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/shop?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="home-page overflow-hidden">
      <SEO
        title="Pusat Kecantikan & Kesehatan Premium"
        description="Temukan produk kecantikan terbaik dari AkuGlow. Rahasia kulit sehat terpancar dari pilihan komunitas kami."
        schema={[organizationSchema, websiteSchema]}
      />
      {/* 1. Hero Experience - Visual Utama & Branding */}
      <HeroSlider />

      {/* 2. Value Proposition - Mengapa Memilih Kami? */}
      <FeatureBar data={cmsContent?.features} />

      {/* 3. Discovery Hub - Navigasi Kategori */}
      <CategoryGrid />

      {/* 5. About & Mission - Trust Building */}
      <AboutMission data={cmsContent?.about_mission} />

      {/* 5. Hero Products - Produk Terlaris (Dynamic Limit) */}
      <section className="py-16 bg-slate-50/40">
        <ProductSection
          title="Koleksi Terlaris AkuGlow "
          subtitle="Rahasia kulit sehat terpancar dari pilihan komunitas kami."
          limit={4}
        />
      </section>

      {/* 6. Personalized - Rekomendasi Khusus */}
      <RecommendedSection limit={4} className="bg-white" />

      {/* 7. Social Proof - Pencapaian & Angka Real */}
      <StatsSection data={cmsContent?.stats} />

      {/* 7. Community Voice - Ulasan dari Pelanggan Setia */}
      <Testimonials title={cmsContent?.testimonials_title} />

      {/* 8. Activation - Diagnosa Kulit Interaktif */}
      <DiagnosticCTA data={cmsContent?.diagnostic} />

      {/* 9. Visual Promo - Highlight Kampanye Berjalan */}
      <PromoBanner />

    </main>
  );
};

export default HomePage;
