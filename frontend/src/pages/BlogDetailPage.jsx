import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function BlogDetailPage() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/blog?slug=${id}`)
      .then(d => {
        if (d.data) setBlog(d.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20"><div className="spinner-border text-blue-600"></div></div>;
  if (!blog) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold mb-4">Artikel Tidak Ditemukan</h2>
      <Link to="/blog" className="btn btn-primary">Kembali ke Blog</Link>
    </div>
  );

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
        <Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
        <i className="bx bx-chevron-right opacity-30"></i>
        <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
        <i className="bx bx-chevron-right opacity-30"></i>
        <span className="text-gray-900 truncate">{blog.title}</span>
      </nav>

      {/* Header Artikel */}
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-5">
          <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-100">
            {blog.category || 'UMUM'}
          </span>
          <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
            <i className="bx bx-calendar"></i>
            {new Date(blog.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.15] mb-8 tracking-tight">
          {blog.title}
        </h1>
        <div className="flex items-center gap-4 border-b border-gray-100 pb-8 mt-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-400 border border-white shadow-sm overflow-hidden">
             <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author || 'Admin')}&background=f8fafc&color=4361ee`} className="w-full h-full" alt="" />
          </div>
          <div>
            <div className="font-black text-gray-900 text-base">{blog.author || 'Tim SahabatMart'}</div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">SahabatMart Editor</div>
          </div>
        </div>
      </header>

      {/* Gambar Konten Utama */}
      {blog.image && (
        <figure className="mb-12 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-100 border-8 border-white bg-white">
          <img 
            src={formatImage(blog.image)} 
            alt={blog.title} 
            className="w-full h-auto object-cover max-h-[550px]" 
          />
        </figure>
      )}

      {/* Isi Artikel */}
      <article className="prose prose-blue prose-lg max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-xl md:text-2xl font-bold text-gray-800 leading-snug mb-10 border-l-4 border-blue-600 pl-6 py-2">
          {blog.summary}
        </p>
        <div className="whitespace-pre-wrap text-lg md:text-xl font-medium text-gray-500 leading-loose">
          {blog.content}
        </div>
      </article>

      {/* Bagian Share */}
      <div className="flex items-center gap-6 mt-20 pt-10 border-t border-gray-100">
        <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Bagikan:</span>
        <div className="flex gap-3">
          <button className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-xl hover:shadow-blue-200 transition-all">
            <i className="bx bxl-facebook text-xl"></i>
          </button>
          <button className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-blue-400 hover:bg-blue-400 hover:text-white hover:shadow-xl hover:shadow-blue-200 transition-all">
            <i className="bx bxl-twitter text-xl"></i>
          </button>
          <button className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white hover:shadow-xl hover:shadow-green-200 transition-all">
            <i className="bx bxl-whatsapp text-xl"></i>
          </button>
        </div>
      </div>
    </main>
  );
}
