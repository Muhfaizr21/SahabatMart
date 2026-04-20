import { useState, useEffect } from 'react';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';

export default function CategorySection() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/categories`)
    .then(d => {
      const data = Array.isArray(d) ? d : (d.data || []);
      setCats(data.slice(0, 5));
    })
    .catch(() => setCats([]))
    .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {loading ? (
             <div className="text-center py-10"><div className="spinner-border text-blue-600 spinner-border-sm"></div></div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {cats.map((cat) => (
                <a key={cat.id} href={`/shop?cat=${cat.name}`}
                className="group flex flex-col items-center p-6 rounded-2xl hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:-translate-y-1"
                style={{ backgroundColor: cat.bg || '#f8fafc' }}>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📦</div>
                <h3 className="text-sm font-semibold text-gray-800 text-center mb-1">{cat.name}</h3>
                </a>
            ))}
            </div>
        )}
      </div>
    </section>
  );
}
