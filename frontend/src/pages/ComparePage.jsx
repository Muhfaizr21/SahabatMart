import { Link } from 'react-router-dom';

export default function ComparePage() {
  const products = [
    { id: 1, name: 'Samsung Galaxy Watch 6 Classic 47mm', price: 'Rp4.480.000', rating: 4.8, brand: 'Samsung', screen: '1.5" Super AMOLED', battery: '425mAh', weight: '59g', img: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=200&h=200&fit=crop' },
    { id: 2, name: 'Apple Watch Series 9 GPS 45mm', price: 'Rp6.999.000', rating: 4.9, brand: 'Apple', screen: '1.9" Retina LTPO OLED', battery: '308mAh', weight: '38.8g', img: 'https://images.unsplash.com/photo-1434493789847-2f02bbfdcb1f?w=200&h=200&fit=crop' },
    { id: 3, name: 'Garmin Venu 3 GPS Smartwatch', price: 'Rp7.799.000', rating: 4.7, brand: 'Garmin', screen: '1.4" AMOLED', battery: 'Up to 14 days', weight: '47g', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop' }
  ];

  return (
    <main className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Bandingkan Spesifikasi</h1>
            <p className="text-gray-500">Bandingkan hingga 3 produk untuk menemukan pilihan terbaikmu.</p>
          </div>
          <button className="bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-500 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm self-start">
            Kosongkan Daftar
          </button>
        </div>

        <div className="overflow-x-auto pb-8">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr>
                <td className="p-4 w-64 border-b border-gray-100 align-top">
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-widest bg-gray-50 inline-block px-3 py-1 rounded-lg">Produk</div>
                </td>
                {products.map(p => (
                  <td key={p.id} className="p-4 border-b border-gray-100 align-top bg-white relative group">
                    <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      ✕
                    </button>
                    <div className="h-48 rounded-2xl bg-gray-50 mb-4 overflow-hidden border border-gray-100 flex items-center justify-center p-4">
                      <img src={p.img} alt={p.name} className="max-h-full object-contain mix-blend-multiply" />
                    </div>
                    <Link to={`/product/${p.id}`} className="font-bold text-gray-900 text-lg hover:text-blue-600 transition-colors leading-snug line-clamp-2 block mb-2">{p.name}</Link>
                    <div className="text-xl font-black text-blue-600 mb-4">{p.price}</div>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                      Masukkan Keranjang
                    </button>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="p-4 font-bold text-gray-500 border-b border-gray-50 bg-gray-50/30">Rating Pembeli</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-semibold text-gray-900 border-b border-gray-50 text-center">
                    ⭐ {p.rating}/5.0
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-gray-500 border-b border-gray-50 bg-gray-50/30">Merek / Brand</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-semibold text-gray-900 border-b border-gray-50 text-center">{p.brand}</td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-gray-500 border-b border-gray-50 bg-gray-50/30">Layar</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-semibold text-gray-900 border-b border-gray-50 text-center">{p.screen}</td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-gray-500 border-b border-gray-50 bg-gray-50/30">Kapasitas Baterai</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-semibold text-gray-900 border-b border-gray-50 text-center">{p.battery}</td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-gray-500 border-b border-gray-50 bg-gray-50/30">Berat Total</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-semibold text-gray-900 border-b border-gray-50 text-center">{p.weight}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
