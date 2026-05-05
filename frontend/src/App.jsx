import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
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
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    // Jika bukan admin (misal merchant/affiliate), lempar ke beranda masing-masing
    const target = user.role === 'merchant' ? '/merchant' : (user.role === 'affiliate' ? '/affiliate' : '/');
    return <Navigate to={target} replace />;
  }

  return children;
}

// Pages
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderDetailPage from './pages/OrderDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import ProfilePage from './pages/ProfilePage';
import CartDrawer from './components/CartDrawer';
import WishlistPage from './pages/WishlistPage';
import ComparePage from './pages/ComparePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CouponPage from './pages/CouponPage';
import InvoicePage from './pages/InvoicePage';
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
import AdminEducation from './pages/admin/Education';
import AdminEvents from './pages/admin/Events';
import AdminPromo from './pages/admin/Promo';
import AdminInbox from './pages/admin/Inbox';
import AdminPOS from './pages/admin/POS';
import AdminRBAC from './pages/admin/RBAC';
import AdminRestock from './pages/admin/RestockModeration';
import WishlistStats from './pages/admin/WishlistStats';
import SkinPreTest from './pages/affiliate/SkinPreTest';
import SkinJourney from './pages/affiliate/SkinJourney';

import SkinJourneyAdmin from './pages/admin/SkinJourneyAdmin';
import PusatInventory from './pages/admin/PusatInventory';
import SkinCommunity from './pages/SkinCommunity';
import MembershipTiers from './pages/admin/MembershipTiers';
import AdminReviews from './pages/admin/AdminReviews';
import CommissionPresets from './pages/admin/CommissionPresets';


// ── Penanganan Khusus Header/Footer ─────────
function NavbarManager() {
  const location = useLocation();
  const hidePaths = ['/admin', '/merchant', '/affiliate'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;
  return (
    <>
      <Navbar />
      <CartDrawer />
    </>
  );
}

function FooterManager() {
  const location = useLocation();
  const hidePaths = ['/admin', '/merchant', '/affiliate'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;
  return <Footer />;
}

import RecommendedSection from './components/RecommendedSection';

// ── Halaman Home ─────────────────────
function HomePage() {
  return (
    <>
      <HeroSlider />
      <FeatureBar />
      <VoucherSection />
      <RecommendedSection 
        limit={10} 
        title="Rekomendasi Untukmu ✨" 
        subtitle="Berdasarkan apa yang sering kamu lihat dan sukai." 
        className="mt-10"
      />
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
        <a href="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all inline-block shadow-lg shadow-blue-100">
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
import MerchantRestock from './pages/merchant/RestockRequest';
import MerchantOrders from './pages/merchant/OrderList';
import MerchantWallet from './pages/merchant/Wallet';
import MerchantSettings from './pages/merchant/Settings';
import MerchantAnalytics from './pages/merchant/Analytics';

// Affiliate Portal
import AffiliateLayout from './components/affiliate/AffiliateLayout';
import AffiliateDashboard from './pages/affiliate/DashboardUltimate';
import AffiliateLinks from './pages/affiliate/Links';
import AffiliateProducts from './pages/affiliate/Products';
import AffiliateCommissions from './pages/affiliate/Commissions';
import AffiliateWithdrawals from './pages/affiliate/Withdrawals';
import AffiliateSettings from './pages/affiliate/Settings';
import AffiliateEducation from './pages/affiliate/Education';
import AffiliateTeam from './pages/affiliate/Team';
import AffiliateMarketing from './pages/affiliate/Marketing';
import AffiliateLeaderboard from './pages/affiliate/Leaderboard';
import AffiliateVouchers from './pages/affiliate/Vouchers';
import AffiliateEvents from './pages/affiliate/Events';
import AffiliateStats from './pages/affiliate/Stats';
import AffiliateStatus from './pages/affiliate/Status';

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
    captureAffiliate();
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isPanel = ['/admin', '/merchant', '/affiliate'].some(path => location.pathname.startsWith(path));

  return (
    <div className={`min-h-screen flex flex-col ${isPanel ? 'bg-[#0c1324]' : 'bg-[#111827]'}`}>
      <ScrollToTop />
      <Toaster position="top-right" reverseOrder={false} />
      <NavbarManager />
      <div className={`flex-1 ${isPanel ? '' : 'bg-white'}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<Navigate to="/checkout" replace />} />
          <Route path="/checkout" element={<CheckoutPage />} />
           <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
           <Route path="/order/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
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
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/coupons" element={<CouponPage />} />
          <Route path="/invoice/:id" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />

          {/* Akuglow Skin Journey */}
          {/* [Redirects for Legacy Skin Paths] */}
          <Route path="/skin/pretest" element={<Navigate to="/affiliate/skin/pretest" replace />} />
          <Route path="/skin/journey" element={<Navigate to="/affiliate/skin/journey" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="wishlist" element={<WishlistStats />} />
            <Route path="inventory/pusat" element={<PusatInventory />} />
            <Route path="products" element={<AdminProductList />} />
            <Route path="products/add" element={<AdminAddProduct />} />
            <Route path="products/edit" element={<AdminEditProduct />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/detail/:id" element={<AdminOrderDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="merchants/restock" element={<AdminRestock />} />
            <Route path="moderation" element={<AdminModeration />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="commissions" element={<AdminCommissions />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attributes" element={<AdminAttributes />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="logistics" element={<AdminLogistics />} />
            <Route path="regions" element={<AdminRegions />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="audit" element={<AdminAuditLog />} />
            <Route path="blogs" element={<AdminBlogs />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="education" element={<AdminEducation />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="promo" element={<AdminPromo />} />
            <Route path="skin-journey" element={<SkinJourneyAdmin />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="rbac" element={<AdminRBAC />} />
            <Route path="membership-tiers" element={<MembershipTiers />} />
            <Route path="commission-presets" element={<CommissionPresets />} />
            <Route path="settings" element={<AdminSettings />} />

          </Route>

          {/* Merchant Routes */}
          <Route path="/merchant" element={<MerchantLayout />}>
             <Route index element={<MerchantDashboard />} />
             <Route path="products" element={<MerchantProducts />} />
             <Route path="restock" element={<MerchantRestock />} />
             <Route path="orders" element={<MerchantOrders />} />
             <Route path="wallet" element={<MerchantWallet />} />
             <Route path="settings" element={<MerchantSettings />} />
             <Route path="analytics" element={<MerchantAnalytics />} />
          </Route>

          {/* Affiliate Routes */}
          <Route path="/affiliate" element={<ProtectedRoute><AffiliateLayout /></ProtectedRoute>}>
            <Route index element={<AffiliateDashboard />} />
            <Route path="stats" element={<AffiliateStats />} />
            <Route path="team" element={<AffiliateTeam />} />
            <Route path="leaderboard" element={<AffiliateLeaderboard />} />
            <Route path="commissions" element={<AffiliateCommissions />} />
            <Route path="withdrawals" element={<AffiliateWithdrawals />} />
            <Route path="links" element={<AffiliateLinks />} />
            <Route path="education" element={<AffiliateEducation />} />
            <Route path="marketing" element={<AffiliateMarketing />} />
            <Route path="vouchers" element={<AffiliateVouchers />} />
            <Route path="events" element={<AffiliateEvents />} />
            <Route path="settings" element={<AffiliateSettings />} />
            <Route path="community" element={<SkinCommunity />} />
            {/* [Sync Fix] Status Mitra route sesuai dokumen alur mitra Akuglow */}
            <Route path="status" element={<AffiliateStatus />} />
            {/* Akuglow Skin Journey Integrated */}
            <Route path="skin/pretest" element={<SkinPreTest />} />
            <Route path="skin/journey" element={<SkinJourney />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <FooterManager />
    </div>
  );
}
