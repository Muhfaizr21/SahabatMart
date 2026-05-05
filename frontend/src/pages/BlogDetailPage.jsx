import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function BlogDetailPage() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [latestPosts, setLatestPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch main blog detail
    setLoading(true);
    fetchJson(`${PUBLIC_API_BASE}/blogs/detail?slug=${id}`)
      .then(d => {
        if (d) setBlog(d);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    // Fetch latest posts for sidebar
    fetchJson(`${PUBLIC_API_BASE}/blogs`)
      .then(d => {
        const posts = d || [];
        setLatestPosts(posts.filter(p => (p.slug || p.id) !== id).slice(0, 5));
      })
      .catch(err => console.error(err));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="text-8xl mb-8">🔍</div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Artikel Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-10 max-w-sm font-medium leading-relaxed">
          Maaf, artikel yang Anda cari mungkin telah dihapus atau dipindahkan ke alamat lain.
        </p>
        <Link to="/blog" className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
          Kembali ke Blog
        </Link>
      </div>
    );
  }

  return (
    <main className="bg-white min-h-screen">
      {/* Article Header & Hero */}
      <div className="bg-gray-50 pt-16 pb-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-3 text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <i className="bx bx-chevron-right opacity-30 text-lg"></i>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <i className="bx bx-chevron-right opacity-30 text-lg"></i>
            <span className="text-gray-900 line-clamp-1">{blog.title}</span>
          </nav>

          <div className="max-w-4xl">
            <div className="inline-block px-5 py-2 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-[0.2em] mb-8">
              {blog.category || 'SKINCARE TIPS'}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-[1.1] mb-10 tracking-tight">
              {blog.title}
            </h1>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author || 'Admin')}&background=E11D48&color=fff&bold=true`} 
                  className="w-12 h-12 rounded-full border-2 border-white shadow-md" 
                  alt={blog.author} 
                />
                <div>
                  <div className="font-black text-gray-900 text-sm uppercase tracking-wider">{blog.author || 'Admin'}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Published On {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            {/* Featured Image Moved Inside */}
            <figure className="mb-12 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-white">
              <img 
                src={formatImage(blog.image)} 
                alt={blog.title} 
                className="w-full h-auto object-cover max-h-[600px]" 
              />
            </figure>

            <article className="prose prose-xl prose-primary max-w-none">
              {blog.summary && (
                <p className="text-2xl md:text-3xl font-black text-gray-900 leading-snug mb-10 border-l-8 border-primary pl-10 py-2 italic">
                  {blog.summary}
                </p>
              )}
              
              <div 
                className="article-content text-gray-700 leading-[1.8] text-lg md:text-xl font-medium space-y-8"
                dangerouslySetInnerHTML={{ __html: blog.content?.replace(/\n/g, '<br />') }}
              />
            </article>

            {/* Share & Tags */}
            <div className="mt-16 pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Share:</span>
                <div className="flex gap-2">
                    {['facebook', 'twitter', 'whatsapp'].map(platform => (
                      <button key={platform} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                        <i className={`bx bxl-${platform} text-lg`}></i>
                      </button>
                    ))}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {['Skincare', 'Beauty', 'Health'].map(tag => (
                  <span key={tag} className="px-4 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-black rounded-full uppercase tracking-widest">#{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Area - Sticky */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-8">
            {/* Latest Posts */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-8 tracking-tight flex items-center gap-3 border-b border-gray-50 pb-4">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                Artikel Terbaru
              </h3>
              
              <div className="space-y-6">
                {latestPosts.map(post => (
                  <Link key={post.id} to={`/blog/${post.slug || post.id}`} className="group flex gap-4 items-center">
                    <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden shadow-sm">
                      <img 
                        src={formatImage(post.image)} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                        {new Date(post.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
