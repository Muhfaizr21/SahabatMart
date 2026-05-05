import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');

  const categories = ['Semua', 'Tips', 'Skincare', 'Lifestyle', 'Promo', 'Kesehatan'];

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/blogs`)
      .then(d => {
        const data = d || [];
        setPosts(data);
        setFilteredPosts(data);
      })
      .catch(() => {
        setPosts([]);
        setFilteredPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = posts;
    if (category !== 'Semua') {
      result = result.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
    }
    if (search) {
      result = result.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase()) || 
        (p.summary || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredPosts(result);
  }, [search, category, posts]);

  return (
    <main className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="bg-gray-50 py-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
              Blog & <span className="text-primary">Edukasi</span>
            </h1>
            <p className="text-gray-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed mb-10">
              Temukan berbagai tips kecantikan, panduan perawatan kulit, dan informasi terbaru seputar dunia skincare dari para ahli kami.
            </p>
            
            {/* Search and Filters */}
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="relative group">
                    <i className="bx bx-search absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-gray-400 group-focus-within:text-primary transition-colors"></i>
                    <input 
                        type="text" 
                        placeholder="Cari artikel menarik..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white border border-gray-200 rounded-[2rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-lg font-medium"
                    />
                </div>
                
                <div className="flex flex-wrap justify-center gap-3">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                                category === cat 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                                : 'bg-white border border-gray-200 text-gray-500 hover:border-primary hover:text-primary shadow-sm'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Memuat Artikel...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-gray-50 rounded-[3rem] p-20 text-center border border-gray-100">
             <div className="text-6xl mb-6 opacity-40 grayscale">✍️</div>
             <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Tidak Ada Artikel</h3>
             <p className="text-gray-500 max-w-sm mx-auto font-medium">Kami tidak menemukan artikel yang sesuai dengan kriteria pencarian Anda.</p>
             <button onClick={() => { setSearch(''); setCategory('Semua'); }} className="mt-8 text-primary font-bold underline underline-offset-4 hover:opacity-80 transition-opacity">Reset Filter</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10">
            {filteredPosts.map((post, idx) => (
              <article 
                key={post.id} 
                className="bg-white group flex flex-col fade-in shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-2xl md:rounded-[2rem] overflow-hidden border border-gray-100"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <Link to={`/blog/${post.slug || post.id}`} className="block relative overflow-hidden aspect-[16/10]">
                  <img src={formatImage(post.image) || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=500&fit=crop'} 
                    alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute top-2 left-2 md:top-5 md:left-5 bg-white shadow-xl text-primary text-[8px] md:text-[10px] font-black px-2 md:px-4 py-1 md:py-2 rounded-full uppercase tracking-widest">
                    {post.category || 'TIPS'}
                  </span>
                </Link>
                
                <div className="p-4 md:p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-5 text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] md:tracking-[0.15em]">
                     <span className="flex items-center gap-1 md:gap-1.5"><i className="bx bx-calendar text-primary"></i> <span className="hidden xs:inline">{new Date(post.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span><span className="xs:hidden">{new Date(post.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}</span></span>
                     <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                     <span className="flex items-center gap-1 md:gap-1.5 line-clamp-1"><i className="bx bx-user text-primary"></i> {post.author || 'Admin'}</span>
                  </div>
                  
                  <Link to={`/blog/${post.slug || post.id}`} className="block mb-2 md:mb-4">
                    <h2 className="text-sm md:text-2xl font-black text-gray-900 leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {post.title}
                    </h2>
                  </Link>
                  
                  <p className="text-gray-500 text-[11px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 mb-4 md:mb-8 flex-1 font-medium">
                    {post.summary || "Pelajari lebih lanjut tentang artikel menarik ini."}
                  </p>
                  
                  <Link to={`/blog/${post.slug || post.id}`} className="inline-flex items-center gap-2 text-primary font-black text-[9px] md:text-xs uppercase tracking-widest group/btn border-t border-gray-50 pt-4 md:pt-6">
                    <span className="hidden xs:inline">Baca Selengkapnya</span>
                    <span className="xs:hidden">Baca</span>
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/5 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-white transition-all">
                        <i className="bx bx-right-arrow-alt text-base md:text-lg"></i>
                    </div>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
