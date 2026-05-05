import { Link } from 'react-router-dom';

function CartIcon() {
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-16 pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/akuglow.jpg" alt="AkuGlow" className="h-10 w-auto object-contain brightness-200" />
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-xs">
              Toko kecantikan dan kesehatan terpercaya dengan produk berkualitas dan harga bersahabat untuk semua kebutuhan kamu.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <svg width="14" height="14" className="text-blue-500 flex-shrink-0" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Jl. Sudirman No. 123, Jakarta Pusat</span>
              </div>
              <div className="flex items-center gap-3">
                <svg width="14" height="14" className="text-blue-500 flex-shrink-0" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.92 6.92l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                <span>+62 21 1234 5678</span>
              </div>
              <div className="flex items-center gap-3">
                <svg width="14" height="14" className="text-blue-500 flex-shrink-0" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>support@akuglow.id</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {['M', 'T', 'I', 'Y'].map((label, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors text-xs font-bold text-gray-400 hover:text-white">
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-5">Akun Saya</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/profile" className="hover:text-blue-400 transition-colors">Profil Saya</Link></li>
              <li><Link to="/profile?tab=orders" className="hover:text-blue-400 transition-colors">Pesanan Saya</Link></li>
              <li><Link to="/wishlist" className="hover:text-blue-400 transition-colors">Wishlist</Link></li>
              <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Bantuan</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-5">Informasi</h4>
            <ul className="space-y-3 text-sm">
              {['Tentang Kami', 'Blog', 'Kontak Kami', 'Kebijakan Privasi', 'Syarat & Ketentuan'].map(item => (
                <li key={item}><a href="#" className="hover:text-blue-400 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-5">Newsletter</h4>
            <p className="text-sm mb-4">Daftarkan email dan dapatkan promo eksklusif!</p>
            <form className="flex flex-col gap-3">
              <input type="email" placeholder="Email kamu..." className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors" />
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">Berlangganan</button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">&copy; 2025 AkuGlow. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            {['Privacy', 'Terms', 'Sitemap'].map(l => (
              <a key={l} href="#" className="hover:text-blue-400 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
