import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sliders } from '../data/products';

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/public/banners')
      .then(r => r.json())
      .then(d => {
        if (d.data && d.data.length > 0) setBanners(d.data);
        else setBanners(sliders); // Fallback to static if empty
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => setCurrent(p => (p + 1) % banners.length), 4500);
      return () => clearInterval(timer);
    }
  }, [banners]);

  const activeSliders = (banners && banners.length > 0) ? banners : sliders;
  const slide = activeSliders[current % activeSliders.length] || activeSliders[0];

  return (
    <section className="relative overflow-hidden min-h-[480px] flex items-center" style={{ backgroundColor: slide.bg_color || slide.bg, transition: 'background-color 0.6s ease' }}>
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="flex items-center gap-8 py-16">
          <div className="flex-1 z-10">
            <span className="inline-block bg-white/20 text-white text-sm px-4 py-1.5 rounded-full mb-5">{slide.badge}</span>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4 max-w-lg">{slide.title}</h1>
            <p className="text-white/80 text-lg mb-8">
              Penawaran eksklusif <span className="text-yellow-300 font-bold text-2xl">{slide.offer}</span> minggu ini
            </p>
            <Link to={slide.link || "/shop"} className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-lg hover:bg-gray-100 transition-all shadow-lg">
              Belanja Sekarang
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          <div className="flex-1 hidden md:flex justify-end">
            <img src={slide.image} alt={slide.title} className="h-80 lg:h-96 w-auto object-cover rounded-2xl shadow-2xl" style={{ transition: 'all 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

      {/* Arrows */}
      <button onClick={() => setCurrent(p => (p - 1 + sliders.length) % sliders.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full hidden lg:block">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button onClick={() => setCurrent(p => (p + 1) % sliders.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full hidden lg:block">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {sliders.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} />
        ))}
      </div>
    </section>
  );
}
