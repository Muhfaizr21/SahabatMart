import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson } from '../lib/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
    city: '',
    province: '',
    zip_code: ''
  });
  const [saving, setSaving] = useState(false);

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
        zip_code: userData.profile.zip_code || ''
      });
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

  const profile = userData.profile || {};

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-6 text-center">
              <div className="w-32 h-32 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-black mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg relative group cursor-pointer">
                <img src={profile.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop"} alt={profile.full_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              </div>
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">{profile.full_name || 'User AkuGrow'}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full mt-2 border border-yellow-200">
                 <i className="bx bxs-crown"></i> <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Member Aktif</span>
              </div>
            </div>
            
            <nav className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'profile' ? 'bg-blue-50/50 text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-user text-lg"></i> Biodata Diri
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'orders' ? 'bg-blue-50/50 text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-shopping-bag text-lg"></i> Semua Pesanan
              </button>
              <button 
                onClick={() => setActiveTab('address')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all border-l-4 ${activeTab === 'address' ? 'bg-blue-50/50 text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <i className="bx bx-map-pin text-lg"></i> Alamat & Info
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

                    <div className="md:col-span-2">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Alamat Lengkap</label>
                       <textarea 
                         value={formData.address} 
                         onChange={(e) => setFormData({...formData, address: e.target.value})}
                         rows="3"
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       ></textarea>
                    </div>

                    <div>
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kota</label>
                       <input 
                         type="text" 
                         value={formData.city} 
                         onChange={(e) => setFormData({...formData, city: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       />
                    </div>

                    <div>
                       <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-2">Kode Pos</label>
                       <input 
                         type="text" 
                         value={formData.zip_code} 
                         onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none transition-colors" 
                       />
                    </div>

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

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

