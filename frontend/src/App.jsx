import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSlider from './components/HeroSlider';
import FeatureBar from './components/FeatureBar';
import ProductSection from './components/ProductSection';
import PromoBanner from './components/PromoBanner';
import VoucherSection from './components/VoucherSection';
import Footer from './components/Footer';
import MaintenancePage from './pages/MaintenancePage';
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
import PackingSlipPage from './pages/PackingSlipPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import BusinessOpportunity from './pages/BusinessOpportunity';


// New Components for AkuGlow Home Look
import StatsSection from './components/StatsSection';
import AboutMission from './components/AboutMission';
import Testimonials from './components/Testimonials';
import DiagnosticCTA from './components/DiagnosticCTA';
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
import AdminFinance from './pages/admin/Finance';
import AdminDataSavingDetail from './pages/admin/DataSavingDetail';
import AdminProfitShareDetail from './pages/admin/ProfitShareDetail';
import AdminPayouts from './pages/admin/Payouts';
import AdminSettings from './pages/admin/Settings';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminBrands from './pages/admin/Brands';
import AdminAttributes from './pages/admin/Attributes';

import AdminVouchers from './pages/admin/Vouchers';
import AdminLogistics from './pages/admin/Logistics';
import AdminSecurity from './pages/admin/Security';
import AdminRegions from './pages/admin/Regions';
import AdminBlogs from './pages/admin/Blogs';
import BlogEditor from './pages/admin/BlogEditor';
import AdminBanners from './pages/admin/Banners';
import AdminEducation from './pages/admin/Education';
import EducationEditor from './pages/admin/EducationEditor';
import AdminEvents from './pages/admin/Events';
import AdminPromo from './pages/admin/Promo';
import PromoEditor from './pages/admin/PromoEditor';
import AdminInbox from './pages/admin/Inbox';
import AdminPOS from './pages/admin/POS';
import AdminRBAC from './pages/admin/RBAC';
import AdminRestock from './pages/admin/RestockModeration';
import MerchantStock from './pages/admin/MerchantStock';
import WishlistStats from './pages/admin/WishlistStats';
import SkinPreTest from './pages/affiliate/SkinPreTest';
import AdminMediaLibrary from './pages/admin/Media';
import SkinJourney from './pages/affiliate/SkinJourney';

import SkinJourneyAdmin from './pages/admin/SkinJourneyAdmin';
import PusatInventory from './pages/admin/PusatInventory';
import SkinCommunity from './pages/SkinCommunity';
import SkinCommunityAdmin from './pages/admin/SkinCommunityAdmin';
import MembershipTiers from './pages/admin/MembershipTiers';
import AdminReviews from './pages/admin/AdminReviews';
import CommissionPresets from './pages/admin/CommissionPresets';
import AdminDemographics from './pages/admin/Demographics';
import CMSDashboard from './pages/admin/cms/CMSDashboard';
import CMSPlatformEditor from './pages/admin/cms/CMSPlatformEditor';
import CMSThemeProvider from './lib/cms';
import HomePage from './pages/HomePage';
import { ThemeProvider } from './context/ThemeContext';


// ── Penanganan Khusus Header/Footer ─────────
function NavbarManager({ maintenanceActive }) {
  const location = useLocation();
  if (maintenanceActive) return null;
  const hidePaths = ['/admin', '/merchant', '/affiliate', '/invoice', '/packing-slip', '/login', '/register', '/forgot-password', '/reset-password'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;
  return (
    <>
      <Navbar />
      <CartDrawer />
    </>
  );
}

// [BUG-H3 Fix] Hembuskan parameter mode pemeliharaan agar footer ikut sembunyi saat maintenance aktif.
function FooterManager({ maintenanceActive }) {
  const location = useLocation();
  if (maintenanceActive) return null;
  const hidePaths = ['/admin', '/merchant', '/affiliate', '/invoice', '/packing-slip', '/login', '/register', '/forgot-password', '/reset-password'];
  if (hidePaths.some(path => location.pathname.startsWith(path))) return null;
  return <Footer />;
}

import RecommendedSection from './components/RecommendedSection';

// HomePage now imported from ./pages/HomePage

// Blog dan Contact kini diimpor dari component mandiri

// ── 404 Page ─────────────────────
function NotFoundPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center text-center px-6">
      <div>
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Halaman Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-8">Maaf, halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
        <a href="/" className="bg-rose-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-700 transition-all inline-block shadow-lg shadow-rose-100">
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
import MerchantSettings from './pages/merchant/Settings';
import MerchantAnalytics from './pages/merchant/Analytics';
import MerchantPOS from './pages/merchant/POS';
import MerchantWallet from './pages/merchant/Wallet';

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

import { HelmetProvider } from 'react-helmet-async';

// ── App Root ─────────────────────
export default function App() {
  useEffect(() => {
    captureAffiliate();
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isPanel = ['/admin', '/merchant', '/affiliate'].some(path => location.pathname.startsWith(path));
  const [maintenance, setMaintenance] = useState({ active: false, message: '' });

  // Device location cache (from browser Geolocation API)
  const deviceLocRef = useRef(null);

  // Grab device location once on mount — no prompt on every nav
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        deviceLocRef.current = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
      },
      () => {}, // permission denied → silently skip
      { timeout: 3000, enableHighAccuracy: false }
    );
  }, []);

  // Automatic page tracking for user locations
  useEffect(() => {
    const isPanelPath = ['/admin', '/merchant', '/affiliate'].some(path => location.pathname.startsWith(path));
    if (isPanelPath) return;

    const base = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE)
      ? window.APP_CONFIG.API_BASE.replace(/\/+$/, '')
      : (import.meta.env.VITE_API_BASE || '');
    
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = {
      visited_url: location.pathname + location.search,
      ...(deviceLocRef.current ? {
        lat: deviceLocRef.current.lat,
        lon: deviceLocRef.current.lon,
      } : {}),
    };

    fetch(`${base}/api/public/location/log`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch(() => {});
  }, [location.pathname, location.search]);

  // Check maintenance mode on mount + interval
  useEffect(() => {
    const checkMaintenance = () => {
      // Use the same API_BASE resolution as the rest of the app
      const base = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE)
        ? window.APP_CONFIG.API_BASE.replace(/\/+$/, '')
        : (import.meta.env.VITE_API_BASE || '');
      fetch(`${base}/api/public/configs`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
        .then(async r => {
          // 503 = maintenance mode active. Try to parse custom message from JSON.
          if (r.status === 503) {
            try {
              const errData = await r.json();
              setMaintenance({
                active: true,
                message: errData.message || 'Maaf, platform sedang dalam pemeliharaan.',
              });
            } catch {
              setMaintenance({
                active: true,
                message: 'Maaf, platform sedang dalam pemeliharaan.',
              });
            }
            return null;
          }
          return r.json();
        })
        .then(data => {
          if (!data) return;
          const raw = data.data || {};
          const maint = raw.platform_maintenance || raw['platform_maintenance'] || '';
          if (maint === 'true' || maint === true) {
            setMaintenance({
              active: true,
              message: raw.platform_maint_msg || 'Maaf, AkuGlow sedang dalam pemeliharaan rutin.',
            });
          } else {
            setMaintenance({ active: false, message: '' });
          }
        })
        .catch(() => {});
    };
    checkMaintenance();
    // Recheck every 30 seconds while app is open
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show maintenance page for non-admin users
  const user = typeof getStoredUser === 'function' ? getStoredUser() : null;
  const isAdminPath = location.pathname.startsWith('/admin');
  const isLoginPath = location.pathname === '/login';
  const adminRoles = ['admin', 'superadmin'];
  const isAdminUser = user && adminRoles.includes(user.role);

  if (maintenance.active && !isAdminPath && !isLoginPath && !isAdminUser) {
    return <MaintenancePage message={maintenance.message} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isPanel ? 'bg-slate-50' : 'bg-white'}`}>
      <ScrollToTop />
      <Toaster position="top-right" reverseOrder={false} />
      <NavbarManager maintenanceActive={maintenance.active} />
      {!isPanel && <CMSThemeProvider platform="landing_page" />}
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
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
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
          <Route path="/packing-slip/:groupId" element={<ProtectedRoute><PackingSlipPage /></ProtectedRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/peluang-bisnis" element={<BusinessOpportunity />} />


          {/* Akuglow Skin Journey */}
          {/* [Redirects for Legacy Skin Paths] */}
          <Route path="/skin/pretest" element={<Navigate to="/affiliate/skin/pretest" replace />} />
          <Route path="/skin/journey" element={<Navigate to="/affiliate/skin/journey" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="demographics" element={<AdminDemographics />} />
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
            <Route path="merchants/stock" element={<MerchantStock />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="finance/data-saving" element={<AdminDataSavingDetail />} />
            <Route path="finance/profit-share" element={<AdminProfitShareDetail />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attributes" element={<AdminAttributes />} />

            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="logistics" element={<AdminLogistics />} />
            <Route path="regions" element={<AdminRegions />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="audit" element={<AdminAuditLog />} />
            <Route path="media" element={<AdminMediaLibrary />} />
            <Route path="blogs" element={<AdminBlogs />} />
            <Route path="blogs/new" element={<BlogEditor />} />
            <Route path="blogs/edit/:id" element={<BlogEditor />} />
            <Route path="banners" element={<AdminBanners />} />
             <Route path="education" element={<AdminEducation />} />
             <Route path="education/new" element={<EducationEditor />} />
             <Route path="education/edit/:id" element={<EducationEditor />} />
             <Route path="events" element={<AdminEvents />} />
             <Route path="promo" element={<AdminPromo />} />
             <Route path="promo/new" element={<PromoEditor />} />
             <Route path="promo/edit/:id" element={<PromoEditor />} />
             <Route path="skin-journey" element={<SkinJourneyAdmin />} />
            <Route path="skin-community" element={<SkinCommunityAdmin />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="rbac" element={<AdminRBAC />} />
            <Route path="membership-tiers" element={<MembershipTiers />} />
            <Route path="commission-presets" element={<CommissionPresets />} />
            <Route path="settings" element={<AdminSettings />} />

            {/* CMS Visual Editor — all in one page per platform */}
            <Route path="cms" element={<CMSDashboard />} />
            <Route path="cms/:platform" element={<CMSPlatformEditor />} />

          </Route>

          {/* Merchant Routes */}
          {/* [BUG-H2 Fix] Ditambah ProtectedRoute — konsisten dengan /affiliate */}
          <Route path="/merchant" element={<ProtectedRoute><MerchantLayout /></ProtectedRoute>}>
             <Route index element={<MerchantDashboard />} />
             <Route path="products" element={<MerchantProducts />} />
             <Route path="restock" element={<MerchantRestock />} />
             <Route path="orders" element={<MerchantOrders />} />
             <Route path="settings" element={<MerchantSettings />} />
             <Route path="analytics" element={<MerchantAnalytics />} />
             <Route path="pos" element={<MerchantPOS />} />
             <Route path="wallet" element={<MerchantWallet />} />
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
      <FooterManager maintenanceActive={maintenance.active} />
    </div>
  );
}
