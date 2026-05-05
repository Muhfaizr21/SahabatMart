import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE, fetchJson } from '../../lib/api';

export default function SkinPreTest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [barcodeToken, setBarcodeToken] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    skin_problem: '',
    skin_type: '',
    previous_effects: '',
    suggestions: ''
  });

  const next = () => {
    if (step === 1 && !form.full_name) return toast.error('Isi nama lengkapmu dulu ya ✨');
    if (step === 1 && !form.skin_type) return toast.error('Pilih jenis kulitmu dulu ya ✨');
    setStep(s => s + 1);
  };
  const prev = () => setStep(s => s - 1);

  const submit = async () => {
    if (!form.skin_problem) return toast.error('Ceritakan masalah kulitmu sebentar ya ✨');
    setLoading(true);
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/pretest`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.barcode_token) {
        setBarcodeToken(res.barcode_token);
        toast.success('Pendaftaran Skin Journey Berhasil!');
        setStep(4);
      }
    } catch (err) {
      toast.error(`Gagal menyimpan data pretest: ${err.message}`);
      console.error('DEBUG PRETEST:', err);
    } finally {
      setLoading(false);
    }
  };

  const STYLES = {
    container: { 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    },
    card: { 
      maxWidth: '550px', 
      width: '100%', 
      background: 'rgba(30, 41, 59, 0.4)', 
      backdropFilter: 'blur(24px)', 
      padding: '48px', 
      borderRadius: '48px', 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    input: { 
      width: '100%', 
      padding: '18px 24px', 
      borderRadius: '20px', 
      border: '1px solid rgba(255, 255, 255, 0.1)', 
      background: 'rgba(15, 23, 42, 0.4)', 
      color: 'white', 
      fontSize: '15px', 
      marginBottom: '24px', 
      outline: 'none', 
      transition: 'all 0.3s', 
      textAlign: 'left' 
    },
    button: { 
      width: '100%', 
      padding: '18px', 
      borderRadius: '20px', 
      border: 'none', 
      background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', 
      color: 'white', 
      fontSize: '15px', 
      fontWeight: '900', 
      cursor: 'pointer', 
      boxShadow: '0 12px 24px rgba(225, 29, 72, 0.25)', 
      marginTop: '12px', 
      textTransform: 'uppercase', 
      letterSpacing: '1.5px',
      transition: 'all 0.3s'
    },
    label: { 
      display: 'block', 
      marginBottom: '10px', 
      fontWeight: '800', 
      color: '#94a3b8', 
      fontSize: '11px', 
      textAlign: 'left', 
      textTransform: 'uppercase', 
      letterSpacing: '1px' 
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/affiliate/skin/journey?token=' + barcodeToken)}`;

  return (
    <div style={STYLES.container}>
      <div style={STYLES.card} className="animate-in fade-in zoom-in-95 duration-700">
        {/* Background blobs for premium look */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[100px]" />

        {step < 4 && (
          <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10 }}>
            <span className="px-4 py-1.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 inline-block">Akuglow AI Pre-Test</span>
            <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.03em' }}>
              Your Skin <span className="text-rose-500">Journey</span> Starts Here
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>Bantu kami memahami kondisi kulitmu untuk rekomendasi yang presisi.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '32px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ 
                  width: step === i ? '48px' : '12px', 
                  height: '6px', 
                  borderRadius: '10px', 
                  background: step >= i ? 'linear-gradient(to right, #f43f5e, #e11d48)' : 'rgba(255,255,255,0.05)', 
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ textAlign: 'left', position: 'relative', zIndex: 10 }} className="animate-in slide-in-from-right-4 duration-500">
            <label style={STYLES.label}>Nama Lengkap</label>
            <input 
              style={STYLES.input} 
              className="focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5"
              placeholder="Masukkan nama sesuai identitas..." 
              value={form.full_name} 
              onChange={e => setForm({...form, full_name: e.target.value})} 
            />
            
            <label style={STYLES.label}>Tipe Kulit Saat Ini</label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {['Normal', 'Oily', 'Dry', 'Sensitive', 'Combination'].map(type => (
                <button
                  key={type}
                  onClick={() => setForm({...form, skin_type: type})}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                    form.skin_type === type 
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20' 
                      : 'bg-slate-800/40 text-slate-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            <button style={STYLES.button} onClick={next} className="hover:scale-[1.02] active:scale-[0.98]">Lanjut Ke Masalah Kulit</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'left', position: 'relative', zIndex: 10 }} className="animate-in slide-in-from-right-4 duration-500">
            <label style={STYLES.label}>Apa masalah kulit utamamu?</label>
            <textarea 
              style={{ ...STYLES.input, height: '120px', resize: 'none' }} 
              className="focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5"
              placeholder="Contoh: Jerawat membandel, flek hitam, atau kulit kusam..." 
              value={form.skin_problem} 
              onChange={e => setForm({...form, skin_problem: e.target.value})} 
            />
            
            <label style={STYLES.label}>Pengalaman Skincare Sebelumnya</label>
            <textarea 
              style={{ ...STYLES.input, height: '120px', resize: 'none' }} 
              className="focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5"
              placeholder="Apakah pernah breakout? Atau ada alergi bahan tertentu?" 
              value={form.previous_effects} 
              onChange={e => setForm({...form, previous_effects: e.target.value})} 
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ ...STYLES.button, background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }} 
                onClick={prev}
                className="hover:bg-white/5"
              >
                Kembali
              </button>
              <button style={{ ...STYLES.button, flex: 2 }} onClick={next} className="hover:scale-[1.02] active:scale-[0.98]">Lanjut</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'left', position: 'relative', zIndex: 10 }} className="animate-in slide-in-from-right-4 duration-500">
            <label style={STYLES.label}>Harapanmu Bersama Akuglow</label>
            <textarea 
              style={{ ...STYLES.input, height: '120px', resize: 'none' }} 
              className="focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5"
              placeholder="Tuliskan target kulit yang ingin kamu capai..." 
              value={form.suggestions} 
              onChange={e => setForm({...form, suggestions: e.target.value})} 
            />
            
            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 mb-8 flex items-center gap-4">
              <span className="material-symbols-outlined text-emerald-400 text-3xl">verified_user</span>
              <p style={{ fontSize: '12px', color: '#a7f3d0', margin: 0, lineHeight: '1.6' }}>
                "Data kamu aman. AI kami akan memproses info ini untuk membuat program harian yang paling efektif."
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ ...STYLES.button, background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }} 
                onClick={prev}
                className="hover:bg-white/5"
              >
                Kembali
              </button>
              <button 
                style={{ ...STYLES.button, flex: 2 }} 
                onClick={submit} 
                disabled={loading}
                className="hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'MENYIAPKAN JOURNEY...' : 'MULAI SEKARANG'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ padding: '20px 0', position: 'relative', zIndex: 10 }} className="animate-in fade-in zoom-in duration-1000">
             <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-5xl mx-auto mb-8 shadow-inner">
                <span className="material-symbols-outlined text-6xl">check_circle</span>
             </div>
              <h2 style={{ color: 'white', fontSize: '32px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.03em' }}>Selamat Datang! ✨</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '350px', margin: '0 auto 40px' }}>
                Pendaftaran berhasil. Gunakan barcode ini sebagai ID digital perjalanan kulitmu.
              </p>
             
             <div className="p-8 bg-white rounded-[40px] shadow-2xl inline-block mb-10 relative group">
                <div className="absolute inset-0 bg-rose-500/5 blur-2xl group-hover:blur-3xl transition-all" />
                <img src={qrUrl} alt="Barcode" className="w-56 h-56 rounded-2xl relative z-10" />
                <div className="mt-4 text-[10px] font-black text-slate-400 tracking-[0.4em] relative z-10 uppercase">Akuglow Skin Journey</div>
             </div>

             <button 
               style={STYLES.button} 
               onClick={() => navigate('/affiliate/skin/journey')}
               className="hover:scale-[1.02] active:scale-[0.98]"
             >
               BUKA DASHBOARD
             </button>
             <p className="mt-8 text-[11px] text-slate-500 font-bold uppercase tracking-widest">*Screenshot barcode ini untuk cadangan</p>
          </div>
        )}
      </div>
    </div>
  );
}
