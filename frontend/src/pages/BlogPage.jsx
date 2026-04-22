import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/blogs`)
      .then(d => setPosts(d || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-14 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Katalog <span className="text-blue-600">Artikel</span></h1>
            <p className="text-gray-500 font-medium max-w-xl mx-auto">Dapatkan tips kecantikan, informasi kesehatan, dan gaya hidup terbaru dari tim AkuGrow.</p>
            <div className="w-20 h-1.5 bg-blue-600 rounded-full mx-auto mt-6 shadow-lg shadow-blue-100" />
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Memuat Artikel...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-gray-100">
             <div className="text-6xl mb-4">✍️</div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Artikel</h3>
             <p className="text-gray-500">Nantikan update menarik dari kami segera!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <article key={post.id} className="bg-white rounded-3xl border border-gray-100 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 overflow-hidden group flex flex-col">
                <Link to={`/blog/${post.slug || post.id}`} className="block relative overflow-hidden aspect-[16/10]">
                  <img src={formatImage(post.image) || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=500&fit=crop'} 
                    alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
                    {post.category || 'TIPS'}
                  </span>
                </Link>
                <div className="p-7 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     <i className="bx bx-calendar text-sm text-blue-500"></i>
                     {new Date(post.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <Link to={`/blog/${post.slug || post.id}`} className="block mb-4">
                    <h2 className="text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h2>
                  </Link>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-6 flex-1">
                    {post.summary || "Baca selengkapnya mengenai detail artikel ini di AkuGrow Blog."}
                  </p>
                  <div className="pt-5 border-t border-gray-50 mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                          {post.author?.[0] || 'A'}
                        </div>
                        <span className="text-[11px] font-bold text-gray-400">{post.author || 'Admin'}</span>
                    </div>
                    <Link to={`/blog/${post.slug || post.id}`} className="text-blue-600 font-black text-xs uppercase tracking-widest flex items-center gap-1 group/btn">
                      Selengkapnya 
                      <i className="bx bx-right-arrow-alt text-lg transition-transform group-hover/btn:translate-x-1"></i>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
