import React, { useState, useEffect } from 'react';
import { fetchJson, API_BASE, formatImage } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function SkinJourney() {
  const user = getStoredUser();
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journalText, setJournalText] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [ritualActive, setRitualActive] = useState(false);
  const [ritualSeconds, setRitualSeconds] = useState(60);
  const [skinPhoto, setSkinPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [trackerForm, setTrackerForm] = useState({ skin_score: 5, emotional_score: 5, allow_marketing: false, notes: '' });
  const [showJournalHistory, setShowJournalHistory] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [showSelector, setShowSelector] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Filter states for Skin Journey chart
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(null);

  const currentWeekNumber = (() => {
    if (!journeyData?.pretest?.created_at) return null;
    const createdAt = new Date(journeyData.pretest.created_at);
    if (isNaN(createdAt.getTime()) || createdAt.getFullYear() < 2000) return null;
    const daysSince = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    return Math.min(52, Math.max(1, Math.floor(daysSince / 7) + 1));
  })();

  const alreadyUploadedThisWeek = false; // TEMPORARILY DISABLED FOR TESTING

  useEffect(() => {
    let interval = null;
    if (ritualActive && ritualSeconds > 0) {
      interval = setInterval(() => setRitualSeconds(prev => prev - 1), 1000);
    } else if (ritualSeconds === 0) {
      setRitualActive(false);
      setRitualSeconds(60);
      toast.success('Ritual Selesai! Kulitmu berterima kasih. ✨', { duration: 5000 });
    }
    return () => clearInterval(interval);
  }, [ritualActive, ritualSeconds]);

  const fetchJourney = async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${API_BASE}/api/skin/journey`);
      setJourneyData(res);
      
      // Sync completed steps from backend
      if (res.completed_steps_today) {
        const completedMap = {};
        res.completed_steps_today.forEach(id => {
          completedMap[id] = true;
        });
        setCompletedSteps(completedMap);
      }
      
      setShowSelector(false);
    } catch (err) { 
      console.error('Journey Fetch Error:', err);
      toast.error('Gagal memuat data skin journey');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    setLoadingPrograms(true);
    try {
      const data = await fetchJson(`${API_BASE}/api/skin/programs`);
      setPrograms(data);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const handleSetProgram = async (programId) => {
    try {
      await fetchJson(`${API_BASE}/api/skin/set-program`, {
        method: 'POST',
        body: JSON.stringify({ program_id: programId })
      });
      toast.success('Program berhasil diaktifkan! ✨');
      fetchJourney();
    } catch (err) {
      toast.error('Gagal mengaktifkan program');
    }
  };

  useEffect(() => {
    fetchJourney();
  }, []);

  useEffect(() => {
    if (journeyData?.pretest?.id && (!journeyData?.program?.id || showSelector)) {
      fetchPrograms();
    }
  }, [journeyData, showSelector]);

  const handleCompleteStep = async (routineId) => {
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/complete-step`, {
        method: 'POST',
        body: JSON.stringify({ routine_id: routineId })
      });
      
      if (res.message) {
        toast.success(res.message);
        setCompletedSteps(prev => ({ ...prev, [routineId]: true }));
        // Refresh to update EXP/Rank
        fetchJourney();
      }
    } catch (err) {
      toast.error('Gagal menyimpan progres');
    }
  };

  const handlePostJournal = async () => {
    if (!journalText.trim()) return;
    setSavingJournal(true);
    try {
      await fetchJson(`${API_BASE}/api/skin/journal`, { method: 'POST', body: JSON.stringify({ content: journalText }) });
      toast.success('Jurnal harian tersimpan!');
      setJournalText('');
      fetchJourney();
    } catch (err) { toast.error('Gagal mengirim jurnal'); }
    finally { setSavingJournal(false); }
  };

  const handleSaveProgress = async () => {
    if (alreadyUploadedThisWeek) {
      toast.error(`Kamu sudah upload progres minggu ke-${currentWeekNumber}! Tunggu minggu depan ya 💪`);
      return;
    }

    setAnalyzing(true);
    try {
      const progressForm = {
        skin_score: trackerForm.skin_score,
        emotional_score: trackerForm.emotional_score,
        allow_marketing: trackerForm.allow_marketing,
        notes: trackerForm.notes,
        selfie_url: trackerForm.selfie_url
      };

      if (skinPhoto && !aiAnalysis) {
        toast.loading('Menganalisis foto dengan AI...', { id: 'ai-analyze' });
        const formData = new FormData();
        formData.append('photo', skinPhoto);
        const token = localStorage.getItem('token');
        const aiRes = await fetch(`${API_BASE}/api/skin/analyze`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const aiJson = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiJson?.message || 'Gagal menganalisis foto');

        const aiResult = aiJson?.data ?? aiJson;
        if (aiResult?.skin_score) progressForm.skin_score = aiResult.skin_score;
        setAiAnalysis(aiResult);
        if (aiResult?.photo_url) {
          setTrackerForm(prev => ({ ...prev, selfie_url: aiResult.photo_url }));
        }
        
        toast.success('✨ Analisis AI selesai!', { id: 'ai-analyze' });
        return; // Berhenti di sini agar user bisa baca hasil AI
      }

      const res = await fetchJson(`${API_BASE}/api/skin/progress`, {
        method: 'POST',
        body: JSON.stringify(progressForm)
      });

      toast.success(res.message || 'Progres mingguan tersimpan!');
      setSkinPhoto(null);
      setAiAnalysis(null);
      fetchJourney();
    } catch (err) {
      toast.dismiss('ai-analyze');
      toast.error(err.message || 'Gagal menyimpan progres');
    } finally {
      setAnalyzing(false);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/affiliate/skin/journey?token=' + journeyData?.pretest?.barcode_token)}`;

  const renderProgramSelector = () => (
    <div className="space-y-10 py-6 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto">
        <span className="px-4 py-1.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 inline-block">Step 1: Pilih Program</span>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4 italic">"Kulitmu, Aturanmu."</h1>
        <p className="text-slate-400 text-sm">Berdasarkan hasil pre-test, pilih program yang paling sesuai dengan target kulitmu saat ini.</p>
        {journeyData?.program?.id && (
           <button onClick={() => setShowSelector(false)} className="mt-4 text-rose-400 text-[10px] font-black uppercase tracking-widest hover:underline">Batal Ganti</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loadingPrograms ? (
           <div className="col-span-full py-32 text-center">
             <div className="inline-block w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-4"></div>
             <div className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Menyiapkan Rekomendasi...</div>
           </div>
        ) : programs.length > 0 ? programs.map((p) => (
          <div key={p.id} className="p-10 rounded-[48px] bg-slate-800/40 border border-white/5 hover:border-rose-500/30 transition-all group flex flex-col justify-between relative overflow-hidden">
            {/* Background Watermark - Made safe so it doesn't collide */}
            <div className="absolute -right-4 -top-4 text-8xl font-black text-white/[0.03] select-none pointer-events-none group-hover:text-rose-500/[0.05] transition-colors">
              {p.name?.split(' ')[0]}
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-8 group-hover:scale-110 transition-transform overflow-hidden">
                <span className="material-symbols-outlined text-4xl">spa</span>
              </div>
              <h3 className="text-3xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-rose-400 transition-colors">{p.name}</h3>
              <p className="text-slate-400 text-lg leading-relaxed mb-10 line-clamp-3 group-hover:text-slate-300 transition-colors">{p.description || 'Program perawatan kulit intensif untuk hasil maksimal.'}</p>
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
                <span className="w-8 h-[1px] bg-slate-700"></span>
                Tingkat: {p.name.includes('Essential') ? 'Dasar' : p.name.includes('Advanced') ? 'Lanjutan' : 'Intensif'}
              </div>
              <button 
                onClick={() => handleSetProgram(p.id)}
                className="w-full py-5 bg-white text-slate-900 font-black text-sm rounded-3xl shadow-xl shadow-white/5 hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
              >
                PILIH PROGRAM INI
                <span className="material-symbols-outlined text-xl group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center text-slate-600 font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-[40px]">
             Belum ada program yang tersedia. Hubungi Admin.
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin" />
    </div>
  );

  if (!journeyData?.pretest?.id) return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-800/40 border border-white/5 rounded-[40px] text-center px-6">
      <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6">
        <span className="material-symbols-outlined text-4xl">analytics</span>
      </div>
      <h3 className="text-2xl font-black text-white mb-2">Belum Ada Analisis Kulit</h3>
      <p className="text-slate-400 max-w-sm mb-8 text-sm">Mulai perjalanan kulit sehatmu dengan analisis AI pertama. Kami akan memantau progress mingguanmu.</p>
      <button 
        onClick={() => window.location.href='/affiliate/skin/pretest'}
        className="px-8 py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-rose-500/20"
      >
        MULAI ANALISIS SEKARANG
      </button>
    </div>
  );

  if (!journeyData?.program?.id || showSelector) return renderProgramSelector();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-2xl font-black text-white">Skin Journey Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Pantau perkembangan kulitmu setiap hari.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.confirm('Analisis ulang akan mereset data rekomendasi. Lanjut?')) {
                window.location.href='/affiliate/skin/pretest';
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 text-xs font-black transition-all"
          >
            <span className="material-symbols-outlined text-lg">rebase_edit</span>
            ANALISIS ULANG
          </button>
          <button 
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 rounded-2xl text-indigo-400 text-xs font-black transition-all"
          >
            <span className="material-symbols-outlined text-lg">swap_horiz</span>
            GANTI PROGRAM
          </button>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-5 rounded-3xl bg-slate-800/40 border border-white/5 relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Hari Ke</p>
            <h4 className="text-2xl md:text-3xl font-black text-rose-500">{journeyData?.day_count || 1}</h4>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-5xl md:text-6xl text-white/5 group-hover:text-rose-500/10 transition-colors">calendar_today</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-800/40 border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Rank</p>
            <h4 className="text-2xl md:text-3xl font-black text-indigo-400">{journeyData?.warrior_level?.level_name || 'Novice'}</h4>
            <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
               <div 
                 className="bg-indigo-400 h-full rounded-full transition-all duration-500" 
                 style={{ 
                   width: (() => {
                     const exp = journeyData?.warrior_level?.experience || 0;
                     if (exp >= 1500) return '100%';
                     if (exp >= 500) return `${((exp - 500) / 1000) * 100}%`; // Progress to Elite (1500)
                     if (exp >= 100) return `${((exp - 100) / 400) * 100}%`;  // Progress to Warrior (500)
                     return `${(exp / 100) * 100}%`;                         // Progress to Survivor (100)
                   })()
                 }}
               />
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-5xl md:text-6xl text-white/5 group-hover:text-rose-500/10 transition-colors">workspace_premium</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-800/40 border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">EXP</p>
            <h4 className="text-2xl md:text-3xl font-black text-amber-400">{journeyData?.warrior_level?.experience?.toLocaleString() || 0}</h4>
            <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Target: 500</p>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-5xl md:text-6xl text-white/5 group-hover:text-rose-500/10 transition-colors">bolt</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-800/40 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="relative z-10">
            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Jurnal</p>
            <h4 className="text-2xl md:text-3xl font-black text-emerald-400">{journeyData?.journals?.length || 0}</h4>
          </div>
          <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-5xl md:text-6xl text-white/5 group-hover:text-rose-500/10 transition-colors">edit_note</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Affirmation Card */}
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-indigo-500 to-indigo-700 relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <p className="text-indigo-100 text-[10px] font-black tracking-[0.3em] uppercase mb-4 opacity-60">Daily Affirmation</p>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight italic line-clamp-3">
                "{journeyData?.affirmations?.[(journeyData?.day_count || 0) % (journeyData?.affirmations?.length || 5)] || 'Kulitmu sedang berproses, hargai setiap langkahnya.'}"
              </h2>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10"><span className="material-symbols-outlined text-[200px] text-white">auto_awesome</span></div>
          </div>

          {/* Routine List */}
          <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[40px] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black text-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-indigo-400">task_alt</span>
                Routine Hari Ini
              </h3>
              <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                {journeyData?.program?.name}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {journeyData?.routines?.sort((a,b) => (a.step?.order || 0) - (b.step?.order || 0)).map((routine, i) => (
                <div key={i} className={`p-5 rounded-[32px] border transition-all cursor-pointer group flex flex-col justify-between h-full ${completedSteps[routine.id] ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-slate-900/40 border-white/5 hover:border-indigo-500/30'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${completedSteps[routine.id] ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                      <span className="material-symbols-outlined">{routine.step?.icon || 'spa'}</span>
                    </div>
                    {completedSteps[routine.id] ? (
                      <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); }}
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors"
                      >
                        CARA
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className={`font-black text-sm mb-1 leading-tight line-clamp-2 ${completedSteps[routine.id] ? 'text-emerald-400 line-through' : 'text-white'}`}>{routine.step?.name}</h4>
                    <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest truncate">{routine.step?.time_of_day}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skin Progress Tracker */}
          <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[40px] backdrop-blur-xl">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-white font-black text-lg flex items-center gap-3">
                 <span className="material-symbols-outlined text-rose-400">camera_front</span>
                 Skin Progress
               </h3>
               <button 
                 onClick={() => !alreadyUploadedThisWeek && setShowTracker(!showTracker)}
                 disabled={alreadyUploadedThisWeek}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${alreadyUploadedThisWeek ? 'bg-slate-700/50 text-slate-500 border-white/5 cursor-not-allowed' : 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border-rose-500/20'}`}
               >
                 {alreadyUploadedThisWeek ? `Week ${currentWeekNumber} Done` : (showTracker ? 'Tutup Tracker' : 'Upload Progres')}
               </button>
             </div>

             {showTracker && !alreadyUploadedThisWeek && (
               <div className="mb-10 p-8 rounded-3xl bg-slate-900/60 border border-white/5 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4 block">Selfie Progres (Wajib)</label>
                      <div className="relative group aspect-square rounded-3xl overflow-hidden bg-slate-800 border-2 border-dashed border-white/10 hover:border-rose-500/50 transition-colors">
                        {skinPhoto ? (
                          <img src={URL.createObjectURL(skinPhoto)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-4xl mb-2">add_a_photo</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Pilih Foto</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => {
                          setSkinPhoto(e.target.files[0]);
                          setAiAnalysis(null);
                          setTrackerForm(prev => ({ ...prev, selfie_url: '' }));
                        }} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4 block text-center">Bagaimana Kulitmu? ({trackerForm.skin_score}/10)</label>
                        <input type="range" min="1" max="10" value={trackerForm.skin_score} onChange={(e) => setTrackerForm({...trackerForm, skin_score: parseInt(e.target.value)})} className="w-full accent-rose-500" />
                      </div>
                      <textarea 
                        className="w-full p-5 bg-slate-800 border border-white/10 rounded-2xl text-white text-sm focus:border-rose-500 outline-none h-32"
                        placeholder="Ada keluhan atau perubahan signifikan?"
                        value={trackerForm.notes}
                        onChange={(e) => setTrackerForm({...trackerForm, notes: e.target.value})}
                      />

                      {aiAnalysis && (
                        <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 animate-in zoom-in-95 duration-500">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-indigo-400">psychology</span>
                            <h4 className="text-white font-black text-[10px] uppercase tracking-widest">Analisis AI Akuglow</h4>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-slate-400 text-[9px] uppercase font-bold mb-1">Kondisi Kulit</p>
                              <p className="text-indigo-200 text-xs leading-relaxed italic">"{aiAnalysis.summary}"</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-slate-500 text-[8px] uppercase font-bold mb-1">Tipe Kulit</p>
                                <p className="text-white text-[10px] font-black uppercase">{aiAnalysis.skin_type}</p>
                              </div>
                              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-slate-500 text-[8px] uppercase font-bold mb-1">Kemerahan</p>
                                <p className="text-white text-[10px] font-black uppercase">{aiAnalysis.redness}%</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                              <p className="text-emerald-400 text-[9px] font-black italic">✨ {aiAnalysis.healing_message}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={handleSaveProgress}
                        disabled={analyzing || !skinPhoto}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${aiAnalysis ? 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-400'}`}
                      >
                        {analyzing ? 'Menganalisis...' : (aiAnalysis ? 'Konfirmasi & Simpan' : 'Analisis & Simpan')}
                      </button>
                    </div>
                  </div>
               </div>
             )}

             <div className="space-y-4">
                {journeyData?.progress_logs?.slice(0, 4).map((log, i) => (
                  <div key={i} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-rose-500/20 transition-all">
                    <div className="flex items-center gap-4">
                      <img src={formatImage(log.selfie_url)} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                      <div>
                        <p className="text-white text-xs font-black uppercase">Minggu {log.week_number}</p>
                        <p className="text-slate-500 text-[9px] font-bold">{new Date(log.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-black">Score: {log.skin_score}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Journal */}
          <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[40px] backdrop-blur-xl">
             <h3 className="text-white font-black text-lg mb-6 flex items-center gap-3">
               <span className="material-symbols-outlined text-emerald-400">edit_note</span>
               Daily Journal
             </h3>
             <textarea 
               className="w-full p-6 bg-slate-900/60 border border-white/5 rounded-[32px] text-white text-sm focus:border-emerald-500 outline-none h-44 mb-6 transition-all"
               placeholder="Bagaimana perasaanmu hari ini?"
               value={journalText}
               onChange={(e) => setJournalText(e.target.value)}
             />
             <button 
               onClick={handlePostJournal}
               disabled={savingJournal || !journalText.trim()}
               className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               {savingJournal ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               ) : (
                 <span className="material-symbols-outlined text-sm">send</span>
               )}
               {savingJournal ? 'Menyimpan...' : 'SIMPAN JURNAL'}
             </button>
          </div>

          {/* Jurnal Lawas History */}
          <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[40px] backdrop-blur-xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-white font-black text-lg flex items-center gap-3">
                 <span className="material-symbols-outlined text-purple-400">history</span>
                 Jurnal Lawas
               </h3>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{journeyData?.journals?.length || 0} Entri</span>
             </div>
             
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {journeyData?.journals?.length > 0 ? (
                 journeyData.journals.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((j, i) => (
                   <div key={i} className="p-5 rounded-[28px] bg-slate-900/40 border border-white/5 hover:border-purple-500/20 transition-all group">
                     <div className="flex items-center justify-between mb-3">
                       <p className="text-purple-400 text-[9px] font-black uppercase tracking-widest">
                         {new Date(j.created_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                       </p>
                       <span className="material-symbols-outlined text-[14px] text-slate-600 group-hover:text-purple-400 transition-colors">verified</span>
                     </div>
                     <p className="text-slate-300 text-xs leading-relaxed italic line-clamp-4">"{j.content}"</p>
                   </div>
                 ))
               ) : (
                 <div className="py-12 text-center bg-slate-900/20 rounded-3xl border border-dashed border-white/5">
                   <span className="material-symbols-outlined text-slate-700 text-4xl mb-3">history_edu</span>
                   <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Belum ada riwayat jurnal</p>
                 </div>
               )}
             </div>
          </div>

          {/* Ritual Card */}
          <div className="p-8 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-[40px] backdrop-blur-xl relative overflow-hidden group">
            <h3 className="text-white font-black text-lg mb-2 relative z-10">Ritual 60 Detik</h3>
            <p className="text-slate-400 text-xs mb-8 relative z-10 leading-relaxed italic">"Pijat wajahmu dengan lembut selama 60 detik untuk meningkatkan sirkulasi."</p>
            
            <div className="flex flex-col items-center justify-center relative z-10">
              <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                  <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="377" strokeDashoffset={377 - (377 * ritualSeconds / 60)} className="text-indigo-400 transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white leading-none">{ritualSeconds}</span>
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">Detik</span>
                </div>
              </div>
              <button 
                onClick={() => setRitualActive(!ritualActive)}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${ritualActive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20'}`}
              >
                {ritualActive ? 'Pause Ritual' : 'Mulai Ritual'}
              </button>
            </div>
            <div className="absolute -left-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
               <span className="material-symbols-outlined text-[150px] text-white">spa</span>
            </div>
          </div>

          {/* Education Links */}
          <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[40px] backdrop-blur-xl">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6 opacity-60">Edukasi Hari Ini</h3>
            <div className="space-y-4">
              {[
                { title: 'Pentingnya Re-apply Sunscreen', icon: 'light_mode', color: 'text-amber-400' },
                { title: 'Urutan Skincare Yang Benar', icon: 'format_list_numbered', color: 'text-indigo-400' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                  <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
                  <span className="text-slate-300 text-[10px] font-bold uppercase">{item.title}</span>
                </div>
              ))}
            </div>
            <button onClick={() => window.location.href='/affiliate/education'} className="w-full mt-4 text-[9px] text-indigo-400 font-bold uppercase hover:text-indigo-300 transition-colors">LIHAT SEMUA MATERI</button>
          </div>

          {/* Digital Barcode Button */}
          <button onClick={() => setShowQR(true)} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">qr_code_2</span>
            Digital Barcode
          </button>
        </div>
      </div>

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

      {showJournalHistory && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowJournalHistory(false)} />
          <div className="relative bg-slate-900 border border-white/10 p-8 rounded-[40px] max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black text-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">history_edu</span>
                Riwayat Jurnal
              </h3>
              <button onClick={() => setShowJournalHistory(false)} className="text-white hover:text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {journeyData?.journals?.map((j, i) => (
                <div key={i} className="p-5 rounded-3xl bg-white/5 border border-white/5">
                  <p className="text-slate-500 text-[10px] font-bold mb-2 uppercase">{new Date(j.created_at).toLocaleDateString('id-ID')}</p>
                  <p className="text-slate-300 text-sm italic">"{j.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRoutine && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedRoutine(null)} />
          <div className="relative bg-slate-900 border border-indigo-500/20 p-10 rounded-[48px] max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">{selectedRoutine.step?.icon || 'spa'}</span>
                </div>
                <div>
                  <h3 className="text-white font-black text-xl uppercase tracking-tighter">Cara Pakai: {selectedRoutine.step?.name}</h3>
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">{selectedRoutine.duration_min} Menit Sesi</p>
                </div>
              </div>
              <button onClick={() => setSelectedRoutine(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-white/5">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedRoutine.instructions || selectedRoutine.step?.description || 'Ikuti langkah standar untuk tahap ini.'}
                </p>
              </div>

              {journeyData?.recommendations?.find(r => r.step_type === selectedRoutine.step?.name) && (
                <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">Produk Rekomendasi:</p>
                  {(() => {
                    const rec = journeyData.recommendations.find(r => r.step_type === selectedRoutine.step?.name);
                    return (
                      <div className="flex items-center gap-4">
                        <img src={formatImage(rec.product?.image)} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                        <div>
                          <p className="text-white font-black text-sm">{rec.product?.name}</p>
                          <p className="text-slate-500 text-[9px] mt-1 line-clamp-2">Gunakan secukupnya untuk hasil maksimal.</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                handleCompleteStep(selectedRoutine.id);
                setSelectedRoutine(null);
              }}
              className="w-full mt-10 py-5 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
            >
              SAYA SUDAH MENGERJAKAN INI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
