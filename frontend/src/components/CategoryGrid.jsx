import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';

const CategoryGrid = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/categories`)
      .then(d => {
        const data = Array.isArray(d) ? d : (d.data || []);
        setCategories(data);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (categories.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-tight">Telusuri Berdasarkan Kategori</h2>
            <p className="text-gray-500 mt-2">Temukan solusi skincare yang tepat untuk setiap kebutuhan kulitmu.</p>
          </div>
          <Link to="/shop" className="text-primary font-bold hover:underline">Lihat Semua</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {categories.slice(0, 6).map((cat, idx) => (
            <Link 
              key={cat.id || idx} 
              to={`/shop?cat=${cat.name}`}
              className="group flex flex-col items-center text-center space-y-4"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:border-primary group-hover:shadow-xl group-hover:shadow-primary/10 transition-all duration-500">
                <img 
                  src={cat.image || `https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&q=80&sig=${idx}`} 
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <span className="font-bold text-gray-800 group-hover:text-primary transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
