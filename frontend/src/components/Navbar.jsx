import { useState } from 'react';
import { Link } from 'react-router-dom';

const SearchIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const CartIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const HeartIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
const UserIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MenuIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const CloseIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const ChevronDown = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>;
const CompareIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 3 21 8 16 13"/><line x1="21" y1="8" x2="9" y2="8"/><polyline points="8 21 3 16 8 11"/><line x1="3" y1="16" x2="15" y2="16"/></svg>;

const navLinks = [
  { label: 'Beranda', href: '/' },
  { label: 'Toko', href: '/shop' },
  { label: 'Blog', href: '/blog' },
  { label: 'Kupon', href: '/coupons' },
  { label: 'Tentang', href: '/about' },
  { label: 'Kontak', href: '/contact' },
];

const categories = ['New Arrivals', 'Electronics', 'Smartphones', 'Computers', 'Cameras', 'Smart Watches', 'Headphones', 'Gaming', 'Sports'];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  return (
    <>
      {/* Main Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CartIcon />
              </div>
              <span className="text-xl font-bold text-gray-900">SahabatMart</span>
            </Link>

            {/* Search */}
            <div className="hidden lg:flex flex-1 max-w-xl">
              <div className="flex w-full border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors">
                <input type="text" placeholder="Cari Produk..." className="flex-1 px-4 py-2 text-sm outline-none" />
                <select className="border-l border-gray-200 px-3 text-xs text-gray-500 bg-gray-50 outline-none">
                  <option>Semua Kategori</option>
                  <option>Electronics</option>
                  <option>Mobile</option>
                  <option>Komputer</option>
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 px-4 text-white transition-colors">
                  <SearchIcon />
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <Link to={localStorage.getItem('token') ? "/profile" : "/login"} className="hidden lg:flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                <UserIcon />
                <div className="text-xs">
                   <div className="text-gray-400">Halo,</div>
                   <div className="font-semibold text-gray-800 w-16 truncate">
                     {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).profile?.full_name || 'Member' : 'Masuk'}
                   </div>
                </div>
              </Link>
              <Link to="/compare" className="hidden lg:flex text-gray-600 hover:text-blue-600 transition-colors">
                <CompareIcon />
              </Link>
              <Link to="/wishlist" className="hidden lg:flex relative text-gray-600 hover:text-blue-600 transition-colors">
                <HeartIcon />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">4</span>
              </Link>
              <Link to="/cart" className="relative text-gray-600 hover:text-blue-600 transition-colors">
                <CartIcon />
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">13</span>
              </Link>
              <button className="lg:hidden text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>

          {/* Bottom Nav Desktop */}
          <div className="hidden lg:flex items-center h-10 border-t border-gray-100 gap-8 text-sm">
            {/* All Departments Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 font-medium text-gray-700 hover:text-blue-600 h-10"
                onClick={() => setCatOpen(!catOpen)}
                onBlur={() => setTimeout(() => setCatOpen(false), 150)}
              >
                <MenuIcon />
                Semua Departemen
                <ChevronDown />
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 w-56 bg-white shadow-xl border border-gray-100 rounded-b-lg z-50">
                  {categories.map((cat) => (
                    <Link key={cat} to={`/shop?cat=${cat}`} className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      {cat}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="font-medium text-gray-700 hover:text-blue-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-6 py-4">
            <input type="text" placeholder="Cari..." className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 outline-none" />
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="block py-2.5 text-sm text-gray-700 border-b border-gray-50">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
