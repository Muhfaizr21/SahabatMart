import React, { useState } from 'react';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetchJson(`${PUBLIC_API_BASE}/contact/submit`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      toast.success(res.message || 'Pesan berhasil dikirim!');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim pesan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Hubungi <span className="text-blue-600">Kami</span></h1>
        <p className="text-gray-500 font-medium max-w-xl mx-auto">Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja.</p>
        <div className="w-20 h-1.5 bg-blue-600 rounded-full mx-auto mt-6 shadow-lg shadow-blue-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-blue-100/50 border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-8">Kirim Pesan</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Nama kamu" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-700" 
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="email@kamu.com" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-700" 
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Subjek</label>
              <input 
                type="text" 
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                required
                placeholder="Subjek pesan" 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-700" 
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Pesan</label>
              <textarea 
                rows={5} 
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                required
                placeholder="Tulis pesan kamu secara detail..." 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all font-bold text-gray-700 resize-none" 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <i className="bx bx-paper-plane text-xl"></i>
                  Kirim Pesan Sekarang
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <h2 className="text-2xl font-black text-gray-900 mb-4 px-2">Informasi Kontak</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {[
              { label: 'Alamat', value: 'Jl. Sudirman No. 123, Jakarta Pusat, 10220', icon: 'bx-map', color: 'blue' },
              { label: 'Telepon', value: '+62 21 1234 5678', icon: 'bx-phone', color: 'indigo' },
              { label: 'Email', value: 'support@sahabatmart.id', icon: 'bx-envelope', color: 'sky' },
              { label: 'Jam Operasional', value: 'Sen - Sab: 09.00 - 21.00 WIB', icon: 'bx-time-five', color: 'emerald' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-3xl p-6 border border-gray-50 shadow-xl shadow-gray-200/20 flex gap-5 group hover:border-blue-100 transition-all">
                <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-2xl text-${item.color}-600 group-hover:scale-110 transition-transform`}>
                  <i className={`bx ${item.icon}`}></i>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{item.label}</div>
                  <div className="text-sm font-black text-gray-800 leading-relaxed">{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">Butuh bantuan cepat?</h3>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">Hubungi pusat bantuan SahabatMart Care untuk respon instan dari tim support kami.</p>
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl font-bold cursor-pointer hover:bg-white hover:text-gray-900 transition-all">
                   <i className="bx bxl-whatsapp text-xl text-green-400"></i>
                   SahabatMart Care
                </div>
             </div>
             {/* Decorative */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
