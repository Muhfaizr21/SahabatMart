import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, BUYER_API_BASE, PUBLIC_API_BASE, fetchJson, captureAffiliate } from '../lib/api';

const steps = ['Keranjang', 'Checkout', 'Konfirmasi'];
const paymentMethods = [
  { id: 'QRIS', label: 'QRIS (GOPAY/OVO/DANA)', icon: '📱', desc: 'Scan & Bayar Instan' },
  { id: 'MANDIRIVA', label: 'Mandiri Virtual Account', icon: '🏦', desc: 'Transfer via Mandiri' },
  { id: 'BRIVA', label: 'BRI Virtual Account', icon: '🏦', desc: 'Transfer via BRI' },
  { id: 'BCAVA', label: 'BCA Virtual Account', icon: '🏦', desc: 'Transfer via BCA' },
  { id: 'ALFAMART', label: 'Alfamart', icon: '🏪', desc: 'Bayar via Kasir Alfamart' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [cart, setCart] = useState({ items: [] });
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', province: '', postalCode: '', notes: '',
    area_id: '', area_name: '', district: '',
  });
  const [areaSearch, setAreaSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [shippingType, setShippingType] = useState('expedition');
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [areas, setAreas] = useState([]);
  const [searchingArea, setSearchingArea] = useState(false);
  const [shippingRates, setShippingRates] = useState([]);
  const [shippingWarning, setShippingWarning] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const getItemPrice = (item) => {
    const isMitra = user?.role === 'mitra' || user?.role === 'affiliate';
    if (isMitra) {
      if (item.product_variant?.wholesale_price > 0) return item.product_variant.wholesale_price;
      if (item.product?.wholesale_price > 0) return item.product.wholesale_price;
    }
    return item.product_variant?.price || item.product?.price || 0;
  };

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Guest mode, nothing to fetch from profile
          setLoading(false);
          return;
        }

        // Parallel fetch for speed
        const [cartData, profileData] = await Promise.all([
          fetchJson(`${BUYER_API_BASE}/cart`),
          fetchJson(`${BUYER_API_BASE}/profile`)
        ]);

        if (cartData) setCart(cartData);
        if (profileData && profileData.user) {
          const u = profileData.user;
          // [Sync Fix] Ensure user state is updated with role
          setUser(u);
          const names = u.profile?.full_name?.split(' ') || ['', ''];
          const profile = u.profile || {};
          
          setForm(f => ({
            ...f,
            firstName: names[0],
            lastName: names.slice(1).join(' ') || profile.full_name,
            email: u.email,
            phone: u.phone || '',
            address: profile.address || '',
            city: profile.city || '',
            province: profile.province || '',
            postalCode: profile.zip_code || '',
            area_id: profile.area_id || '',
            district: profile.district || ''
          }));

          if (profile.area_id) {
             if (profile.district && profile.city) {
                setAreaSearch(`${profile.district}, ${profile.city}`);
             } else if (profile.district || profile.city) {
                setAreaSearch(profile.district || profile.city);
             }
             if (cartData?.items?.length > 0) {
                fetchRates(profile.area_id, cartData.items);
             }
          } else {
             // Wajib pilih ulang jika tidak ada area_id valid
             setForm(f => ({ ...f, city: '', province: '', postalCode: '', district: '', area_id: '' }));
             setAreaSearch('');
          }
        }
      } catch (err) {
        console.error('Failed to pre-fill checkout:', err);
      }
    };
    fetchCheckoutData();
    captureAffiliate(); // Track referral on checkout if not already
  }, [navigate]);

  const subtotal = cart.items?.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0) || 0;
  const shipping = 0;
  
  // Calculate Discount
  let discount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discount_type === 'percent') {
      discount = subtotal * (appliedVoucher.discount_value / 100);
    } else {
      discount = appliedVoucher.discount_value;
    }
  }

  const total = subtotal + (shippingType === 'expedition' ? shippingCost : 0) - discount;

  const handleApplyVoucher = async () => {
    if (!voucherCode) return;
    setCheckingVoucher(true);
    try {
      // fetchJson auto-strips the response, so 'res' IS the voucher object
      const res = await fetchJson(`${PUBLIC_API_BASE}/vouchers/check?code=${voucherCode}&subtotal=${subtotal}`);
      if (res && res.data) {
        setAppliedVoucher(res.data);
        console.log("Voucher applied successfully:", res.data);
      } else {
        throw new Error("Format voucher tidak dikenali");
      }
    } catch (err) {
      alert(err.message);
      setAppliedVoucher(null);
    } finally {
      setCheckingVoucher(false);
    }
  };

  const handleSearchArea = async (input) => {
    if (input.length < 3) return;
    setSearchingArea(true);
    try {
      const res = await fetchJson(`${API_BASE}/api/shipping/areas?input=${input}`);
      setAreas(res || []);
    } catch (err) {
      console.error('Area search failed:', err);
    } finally {
      setSearchingArea(false);
    }
  };

  const handleSelectArea = async (area) => {
    const postalCode = area.name.split('.').pop().trim();
    setForm(f => ({ 
      ...f, 
      city: area.administrative_division_level_2_name, 
      province: area.administrative_division_level_1_name, 
      postalCode: postalCode,
      area_id: area.id,
      area_name: area.name,
      district: area.administrative_division_level_3_name,
    }));
    setAreaSearch(area.name);
    setAreas([]);
    fetchRates(area.id);
  };

  const fetchRates = async (areaId, overrideItems = null) => {
    setLoadingRates(true);
    try {
      const sourceItems = overrideItems || cart.items;
      if (!sourceItems || sourceItems.length === 0) {
        setShippingRates([]);
        return;
      }
      const items = sourceItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product?.name || 'Produk',
        unit_price: getItemPrice(i),
        quantity: i.quantity,
        // Berat dari variant > produk > default 200g (dalam gram)
        weight: i.product_variant?.weight || i.product?.weight || 200,
        // merchant_id langsung dari cart item, bukan dari nested product
        merchant_id: i.merchant_id || '00000000-0000-0000-0000-000000000000'
      }));
      const res = await fetchJson(`${API_BASE}/api/shipping/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_area_id: areaId, items })
      });
      console.log("[Shipping] Rates received:", res.rates);
      setShippingRates(res.rates || []);
      setShippingWarning(res.warning || "");
      if (!res.rates || res.rates.length === 0) {
        console.warn("[Shipping] No rates found for items:", items);
      }
    } catch (err) {
      console.error('Fetch rates failed:', err);
      setShippingRates([]);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const orderItems = cart.items.map(item => ({
          merchant_id: item.merchant_id || '00000000-0000-0000-0000-000000000000',
          product_id: item.product_id,
          product_variant_id: item.product_variant_id || null,
          product_name: item.product?.name || '',
          variant_name: item.product_variant?.name || '',
          sku: item.product_variant?.sku || '',
          // Prioritas: harga variant > harga produk (wajib ada agar total benar)
          unit_price: getItemPrice(item),
          quantity: item.quantity,
          // Berat wajib ada untuk kalkulasi ongkir backend
          weight: item.product_variant?.weight || item.product?.weight || 200,
          product_image_url: item.product?.image || item.product?.image_url || ''
      }));

        // [Sync Fix] Ambil upline dari localStorage dengan prioritas:
        // 1. affiliate_id = sudah di-track backend via captureAffiliate()
        // 2. pending_ref = ref code dari URL yang belum di-track (belum klik link, langsung checkout)
        const trackedAffiliateId = localStorage.getItem('affiliate_id') || '';
        const pendingRef = localStorage.getItem('pending_ref') || '';
        const uplineRef = trackedAffiliateId || pendingRef;

        const payload = {
          email: form.email,
          password: form.password || '', // Only for guests
          full_name: `${form.firstName} ${form.lastName}`,
          phone: form.phone,
          items: orderItems,
          shipping_info: {
            shipping_name: `${form.firstName} ${form.lastName}`,
            shipping_phone: form.phone,
            shipping_address: form.address,
            shipping_city: form.city,
            shipping_province: form.province,
            shipping_postal_code: form.postalCode,
            destination_area_id: form.area_id,
            total_shipping_cost: shippingCost,
            notes: form.notes,
            merchant_groups: (() => {
              // Group cart items by merchant_id to build per-merchant groups
              const grouped = {};
              cart.items.forEach(i => {
                const mId = i.merchant_id || '00000000-0000-0000-0000-000000000000';
                if (!grouped[mId]) grouped[mId] = [];
                grouped[mId].push(i);
              });
              return Object.keys(grouped).map(mId => ({
                merchant_id: mId,
                courier_code: selectedShipping?.courier_code || '',
                service_code: selectedShipping?.courier_service || '',
                // shipping cost dibagi merata jika multi-merchant, atau penuh jika single
                shipping_cost: Object.keys(grouped).length > 1
                  ? Math.round(shippingCost / Object.keys(grouped).length)
                  : shippingCost
              }));
            })()
          },
          upline_id: uplineRef,
          voucher_code: appliedVoucher?.code || '',
          payment_method: paymentMethod,
          total_weight: cart.items?.reduce((w, i) => w + ((i.product_variant?.weight || i.product?.weight || 200) * i.quantity), 0) || 0,
        };

      // [Sync Fix] Update profile address automatically if logged in
      if (token) {
        fetchJson(`${BUYER_API_BASE}/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: `${form.firstName} ${form.lastName}`,
            phone: form.phone,
            address: form.address,
            district: form.district,
            city: form.city,
            province: form.province,
            zip_code: form.postalCode,
            area_id: form.area_id
          })
        }).catch(e => console.warn('Failed to sync profile address:', e));
      }

      const res = await fetchJson(`${PUBLIC_API_BASE}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }

      // Clear local cart
      setCart({ items: [] });
      
      navigate('/order-success', { 
        state: { 
          order: res.order, 
          payment: res.payment 
        } 
      });
    } catch (err) {
      alert('Checkout gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
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
                <div className="flex items-center justify-between mb-5">
                   <h2 className="font-bold text-gray-900 text-lg">Informasi Pengiriman</h2>
                   {!localStorage.getItem('token') && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase tracking-tighter">Beli & Daftar Mitra</span>
                   )}
                </div>
                
                {/* Account setup for guests */}
                {!localStorage.getItem('token') && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-6 group hover:border-purple-300 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-purple-600 text-sm">person_add</span>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Buat Akun Mitra (Wajib)</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-4">Setiap pembeli di Akuglow otomatis menjadi mitra berlisensi.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Email *</label>
                        <input required type="email" placeholder="email@kamu.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-purple-400 transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Kata Sandi *</label>
                        <input required type="password" placeholder="Min. 8 Karakter" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-purple-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                )}

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
                  {/* Hide email if already shown in account setup above */}
                  {localStorage.getItem('token') && (
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                      <input required type="email" placeholder="email@kamu.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                    </div>
                  )}
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
                  <div className="sm:col-span-2 relative">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Kecamatan / Kota *</label>
                    <input 
                      type="text" 
                      placeholder="Ketik min. 3 huruf, misal: 'Kebayoran'"
                      value={areaSearch}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
                      onChange={(e) => { 
                        setAreaSearch(e.target.value); 
                        setForm(f => ({ ...f, area_id: '', city: '', province: '', postalCode: '' }));
                        handleSearchArea(e.target.value); 
                      }}
                    />
                    {searchingArea && <div className="absolute right-4 top-9 text-[10px] text-blue-500 animate-pulse">Mencari...</div>}
                    {areas.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {areas.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleSelectArea(a)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0"
                          >
                            <div className="font-bold">{a.name}</div>
                            <div className="text-gray-500">{a.administrative_division_level_2_name}, {a.administrative_division_level_1_name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {form.area_id ? (
                      <div className="mt-2 text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full w-fit">
                        <span className="text-green-500">✓</span> Lokasi berhasil dipilih
                      </div>
                    ) : areaSearch.length >= 3 && !searchingArea && areas.length === 0 ? (
                      <div className="mt-2 text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <span>⚠️</span> Lokasi tidak ditemukan. Coba kata kunci lain.
                      </div>
                    ) : areaSearch.length > 0 && !form.area_id ? (
                      <div className="mt-2 text-[10px] text-orange-500 font-bold flex items-center gap-1">
                        <span>⚠️</span> Pilih lokasi dari daftar yang muncul di atas
                      </div>
                    ) : null}
                  </div>
                  {/* Detail lokasi otomatis terisi dari pilihan area */}
                  <div className="sm:col-span-2 flex flex-wrap gap-3 text-sm">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs font-medium text-gray-500 block mb-1">Kota/Kabupaten</label>
                      <div className={`bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 ${form.city ? 'text-gray-700 font-medium' : 'text-gray-400 text-xs italic'}`}>
                        {form.city || 'Otomatis terisi...'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs font-medium text-gray-500 block mb-1">Provinsi</label>
                      <div className={`bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 ${form.province ? 'text-gray-700 font-medium' : 'text-gray-400 text-xs italic'}`}>
                        {form.province || 'Otomatis terisi...'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Kode Pos</label>
                    {form.area_id ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700">{form.postalCode}</div>
                    ) : (
                      <input type="text" placeholder="10220" value={form.postalCode}
                        onChange={e => setForm({...form, postalCode: e.target.value})}
                        className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
                    )}
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
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900 text-lg">Metode Pengiriman</h2>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => setShippingType('expedition')}
                      className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${shippingType === 'expedition' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >Kirim Ekspedisi</button>
                    <button 
                      type="button"
                      onClick={() => {
                        setShippingType('pickup');
                        setShippingCost(0);
                        setSelectedShipping({ courier_code: 'PICKUP', courier_name: 'AMBIL DI TOKO', courier_service: 'SELF' });
                      }}
                      className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${shippingType === 'pickup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >Ambil di Toko</button>
                  </div>
                </div>

                {shippingWarning && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-xl">⚠️</span>
                    <div className="text-sm text-orange-700 leading-relaxed font-medium">
                      {shippingWarning}
                    </div>
                  </div>
                )}

                {shippingType === 'expedition' ? (
                  <div className="space-y-3">
                    {loadingRates ? (
                       <div className="py-10 text-center">
                          <div className="animate-spin mb-2">🌀</div>
                          <div className="text-xs text-gray-400">Mengambil ongkir terbaik...</div>
                       </div>
                    ) : shippingRates.length > 0 ? (
                      shippingRates.map((method, idx) => (
                        <label key={idx} className="flex items-center gap-4 border-2 border-gray-100 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                          <input 
                            type="radio" 
                            name="shipping" 
                            checked={selectedShipping?.courier_code === method.courier_code && selectedShipping?.courier_service === method.courier_service}
                            onChange={() => {
                              setSelectedShipping(method);
                              setShippingCost(method.price);
                            }}
                            className="accent-blue-600 w-4 h-4" 
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 text-sm uppercase">{method.courier_name} {method.courier_service}</div>
                            <div className="text-xs text-gray-500">Estimasi {method.duration}</div>
                          </div>
                          <div className="text-sm font-bold text-gray-700">Rp{method.price.toLocaleString('id-ID')}</div>
                        </label>
                      ))
                    ) : (
                       <div className="py-10 px-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                         <div className="text-3xl mb-2 opacity-30">🚚</div>
                         <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                           {form.area_id 
                             ? 'Maaf, tidak ada kurir ekspedisi yang mendukung rute ini atau kurir sedang non-aktif.' 
                             : 'Pilih lokasi pengiriman (Kecamatan/Kota) pada kolom alamat di atas untuk melihat opsi kurir.'}
                         </p>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-blue-500 bg-blue-50 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mb-4 shadow-xl shadow-blue-200/50">🏪</div>
                    <h4 className="font-black text-blue-900 mb-1">Pick-up di Merchant Terdekat</h4>
                    <p className="text-xs text-blue-600 mb-4 px-6 leading-relaxed">Pesanan Anda akan disiapkan untuk diambil di lokasi merchant yang Anda pilih saat memasukkan produk ke keranjang.</p>
                    <div className="bg-white px-4 py-2 rounded-full border border-blue-200 text-[10px] font-black text-blue-600 uppercase tracking-widest">Biaya Pengiriman: GRATIS</div>
                  </div>
                )}
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
                <div className="space-y-4 mb-5 max-h-60 overflow-y-auto pr-2">
                  {cart.items?.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="relative flex-shrink-0">
                        {item.product?.image_url || item.product?.image ? (
                          <img
                            src={item.product?.image_url || item.product?.image}
                            alt={item.product?.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-400 text-sm font-bold">
                            {item.product?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-gray-900 font-bold leading-tight line-clamp-1 truncate">{item.product?.name}</div>
                        <div className="text-[10px] text-blue-600 font-medium leading-tight line-clamp-1">{item.product_variant?.name || 'Default Varian'}</div>
                        <div className="text-[11px] font-bold text-gray-900 mt-0.5">Rp{(getItemPrice(item) * item.quantity).toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-5 pt-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Masukkan voucher..." 
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 uppercase"
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                    />
                    <button 
                      type="button" 
                      onClick={handleApplyVoucher}
                      disabled={checkingVoucher || !voucherCode}
                      className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
                    >
                      {checkingVoucher ? '...' : 'Pasang'}
                    </button>
                  </div>
                  {appliedVoucher && (
                    <div className="bg-green-50 text-green-700 text-[10px] px-3 py-2 rounded-lg mt-2 font-medium flex justify-between items-center">
                      <span>Voucher {appliedVoucher.code} terpasang</span>
                      <button onClick={() => setAppliedVoucher(null)} className="font-bold">Hapus</button>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">Rp{subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Total Berat</span>
                    <span>{((cart.items?.reduce((w, i) => w + ((i.product_variant?.weight || i.product?.weight || 200) * i.quantity), 0) || 0) / 1000).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Pengiriman</span>
                    <span className={shippingType === 'pickup' || (shippingType === 'expedition' && selectedShipping) || shippingCost === 0 ? "text-green-600 font-bold" : "text-gray-400 font-medium italic"}>
                      {shippingType === 'pickup' ? 'GRATIS' : (shippingType === 'expedition' && selectedShipping) ? `Rp${shippingCost.toLocaleString('id-ID')}` : 'Pilih Kurir'}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon Voucher</span>
                      <span className="font-medium">-Rp{discount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString('id-ID')}</span>
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
