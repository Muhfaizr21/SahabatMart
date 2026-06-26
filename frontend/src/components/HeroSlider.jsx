import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sliders } from '../data/products';
import { PUBLIC_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function HeroSlider({ previewData }) {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (previewData) {
      setBanners([{
        title: previewData.title || 'Judul',
        subtitle: previewData.subtitle || 'Subjudul',
        link: previewData.cta_url || '#',
        offer: previewData.cta_text || 'PROMO'
      }]);
      return;
    }
    
    fetchJson(`${PUBLIC_API_BASE}/banners`)
      .then(d => {
        const data = Array.isArray(d) ? d : (d.data || []);
        if (data.length > 0) setBanners(data);
        else setBanners(sliders); // Fallback to static if empty
      })
      .catch(() => setBanners(sliders));
  }, [previewData]);

  const activeSliders = (banners && banners.length > 0) ? banners : sliders;

  useEffect(() => {
    if (activeSliders.length > 0) {
      const timer = setInterval(() => handleNext(), 6000);
      return () => clearInterval(timer);
    }
  }, [activeSliders, current]);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent(p => (p + 1) % activeSliders.length);
      setIsAnimating(false);
    }, 400);
  };

  const handlePrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent(p => (p - 1 + activeSliders.length) % activeSliders.length);
      setIsAnimating(false);
    }, 400);
  };

  const slide = activeSliders[current % activeSliders.length] || activeSliders[0];
  
  // Premium gradient background based on base color
  const baseBg = slide.bg_color || slide.bg || '#2563eb';

  return (
    <section 
      className="relative overflow-hidden min-h-[550px] lg:min-h-[650px] flex items-center justify-center group"
      style={{ 
        background: `linear-gradient(135deg, ${baseBg} 0%, rgba(0,0,0,0.5) 120%), ${baseBg}`,
        transition: 'background 0.8s ease-in-out'
      }}
    >
      {/* Premium Decorative Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-black/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none mix-blend-overlay"></div>
      
      {/* Grid Pattern Overlay for Texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>

      <div className={`max-w-7xl mx-auto px-6 w-full z-10 transition-all duration-500 ease-in-out ${isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20 py-16 mt-8 md:mt-0">
          
          {/* Text Content */}
          <div className="flex-1 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span className="text-white text-xs sm:text-sm font-semibold tracking-wider uppercase">{slide.badge || 'PROMO EKSKLUSIF'}</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 drop-shadow-lg">
              {slide.title}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-start md:items-center gap-4 mb-10">
              <p className="text-white/90 text-lg md:text-xl font-light max-w-md leading-relaxed">
                {slide.subtitle || 'Tingkatkan pengalaman belanja premium Anda hari ini.'}
              </p>
              {slide.offer && (
                <div className="bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-300 font-bold px-4 py-2 rounded-lg inline-block w-max mt-2 sm:mt-0">
                  {slide.offer}
                </div>
              )}
            </div>
            
            <Link 
              to={slide.link || "/shop"} 
              className="group relative inline-flex items-center gap-3 bg-white text-gray-900 font-bold px-8 py-4 rounded-xl overflow-hidden hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 tracking-wide">Belanja Sekarang</span>
              <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
          </div>
          
          {/* Image Content */}
          <div className="flex-1 w-full md:w-auto flex justify-center md:justify-end relative">
            <div className="absolute inset-0 bg-white/20 blur-[80px] rounded-full scale-75 pointer-events-none"></div>
            <div className="relative animate-[float_6s_ease-in-out_infinite]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-black/20 to-transparent mix-blend-overlay z-10 pointer-events-none"></div>
              {formatImage(slide.image) ? (
              <img 
                src={formatImage(slide.image)} 
                alt={slide.title} 
                className="h-[320px] sm:h-[400px] lg:h-[520px] w-auto object-cover rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/30" 
              />
              ) : (
              <div className="h-[320px] sm:h-[400px] lg:h-[520px] w-[400px] flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <i className='bx bxs-offer text-8xl text-white/40'></i>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 justify-between pointer-events-none z-20 hidden md:flex">
        <button 
          onClick={handlePrev}
          className="pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30 hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100"
          aria-label="Previous slide"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button 
          onClick={handleNext}
          className="pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30 hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100"
          aria-label="Next slide"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Modern Pagination Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        {activeSliders.map((_, i) => (
          <button 
            key={i} 
            onClick={() => {
              if (i === current) return;
              setIsAnimating(true);
              setTimeout(() => {
                setCurrent(i);
                setIsAnimating(false);
              }, 400);
            }}
            className="group relative flex items-center justify-center p-2"
            aria-label={`Go to slide ${i + 1}`}
          >
            <span className={`block h-1.5 rounded-full transition-all duration-500 ${i === current ? 'w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/40 group-hover:bg-white/80'}`} />
          </button>
        ))}
      </div>

      {/* Add custom float animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
      `}} />
    </section>
  );
}
