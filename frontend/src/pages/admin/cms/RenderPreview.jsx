import React from 'react';
import HeroSlider from '../../../components/HeroSlider';
import FeatureBar from '../../../components/FeatureBar';
import AboutMission from '../../../components/AboutMission';
import StatsSection from '../../../components/StatsSection';
import Testimonials from '../../../components/Testimonials';
import DiagnosticCTA from '../../../components/DiagnosticCTA';
import PromoBanner from '../../../components/PromoBanner';


import AboutPage from '../../AboutPage';
import BlogPage from '../../BlogPage';
import ShopPage from '../../ShopPage';
import BusinessOpportunity from '../../BusinessOpportunity';
import ContactPage from '../../ContactPage';

export default function RenderPreview({ data, platform, page }) {
  if (!data || typeof data !== 'object') return null;
  const str = (v) => v || '';

  // Jika platform bukan landing_page (misal affiliate_dashboard), 
  // kita render pakai UI generik atau biarkan kosong sementara
  if (platform !== 'landing_page') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', color: '#1e1b4b' }}>
        <p className="text-slate-500 italic text-sm">Preview khusus tidak tersedia untuk platform ini.</p>
      </div>
    );
  }

  if (page === 'about') {
    return (
      <div className="preview-container overflow-x-hidden transform origin-top-left scale-[0.6] w-[166%] h-[166%] pointer-events-none">
        <AboutPage previewData={data} />
      </div>
    );
  }

  if (page === 'blog') {
    return (
      <div className="preview-container overflow-x-hidden transform origin-top-left scale-[0.6] w-[166%] h-[166%] pointer-events-none">
        <BlogPage previewData={data} />
      </div>
    );
  }

  if (page === 'shop') {
    return (
      <div className="preview-container overflow-x-hidden transform origin-top-left scale-[0.6] w-[166%] h-[166%] pointer-events-none">
        <ShopPage previewData={data} />
      </div>
    );
  }

  if (page === 'business') {
    return (
      <div className="preview-container overflow-x-hidden transform origin-top-left scale-[0.6] w-[166%] h-[166%] pointer-events-none">
        <BusinessOpportunity previewData={data} />
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="preview-container overflow-x-hidden transform origin-top-left scale-[0.6] w-[166%] h-[166%] pointer-events-none">
        <ContactPage previewData={data} />
      </div>
    );
  }

  // Untuk halaman selain Beranda, About, Blog, Shop kita gunakan preview generik
  if (page !== 'home') {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', color: '#1e1b4b', padding: '0.5rem' }}>
        {/* Header Preview (Otomatis ambil hero title jika ada) */}
        <div style={{ padding: '2rem', background: 'linear-gradient(to right, #3730a3, #312e81)', color: 'white', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {str(data.hero_title || (data.hero && data.hero.title) || `Preview Konten - ${page}`)}
          </h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            {str(data.hero_subtitle || (data.hero && data.hero.subtitle) || '')}
          </p>
        </div>

        {/* Konten Dinamis (Otomatis merender semua field yang ada di CMS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(data).map(([key, value]) => {
            // Skip bagian hero karena sudah dirender di atas
            if (key === 'hero' || key === 'hero_title' || key === 'hero_subtitle') return null;
            
            // Render untuk data object/array (seperti features, stats)
            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</h3>
                  <pre style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'pre-wrap', background: '#f1f5f9', padding: '0.5rem', borderRadius: '0.25rem' }}>
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              );
            }

            // Render untuk data teks biasa (story, vision, mission, team_title, dll)
            return (
              <div key={key} style={{ padding: '1rem', background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                 <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{key.replace(/_/g, ' ')}</h3>
                 <p style={{ fontSize: '0.875rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{str(value)}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Untuk Landing Page (Beranda), kita render komponen aslinya agar 100% sinkron
  return (
    <div className="preview-container overflow-x-hidden transform origin-top-left scale-[0.6] w-[166%] h-[166%] pointer-events-none">
      <HeroSlider />
      <FeatureBar data={data.features} />
      <AboutMission data={data.about_mission} />
      <StatsSection data={data.stats} />
      <Testimonials title={data.testimonials_title || 'Apa Kata Mereka'} />
      <DiagnosticCTA data={data.diagnostic} />
      <PromoBanner />

    </div>
  );
}
