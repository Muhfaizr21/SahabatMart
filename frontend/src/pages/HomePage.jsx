import React from 'react';
import HeroSlider from '../components/HeroSlider';
import FeatureBar from '../components/FeatureBar';
import CategoryGrid from '../components/CategoryGrid';
import AboutMission from '../components/AboutMission';
import ProductSection from '../components/ProductSection';
import StatsSection from '../components/StatsSection';
import Testimonials from '../components/Testimonials';
import DiagnosticCTA from '../components/DiagnosticCTA';
import PromoBanner from '../components/PromoBanner';
import NewsletterSection from '../components/NewsletterSection';
import RecommendedSection from '../components/RecommendedSection';

import SEO from '../components/SEO';

/**
 * HomePage Component
 * 
 * Landing page utama untuk SahabatMart / AkuGlow.
 * Implementasi rinci dengan arsitektur clean code.
 * Setiap section dipisahkan menjadi komponen mandiri untuk maintainability tinggi.
 */
const HomePage = () => {
  const siteUrl = window.location.origin;
  
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SahabatMart",
    "alternateName": "AkuGlow",
    "url": siteUrl,
    "logo": `${siteUrl}/akuglow.jpg`,
    "sameAs": [
      "https://facebook.com/sahabatmart",
      "https://instagram.com/akuglow"
    ],
    "description": "SahabatMart (AkuGlow) - Platform marketplace kecantikan dan kesehatan premium terpercaya di Indonesia."
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
        description="Temukan produk kecantikan terbaik dari AkuGlow di SahabatMart. Rahasia kulit sehat terpancar dari pilihan komunitas kami."
        schema={[organizationSchema, websiteSchema]}
      />
      {/* 1. Hero Experience - Visual Utama & Branding */}
      <HeroSlider />

      {/* 2. Value Proposition - Mengapa Memilih Kami? */}
      <FeatureBar />

      {/* 3. Discovery Hub - Navigasi Kategori */}
      <CategoryGrid />

      {/* 4. Brand Story - Misi & Filosofi Produk */}
      <AboutMission />

      {/* 5. Hero Products - Produk Terlaris (Dynamic Limit) */}
      <section className="py-16 bg-slate-50/40">
        <ProductSection 
          title="Koleksi Terlaris AkuGlow ✨" 
          subtitle="Rahasia kulit sehat terpancar dari pilihan komunitas kami."
          limit={4} 
        />
      </section>

      {/* 6. Personalized - Rekomendasi Khusus */}
      <RecommendedSection limit={4} className="bg-white" />

      {/* 7. Social Proof - Pencapaian & Angka Real */}
      <StatsSection />

      {/* 7. Community Voice - Ulasan dari Pelanggan Setia */}
      <Testimonials />

      {/* 8. Activation - Diagnosa Kulit Interaktif */}
      <DiagnosticCTA />

      {/* 9. Visual Promo - Highlight Kampanye Berjalan */}
      <PromoBanner />

      {/* 10. Engagement - Berlangganan Newsletter */}
      <NewsletterSection />
    </main>
  );
};

export default HomePage;
