import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import CategorySection from './components/CategorySection';
import FeatureBar from './components/FeatureBar';
import ProductSection from './components/ProductSection';
import PromoBanner from './components/PromoBanner';
import VoucherSection from './components/VoucherSection';
import Footer from './components/Footer';
import { getStoredUser, isAdminUser } from './lib/auth';
import { captureAffiliate } from './lib/api';
import { Toaster } from 'react-hot-toast';

// ── Protected Route Wrapper ─────────
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

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
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProductList from './pages/admin/ProductList';
import AdminAddProduct from './pages/admin/AddProduct';
import AdminEditProduct from './pages/admin/EditProduct';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminUsers from './pages/admin/Users';
import AdminCategories from './pages/admin/Categories';
import AdminMerchants from './pages/admin/Merchants';
import AdminAffiliates from './pages/admin/Affiliates';
import AdminModeration from './pages/admin/Moderation';
import AdminFinance from './pages/admin/Finance';
import AdminCommissions from './pages/admin/Commissions';
import AdminPayouts from './pages/admin/Payouts';
import AdminSettings from './pages/admin/Settings';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminBrands from './pages/admin/Brands';
import AdminAttributes from './pages/admin/Attributes';
import AdminDisputes from './pages/admin/Disputes';
import AdminVouchers from './pages/admin/Vouchers';
import AdminLogistics from './pages/admin/Logistics';
import AdminSecurity from './pages/admin/Security';
import AdminRegions from './pages/admin/Regions';
import AdminBlogs from './pages/admin/Blogs';
import AdminBanners from './pages/admin/Banners';
import AdminInbox from './pages/admin/Inbox';
import AdminPOS from './pages/admin/POS';
import WishlistStats from './pages/admin/WishlistStats';

// ── Penanganan Khusus Header/Footer ─────────
function NavbarManager() {
  const location = useLocation();
  const hidePaths = ['/admin', '/merchant', '/affiliate'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;
  return <Navbar />;
}

function FooterManager() {
  const location = useLocation();
  const hidePaths = ['/admin', '/merchant', '/affiliate'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;
  return <Footer />;
}

// ── Halaman Home ─────────────────────
function HomePage() {
  return (
    <>
      <HeroSlider />
      <CategorySection />
      <FeatureBar />
      <VoucherSection />
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

// Merchant Portal
import MerchantLayout from './components/merchant/MerchantLayout';
import MerchantDashboard from './pages/merchant/Dashboard';
import MerchantProducts from './pages/merchant/ProductList';
import MerchantAddProduct from './pages/merchant/AddProduct';
import MerchantOrders from './pages/merchant/OrderList';
import MerchantWallet from './pages/merchant/Wallet';
import MerchantSettings from './pages/merchant/Settings';
import MerchantAnalytics from './pages/merchant/Analytics';
import MerchantVouchers from './pages/merchant/Vouchers';

// Affiliate Portal
import AffiliateLayout from './components/affiliate/AffiliateLayout';
import AffiliateDashboard from './pages/affiliate/Dashboard';
import AffiliateLinks from './pages/affiliate/Links';
import AffiliateProducts from './pages/affiliate/Products';
import AffiliateCommissions from './pages/affiliate/Commissions';
import AffiliateWithdrawals from './pages/affiliate/Withdrawals';
import AffiliateSettings from './pages/affiliate/Settings';

// ── Scroll To Top on Route Change ─────────
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// ── App Root ─────────────────────
export default function App() {
  useEffect(() => {
    // Jalankan pelacakan affiliate di setiap akses pertama
    captureAffiliate();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" reverseOrder={false} />
      <div className="min-h-screen bg-white">
        <NavbarManager />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/coupons" element={<CouponPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="wishlist" element={<WishlistStats />} />
            <Route path="products" element={<AdminProductList />} />
            <Route path="products/add" element={<AdminAddProduct />} />
            <Route path="products/edit" element={<AdminEditProduct />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/detail/:id" element={<AdminOrderDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="moderation" element={<AdminModeration />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="commissions" element={<AdminCommissions />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attributes" element={<AdminAttributes />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="logistics" element={<AdminLogistics />} />
            <Route path="regions" element={<AdminRegions />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="audit" element={<AdminAuditLog />} />
            <Route path="blogs" element={<AdminBlogs />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="inbox" element={<AdminInbox />} />
          </Route>

          {/* Merchant Routes */}
          <Route path="/merchant" element={<MerchantLayout />}>
             <Route index element={<MerchantDashboard />} />
             <Route path="products" element={<MerchantProducts />} />
             <Route path="products/add" element={<MerchantAddProduct />} />
             <Route path="products/edit/:id" element={<MerchantAddProduct />} />
             <Route path="orders" element={<MerchantOrders />} />
             <Route path="wallet" element={<MerchantWallet />} />
             <Route path="settings" element={<MerchantSettings />} />
             <Route path="analytics" element={<MerchantAnalytics />} />
             <Route path="vouchers" element={<MerchantVouchers />} />
          </Route>

          {/* Affiliate Routes */}
          <Route path="/affiliate" element={<AffiliateLayout />}>
             <Route index element={<AffiliateDashboard />} />
             <Route path="links" element={<AffiliateLinks />} />
             <Route path="products" element={<AffiliateProducts />} />
             <Route path="commissions" element={<AffiliateCommissions />} />
             <Route path="withdrawals" element={<AffiliateWithdrawals />} />
             <Route path="settings" element={<AffiliateSettings />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <FooterManager />
      </div>
    </BrowserRouter>
  );
}
