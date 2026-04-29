import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE, fetchJson } from '../lib/api';

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

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/pretest`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.token) {
        setBarcodeToken(res.token);
        toast.success('Pendaftaran Skin Journey Berhasil!');
        setStep(4); // Move to success step
      }
    } catch (err) {
      toast.error(`Gagal mengirim data: ${err.message}`);
      console.error('DEBUG PRETEST:', err);
    } finally {
      setLoading(false);
    }
  };

  const STYLES = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" },
    card: { maxWidth: '500px', width: '100%', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(255, 182, 193, 0.2)', border: '1px solid rgba(255, 182, 193, 0.3)', textAlign: 'center' },
    input: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '2px solid #fee2e2', fontSize: '16px', marginBottom: '20px', outline: 'none', transition: 'all 0.3s', textAlign: 'left' },
    button: { width: '100%', padding: '16px', borderRadius: '15px', border: 'none', background: 'linear-gradient(90deg, #ff8fa3 0%, #ff4d6d 100%)', color: 'white', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 10px 20px rgba(255, 77, 109, 0.3)', marginTop: '10px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568', textAlign: 'left' }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/skin/journey?token=' + barcodeToken)}`;

  return (
    <div style={STYLES.container}>
      <div style={STYLES.card}>
        {step < 4 && (
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ color: '#ff4d6d', fontSize: '28px', marginBottom: '10px' }}>Digital Skin Journey</h1>
            <p style={{ color: '#718096' }}>Langkah awal menuju kulit yang lebih sehat dan bahagia.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: '40px', height: '6px', borderRadius: '3px', background: step >= i ? '#ff4d6d' : '#fee2e2', transition: 'all 0.5s' }} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ textAlign: 'left' }}>
            <label style={STYLES.label}>Nama Lengkap</label>
            <input style={STYLES.input} placeholder="Masukkan nama Anda..." value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            <label style={STYLES.label}>Jenis Kulit</label>
            <select style={STYLES.input} value={form.skin_type} onChange={e => setForm({...form, skin_type: e.target.value})}>
              <option value="">Pilih jenis kulit...</option>
              <option value="Normal">Normal</option>
              <option value="Oily">Berminyak (Oily)</option>
              <option value="Dry">Kering (Dry)</option>
              <option value="Sensitive">Sensitif</option>
              <option value="Combination">Kombinasi</option>
            </select>
            <button style={STYLES.button} onClick={next}>Lanjut</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'left' }}>
            <label style={STYLES.label}>Permasalahan Kulit</label>
            <textarea style={{ ...STYLES.input, height: '100px', resize: 'none' }} placeholder="Ceritakan masalah kulitmu..." value={form.skin_problem} onChange={e => setForm({...form, skin_problem: e.target.value})} />
            <label style={STYLES.label}>Hasil Produk Sebelumnya</label>
            <textarea style={{ ...STYLES.input, height: '100px', resize: 'none' }} placeholder="Efek penggunaan skincare sebelumnya..." value={form.previous_effects} onChange={e => setForm({...form, previous_effects: e.target.value})} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...STYLES.button, background: '#edf2f7', color: '#4a5568' }} onClick={prev}>Kembali</button>
              <button style={STYLES.button} onClick={next}>Lanjut</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'left' }}>
            <label style={STYLES.label}>Saran/Harapan Penggunaan Produk</label>
            <textarea style={{ ...STYLES.input, height: '100px', resize: 'none' }} placeholder="Tuliskan saran atau apa yang ingin kamu capai bersama Akuglow?" value={form.suggestions} onChange={e => setForm({...form, suggestions: e.target.value})} />
            <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px dashed #ff8fa3' }}>
              <p style={{ fontSize: '13px', color: '#ff4d6d', margin: 0, textAlign: 'center', lineHeight: '1.6' }}>
                "Terima kasih sudah bertahan hari ini. Proses penyembuhan memang tidak instan, tapi kamu sudah selangkah lebih dekat."
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...STYLES.button, background: '#edf2f7', color: '#4a5568' }} onClick={prev}>Kembali</button>
              <button style={STYLES.button} onClick={submit} disabled={loading}>{loading ? 'MENGANALISIS...' : 'MULAI JOURNEY'}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ padding: '20px 0' }}>
             <div style={{ width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontSize: '40px', margin: '0 auto 20px' }}>
                <i className="bx bx-check-circle" />
             </div>
             <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Selamat Bergabung!</h2>
             <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>Pendaftaranmu berhasil. Berikut adalah Barcode Digital untuk akses cepat ke journey-mu.</p>
             
             <div style={{ background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'inline-block', marginBottom: '30px' }}>
                <img src={qrUrl} alt="Barcode" style={{ width: '200px', borderRadius: '10px' }} />
                <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '800', color: '#ff4d6d', letterSpacing: '2px' }}>AKUGLOW JOURNEY</div>
             </div>

             <button style={STYLES.button} onClick={() => navigate('/skin/journey')}>Buka Dashboard Sekarang</button>
             <p style={{ marginTop: '15px', fontSize: '12px', color: '#94a3b8' }}>*Silakan screenshot Barcode ini jika diperlukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
