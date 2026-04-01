import { Link } from 'react-router-dom';

export default function CouponPage() {
  const coupons = [
    { code: 'SAHABATBARU', title: 'Diskon Pengguna Baru', desc: 'Dapatkan potongan langsung Rp50.000 untuk transaksi perdana kamu minimal Rp200.000. Hanya berlaku untuk pengguna yang baru terdaftar.', exp: '31 Des 2024', color: 'bg-blue-600', max: 'Rp50.000' },
    { code: 'ONGKIRGRATIS', title: 'Gratis Ongkir Pulau Jawa', desc: 'Nikmati layanan gratis biaya pengiriman hingga Rp30.000 ke seluruh wilayah di Pulau Jawa. Minimal belanja Rp100.000.', exp: '15 Mei 2024', color: 'bg-green-500', max: 'Rp30.000' },
    { code: 'PAYDAY24', title: 'Promo Payday Super', desc: 'Diskon besar-besaran 20% khusus metode pembayaran E-Wallet dan Kartu Kredit di akhir bulan.', exp: 'Sebentar Lagi', color: 'bg-red-500', max: 'Rp150.000' },
    { code: 'GADGETPRO', title: 'Cashback Ekstra Gadget', desc: 'Cashback berupa Koin SahabatMart (Coins) sebesar 5% untuk semua kategori Elektronik dan Gadget.', exp: '30 Apr 2024', color: 'bg-purple-600', max: 'Rp200.000' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 text-yellow-500 rounded-full mb-4 shadow-inner">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">Klaim Kupon Spesialmu!</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">Gunakan kode promo di bawah ini pada halaman *Checkout* untuk mendapatkan harga terbaik.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {coupons.map((c, i) => (
            <div key={i} className="flex flex-col sm:flex-row bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-shadow group relative">
              {/* Desain Tepi Ribbed (Kupon Sobek) */}
              <div className={`${c.color} sm:w-1/3 p-6 flex flex-col justify-center items-center text-center relative border-r-2 border-dashed border-white/40`}>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
                
                <h3 className="text-white font-black text-2xl mb-1">{c.max}</h3>
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">Maks. Potongan</span>
              </div>
              
              <div className="p-6 sm:w-2/3 flex flex-col relative">
                 <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
                 
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-xl">{c.title}</h3>
                  <span className="text-[10px] font-bold uppercase py-1 px-2.5 bg-gray-100 text-gray-500 rounded-lg">Exp: {c.exp}</span>
                </div>
                
                <p className="text-sm text-gray-500 mb-5 leading-relaxed flex-1">
                  {c.desc}
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 font-mono font-bold text-gray-900 text-center tracking-widest text-lg">
                    {c.code}
                  </div>
                  <button className="bg-gray-900 hover:bg-blue-600 text-white font-bold p-3 rounded-xl transition-colors shrink-0 tooltip relative">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
