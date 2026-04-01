import { Link } from 'react-router-dom';

export default function BlogPage() {
  const posts = [
    { id: 1, title: 'Tips Memilih Laptop Gaming Terbaik 2024', date: '25 Mar 2024', cat: 'Komputer', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop' },
    { id: 2, title: 'Rekomendasi Headphone Wireless Terbaik', date: '20 Mar 2024', cat: 'Audio', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop' },
    { id: 3, title: 'Smartphone Flagship vs Mid-Range: Mana yang Cocok?', date: '15 Mar 2024', cat: 'Mobile', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=250&fit=crop' },
    { id: 4, title: 'Cara Merawat Smart Watch agar Awet', date: '10 Mar 2024', cat: 'Wearable', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop' },
    { id: 5, title: 'Pilihan Kamera Digital Terbaik untuk Pemula', date: '5 Mar 2024', cat: 'Kamera', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=250&fit=crop' },
    { id: 6, title: 'Review Powerbank 20000mAh Terpopuler', date: '1 Mar 2024', cat: 'Aksesori', img: 'https://images.unsplash.com/photo-1512499616092-23c316279c67?w=400&h=250&fit=crop' }, // Gambar pengganti yang valid
  ];

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog & Artikel</h1>
      <div className="w-12 h-1 bg-blue-600 rounded-full mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <article key={post.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden group">
            <Link to={`/blog/${post.id}`} className="block overflow-hidden">
              <img src={post.img} alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
            </Link>
            <div className="p-5">
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md">{post.cat}</span>
              <Link to={`/blog/${post.id}`} className="block mt-2 mb-3">
                <h2 className="text-base font-bold text-gray-900 leading-snug hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h2>
              </Link>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{post.date}</span>
                <Link to={`/blog/${post.id}`} className="text-blue-600 font-bold hover:underline">Baca →</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
