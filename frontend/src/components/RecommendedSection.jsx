import { useState, useEffect } from 'react';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';
import { ProductCard } from './ProductSection';
import { isAuthenticated } from '../lib/auth';

export default function RecommendedSection({ limit = 5, title = "Rekomendasi Spesial ✨", subtitle = "Berdasarkan aktivitas dan minat Anda." }) {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecommended = async () => {
      try {
        const data = await fetchJson(`${PUBLIC_API_BASE}/products/recommended?limit=${limit}`);
        setRecommended(Array.isArray(data) ? data : (data.data || []));
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRecommended();
  }, [limit]);

  if (!loading && recommended.length === 0) return null;

  return (
    <section className="py-14 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">{title}</h2>
          <p className="text-gray-500 text-sm mt-1">{isAuthenticated() ? subtitle : "Produk paling populer yang mungkin Anda suka."}</p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {recommended.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
