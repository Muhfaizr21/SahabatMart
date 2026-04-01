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
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import WishlistPage from './pages/WishlistPage';
import ComparePage from './pages/ComparePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CouponPage from './pages/CouponPage';
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

// Blog dan Contact kini diimpor dari component mandiri

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
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/coupons" element={<CouponPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
