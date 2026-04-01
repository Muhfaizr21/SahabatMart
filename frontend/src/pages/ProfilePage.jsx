import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');

  const orders = [
    { id: '#ORD-20240321-893', date: '21 Mar 2024', total: 'Rp19.450.000', status: 'Selesai', items: 2 },
    { id: '#ORD-20240215-421', date: '15 Feb 2024', total: 'Rp3.150.000', status: 'Dikirim', items: 1 },
    { id: '#ORD-20240105-112', date: '05 Jan 2024', total: 'Rp850.000', status: 'Dibatalkan', items: 3 },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-6 text-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop" alt="User" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Muhfaiizr</h2>
              <p className="text-sm text-gray-500 mb-6">Member Premium</p>
            </div>
            
            <nav className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-semibold transition-colors border-b border-gray-50 ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Profil Saya
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-semibold transition-colors border-b border-gray-50 ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Pesanan Saya
              </button>
              <button 
                onClick={() => setActiveTab('address')}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-semibold transition-colors border-b border-gray-50 ${activeTab === 'address' ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Alamat Pengiriman
              </button>
              <Link to="/login" className="w-full flex items-center gap-3 px-6 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                Keluar
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[500px]">
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Informasi Biodata</h3>
                  <form className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Nama Lengkap</label>
                      <input type="text" defaultValue="Muhfaiizr" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:bg-white bg-gray-50 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                      <input type="email" defaultValue="user@sahabatmart.id" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:bg-white bg-gray-50 outline-none" disabled />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Nomor Ponsel</label>
                      <input type="tel" defaultValue="+6281234567890" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:bg-white bg-gray-50 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Tanggal Lahir</label>
                      <input type="date" defaultValue="1995-08-15" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:bg-white bg-gray-50 outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Jenis Kelamin</label>
                      <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:bg-white bg-gray-50 outline-none">
                        <option>Laki-laki</option>
                        <option>Perempuan</option>
                        <option>Tidak Disebutkan</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors">
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Riwayat Pesanan</h3>
                  <div className="space-y-4">
                    {orders.map((order, i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-50 pb-4">
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="font-bold text-blue-600">{order.id}</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">{order.date}</span>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${order.status === 'Selesai' ? 'bg-green-100 text-green-700' : order.status === 'Dikirim' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              {order.status}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">{order.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Terdiri dari {order.items} produk</span>
                          <button className="text-sm font-bold text-blue-600 hover:underline">
                            Lihat Detail →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'address' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Alamat Saya</h3>
                    <button className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                      + Tambah Alamat
                    </button>
                  </div>
                  <div className="border border-blue-200 bg-blue-50/20 rounded-2xl p-6 relative">
                    <div className="absolute top-6 right-6 flex gap-3">
                      <button className="text-blue-600 font-bold text-sm hover:underline">Ubah</button>
                    </div>
                    <div className="mb-2">
                      <span className="font-bold text-gray-900 mr-2">Rumah</span>
                      <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Utama</span>
                    </div>
                    <div className="text-gray-900 font-medium text-sm mb-1">Muhfaiizr (+6281234567890)</div>
                    <p className="text-gray-500 text-sm max-w-sm leading-relaxed">Jl. Kebon Jeruk Raya No. 12, Kav. 3, Jakarta Barat, DKI Jakarta, 11530</p>
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
