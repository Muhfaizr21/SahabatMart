import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/public/blogs')
      .then(r => r.json())
      .then(d => setPosts(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog & Artikel</h1>
      <div className="w-12 h-1 bg-blue-600 rounded-full mb-10" />
      
      {loading ? (
        <div className="text-center py-20"><div className="spinner-border text-blue-600"></div></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted">Belum ada artikel yang dipublikasikan.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <article key={post.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden group">
              <Link to={`/blog/${post.slug || post.id}`} className="block overflow-hidden">
                <img src={post.image || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop'} 
                  alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
              </Link>
              <div className="p-5">
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md">{post.category}</span>
                <Link to={`/blog/${post.slug || post.id}`} className="block mt-2 mb-3">
                  <h2 className="text-base font-bold text-gray-900 leading-snug hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h2>
                </Link>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  <Link to={`/blog/${post.slug || post.id}`} className="text-blue-600 font-bold hover:underline">Baca →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
