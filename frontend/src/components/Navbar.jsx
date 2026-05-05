import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getStoredUser, isAuthenticated, logout, isAdminUser } from '../lib/auth';
import { BUYER_API_BASE, PUBLIC_API_BASE, fetchJson } from '../lib/api';

const SearchIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const CartIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const HeartIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
const UserIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MenuIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const CloseIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CompareIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 3 21 8 16 13"/><line x1="21" y1="8" x2="9" y2="8"/><polyline points="8 21 3 16 8 11"/><line x1="3" y1="16" x2="15" y2="16"/></svg>;

const navLinks = [
  { label: 'Beranda', href: '/' },
  { label: 'Toko', href: '/shop' },
  { label: 'Blog', href: '/blog' },
  { label: 'Kupon', href: '/coupons' },
  { label: 'Tentang', href: '/about' },
  { label: 'Kontak', href: '/contact' },
];

const categories = ['Electronics', 'Smartphones', 'Computers', 'Smart Watches', 'Gaming', 'Cameras', 'Headphones'];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const loggedIn = isAuthenticated();
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  const fetchCounts = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const cartData = await fetchJson(`${BUYER_API_BASE}/cart`);
      if (cartData) {
        const items = cartData.items || cartData.Items || [];
        const total = items.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
        setCartCount(total);
      }

      const wishlistData = await fetchJson(`${BUYER_API_BASE}/wishlist`);
      if (wishlistData) {
        setWishCount(Array.isArray(wishlistData) ? wishlistData.length : (wishlistData.data?.length || 0));
      }
    } catch (err) {
      console.error('Navbar Sync Error:', err);
    }
  };

  useEffect(() => {
    
    fetchCounts();
    
    // Real-time Sync via SSE (Server-Sent Events)
    let eventSource = null;
    if (localStorage.getItem('token') && user?.id) {
       // Melalui SSE, perubahan di keranjang/wishlist/notif akan langsung terdeteksi
       eventSource = new EventSource(`${PUBLIC_API_BASE.replace('/public', '')}/notifications/stream?user_id=${user.id}`);
       
       eventSource.onmessage = (event) => {
         if (!event.data || event.data.trim() === "") return;
         try {
           const payload = JSON.parse(event.data);
           if (payload.type === 'cart_update' || payload.type === 'wishlist_update' || payload.type === 'notification') {
             fetchCounts(); // Auto sync state navbar
           }
         } catch (err) {
           console.error('SSE Error:', err);
         }
       };

       eventSource.onerror = () => {
         eventSource.close();
       };
    }
    
    // Listen for custom updates (e.g. from AddToCart)
    window.addEventListener('cartUpdate', fetchCounts);
    
    // Polling as safety net (lebih lambat karena sudah ada SSE)
    const interval = setInterval(fetchCounts, 60000);
    
    return () => {
      if (eventSource) eventSource.close();
      window.removeEventListener('cartUpdate', fetchCounts);
      clearInterval(interval);
    };
  }, [location.pathname, user?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        {/* Top Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 lg:gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 transition-transform active:scale-95">
            <img src="/akuglow.jpg" alt="AkuGlow" className="h-8 sm:h-10 w-auto object-contain" />
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-2xl">
            <div className="flex w-full border-2 border-gray-100 rounded-2xl overflow-hidden focus-within:border-blue-500 transition-all bg-gray-50 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-blue-50/50">
              <input 
                type="text" 
                placeholder="Cari produk premium, kategori, atau merk..." 
                className="flex-1 px-6 py-2.5 text-sm outline-none bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 text-white transition-colors flex items-center justify-center">
                <SearchIcon />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-5">
            {/* Mobile Search Toggle (Optional but helpful) */}
            <button className="lg:hidden p-2 text-gray-500 hover:text-blue-600 active:scale-90 transition-all" onClick={() => setMenuOpen(!menuOpen)}>
              <SearchIcon />
            </button>

            <div className="relative">
              <button 
                className="flex items-center gap-2.5 text-gray-700 hover:text-blue-600 transition-all group"
                onClick={() => setUserDropdown(!userDropdown)}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:border-blue-200 transition-all overflow-hidden">
                  {loggedIn && user?.profile?.photo_url ? (
                    <img src={user.profile.photo_url} className="w-full h-full object-cover" alt="Profile" />
                  ) : <UserIcon />}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Akun Saya</p>
                  <p className="text-sm font-black text-gray-800 leading-none">
                    {loggedIn ? (user?.profile?.full_name?.split(' ')[0] || 'Member') : 'Masuk'}
                  </p>
                </div>
              </button>

              {userDropdown && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-white border border-gray-100 shadow-2xl rounded-2xl py-3 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {loggedIn ? (
                    <>
                      <div className="px-4 pb-3 border-b border-gray-50 mb-2">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user?.role}</p>
                        <p className="text-xs font-medium text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link to="/profile" className="block px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Profil Saya</Link>
                      <Link to="/profile?tab=orders" className="block px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Pesanan Saya</Link>
                      {isAdmin && (
                        <Link to="/admin" className="block px-4 py-2.5 text-sm font-black text-blue-600 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Dashboard Admin</Link>
                      )}
                      {user?.role === 'merchant' && (
                        <Link to="/merchant" className="block px-4 py-2.5 text-sm font-black text-blue-600 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Dashboard Merchant</Link>
                      )}
                      {user?.role === 'affiliate' && (
                        <Link to="/affiliate" className="block px-4 py-2.5 text-sm font-black text-blue-600 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Dashboard Affiliate</Link>
                      )}
                      <div className="mt-2 pt-2 border-t border-gray-50">
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">Keluar (Logout)</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="block px-4 py-2.5 text-sm font-black text-gray-800 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Masuk Akun</Link>
                      <Link to="/register" className="block px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-blue-50" onClick={() => setUserDropdown(false)}>Daftar Baru</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {loggedIn && (
              <Link to="/wishlist" className="hidden sm:flex relative p-2.5 text-gray-700 hover:text-red-500 transition-colors">
                <HeartIcon />
                {wishCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">{wishCount}</span>}
              </Link>
            )}

            {loggedIn && (
              <button 
                onClick={() => window.dispatchEvent(new Event('openCart'))}
                className="relative p-2.5 text-gray-700 hover:text-blue-600 transition-colors cursor-pointer active:scale-90"
              >
                <CartIcon />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">{cartCount}</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Sub-Navbar */}
        <div className="lg:hidden border-t border-gray-50 overflow-x-auto no-scrollbar bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-6 px-4 h-11 whitespace-nowrap min-w-max">
            {navLinks.map(link => (
              <Link 
                key={link.label} 
                to={link.href} 
                className={`text-[13px] font-bold transition-all ${location.pathname === link.href ? 'text-blue-600 border-b-2 border-blue-600 h-full flex items-center' : 'text-gray-500 hover:text-blue-600'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop Navigation Bottom */}
        <div className="hidden lg:block border-t border-gray-100 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-10 h-12">
            <nav className="flex items-center gap-8">
              {navLinks.map(link => (
                <Link key={link.label} to={link.href} className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">{link.label}</Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-gray-400">Butuh bantuan?</span>
              <span className="font-black text-gray-900 italic">AkuGlow Care</span>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay / Search Overlay */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 top-[90px] z-[55] bg-white animate-in fade-in slide-in-from-top duration-300 overflow-y-auto pb-20">
            <div className="px-6 py-6 space-y-6">
              <div className="relative">
                <form onSubmit={handleSearch}>
                  <input 
                    type="text" 
                    placeholder="Apa yang kamu cari?" 
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3.5 text-base outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600">
                    <SearchIcon />
                  </button>
                </form>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Menu Navigasi</p>
                {navLinks.map(link => (
                  <Link 
                    key={link.label} 
                    to={link.href} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 text-base font-bold text-gray-800 transition-all border border-gray-100" 
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </Link>
                ))}
              </div>

              {!loggedIn && (
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Link to="/login" className="bg-blue-600 text-white text-center py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-blue-200" onClick={() => setMenuOpen(false)}>Masuk</Link>
                  <Link to="/register" className="bg-gray-100 text-gray-700 text-center py-3.5 rounded-2xl font-black text-sm border border-gray-200" onClick={() => setMenuOpen(false)}>Daftar</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modern Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-2.5 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Link to="/" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link to="/shop" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/shop' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span className="text-[10px] font-bold">Toko</span>
        </Link>
        <Link to="/wishlist" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/wishlist' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
          <HeartIcon />
          <span className="text-[10px] font-bold">Favorit</span>
        </Link>
        <Link to="/profile" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/profile' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
          <UserIcon />
          <span className="text-[10px] font-bold">Profil</span>
        </Link>
      </nav>
    </>
  );
}
