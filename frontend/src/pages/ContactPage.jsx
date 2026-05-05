import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';
import { useConfig } from '../hooks/useConfig';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const { config } = useConfig();
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
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Hubungi <span className="text-rose-600">Kami</span></h1>
        <p className="text-gray-500 font-medium max-w-xl mx-auto">Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja.</p>
        <div className="w-20 h-1.5 bg-rose-600 rounded-full mx-auto mt-6 shadow-lg shadow-rose-100" />
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-rose-600/5 focus:border-rose-600 focus:bg-white transition-all font-bold text-gray-700" 
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-rose-600/5 focus:border-rose-600 focus:bg-white transition-all font-bold text-gray-700" 
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
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-rose-600/5 focus:border-rose-600 focus:bg-white transition-all font-bold text-gray-700" 
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
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-rose-600/5 focus:border-rose-600 focus:bg-white transition-all font-bold text-gray-700 resize-none" 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-xl shadow-rose-200/50 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={20} />
                  Kirim Pesan Sekarang
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <h2 className="text-2xl font-black text-gray-900 mb-4 px-2">Informasi Kontak</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-rose-600/5 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-110 transition-transform">
                <MapPin size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Alamat Kantor</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {config.contact_address || 'Jl. Sudirman No. 123, Jakarta Pusat'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-rose-600/5 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-110 transition-transform">
                <Phone size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Nomor Telepon</h4>
                <p className="text-sm text-gray-500">{config.contact_phone || '+62 21 1234 5678'}</p>
                <p className="text-xs text-rose-600 font-bold mt-1 uppercase tracking-tighter cursor-pointer hover:underline">
                  WhatsApp: {config.contact_whatsapp || '+62 812-3456-7890'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-rose-600/5 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-110 transition-transform">
                <Mail size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Email Support</h4>
                <p className="text-sm text-gray-500">{config.contact_email || 'support@akuglow.id'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-rose-600/5 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-110 transition-transform">
                <Clock size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Jam Operasional</h4>
                <p className="text-sm text-gray-500">{config.contact_hours || 'Senin - Jumat, 09:00 - 18:00'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">Butuh bantuan cepat?</h3>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">Hubungi pusat bantuan AkuGlow Care untuk respon instan dari tim support kami.</p>
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl font-bold cursor-pointer hover:bg-white hover:text-gray-900 transition-all">
                   <MessageCircle size={20} className="text-green-400" />
                   AkuGlow Care
                </div>
             </div>
             {/* Decorative */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
