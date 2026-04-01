import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import CategorySection from './components/CategorySection';
import FeatureBar from './components/FeatureBar';
import ProductSection from './components/ProductSection';
import PromoBanner from './components/PromoBanner';
import Footer from './components/Footer';

// Pages
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ── Halaman Home ─────────────────────
function HomePage() {
  return (
    <>
      <HeroSlider />
      <CategorySection />
      <FeatureBar />
      <ProductSection />
      <PromoBanner />
    </>
  );
}

// ── Halaman Blog ─────────────────────
function BlogPage() {
  const posts = [
    { id: 1, title: 'Tips Memilih Laptop Gaming Terbaik 2024', date: '25 Mar 2024', cat: 'Komputer', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop' },
    { id: 2, title: 'Rekomendasi Headphone Wireless Terbaik', date: '20 Mar 2024', cat: 'Audio', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop' },
    { id: 3, title: 'Smartphone Flagship vs Mid-Range: Mana yang Cocok?', date: '15 Mar 2024', cat: 'Mobile', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=250&fit=crop' },
    { id: 4, title: 'Cara Merawat Smart Watch agar Awet', date: '10 Mar 2024', cat: 'Wearable', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop' },
    { id: 5, title: 'Pilihan Kamera Digital Terbaik untuk Pemula', date: '5 Mar 2024', cat: 'Kamera', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=250&fit=crop' },
    { id: 6, title: 'Review Powerbank 20000mAh Terpopuler', date: '1 Mar 2024', cat: 'Aksesori', img: 'https://images.unsplash.com/photo-1609592776857-567f8bf3688d?w=400&h=250&fit=crop' },
  ];
  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog & Artikel</h1>
      <div className="w-12 h-1 bg-blue-600 rounded-full mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <article key={post.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden group">
            <div className="overflow-hidden">
              <img src={post.img} alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-5">
              <span className="text-xs text-blue-600 font-medium">{post.cat}</span>
              <h2 className="text-base font-bold text-gray-900 mt-1 mb-3 leading-snug hover:text-blue-600 cursor-pointer transition-colors">{post.title}</h2>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{post.date}</span>
                <a href="#" className="text-blue-600 font-medium hover:underline">Baca →</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

// ── Halaman Contact ─────────────────────
function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Hubungi Kami</h1>
      <div className="w-12 h-1 bg-blue-600 rounded-full mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Kirim Pesan</h2>
          <form className="flex flex-col gap-4">
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Nama Lengkap</label>
              <input type="text" placeholder="Nama kamu" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors" /></div>
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input type="email" placeholder="email@kamu.com" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors" /></div>
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Subjek</label>
              <input type="text" placeholder="Subjek pesan" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors" /></div>
            <div><label className="text-sm font-medium text-gray-700 block mb-1">Pesan</label>
              <textarea rows={5} placeholder="Tulis pesan kamu..." className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors resize-none" /></div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">Kirim Pesan</button>
          </form>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Informasi Kontak</h2>
          <div className="space-y-5">
            {[
              { label: 'Alamat', value: 'Jl. Sudirman No. 123, Jakarta Pusat, 10220' },
              { label: 'Telepon', value: '+62 21 1234 5678' },
              { label: 'Email', value: 'support@sahabatmart.id' },
              { label: 'Jam Operasional', value: 'Sen - Sab: 09.00 - 21.00 WIB' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-sm text-gray-700">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// Komponen Login dan Register diimpor dari folder pages

// ── 404 Page ─────────────────────
function NotFoundPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center text-center px-6">
      <div>
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Halaman Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-8">Maaf, halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
        <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          Kembali ke Beranda
        </a>
      </div>
    </main>
  );
}

// ── App Root ─────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
