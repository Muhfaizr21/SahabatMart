import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, BUYER_API_BASE, PUBLIC_API_BASE, fetchJson, captureAffiliate, formatImage } from '../lib/api';
import toast from 'react-hot-toast';

const steps = ['Detail Pengiriman', 'Konfirmasi'];

const CourierLogo = ({ code, name, customLogo }) => {
  const [imgError, setImgError] = useState(false);

  const codeLower = code?.toLowerCase() || '';

  const imageUrl = customLogo ? formatImage(customLogo) : null;

  if (codeLower === 'pickup') {
    return (
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-inner ${config.bg}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615 3.001 3.001 0 0 0 3.75.615m-7.5 0H18m-7.5 0a3.001 3.001 0 0 0 3.75-.615 3.001 3.001 0 0 0 3.75.615m0 0V5.25m0 0a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25m6.75 0v-.901m0 0a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25m0 0v.901m-6.75 0v-.901m0 0A2.25 2.25 0 0 1 7.5 3h1.5a2.25 2.25 0 0 1 2.25 2.25v.901" />
        </svg>
      </div>
    );
  }

  if (imageUrl && !imgError) {
    return (
      <div className="w-12 h-9 bg-white rounded-lg flex items-center justify-center p-0.5 border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
        <img 
          src={imageUrl} 
          alt={name} 
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const label = name?.substring(0, 3).toUpperCase() || codeLower.substring(0, 3).toUpperCase() || 'CR';

  return (
    <div className="w-12 h-9 rounded-lg flex items-center justify-center px-1 text-[8px] font-black tracking-tight text-center shadow-sm select-none flex-shrink-0 bg-gradient-to-br from-slate-700 to-slate-900 text-white">
      {label}
    </div>
  );
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
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
  const [selectedShippings, setSelectedShippings] = useState({}); // { [merchant_id]: rateObj }
  const [areas, setAreas] = useState([]);
  const [searchingArea, setSearchingArea] = useState(false);
  const [shippingRates, setShippingRates] = useState({}); // { [merchant_id]: [rates] }
  const [shippingWarning, setShippingWarning] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [openGroups, setOpenGroups] = useState({ "Virtual Account": true, "Internal": true });
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [useShoppingBalance, setUseShoppingBalance] = useState(false);
  // "Kirim ke Alamat Lain" — gunakan form terpisah, TIDAK simpan ke profil
  const [useAltAddress, setUseAltAddress] = useState(false);
  const [altForm, setAltForm] = useState({
    firstName: '', lastName: '', phone: '',
    address: '', city: '', province: '', postalCode: '', notes: '',
    area_id: '', area_name: '', district: '',
  });
  const [altAreaSearch, setAltAreaSearch] = useState('');
  const [altAreas, setAltAreas] = useState([]);
  const [searchingAltArea, setSearchingAltArea] = useState(false);
  const [manualTransferConfig, setManualTransferConfig] = useState(null); // { enabled, bank_name, account_number, account_holder, instructions }
  const [qrisConfig, setQrisConfig] = useState(null); // { enabled, image_url }
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [proofNote, setProofNote] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);


  useEffect(() => {
    // [BUG-H4 Fix] JSON.parse localStorage dengan try/catch
    try {
      const userData = localStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (_e) {
      localStorage.removeItem('user');
    }
  }, []);

  const getItemPrice = (item) => {
    const isMitra = user?.role === 'mitra' || user?.role === 'affiliate';
    if (isMitra) {
      if (item.product_variant?.wholesale_price > 0) return item.product_variant.wholesale_price;
      if (item.product?.wholesale_price > 0) return item.product.wholesale_price;
    }
    return item.product_variant?.price || item.product?.price || 0;
  };

  // Fetch manual transfer config — selalu dijalankan, tidak perlu login
  useEffect(() => {
    fetch(`${API_BASE}/api/public/configs`, {
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
      .then(r => r.json())
      .then(res => {
        const cfg = res?.data || {};
        console.log('[ManualTransfer] enabled?', cfg['payment_manual_transfer_enabled']);
        if (cfg['payment_manual_transfer_enabled'] === 'true') {
          setManualTransferConfig({
            enabled: true,
            bank_name: cfg['payment_manual_bank_name'] || '',
            account_number: cfg['payment_manual_account_number'] || '',
            account_holder: cfg['payment_manual_account_holder'] || '',
            instructions: cfg['payment_manual_instructions'] || '',
          });
        } else {
          setManualTransferConfig(null);
        }
        
        if (cfg['payment_qris_enabled'] === 'true') {
          setQrisConfig({
            enabled: true,
            image_url: cfg['payment_qris_image_url'] || ''
          });
        } else {
          setQrisConfig(null);
        }
      })
      .catch(e => console.error('[Config] fetch error:', e));
  }, []);

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Guest mode, nothing to fetch from profile
          setLoading(false);
          return;
        }

        // Parallel fetch for speed (tanpa publicConfigData - sudah di-fetch terpisah)
        const [cartData, profileData, channelsData, walletData] = await Promise.all([
          fetchJson(`${BUYER_API_BASE}/cart`),
          fetchJson(`${BUYER_API_BASE}/profile`),
          fetchJson(`${API_BASE}/api/payment/channels`).catch(() => null),
          fetchJson(`${BUYER_API_BASE}/wallet`).catch(() => null),
        ]);

        if (walletData) setWallet(walletData);

        // [Fix] Handle unwrapped channels data from fetchJson
        const channelsList = channelsData?.data || (Array.isArray(channelsData) ? channelsData : []);
        
        if (channelsList && channelsList.length > 0) {
          const mapped = channelsList.map(c => ({
            id: c.code,
            label: c.name,
            icon: c.icon_url,
            desc: c.group,
            type: c.type, // "direct" | "redirect"
            fee_customer: c.fee_customer?.flat || 0,
            fee_customer_pct: c.fee_customer?.percent || 0,
            fee_merchant: c.fee_merchant?.flat || 0,
            min_amount: c.minimum_amount || 0,
            max_amount: c.maximum_amount || 0,
          }));

          setPaymentMethods(mapped);
          if (mapped.length > 0) setPaymentMethod(mapped[0].id);
        }
        setLoadingChannels(false);

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
      } catch (_err) {
        // [BUG-M11 Fix] Jangan bocorkan error message ke console — bisa berisi info sensitif
      }
    };
    fetchCheckoutData();
    captureAffiliate(); // Track referral on checkout if not already
  }, [navigate]);

  const subtotal = cart.items?.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0) || 0;
  const shipping = 0;

  // Deteksi apakah SEMUA item di cart adalah produk digital/virtual
  // Jika ya: skip form pengiriman & ongkir
  const allDigital = cart.items?.length > 0 && cart.items.every(i =>
    i.product?.product_type === 'digital' || i.product?.is_virtual
  );

  // ============================================================
  // WooCommerce-style Tax Calculation
  // ============================================================
  // Tax rates per tax_class (default Indonesia PPN 11%)
  const TAX_RATES = {
    'standard': 0.11,    // 11% PPN
    'reduced': 0.05,      // 5% PPN reduzido
    'zero': 0,            // 0% Bebas pajak
  };

  // Get tax rate for an item
  const getItemTaxRate = (item) => {
    const taxStatus = item.product?.tax_status || item.product_variant?.tax_status || 'taxable';
    if (taxStatus === 'none') return 0; // Zero rate
    if (taxStatus === 'reduced') return TAX_RATES.reduced;
    if (taxStatus === 'taxable') {
      const taxClass = item.product?.tax_class || item.product_variant?.tax_class || 'standard';
      return TAX_RATES[taxClass] || TAX_RATES.standard;
    }
    return 0;
  };

  // Check if sale is active (sale schedule validation)
  const isSaleActive = (item) => {
    const product = item.product;
    if (!product?.old_price || product.old_price <= 0) return false;
    if (product.old_price <= product.price) return false;
    const now = new Date();
    if (product.sale_start && new Date(product.sale_start) > now) return false;
    if (product.sale_end && new Date(product.sale_end) < now) return false;
    return true;
  };

  // Get effective price (sale price if active, otherwise regular price)
  const getEffectivePrice = (item) => {
    const basePrice = item.product_variant?.price || item.product?.price || 0;
    const salePrice = item.product_variant?.old_price || item.product?.old_price || 0;
    if (salePrice > 0 && salePrice > basePrice && isSaleActive(item)) {
      return salePrice; // Sale is active, use sale price
    }
    return basePrice;
  };

  // Calculate tax per item
  const calculateItemTax = (item) => {
    const taxableAmount = getEffectivePrice(item) * item.quantity;
    return taxableAmount * getItemTaxRate(item);
  };

  // Total tax for all items
  const totalTax = cart.items?.reduce((s, i) => s + calculateItemTax(i), 0) || 0;

  // Calculate Discount — utamakan nilai dari server (sudah memperhitungkan max_discount)
  let discount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.server_discount_amount != null) {
      discount = appliedVoucher.server_discount_amount;
    } else if (appliedVoucher.discount_type === 'percent') {
      discount = subtotal * (appliedVoucher.discount_value / 100);
      if (appliedVoucher.max_discount > 0 && discount > appliedVoucher.max_discount) {
        discount = appliedVoucher.max_discount;
      }
    } else {
      discount = appliedVoucher.discount_value;
    }
  }

  // Total: untuk produk digital, shipping selalu 0
  const effectiveShipping = allDigital ? 0 : (shippingType === 'expedition' ? shippingCost : 0);
  const total = subtotal + effectiveShipping + totalTax - discount;
  const shoppingBalanceDeduction = useShoppingBalance ? Math.min(wallet?.shopping_balance || 0, total) : 0;
  const remainingTotal = total - shoppingBalanceDeduction;

  const handleApplyVoucher = async () => {
    if (!voucherCode) return;
    setCheckingVoucher(true);
    try {
      const token = localStorage.getItem('token');
      
      // Kumpulkan konteks keranjang untuk validasi tipe voucher
      const productIDs = cart.items?.map(i => i.product_id).filter(Boolean).join(',') || '';
      const categories = [...new Set(cart.items?.map(i => i.product?.category).filter(Boolean))].join(',') || '';

      const params = new URLSearchParams({
        code: voucherCode,
        subtotal: subtotal.toString(),
        ...(productIDs && { product_ids: productIDs }),
        ...(categories && { categories }),
      });

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetchJson(`${PUBLIC_API_BASE}/vouchers/check?${params}`, { headers });

      if (res && res.data) {
        // Simpan discount_amount dari server jika tersedia
        const voucherData = {
          ...res.data,
          server_discount_amount: res.discount_amount || null,
        };
        setAppliedVoucher(voucherData);
      } else {
        throw new Error("Format voucher tidak dikenali");
      }
    } catch (_err) {
      // [BUG-H5 Fix] Ganti alert() dengan toast
      toast.error(_err.message || 'Gagal memvalidasi voucher');
      setAppliedVoucher(null);
    } finally {
      setCheckingVoucher(false);
    }
  };

  const handleSearchArea = async (input) => {
    if (input.length < 3) {
      setAreas([]);
      return;
    }
    setSearchingArea(true);
    try {
      const res = await fetchJson(`${API_BASE}/api/shipping/areas?input=${encodeURIComponent(input)}`);
      // Backend returns { areas: [...] } — extract the array
      const areaList = res?.areas || (Array.isArray(res) ? res : []);
      setAreas(areaList);
    } catch (_err) {
      setAreas([]);
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
        setShippingRates({});
        return;
      }
      const items = sourceItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product?.name || 'Produk',
        unit_price: getItemPrice(i),
        quantity: i.quantity,
        weight: i.product_variant?.weight || i.product?.weight || 200,
        merchant_id: i.merchant_id || '00000000-0000-0000-0000-000000000000'
      }));

      // Kirim sebagai POST — fetchJson sudah handle Content-Type & ngrok header
      const res = await fetchJson(`${API_BASE}/api/shipping/rates`, {
        method: 'POST',
        body: JSON.stringify({ destination_area_id: areaId, items })
      });
      
      // fetchJson sudah unwrap { status: 'success', data: {...} } jika ada
      // Backend mengembalikan { rates: {...}, warning: '...' } langsung
      const rates = res?.rates || {};
      setShippingRates(rates);
      setShippingWarning(res?.warning || '');

      // Auto-select kurir pertama untuk tiap merchant jika belum dipilih
      const initialSelected = { ...selectedShippings };
      Object.keys(rates).forEach(mID => {
        if (!initialSelected[mID] && rates[mID]?.length > 0) {
          initialSelected[mID] = rates[mID][0];
        }
      });
      setSelectedShippings(initialSelected);

      const totalCost = Object.values(initialSelected).reduce((sum, r) => sum + (r?.price || 0), 0);
      setShippingCost(totalCost);

    } catch (_err) {
      setShippingRates({});
      setShippingWarning('Gagal mengambil ongkir. Pastikan koneksi stabil.');
    } finally {
      setLoadingRates(false);
    }
  };

  // Cari area untuk alamat alternatif
  const handleSearchAltArea = async (input) => {
    if (input.length < 3) { setAltAreas([]); return; }
    setSearchingAltArea(true);
    try {
      const res = await fetchJson(`${API_BASE}/api/shipping/areas?input=${encodeURIComponent(input)}`);
      setAltAreas(res?.areas || []);
    } catch (_) { setAltAreas([]); }
    finally { setSearchingAltArea(false); }
  };

  const handleSelectAltArea = (area) => {
    const postalCode = area.name.split('.').pop().trim();
    setAltForm(f => ({
      ...f,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode,
      area_id: area.id,
      area_name: area.name,
      district: area.administrative_division_level_3_name,
    }));
    setAltAreaSearch(area.name);
    setAltAreas([]);
    // Fetch ongkir pakai area alternatif
    fetchRates(area.id);
  };

  // Resolve: pakai altForm jika useAltAddress, else pakai form biasa
  const activeForm = useAltAddress ? altForm : form;

  // Handle file pick untuk bukti transfer
  const handleProofFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Upload bukti dan submit order sekaligus
  const handleProofSubmit = async () => {
    if (!proofFile) { toast.error('Upload bukti transfer terlebih dahulu'); return; }
    setUploadingProof(true);
    try {
      // 1. Upload file ke backend
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', proofFile);
      const uploadRes = await fetch(`${API_BASE}/api/buyer/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) throw new Error(uploadData.message || 'Gagal upload bukti');
      const proofUrl = uploadData.url;

      // 2. Submit checkout dengan proof_url
      setShowProofModal(false);
      await doCheckout(proofUrl, proofNote);
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Jika manual transfer / qris → tampilkan modal upload bukti dulu
    if (paymentMethod === 'manual_transfer' || paymentMethod === 'qris') {
      setShowProofModal(true);
      return;
    }
    await doCheckout(null, '');
  };

  const doCheckout = async (proofUrl, proofNote) => {
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
          // [BUG-H10 Fix] JANGAN kirim password untuk user yang sudah login (token ada)
          // password field ada di DOM hanya untuk guest, dan form.password tetap terisi
          // meskipun user sudah login karena state tidak di-reset.
          // Cegah kebocoran password plaintext ke API.
          ...(!token && form.password ? { password: form.password } : {}),
          full_name: `${form.firstName} ${form.lastName}`,
          phone: form.phone,
          items: orderItems,
          shipping_info: {
            shipping_name: `${activeForm.firstName} ${activeForm.lastName}`,
            shipping_phone: activeForm.phone,
            shipping_address: activeForm.address,
            shipping_district: activeForm.district,
            shipping_city: activeForm.city,
            shipping_province: activeForm.province,
            shipping_postal_code: activeForm.postalCode,
            destination_area_id: activeForm.area_id,
            total_shipping_cost: shippingCost,
            notes: form.notes,
            merchant_groups: (() => {
              const grouped = {};
              cart.items.forEach(i => {
                const mId = i.merchant_id || '00000000-0000-0000-0000-000000000000';
                if (!grouped[mId]) grouped[mId] = [];
                grouped[mId].push(i);
              });
              return Object.keys(grouped).map(mId => {
                const sel = selectedShippings[mId];
                return {
                  merchant_id: mId,
                  courier_code: sel?.courier_code || 'PICKUP',
                  courier_service: sel?.courier_service || 'SELF', // field name backend pakai courier_service bukan service_code
                  service_code: sel?.courier_service || 'SELF',
                  shipping_cost: sel?.price || 0,
                  shipping_type: shippingType
                };
              });
            })()
          },
          upline_id: uplineRef,
          voucher_code: appliedVoucher?.code || '',
          payment_method: paymentMethod,
          use_shopping_balance: useShoppingBalance,
          payment_proof_url: proofUrl || '',
          payment_proof_note: proofNote || '',
          total_weight: cart.items?.reduce((w, i) => w + ((i.product_variant?.weight || i.product?.weight || 200) * i.quantity), 0) || 0,
          // WooCommerce-style Tax Data
          tax_amount: totalTax,
          tax_breakdown: cart.items?.map(i => ({
            product_id: i.product_id,
            product_variant_id: i.product_variant_id || null,
            tax_rate: getItemTaxRate(i),
            taxable_amount: getEffectivePrice(i) * i.quantity,
            tax_amount: calculateItemTax(i),
          })),
        };


      // [Sync Fix] Hanya update profil jika TIDAK pakai alamat lain
      // Jika pakai alamat lain (useAltAddress), jangan timpa profil utama
      if (token && !useAltAddress) {
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
        }).catch(() => {});
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
      
      // [Sync Fix] Jika ada URL checkout dari Tripay, arahkan langsung ke sana
      if (res.payment && res.payment.checkout_url) {
        window.location.href = res.payment.checkout_url;
        return;
      }

      navigate('/order-success', { 
        state: { 
          order: res.order, 
          payment: res.payment,
          isManualTransfer: paymentMethod === 'manual_transfer',
        } 
      });

    } catch (_err) {
      // [BUG-H5 Fix] Ganti alert() dengan toast
      toast.error('Checkout gagal: ' + _err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <main className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Checkout</h1>
          {/* Steps */}
          <div className="flex items-center gap-3 mt-4">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${i === 0 ? 'text-white' : 'text-blue-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-white text-blue-700' : 'bg-white/20'}`}>
                    {i + 1}
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
              {/* Shipping Info — disembunyikan untuk produk digital */}
              {allDigital ? (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-sm p-6 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl shadow-lg flex-shrink-0"><i className="bx bx-save"/></div>
                  <div>
                    <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Semua Item Digital</div>
                    <h2 className="font-black text-indigo-900 text-base">Tidak Ada Pengiriman Fisik</h2>
                    <p className="text-xs text-indigo-500 mt-1 leading-relaxed">Produk digital akan langsung dapat diakses setelah pembayaran berhasil. Pastikan email Anda aktif untuk menerima link akses.</p>
                  </div>
                </div>
              ) : (
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
                        <i className="bx bx-error text-amber-500" /> Lokasi tidak ditemukan. Coba kata kunci lain.
                      </div>
                    ) : areaSearch.length > 0 && !form.area_id ? (
                      <div className="mt-2 text-[10px] text-orange-500 font-bold flex items-center gap-1">
                        <span><i className="bx bx-error" style={{color:'#f59e0b'}}/></span> Pilih lokasi dari daftar yang muncul di atas
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

                {/* ── TOGGLE: Kirim ke Alamat Lain ── */}
                <div className="mt-5 pt-5 border-t border-dashed border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setUseAltAddress(v => {
                        const next = !v;
                        // Kalau baru diaktifkan, prefill nama & hp dari form utama
                        if (next && !altForm.firstName) {
                          setAltForm(f => ({
                            ...f,
                            firstName: form.firstName,
                            lastName: form.lastName,
                            phone: form.phone,
                          }));
                        }
                        // Reset ongkir kalau switch
                        setShippingRates({});
                        setSelectedShippings({});
                        setShippingCost(0);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all ${
                      useAltAddress
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${useAltAddress ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-white text-gray-400 border border-gray-200'}`}>
                        <span className="material-symbols-outlined text-lg">add_location_alt</span>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm leading-none mb-0.5">Kirim ke Alamat Lain</p>
                        <p className="text-[10px] opacity-60 font-medium">
                          {useAltAddress ? 'Aktif — paket dikirim ke alamat di bawah' : 'Klik untuk kirim ke alamat berbeda dari profil'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all relative ${useAltAddress ? 'bg-orange-500' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${useAltAddress ? 'left-5' : 'left-0.5'}`}></div>
                    </div>
                  </button>

                  {/* Form Alamat Alternatif — muncul hanya saat toggle ON */}
                  {useAltAddress && (
                    <div className="mt-4 p-5 rounded-2xl bg-orange-50/60 border border-orange-100 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-orange-500 text-base">info</span>
                        <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Alamat ini hanya dipakai untuk pengiriman — profil kamu tidak akan berubah</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Nama Penerima *</label>
                          <input required={useAltAddress} type="text" placeholder="Nama lengkap penerima" value={altForm.firstName}
                            onChange={e => setAltForm(f => ({ ...f, firstName: e.target.value }))}
                            className="w-full border border-orange-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">No. HP Penerima *</label>
                          <input required={useAltAddress} type="tel" placeholder="08xxxxxxxxxx" value={altForm.phone}
                            onChange={e => setAltForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full border border-orange-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-gray-600 block mb-1">Alamat Lengkap *</label>
                          <input required={useAltAddress} type="text" placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan" value={altForm.address}
                            onChange={e => setAltForm(f => ({ ...f, address: e.target.value }))}
                            className="w-full border border-orange-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div className="sm:col-span-2 relative">
                          <label className="text-xs font-bold text-gray-600 block mb-1">Kecamatan / Kota *</label>
                          <input
                            type="text"
                            placeholder="Ketik min. 3 huruf, misal: 'Kebayoran'"
                            value={altAreaSearch}
                            className="w-full border border-orange-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition-colors"
                            onChange={e => {
                              setAltAreaSearch(e.target.value);
                              setAltForm(f => ({ ...f, area_id: '', city: '', province: '', postalCode: '', district: '' }));
                              handleSearchAltArea(e.target.value);
                            }}
                          />
                          {searchingAltArea && <div className="absolute right-4 top-9 text-[10px] text-orange-500 animate-pulse">Mencari...</div>}
                          {altAreas.length > 0 && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                              {altAreas.map(a => (
                                <button key={a.id} type="button" onClick={() => handleSelectAltArea(a)}
                                  className="w-full text-left px-4 py-2 text-xs hover:bg-orange-50 border-b border-gray-50 last:border-0">
                                  <div className="font-bold">{a.name}</div>
                                  <div className="text-gray-500">{a.administrative_division_level_2_name}, {a.administrative_division_level_1_name}</div>
                                </button>
                              ))}
                            </div>
                          )}
                          {altForm.area_id ? (
                            <div className="mt-2 text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full w-fit">
                              <span className="text-green-500">✓</span> {altForm.district}, {altForm.city}, {altForm.province}
                            </div>
                          ) : altAreaSearch.length >= 3 && !searchingAltArea && altAreas.length === 0 ? (
                            <div className="mt-2 text-[10px] text-red-500 font-bold"> Lokasi tidak ditemukan.</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
              )}


              {/* Shipping Method — hanya untuk produk fisik */}
              {!allDigital && (
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
                        // BUG-P1 fix: nama state adalah setSelectedShippings (plural), bukan setSelectedShipping
                        const pickupMethod = { courier_code: 'PICKUP', courier_name: 'AMBIL DI TOKO', courier_service: 'SELF', price: 0 };
                        const pickupMap = {};
                        cart.items.forEach(i => {
                          const mId = i.merchant_id || '00000000-0000-0000-0000-000000000000';
                          pickupMap[mId] = pickupMethod;
                        });
                        setSelectedShippings(pickupMap);
                      }}
                      className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${shippingType === 'pickup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >Ambil di Toko</button>
                  </div>
                </div>

                {shippingWarning && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-xl"><i className="bx bx-error" style={{color:'#f59e0b'}}/></span>
                    <div className="text-sm text-orange-700 leading-relaxed font-medium">
                      {shippingWarning}
                    </div>
                  </div>
                )}

                {shippingType === 'expedition' ? (
                  <div className="space-y-8">
                    {loadingRates ? (
                       <div className="py-10 text-center">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <div className="text-xs text-gray-400">Mengambil ongkir terbaik...</div>
                       </div>
                    ) : Object.keys(shippingRates).length > 0 ? (
                      Object.entries(shippingRates).map(([mID, rates]) => {
                        const mName = cart.items.find(i => (i.merchant_id || '00000000-0000-0000-0000-000000000000') === mID)?.merchant?.store_name || 'AkuGlow (Pusat)';
                        return (
                          <div key={mID} className="animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <span className="material-symbols-outlined text-sm text-blue-600">
                                {mID === '00000000-0000-0000-0000-000000000000' ? 'verified' : 'storefront'}
                              </span>
                              <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                                {mID === '00000000-0000-0000-0000-000000000000' ? 'Kirim Langsung Dari: OFFICIAL PUSAT' : `Kirim dari: ${mName}`}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {rates.map((method, idx) => (
                                <label key={idx} className={`flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all relative overflow-hidden ${
                                  selectedShippings[mID]?.courier_code === method.courier_code && selectedShippings[mID]?.courier_service === method.courier_service
                                  ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-50/50' : 'border-gray-100 hover:border-gray-300 bg-white'
                                }`}>
                                  <input 
                                    type="radio" 
                                    name={`shipping_${mID}`} 
                                    checked={selectedShippings[mID]?.courier_code === method.courier_code && selectedShippings[mID]?.courier_service === method.courier_service}
                                    onChange={() => {
                                      const newSelected = { ...selectedShippings, [mID]: method };
                                      setSelectedShippings(newSelected);
                                      const totalCost = Object.values(newSelected).reduce((sum, r) => sum + (r?.price || 0), 0);
                                      setShippingCost(totalCost);
                                    }}
                                    className="accent-blue-600 w-4 h-4 flex-shrink-0" 
                                  />
                                  <CourierLogo code={method.courier_code} name={method.courier_name} customLogo={method.logo_url} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 text-xs uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                                      <span>{method.courier_name}</span> 
                                      <span className="text-blue-600 font-extrabold">{method.courier_service_name || method.courier_service}</span>
                                      {method.is_estimated && (
                                        <span className="text-[8px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.2 rounded-full">EST</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                      {method.is_estimated ? 'Perkiraan' : 'Estimasi'} {method.duration}
                                    </div>
                                  </div>
                                  <div className="text-sm font-black text-gray-900 ml-auto whitespace-nowrap">Rp{method.price.toLocaleString('id-ID')}</div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                       <div className="py-10 px-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                         <div className="text-3xl mb-2 opacity-30"></div>
                         <p className="text-gray-500 text-[11px] font-medium leading-relaxed">
                           {form.area_id 
                             ? 'Maaf, tidak ada kurir ekspedisi yang mendukung rute ini atau kurir sedang non-aktif.' 
                             : 'Pilih lokasi pengiriman (Kecamatan/Kota) pada kolom alamat di atas untuk melihat opsi kurir.'}
                         </p>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                      {/* Decorative Background Elements */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 blur-[60px] rounded-full -ml-20 -mb-20"></div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/30 flex-shrink-0 animate-bounce-slow">
                          
                        </div>
                        <div className="flex-1">
                          <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                            Self Pick-up Option
                          </div>
                          <h4 className="text-2xl font-black mb-2 tracking-tight">Ambil Sendiri di Toko</h4>
                          <p className="text-blue-100 text-sm leading-relaxed mb-6 font-medium">
                            Hemat ongkos kirim dengan mengambil langsung pesanan Anda di titik lokasi merchant kami.
                          </p>
                          
                          {/* Merchant List */}
                          <div className="space-y-3 mb-8">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] block mb-2">Lokasi Penjemputan:</span>
                            {Object.entries(
                              cart.items.reduce((acc, item) => {
                                const mId = item.merchant_id || '00000000-0000-0000-0000-000000000000';
                                const mName = item.merchant?.store_name || 'Gudang Pusat AkuGlow';
                                const mCity = item.merchant?.city || 'Jakarta Pusat';
                                if (!acc[mId]) acc[mId] = { name: mName, city: mCity };
                                return acc;
                              }, {})
                            ).map(([mId, m]) => (
                              <div key={mId} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs"></div>
                                <div>
                                  <div className="text-xs font-black">{m.name}</div>
                                  <div className="text-[10px] text-blue-200">{m.city}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Steps */}
                          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                            {[
                              { icon: 'bx-credit-card', label: 'Bayar' },
                              { icon: 'bx-package', label: 'Siapkan' },
                              { icon: 'bx-walk', label: 'Ambil' }
                            ].map((step, i) => (
                              <div key={i} className="text-center group">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:bg-white/30 transition-colors">
                                  <i className={`bx ${step.icon} text-lg`}></i>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tighter">{step.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-3 rounded-2xl border border-blue-100">
                      <i className="bx bx-check-shield text-xl"></i>
                      <span className="text-[11px] font-black uppercase tracking-widest">Biaya Pengiriman: Gratis & Aman</span>
                    </div>
                  </div>
                )}
              </div>
              )}{/* end !allDigital shipping method */}

              {/* Saldo Bonus Belanja Toggle */}
              {wallet && wallet.shopping_balance > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-purple-600 text-2xl">account_balance_wallet</span>
                      <div>
                        <h2 className="font-bold text-gray-900 text-sm">Gunakan Saldo Bonus Belanja</h2>
                        <p className="text-gray-400 text-[10px] mt-0.5">Potong total tagihan menggunakan saldo bonus Anda</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={useShoppingBalance} 
                        onChange={(e) => setUseShoppingBalance(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between text-xs font-semibold">
                    <span className="text-purple-700">Saldo Tersedia:</span>
                    <span className="text-purple-900 font-bold">Rp{wallet.shopping_balance.toLocaleString('id-ID')}</span>
                  </div>
                  {useShoppingBalance && (
                    <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between text-xs font-semibold text-green-700 animate-in fade-in slide-in-from-top-1">
                      <span>Deduction Applied:</span>
                      <span>-Rp{Math.min(wallet.shopping_balance, total).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              {remainingTotal > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-gray-900 text-lg mb-5">Metode Pembayaran</h2>
                
                {loadingChannels ? (
                   <div className="py-6 text-center">
                      <div className="animate-spin mb-2"></div>
                      <div className="text-xs text-gray-400">Memuat metode pembayaran...</div>
                   </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(
                      paymentMethods.reduce((acc, method) => {
                        const group = method.desc || "Lainnya";
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(method);
                        return acc;
                      }, {})
                    ).map(([groupName, methods]) => (
                      <div key={groupName} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {groupName.includes('Account') ? '' : 
                               groupName.includes('Wallet') ? '' : 
                               groupName.includes('Retail') ? '' : 
                               groupName.includes('QR') ? '' : ''}
                            </span>
                            <span className="font-bold text-gray-900">{groupName}</span>
                          </div>
                          <span className={`text-gray-400 transition-transform duration-300 ${openGroups[groupName] ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        
                        {openGroups[groupName] && (
                          <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {methods.map(method => {
                              const feeFlat = method.fee_customer || 0;
                              const feePercent = method.fee_customer_pct || 0;
                              const totalPaymentFee = Math.round((total * (feePercent / 100)) + feeFlat);

                              const isInsufficient = method.id === 'shopping_balance' && method.balance < total;

                              return (
                                <button
                                  key={method.id}
                                  type="button"
                                  disabled={isInsufficient}
                                  onClick={() => setPaymentMethod(method.id)}
                                  className={`flex items-center gap-3 border-2 rounded-xl p-4 text-left transition-all relative overflow-hidden ${
                                    paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : 
                                    isInsufficient ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 border-gray-100' :
                                    'border-gray-100 hover:border-gray-300'
                                  }`}
                                >
                                  {paymentMethod === method.id && (
                                    <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-0.5 rounded-bl-lg text-[10px] font-bold">
                                      Terpilih
                                    </div>
                                  )}
                                  <img src={method.icon} alt={method.label} className="w-10 h-10 object-contain bg-white rounded border border-gray-100 p-1" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-800 text-sm truncate leading-tight">{method.label}</div>
                                    {method.id === 'shopping_balance' ? (
                                      <div className={`text-[10px] font-bold mt-1 ${isInsufficient ? 'text-red-500' : 'text-green-600'}`}>
                                        Sisa: Rp{method.balance.toLocaleString('id-ID')}
                                        {isInsufficient && ' (Kurang)'}
                                      </div>
                                    ) : totalPaymentFee > 0 && (
                                      <div className="text-[10px] font-bold text-orange-500 mt-1">
                                        + Biaya: Rp{totalPaymentFee.toLocaleString('id-ID')}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                   <div className="py-6 px-4 text-center bg-red-50 rounded-xl border border-red-100">
                     <p className="text-red-600 text-xs font-bold">Tidak ada metode pembayaran aktif.</p>
                   </div>
                )}

                {/* Manual Transfer Option — tampil jika admin mengaktifkannya */}
                {manualTransferConfig?.enabled && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('manual_transfer')}
                      className={`w-full flex items-center gap-4 border-2 rounded-2xl p-4 text-left transition-all relative ${
                        paymentMethod === 'manual_transfer'
                          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-50/50'
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      {paymentMethod === 'manual_transfer' && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-0.5 rounded-bl-lg rounded-tr-2xl text-[10px] font-bold">
                          Terpilih
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        paymentMethod === 'manual_transfer' ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-100'
                      }`}>
                        <i className={`bx bx-transfer text-2xl ${paymentMethod === 'manual_transfer' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm">Transfer Manual</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Transfer ke {manualTransferConfig.bank_name || 'rekening toko'}, lalu upload bukti
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                        paymentMethod === 'manual_transfer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>0 Fee</span>
                    </button>

                    {/* QRIS Button */}
                    {qrisConfig?.enabled && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('qris')}
                          className={`w-full flex items-center gap-4 border-2 rounded-2xl p-4 text-left transition-all relative ${
                            paymentMethod === 'qris'
                              ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-50/50'
                              : 'border-gray-200 hover:border-emerald-300 bg-white'
                          }`}
                        >
                          {paymentMethod === 'qris' && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-2 py-0.5 rounded-bl-lg rounded-tr-2xl text-[10px] font-bold">
                              Terpilih
                            </div>
                          )}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            paymentMethod === 'qris' ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'bg-gray-100'
                          }`}>
                            <i className={`bx bx-qr-scan text-2xl ${paymentMethod === 'qris' ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 text-sm">QRIS</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Scan kode QR dengan e-Wallet atau m-Banking, lalu upload bukti
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                            paymentMethod === 'qris' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>0 Fee</span>
                        </button>
                        
                        {/* Info QRIS — tampil saat dipilih */}
                        {paymentMethod === 'qris' && (
                          <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-3">Scan QR Code</div>
                            <div className="flex flex-col items-center justify-center mb-4 bg-white rounded-xl p-3">
                              {qrisConfig.image_url ? (
                                <img src={qrisConfig.image_url} alt="QRIS Code" className="max-w-[200px] max-h-[200px] object-contain rounded-lg" />
                              ) : (
                                <div className="text-gray-500 text-sm">QRIS tidak tersedia</div>
                              )}
                            </div>
                            <div className="text-[11px] bg-white/10 rounded-xl p-3 leading-relaxed opacity-80 text-center">
                              Silakan scan kode QR di atas menggunakan aplikasi e-Wallet atau Mobile Banking Anda.
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold opacity-60">
                              <i className="bx bxs-check-circle" /> SETELAH TRANSFER, WAJIB UPLOAD BUKTI DI BAWAH
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info rekening — tampil saat dipilih */}
                    {paymentMethod === 'manual_transfer' && (
                      <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-3">Rekening Tujuan Transfer</div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i className="bx bx-credit-card text-xl" />
                          </div>
                          <div>
                            <div className="text-base font-black">{manualTransferConfig.bank_name || '—'}</div>
                            <div className="text-lg font-extrabold tracking-widest">{manualTransferConfig.account_number || '—'}</div>
                            <div className="text-xs opacity-70">a.n. {manualTransferConfig.account_holder || '—'}</div>
                          </div>
                        </div>
                        {manualTransferConfig.instructions && (
                          <div className="text-[11px] bg-white/10 rounded-xl p-3 leading-relaxed opacity-80 whitespace-pre-wrap">
                            {manualTransferConfig.instructions}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold opacity-60">
                          <i className="bx bx-info-circle" />
                          Setelah transfer, konfirmasi ke admin melalui WhatsApp atau halaman pesanan Anda.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              ) : (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 shadow-sm p-6 flex flex-col items-center justify-center text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-green-600 mb-2">verified</span>
                  <h3 className="font-bold text-green-900 text-sm">Pesanan Sepenuhnya Terbayar</h3>
                  <p className="text-green-700 text-xs mt-1 max-w-sm">
                    Saldo Bonus Belanja Anda mencukupi untuk membayar seluruh pesanan ini. Tidak diperlukan metode pembayaran eksternal!
                  </p>
                </div>
              )}
            </div>

            {/* Right: Summary */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 text-lg mb-5">Ringkasan Pesanan</h3>
                <div className="space-y-4 mb-5 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(
                    (cart.items || []).reduce((acc, item) => {
                      const mId = item.merchant_id || '00000000-0000-0000-0000-000000000000';
                      const mName = item.merchant?.store_name || 'AkuGlow (Pusat)';
                      if (!acc[mId]) acc[mId] = { name: mName, items: [] };
                      acc[mId].items.push(item);
                      return acc;
                    }, {})
                  ).map(([mId, group]) => (
                    <div key={mId} className="space-y-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                         <span className="material-symbols-outlined text-[12px]">storefront</span>
                         {group.name}
                      </div>
                      {group.items.map((item, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="relative flex-shrink-0">
                            {item.product?.image_url || item.product?.image ? (
                              <img
                                src={formatImage(item.product?.image_url || item.product?.image)}
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
                            {/* WooCommerce-style Price Display with Sale */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isSaleActive(item) ? (
                                <>
                                  <span className="text-[11px] font-bold text-red-500">Rp{(getEffectivePrice(item) * item.quantity).toLocaleString('id-ID')}</span>
                                  <span className="text-[10px] text-gray-400 line-through">Rp{(getItemPrice(item) * item.quantity).toLocaleString('id-ID')}</span>
                                </>
                              ) : (
                                <span className="text-[11px] font-bold text-gray-900">Rp{(getItemPrice(item) * item.quantity).toLocaleString('id-ID')}</span>
                              )}
                            </div>
                            {/* Stock Status Indicator */}
                            {item.product?.stock === 0 && item.product?.backorders !== 'yes' && item.product?.backorders !== 'notify' && (
                              <div className="text-[9px] text-red-500 font-bold mt-0.5"> Stok Habis</div>
                            )}
                          </div>
                        </div>
                      ))}
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
                  {/* WooCommerce-style Tax Display */}
                  {totalTax > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Pajak (PPN 11%)</span>
                      <span className="font-medium">Rp{totalTax.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Total Berat</span>
                    <span>{((cart.items?.reduce((w, i) => w + ((i.product_variant?.weight || i.product?.weight || 200) * i.quantity), 0) || 0) / 1000).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Pengiriman</span>
                    <span className={shippingType === 'pickup' || (shippingType === 'expedition' && Object.keys(selectedShippings).length > 0) || shippingCost === 0 ? "text-green-600 font-bold" : "text-gray-400 font-medium italic"}>
                      {shippingType === 'pickup' ? 'GRATIS' : (shippingType === 'expedition' && Object.keys(selectedShippings).length > 0) ? `Rp${shippingCost.toLocaleString('id-ID')}` : 'Pilih Kurir'}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon Voucher</span>
                      <span className="font-medium">-Rp{discount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {shoppingBalanceDeduction > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Potongan Saldo Belanja</span>
                      <span className="font-medium font-bold">-Rp{shoppingBalanceDeduction.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {(() => {
                    if (remainingTotal === 0) return null;
                    const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
                    const feeFlat = selectedMethod?.fee_customer || 0;
                    const feePercent = selectedMethod?.fee_customer_pct || 0;
                    const totalPaymentFee = Math.round((remainingTotal * (feePercent / 100)) + feeFlat);
                    
                    if (totalPaymentFee > 0) {
                      return (
                        <div className="flex justify-between text-orange-600">
                          <span>Biaya Layanan (Payment)</span>
                          <span className="font-medium">Rp{totalPaymentFee.toLocaleString('id-ID')}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total Tagihan</span>
                    <span>Rp{(() => {
                      if (remainingTotal === 0) return '0';
                      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
                      const feeFlat = selectedMethod?.fee_customer || 0;
                      const feePercent = selectedMethod?.fee_customer_pct || 0;
                      const totalPaymentFee = Math.round((remainingTotal * (feePercent / 100)) + feeFlat);
                      return (remainingTotal + totalPaymentFee).toLocaleString('id-ID');
                    })()}</span>
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

      {/* ── Modal Upload Bukti Pembayaran ── */}
      {showProofModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className={`bg-gradient-to-r ${paymentMethod === 'qris' ? 'from-emerald-700 to-emerald-900' : 'from-blue-700 to-blue-900'} p-6 text-white`}>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <i className={`bx ${paymentMethod === 'qris' ? 'bx-qr-scan' : 'bx-transfer'} text-2xl`} />
                </div>
                <div>
                  <h2 className="text-lg font-black">Upload Bukti Pembayaran</h2>
                  <p className={`${paymentMethod === 'qris' ? 'text-emerald-200' : 'text-blue-200'} text-xs`}>Wajib untuk menyelesaikan pesanan</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Info tujuan */}
              {paymentMethod === 'manual_transfer' && manualTransferConfig && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className="bx bx-credit-card text-white text-xl" />
                  </div>
                  <div>
                    <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Transfer ke</div>
                    <div className="font-black text-gray-900">{manualTransferConfig.bank_name}</div>
                    <div className="text-blue-700 font-bold text-lg tracking-widest">{manualTransferConfig.account_number}</div>
                    <div className="text-xs text-gray-500">a.n. {manualTransferConfig.account_holder}</div>
                  </div>
                </div>
              )}
              {paymentMethod === 'qris' && qrisConfig?.image_url && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Kode QRIS</div>
                  <img src={qrisConfig.image_url} alt="QRIS" className="w-32 h-32 object-contain rounded-lg border border-emerald-200" />
                </div>
              )}

              {/* Area Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Screenshot Bukti Transfer <span className="text-red-500">*</span></label>
                <label
                  htmlFor="proof-upload"
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-all min-h-[140px] overflow-hidden ${
                    proofPreview ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {proofPreview ? (
                    <img src={proofPreview} alt="preview" className="w-full max-h-48 object-contain rounded-xl" />
                  ) : (
                    <div className="text-center p-6">
                      <i className="bx bx-image-add text-4xl text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-500">Klik untuk upload foto</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — maks. 5MB</p>
                    </div>
                  )}
                  <input
                    id="proof-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProofFileChange}
                  />
                </label>
                {proofPreview && (
                  <button
                    type="button"
                    onClick={() => { setProofFile(null); setProofPreview(null); }}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >Ganti foto</button>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea
                  value={proofNote}
                  onChange={e => setProofNote(e.target.value)}
                  placeholder="Contoh: Transfer dari BCA atas nama Budi, jam 10.30"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* Info tunggu konfirmasi */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <i className="bx bx-info-circle text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Setelah submit, pesanan akan masuk status <strong>Menunggu Konfirmasi Admin</strong>. 
                  Admin akan memverifikasi bukti transfer Anda dalam 1×24 jam.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition"
                  disabled={uploadingProof}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProofSubmit}
                  disabled={!proofFile || uploadingProof}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingProof ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengupload...</>
                  ) : (
                    <><i className="bx bx-send" /> Kirim & Konfirmasi</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
