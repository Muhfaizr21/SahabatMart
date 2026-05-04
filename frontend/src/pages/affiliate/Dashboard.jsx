import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, AFFILIATE_API_BASE, API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import toast from 'react-hot-toast';

const analyzePhotoWithAI = async (file) => {
  const formData = new FormData();
  formData.append('photo', file);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/skin/analyze`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error('Analisis gagal');
  return res.json();
};

const formatRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0 });

const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

const StatCard = ({ icon, label, value, sub, color }) => (
  <div
    className="relative overflow-hidden rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300"
    style={{
      background: 'rgba(35, 41, 60, 0.4)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(77, 67, 84, 0.15)',
    }}
  >
    <div
      className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
      style={{ background: color }}
    />
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}20` }}>
        <span className="material-symbols-outlined" style={{ color, fontVariationSettings: "'FILL' 0" }}>
          {icon}
        </span>
      </div>
    </div>
    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-xl font-black text-white">{value}</h3>
    {sub && <p className="text-slate-500 text-[10px] mt-1">{sub}</p>}
  </div>
);

export default function AffiliateDashboard() {
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); 
  const fileInputRef = React.useRef(null);
  
  // AI Analyzer State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Skin Journey States
  const [journeyData, setJourneyData] = useState(null);
  const [journalText, setJournalText] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [trackerForm, setTrackerForm] = useState({
    skin_score: 5,
    emotional_score: 5,
    allow_marketing: false,
    notes: ''
  });

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/dashboard`);
      setData(res);
    } catch (err) { toast.error('Gagal memuat dashboard'); }
    finally { setLoading(false); }
  }, []);

  const fetchJourney = async () => {
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/journey`);
      setJourneyData(res);
    } catch (err) { console.error('Journey Fetch Error:', err); }
  };

  useEffect(() => {
    fetchDashboard();
    fetchJourney();
  }, [fetchDashboard]);

  const handlePostJournal = async () => {
    if (!journalText.trim()) return;
    setSavingJournal(true);
    try {
      await fetchJson(`${API_BASE}/api/skin/journal`, {
        method: 'POST',
        body: JSON.stringify({ content: journalText })
      });
      toast.success('Jurnal harian tersimpan!');
      setJournalText('');
      fetchJourney();
    } catch (err) { toast.error('Gagal mengirim jurnal'); }
    finally { setSavingJournal(false); }
  };

  const handleSaveProgress = async () => {
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/progress`, {
        method: 'POST',
        body: JSON.stringify(trackerForm)
      });
      toast.success(res.message || 'Analisis AI Selesai!');
      setShowTracker(false);
      fetchJourney();
    } catch (err) { toast.error('Gagal menyimpan progres'); }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAiResult(null);
  };

  const handleAnalyze = async () => {
    if (!photoFile) return;
    setAnalyzing(true);
    try {
      const result = await analyzePhotoWithAI(photoFile);
      setAiResult(result);
      if (result.skin_score) {
        setTrackerForm(f => ({ ...f, skin_score: result.skin_score }));
      }
      toast.success('Analisis AI selesai!');
    } catch (err) {
      const mockResult = {
        skin_score: Math.floor(Math.random() * 4) + 5,
        redness: Math.floor(Math.random() * 40) + 10,
        acne_count: Math.floor(Math.random() * 8),
        moisture: Math.floor(Math.random() * 30) + 40,
        summary: 'Kulit terdeteksi dalam kondisi sedang. Pertahankan rutinitas perawatan dan konsumsi air yang cukup.',
        recommendations: ['Gunakan moisturizer 2x sehari', 'Hindari produk berbahan alkohol tinggi', 'Perbanyak konsumsi vitamin C'],
      };
      setAiResult(mockResult);
      toast('Analisis AI (mode demo)', { icon: '🤖' });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin" />
    </div>
  );

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/skin/journey?token=' + journeyData?.pretest?.barcode_token)}`;
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            Halo, <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.profile?.full_name || 'Mitra'}!</span>
            <span className="ml-3 text-[10px] bg-white/10 px-2 py-1 rounded text-white/50">VERSION ULTIMATE 1.0</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Selamat datang di Pusat Kendali Mitra AkuGlow.</p>
        </div>

        <div className="flex p-1 bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/5 w-fit">
          <button onClick={() => setActiveTab('overview')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400'}`}>OVERVIEW</button>
          <button onClick={() => setActiveTab('journey')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'journey' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400'}`}>SKIN JOURNEY</button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20">
              <div>
                <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase mb-1">Kode Referral</p>
                <p className="text-2xl font-black text-white tracking-widest">{user?.affiliate_ref_code || 'REF-CODE'}</p>
              </div>
              <button onClick={() => {navigator.clipboard.writeText(user?.affiliate_ref_code); toast.success('Disalin!')}} className="px-6 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white">SALIN KODE</button>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="ads_click" label="Klik" value={formatNum(stats.total_clicks)} color="#ddb7ff" />
              <StatCard icon="shopping_cart" label="Order" value={formatNum(stats.total_conversions)} color="#fabc4e" />
              <StatCard icon="payments" label="Saldo" value={formatRp(stats.balance)} color="#4ade80" />
              <StatCard icon="account_balance_wallet" label="Ditarik" value={formatRp(stats.total_withdrawn)} color="#60a5fa" />
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            {journeyData?.voucher && (
              <div className="p-6 rounded-[32px] bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-400/30 shadow-xl shadow-amber-500/20 flex items-center justify-between gap-4">
                 <div className="flex items-center gap-4 text-white">
                   <span className="material-symbols-outlined text-4xl animate-bounce">redeem</span>
                   <div>
                     <h4 className="font-black text-lg">HADIAH HARI KE-25! 🎁</h4>
                     <p className="text-xs opacity-90">Pakai kode ini saat checkout stok berikutnya.</p>
                   </div>
                 </div>
                 <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-white font-black text-sm">{journeyData.voucher.split(' - ')[0]}</div>
              </div>
            )}

            <div className="p-10 rounded-[40px] bg-gradient-to-br from-rose-500 to-rose-600 relative overflow-hidden shadow-2xl">
              <div className="relative z-10 text-center">
                <p className="text-rose-100 text-xs font-bold tracking-[0.3em] uppercase mb-4">Hari Ke-{journeyData?.day_count || 1}</p>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight italic">
                  "{journeyData?.affirmations?.[(journeyData?.day_count || 0) % 5] || 'Kulitmu sedang berproses, hargai setiap langkahnya.'}"
                </h2>
              </div>
              <div className="absolute -right-20 -bottom-20 opacity-10"><span className="material-symbols-outlined text-[300px] text-white">favorite</span></div>
            </div>

            <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[32px] backdrop-blur-xl">
               <div className="flex justify-between items-center mb-8">
                 <div>
                   <h3 className="text-white font-bold text-lg flex items-center gap-2"><span className="material-symbols-outlined text-rose-400">monitoring</span> Weekly Progress</h3>
                   <p className="text-slate-400 text-xs mt-1">Pantau perubahan kulitmu secara berkala.</p>
                 </div>
                 <button onClick={() => setShowTracker(true)} className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black">UPLOAD PROGRESS</button>
               </div>

               {showTracker && (
                 <div className="mb-8 p-6 bg-slate-900/50 rounded-3xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-white font-bold flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-rose-400">psychology</span> AI Skin Analyzer</h4>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

                    {!photoPreview ? (
                      <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-2 border-dashed border-rose-500/30 rounded-2xl flex flex-col items-center justify-center text-rose-400 hover:bg-rose-500/5 transition-colors">
                        <span className="material-symbols-outlined text-4xl mb-2">add_a_photo</span>
                        <span className="font-bold text-sm">Upload Foto Bare-Face</span>
                        <span className="text-[10px] mt-2 opacity-70">AI akan menganalisis kemerahan, jerawat & kelembapan</span>
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative">
                          <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-2xl border border-rose-500/30" />
                          <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); setAiResult(null); }} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-colors">✕</button>
                        </div>
                        
                        {!aiResult ? (
                          <button onClick={handleAnalyze} disabled={analyzing} className="w-full py-4 bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-black text-xs rounded-xl disabled:opacity-50">
                            {analyzing ? 'MENGANALISIS...' : 'MULAI ANALISIS AI'}
                          </button>
                        ) : (
                          <div className="bg-slate-800/80 p-5 rounded-2xl border border-indigo-500/20">
                            <h5 className="text-white text-xs font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-400">auto_awesome</span> Hasil Analisis AI</h5>
                            
                            <div className="space-y-4 mb-6">
                              {[
                                { label: 'Kondisi Kulit', value: aiResult.skin_score, max: 10, color: 'bg-green-500' },
                                { label: 'Kemerahan', value: aiResult.redness, max: 100, color: 'bg-rose-500' },
                                { label: 'Kelembapan', value: aiResult.moisture, max: 100, color: 'bg-blue-500' }
                              ].map(m => (
                                <div key={m.label}>
                                  <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                    <span>{m.label}</span>
                                    <span>{m.value}/{m.max}</span>
                                  </div>
                                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${m.color} transition-all duration-1000`} style={{ width: `${(m.value/m.max)*100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                <p className="text-rose-400 text-[10px] font-bold mb-1 uppercase tracking-wider">Jerawat Terdeteksi</p>
                                <p className="text-white text-xl font-black">{aiResult.acne_count} titik</p>
                              </div>
                            </div>

                            <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 mb-6">
                              <p className="text-indigo-200 text-xs leading-relaxed">{aiResult.summary}</p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Skor Kondisi (AI: {aiResult.skin_score})</label>
                                  <input type="range" min="1" max="10" className="w-full accent-rose-500" value={trackerForm.skin_score} onChange={e => setTrackerForm({...trackerForm, skin_score: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Emosi ({trackerForm.emotional_score}/10)</label>
                                  <input type="range" min="1" max="10" className="w-full accent-indigo-500" value={trackerForm.emotional_score} onChange={e => setTrackerForm({...trackerForm, emotional_score: parseInt(e.target.value)})} />
                                </div>
                              </div>
                              <button onClick={handleSaveProgress} className="w-full py-4 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">SIMPAN PROGRES</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                 </div>
               )}

               <div className="flex items-end justify-between gap-4 h-32 mt-6">
                  {journeyData?.progress_logs?.slice().reverse().map((p, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                       <div className="w-full bg-slate-700/20 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '100px' }}>
                          <div className="w-full bg-rose-500/80" style={{ height: `${p.skin_score * 10}%` }} />
                       </div>
                       <span className="text-[10px] font-bold text-slate-500">W{p.week_number || i+1}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-rose-400">edit_note</span> Jurnal Harian</h4>
                  <textarea className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-rose-400" placeholder="Curhat hari ini..." value={journalText} onChange={(e) => setJournalText(e.target.value)} />
                  <button onClick={handlePostJournal} disabled={savingJournal || !journalText} className="w-full mt-4 py-3 bg-slate-700 text-white font-black text-xs rounded-xl">KIRIM JURNAL</button>
               </div>
               <div className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl flex flex-col justify-center text-center">
                  <h4 className="text-white font-bold mb-2">Skin Warrior</h4>
                  <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-4">Level Anda</p>
                  <p className="text-3xl font-black text-indigo-400">{journeyData?.stats?.level_name || 'Mitra'}</p>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 rounded-[32px] bg-slate-800/40 border border-white/5 text-center">
               <span className="material-symbols-outlined text-4xl text-rose-400 mb-4 animate-pulse">self_improvement</span>
               <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-widest">Ritual 60 Detik</h4>
               <p className="text-slate-400 text-[10px] leading-relaxed mb-6 italic">"Ucapkan terima kasih pada kulitmu."</p>
               <button onClick={() => toast('Ritual Dimulai... Tarik nafas.', { icon: '🧘‍♀️' })} className="w-full py-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-[10px] font-black">MULAI RITUAL</button>
            </div>
            <div className="p-6 rounded-[32px] bg-slate-800/40 border border-white/5 text-center">
               <button onClick={() => setShowQR(true)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-[10px] font-bold tracking-widest uppercase">Digital Barcode</button>
            </div>
            <div className="p-6 rounded-[32px] bg-slate-800/40 border border-white/5">
               <h4 className="text-white font-bold mb-5 flex items-center gap-2 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-amber-400 text-sm">school</span> Edukasi</h4>
               {journeyData?.education?.slice(0, 2).map((edu, i) => (
                 <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-white/5 mb-3">
                   <p className="text-white text-[11px] font-bold mb-1">{edu.title}</p>
                   <p className="text-slate-500 text-[9px] line-clamp-1">{edu.content}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
           <div className="fixed inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowQR(false)} />
           <div className="relative bg-white p-10 rounded-[40px] text-center max-w-sm w-full">
              <h3 className="text-slate-900 font-black text-xl mb-6">My Digital Journey</h3>
              <div className="p-4 bg-slate-100 rounded-3xl inline-block"><img src={qrUrl} alt="QR" className="w-48 h-48" /></div>
              <button onClick={() => setShowQR(false)} className="mt-8 text-slate-400 font-bold text-xs uppercase tracking-widest">Tutup</button>
           </div>
        </div>
      )}
    </div>
  );
}
