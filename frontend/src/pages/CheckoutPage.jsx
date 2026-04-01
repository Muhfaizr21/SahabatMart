import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const steps = ['Keranjang', 'Checkout', 'Konfirmasi'];
const provinces = ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten', 'Yogyakarta', 'Bali', 'Sumatera Utara', 'Sulawesi Selatan'];
const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank', icon: '🏦', desc: 'BCA, Mandiri, BNI, BRI' },
  { id: 'ewallet', label: 'E-Wallet', icon: '📱', desc: 'GoPay, OVO, DANA, ShopeePay' },
  { id: 'cod', label: 'Bayar di Tempat', icon: '💵', desc: 'Cash On Delivery' },
  { id: 'cc', label: 'Kartu Kredit/Debit', icon: '💳', desc: 'Visa, MasterCard, JCB' },
];

const orderSummary = [
  { name: 'Galaxy Tab S6 Lite 10.4-inch Android Tablet 128GB', qty: 1, price: 247 * 16000, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=60&h=60&fit=crop' },
  { name: 'Cancelling Headphones Wireless Premium Edition', qty: 2, price: 120 * 16000, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=60&h=60&fit=crop' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', province: '', postalCode: '', notes: '',
  });
  const [loading, setLoading] = useState(false);

  const subtotal = orderSummary.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = 0;
  const total = subtotal + shipping;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/order-success');
    }, 2000);
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Checkout</h1>
          {/* Steps */}
          <div className="flex items-center gap-3 mt-4">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${i <= 1 ? 'text-white' : 'text-blue-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 1 ? 'bg-green-400' : i === 1 ? 'bg-white text-blue-700' : 'bg-white/20'}`}>
                    {i < 1 ? '✓' : i + 1}
                  </div>
                  <span className="text-sm font-medium">{step}</span>
                </div>
                {i < steps.length - 1 && <div className="w-12 h-0.5 bg-white/30" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Form */}
            <div className="flex-1 space-y-6">
              {/* Shipping Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5">Informasi Pengiriman</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Nama Depan *</label>
                    <input required type="text" placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Nama Belakang *</label>
                    <input required type="text" placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                    <input required type="email" placeholder="email@kamu.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Nomor HP *</label>
                    <input required type="tel" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Alamat Lengkap *</label>
                    <input required type="text" placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Kota/Kabupaten *</label>
                    <input required type="text" placeholder="Jakarta Pusat" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Provinsi *</label>
                    <select required value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors bg-white">
                      <option value="">Pilih Provinsi</option>
                      {provinces.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Kode Pos</label>
                    <input type="text" placeholder="10220" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Catatan Pesanan</label>
                    <textarea rows={2} placeholder="Catatan untuk penjual (opsional)..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors resize-none" />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5">Metode Pengiriman</h2>
                <div className="space-y-3">
                  {[
                    { id: 'jne-reg', label: 'JNE Reguler', days: '3-5 hari', price: 'GRATIS' },
                    { id: 'jne-yes', label: 'JNE YES (Yakin Esok Sampai)', days: '1 hari', price: 'Rp25.000' },
                    { id: 'sicepat', label: 'SiCepat BEST', days: '2-3 hari', price: 'Rp12.000' },
                  ].map(method => (
                    <label key={method.id} className="flex items-center gap-4 border-2 border-gray-100 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input type="radio" name="shipping" defaultChecked={method.id === 'jne-reg'} className="accent-blue-600 w-4 h-4" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-sm">{method.label}</div>
                        <div className="text-xs text-gray-500">{method.days}</div>
                      </div>
                      <div className={`text-sm font-bold ${method.price === 'GRATIS' ? 'text-green-600' : 'text-gray-700'}`}>{method.price}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-5">Metode Pembayaran</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-3 border-2 rounded-xl p-4 text-left transition-all ${
                        paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{method.label}</div>
                        <div className="text-xs text-gray-500">{method.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 text-lg mb-5">Ringkasan Pesanan</h3>
                <div className="space-y-4 mb-5">
                  {orderSummary.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="relative">
                        <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-50" />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{item.qty}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{item.name}</div>
                        <div className="text-xs font-bold text-gray-900 mt-1">Rp{(item.price * item.qty).toLocaleString('id')}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">Rp{subtotal.toLocaleString('id')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Pengiriman</span>
                    <span className="text-green-600 font-medium">GRATIS</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString('id')}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Memproses...
                    </>
                  ) : 'Konfirmasi Pesanan →'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">Dengan menekan tombol, kamu menyetujui <Link to="#" className="text-blue-500 hover:underline">Syarat & Ketentuan</Link></p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
