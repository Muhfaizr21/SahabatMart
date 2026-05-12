import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BUYER_API_BASE, AUTH_API_BASE, fetchJson, uploadFile, formatImage } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import MemberCard from '../components/MemberCard';

export default function ProfilePage() {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCard = async () => {
    if (cardRef.current === null || !userData) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `AkuGlow-Member-${userData.id.substring(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sync tab with URL parameter if it changes
  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
    city: '',
    province: '',
    zip_code: '',
    avatar_url: '',
    area_id: '',
    district: ''
  });
  const [saving, setSaving] = useState(false);

  // Biteship Area States
  const [areaSearch, setAreaSearch] = useState('');
  const [areas, setAreas] = useState([]);
  const [searchingArea, setSearchingArea] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${BUYER_API_BASE}/profile`);
      setUserData(res.user);
      setOrders(res.orders || []);
    } catch (err) {
      console.error(err);
      if (err.message.includes('401')) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (userData?.profile) {
      setFormData({
        full_name: userData.profile.full_name || '',
        phone: userData.phone || '',
        gender: userData.profile.gender || '',
        date_of_birth: userData.profile.date_of_birth ? userData.profile.date_of_birth.substring(0, 10) : '',
        address: userData.profile.address || '',
        city: userData.profile.city || '',
        province: userData.profile.province || '',
        zip_code: userData.profile.zip_code || '',
        avatar_url: userData.profile.avatar_url || '',
        area_id: userData.profile.area_id || '',
        district: userData.profile.district || ''
      });
      if (userData.profile.area_id) {
         if (userData.profile.district && userData.profile.city) {
            setAreaSearch(`${userData.profile.district}, ${userData.profile.city}`);
         } else if (userData.profile.district || userData.profile.city) {
            setAreaSearch(userData.profile.district || userData.profile.city);
         }
      }
    }
  }, [userData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (loading) {
    return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
       </div>
    );
  }

  if (!userData) {
    return (
       <div className="min-h-screen flex items-center justify-center flex-col">
          <h2 className="text-xl font-bold mb-4">Gagal memuat profil</h2>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Coba Lagi</button>
       </div>
    );
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchJson(`${BUYER_API_BASE}/profile/update`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      alert('Profil berhasil diperbarui!');
      loadProfile();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const res = await uploadFile(`${BUYER_API_BASE}/upload`, file);
      const imageUrl = res.url || (res.data && res.data.url);
      if (imageUrl) {
        const updatedFormData = { ...formData, avatar_url: imageUrl };
        setFormData(updatedFormData);
        setUserData(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatar_url: imageUrl
          }
        }));
        
        // Auto save profile after upload so it persists immediately
        await fetchJson(`${BUYER_API_BASE}/profile/update`, {
          method: 'POST',
          body: JSON.stringify(updatedFormData)
        });
      }
    } catch (err) {
      alert("Gagal mengupload foto: " + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSearchArea = async (input) => {
    if (input.length < 3) return;
    setSearchingArea(true);
    try {
      const res = await fetchJson(`${BUYER_API_BASE}/shipping/areas?input=${input}`);
      setAreas(res.areas || []);
    } catch (err) {
      console.error('Area search failed:', err);
    } finally {
      setSearchingArea(false);
    }
  };

  const handleSelectArea = async (area) => {
    setFormData(f => ({ 
      ...f, 
      city: area.city_name, 
      province: area.province_name, 
      zip_code: area.postal_code,
      area_id: area.id,
      district: area.name,
    }));
    setAreaSearch(area.name + ', ' + area.city_name);
    setAreas([]);
  };

  const profile = userData.profile || {};

  return (
    <main className="min-h-screen bg-gray-50 py-12 print:bg-white print:py-0">
      <style>{`
        @media print {
          nav, aside, header, footer, .mb-10.border-b, .mt-12.w-full.max-w-md, button, .no-print {
            display: none !important;
          }
          body, main {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
          }
          .flex-1 {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .bg-white.rounded-\[2rem\] {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .animate-fade-in {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            min-height: 100vh !important;
            width: 100% !important;
          }
          /* Ensure the card prints with its background colors */
          .perspective-1000 {
            transform: scale(1.4) !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6 print:px-0">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-6 text-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-4xl font-black mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg relative group cursor-pointer"
              >
                <img src={formatImage(formData.avatar_url || profile.avatar_url) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop"} alt={profile.full_name} className={`w-full h-full object-cover transition-transform ${uploadingAvatar ? 'opacity-50' : 'group-hover:scale-110'}`} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className={`bx ${uploadingAvatar ? 'bx-loader-alt animate-spin' : 'bx-camera'} text-white text-3xl`}></i>
                </div>
              </div>
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">{profile.full_name || 'User AkuGlow'}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full mt-2 border border-rose-200">
                 <i className="bx bxs-crown text-rose-500"></i> <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Member Aktif</span>
              </div>
            </div>
            
            <nav className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'profile' ? 'bg-rose-50/50 text-rose-600 border-rose-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-user text-lg"></i> Biodata Diri
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'orders' ? 'bg-rose-50/50 text-rose-600 border-rose-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-shopping-bag text-lg"></i> Semua Pesanan
              </button>
              <button 
                onClick={() => setActiveTab('address')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'address' ? 'bg-rose-50/50 text-rose-600 border-rose-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-map-pin text-lg"></i> Alamat & Info
              </button>
              <button 
                onClick={() => setActiveTab('member-card')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'member-card' ? 'bg-rose-50/50 text-rose-600 border-rose-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-id-card text-lg"></i> Kartu Member Digital
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'security' ? 'bg-rose-50/50 text-rose-600 border-rose-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-lock-alt text-lg"></i> Keamanan
              </button>
              <div className="my-2 border-t border-gray-50"></div>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
                <i className="bx bx-log-out text-lg"></i> Keluar
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-gray-100 shadow-xl shadow-gray-200/20 min-h-[500px]">
              {activeTab === 'profile' && (
                <div className="animate-fade-in">
                  <div className="mb-8 border-b border-gray-100 pb-6">
                    <h3 className="text-2xl font-black text-gray-900">Biodata Diri</h3>
                    <p className="text-sm text-gray-400 mt-1">Kelola informasi profil dan detail kontak Anda.</p>
                  </div>
                  <form className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7" onSubmit={handleUpdateProfile}>
                    <div className="md:col-span-2">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Nama Lengkap</label>
                       <input 
                         type="text" 
                         value={formData.full_name} 
                         onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       />
                    </div>
                    <div>
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Alamat Email</label>
                       <input type="email" defaultValue={userData.email} readOnly className="w-full border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed rounded-xl px-4 py-3.5 text-sm font-medium outline-none" />
                    </div>
                    <div>
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Nomor Telepon</label>
                       <input 
                         type="tel" 
                         value={formData.phone} 
                         onChange={(e) => setFormData({...formData, phone: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       />
                    </div>

                    <div>
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Tanggal Lahir</label>
                       <input 
                         type="date" 
                         value={formData.date_of_birth} 
                         onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       />
                    </div>
                    <div>
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Jenis Kelamin</label>
                       <select 
                         value={formData.gender} 
                         onChange={(e) => setFormData({...formData, gender: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors bg-white" 
                       >
                         <option value="">Pilih Jenis Kelamin</option>
                         <option value="male">Laki-Laki</option>
                         <option value="female">Perempuan</option>
                       </select>
                    </div>

                    <div className="md:col-span-2">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Alamat Lengkap</label>
                       <textarea 
                         value={formData.address} 
                         onChange={(e) => setFormData({...formData, address: e.target.value})}
                         rows="3"
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       ></textarea>
                    </div>

                    <div className="md:col-span-2 relative">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kecamatan / Kota *</label>
                       <input 
                         type="text" 
                         value={areaSearch} 
                         onChange={(e) => { 
                           setAreaSearch(e.target.value); 
                           setFormData(f => ({ ...f, area_id: '', city: '', province: '', zip_code: '' }));
                           handleSearchArea(e.target.value); 
                         }}
                         placeholder="Cari kecamatan atau kota Anda..."
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       />
                       {searchingArea && <div className="absolute right-4 top-12 text-[10px] text-blue-500 animate-pulse">Mencari...</div>}
                       {areas.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                            {areas.map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => handleSelectArea(a)}
                                className="w-full text-left px-4 py-3 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0"
                              >
                                <div className="font-bold text-gray-900">{a.name}</div>
                                <div className="text-gray-500">{a.city_name}, {a.province_name} ({a.postal_code})</div>
                              </button>
                            ))}
                          </div>
                       )}
                       {formData.area_id ? (
                          <div className="mt-2 text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full w-fit">
                            <span>✓</span> Lokasi terverifikasi
                          </div>
                       ) : areaSearch.length > 0 && (
                          <div className="mt-2 text-[10px] text-orange-500 font-bold flex items-center gap-1">
                            <span>⚠️</span> Silakan pilih lokasi dari daftar yang muncul
                          </div>
                       )}
                    </div>

                    {formData.area_id && (
                      <>
                        <div>
                           <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kota</label>
                           <div className="w-full border border-gray-100 bg-gray-50 text-gray-700 rounded-xl px-4 py-3.5 text-sm font-semibold">{formData.city}</div>
                        </div>
                        <div>
                           <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Provinsi</label>
                           <div className="w-full border border-gray-100 bg-gray-50 text-gray-700 rounded-xl px-4 py-3.5 text-sm font-semibold">{formData.province}</div>
                        </div>
                        <div>
                           <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kode Pos</label>
                           <div className="w-full border border-gray-100 bg-gray-50 text-gray-700 rounded-xl px-4 py-3.5 text-sm font-semibold">{formData.zip_code}</div>
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2 flex justify-end pt-4">
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black py-4 px-10 rounded-[1rem] transition-all shadow-xl shadow-blue-500/30 active:scale-95 text-sm"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                     <div>
                       <h3 className="text-2xl font-black text-gray-900">Riwayat Pesanan</h3>
                       <p className="text-sm text-gray-400 mt-1">Pantau status pesanan dan transaksi belanja Anda.</p>
                     </div>
                  </div>
                  
                  {orders.length === 0 ? (
                     <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <div className="text-5xl mb-4 opacity-50">🛒</div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Belum ada pesanan</h4>
                        <p className="text-gray-400 mb-6 text-sm">Pesanan yang Anda buat akan muncul di sini.</p>
                        <Link to="/shop" className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors">Mulai Belanja</Link>
                     </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => {
                         let totalItems = 0;
                         let merchCount = order.merchant_groups?.length || 0;
                         if(order.merchant_groups) {
                            order.merchant_groups.forEach(g => { totalItems += g.items?.length || 0; });
                         }

                         return (
                          <div key={order.id} className="border border-gray-100 rounded-[1.5rem] p-6 shadow-sm hover:shadow-lg transition-all group bg-white relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-50">
                              <div className="flex items-center gap-3">
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black tracking-widest">{new Date(order.created_at).toLocaleDateString()}</span>
                                <span className="font-bold text-gray-400 text-xs tracking-wider">#{String(order.id).substring(0,8).toUpperCase()}</span>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black ${
                                order.status === 'completed' ? 'bg-green-50 text-green-600' : 
                                order.status === 'shipped' ? 'bg-blue-50 text-blue-600' : 
                                order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                                'bg-orange-50 text-orange-600'}`}>
                                {order.status}
                              </span>
                            </div>
                            
                            <div className="flex items-end justify-between">
                              <div>
                                 <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest">Total Belanja</p>
                                 <span className="font-black text-xl text-gray-900">Rp{(order.grand_total || 0).toLocaleString('id')}</span>
                                 <p className="text-sm text-gray-500 font-medium mt-1">Terdiri dari {totalItems} item dari {merchCount} Toko</p>
                              </div>
                              <Link to={`/order/${order.id}`} className="text-sm font-bold text-blue-600 hover:text-indigo-700 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-colors">
                                Lihat Detail
                              </Link>
                            </div>
                          </div>
                         );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'address' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                    <div>
                       <h3 className="text-2xl font-black text-gray-900">Domisili & Pengiriman</h3>
                       <p className="text-sm text-gray-400 mt-1">Informasi pengiriman utama berdasarkan pesanan terakhir Anda.</p>
                    </div>
                  </div>
                  
                  {orders.length > 0 ? (
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">📍</div>
                        <div>
                          <h4 className="font-black text-gray-900">{orders[0].shipping_name}</h4>
                          <p className="text-xs text-gray-400 font-bold">{orders[0].shipping_phone}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                          <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            {orders[0].shipping_address}, {orders[0].shipping_district}, {orders[0].shipping_city}, {orders[0].shipping_province} {orders[0].shipping_postal_code}
                          </p>
                        </div>
                        {orders[0].notes && (
                          <div className="text-xs text-gray-400 italic bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                             Catatan: {orders[0].notes}
                          </div>
                        )}
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                         <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full">Alamat Terverifikasi</span>
                         <button onClick={() => navigate('/shop')} className="text-xs font-bold text-blue-600 hover:underline">Ubah Alamat di Checkout Berikutnya</button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-3xl p-10 text-center relative max-w-lg mx-auto mt-10">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-4xl mx-auto mb-6">📍</div>
                      <h4 className="text-lg font-black text-gray-900 mb-2">Belum Ada Alamat Tersimpan</h4>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">Untuk saat ini, setiap kali Anda melakukan pemesanan (Checkout), data alamat pengiriman Anda akan secara otomatis diperbarui berdasarkan entri tersebut.</p>
                      <button onClick={() => navigate('/shop')} className="bg-gray-900 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-xl shadow-gray-200">
                        Mulai Belanja Sekarang
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'security' && (
                <div className="animate-fade-in">
                  <div className="mb-8 border-b border-gray-100 pb-6">
                    <h3 className="text-2xl font-black text-gray-900">Keamanan Akun</h3>
                    <p className="text-sm text-gray-400 mt-1">Ubah kata sandi Anda secara berkala untuk menjaga keamanan akun.</p>
                  </div>
                  
                  <form 
                    className="max-w-md space-y-6"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const oldPass = e.target.old_password.value;
                      const newPass = e.target.new_password.value;
                      const confirmPass = e.target.confirm_password.value;

                      if (newPass !== confirmPass) return alert('Konfirmasi password tidak cocok');
                      
                      try {
                        await fetchJson(`${AUTH_API_BASE}/change-password`, {
                          method: 'POST',
                          body: JSON.stringify({ old_password: oldPass, new_password: newPass })
                        });
                        alert('Password berhasil diubah!');
                        e.target.reset();
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                  >
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kata Sandi Lama</label>
                      <div className="relative">
                        <input 
                          type={showOldPassword ? "text" : "password"}
                          name="old_password"
                          required
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 pr-12 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors flex items-center"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showOldPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kata Sandi Baru</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          name="new_password"
                          required
                          minLength={6}
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 pr-12 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors flex items-center"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Konfirmasi Kata Sandi Baru</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          required
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 pr-12 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors flex items-center"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <button 
                        type="submit" 
                        className="w-full bg-gray-900 hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-gray-200 active:scale-95 text-sm"
                      >
                        Perbarui Kata Sandi
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'member-card' && (
                <div className="animate-fade-in flex flex-col items-center">
                  <div className="mb-10 border-b border-gray-100 pb-6 w-full text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">Kartu Member Digital</h3>
                      <p className="text-sm text-gray-400 mt-1">Gunakan kartu ini untuk identitas saat bertransaksi di outlet fisik.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                       <i className="bx bxs-check-shield text-lg"></i>
                       <span className="text-[10px] font-black uppercase tracking-widest">Verified Member</span>
                    </div>
                  </div>

                  <div ref={cardRef}>
                    <MemberCard user={userData} profile={profile} />
                  </div>

                  {/* INFO SECTION */}
                  <div className="mt-12 w-full max-w-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all text-center">
                           <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                              <i className="bx bx-history"></i>
                           </div>
                           <h6 className="font-bold text-gray-900 text-xs">Riwayat Belanja</h6>
                           <p className="text-[10px] text-gray-400 mt-1">Catatan transaksi digital</p>
                        </div>
                        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all text-center">
                           <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                              <i className="bx bx-star"></i>
                           </div>
                           <h6 className="font-bold text-gray-900 text-xs">Akses Eksklusif</h6>
                           <p className="text-[10px] text-gray-400 mt-1">Member-only event & promo</p>
                        </div>
                    </div>

                    <div className="bg-gray-900 text-white rounded-[2rem] p-8 relative overflow-hidden shadow-2xl shadow-gray-900/20">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-600/20 rounded-full blur-2xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                              <i className="bx bx-help-circle text-rose-400"></i>
                           </div>
                           <h5 className="font-black text-sm tracking-wide uppercase">Cara Penggunaan</h5>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Tunjukkan kode QR di atas saat melakukan pembayaran di kasir outlet <span className="text-white font-bold underline decoration-rose-500 underline-offset-4">SahabatMart</span> mana saja agar transaksi Anda tercatat otomatis di dashboard.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <button 
                        onClick={downloadCard}
                        disabled={isDownloading}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-600 text-white font-black text-sm hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50 no-print"
                      >
                        <i className={`bx ${isDownloading ? 'bx-loader-alt animate-spin' : 'bx-download'} text-xl`}></i>
                        {isDownloading ? 'Downloading...' : 'Download Card'}
                      </button>

                      <button 
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-gray-100 text-gray-900 font-black text-sm hover:border-rose-500 hover:text-rose-600 transition-all active:scale-95 no-print"
                      >
                        <i className="bx bx-printer text-xl"></i>
                        Print Card
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

