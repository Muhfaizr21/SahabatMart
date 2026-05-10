import React, { useState, useEffect, useRef } from 'react';
import { fetchJson, API_BASE, formatImage } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';

export default function SkinJourney() {
  const user = getStoredUser();
  const certificateRef = useRef(null);
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journalText, setJournalText] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [history, setHistory] = useState([]); // Graduation history
  const [activeCertificate, setActiveCertificate] = useState(null); // Data for cert download
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
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imageAlign, setImageAlign] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Filter states for Skin Journey chart
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(null);

  const currentWeekNumber = (() => {
    // Priority: Use started_at from the active program, fallback to pretest created_at
    const startDateStr = journeyData?.program?.id ? journeyData.started_at : journeyData?.pretest?.created_at;
    if (!startDateStr) return 1;
    
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime()) || startDate.getFullYear() < 2000) return 1;
    
    const daysSince = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
    return Math.min(52, Math.max(1, Math.floor(daysSince / 7) + 1));
  })();

  // BUG-02/11 fix: Weekly lock dikendalikan oleh backend, disable TESTING_MODE
  const TESTING_MODE = false;
  
  const alreadyUploadedThisWeek = !TESTING_MODE && (journeyData?.progress_logs?.some(log => {
    const logDate = new Date(log.created_at);
    const now = new Date();
    const getWeek = (date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };
    return getWeek(logDate) === getWeek(now) && logDate.getFullYear() === now.getFullYear();
  }) || false);

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

      // Fetch History [Point 2]
      try {
        const histData = await fetchJson(`${API_BASE}/api/skin/history`);
        setHistory(histData || []);
      } catch (e) { console.error("History fetch error:", e); }
      
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

  const formatSummary = (text) => {
    if (!text) return '';
    // XSS Protection: Escape HTML tags first
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    // Then apply safe formatting
    const formatted = escaped.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-black">$1</b>');
    return { __html: formatted };
  };

  const handleSetProgram = async (programId) => {
    try {
      setLoading(true); // Force loading state
      await fetchJson(`${API_BASE}/api/skin/set-program`, {
        method: 'POST',
        body: JSON.stringify({ program_id: programId })
      });
      toast.success('Program berhasil diaktifkan! ✨');
      await fetchJourney(); // Ensure we wait for fetch
      setLoading(false);
    } catch (err) {
      setLoading(false);
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

  const handleFinishJourney = async () => {
    if (!window.confirm('Apakah kamu yakin ingin menyelesaikan program ini? Kamu tidak akan bisa mencatat rutin harian lagi setelah ini.')) return;
    
    try {
      await fetchJson(`${API_BASE}/api/skin/finish-program`, { method: 'POST' });
      toast.success('🎉 Selamat! Program kamu telah selesai!');
      fetchJourney();
    } catch (err) {
      toast.error(err.message || 'Gagal menyelesaikan program');
    }
  };

  const processAndValidateImage = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Optimized size for AI (640x800 is sufficient for analysis and much faster)
          const targetWidth = 640;
          const targetHeight = 800;
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Draw image to fit canvas
          const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
          const x = (targetWidth - img.width * scale) / 2;
          const y = (targetHeight - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          
          // 1. Fast Quality Gatekeeper: Skip heavy pixel math where possible
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let totalLuminance = 0;
          
          const grayscale = new Float32Array(canvas.width * canvas.height);
          
          // Optimized loop: Jump more pixels for faster initial scan
          for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const gray = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            totalLuminance += gray;
            grayscale[j] = gray;
          }
          
          let diffSum = 0;
          let count = 0;
          // Faster sharpness detection: Check every 4th pixel instead of 2nd
          for (let i = canvas.width + 1; i < grayscale.length - canvas.width - 1; i += 4) {
             const val = Math.abs(
               grayscale[i] * 4 - 
               grayscale[i-1] - grayscale[i+1] - 
               grayscale[i-canvas.width] - grayscale[i+canvas.width]
             );
             diffSum += val;
             count++;
          }
          const sharpness = diffSum / count;
          const avgLuminance = totalLuminance / (data.length / 4);
          
          console.log('Image Quality Check:', { sharpness, avgLuminance });

          // Kita ubah dari "Blokir" menjadi "Peringatan" agar tidak kaku
          if (avgLuminance < 25) {
            toast("Fotonya terlihat agak gelap, AI mungkin kurang akurat. Coba cari cahaya lebih ya!", { icon: '⚠️' });
          }
          
          if (sharpness < 1.5) {
             toast("Fotonya terdeteksi agak buram. Pastikan kamera fokus agar hasil maksimal!", { icon: '⚠️' });
          }

          // Kita hanya blokir jika BENAR-BENAR ekstrem (misal layar hitam total atau blank)
          if (avgLuminance < 5 || sharpness < 0.5) {
            reject(new Error("Foto tidak terbaca. Pastikan kamera tidak tertutup dan ada cahaya."));
            return;
          }

          // 2. Pre-Processing Enhancement (Auto-Enhance)
          // Naikan kontras sedikit agar tekstur kulit lebih terlihat untuk AI
          const contrast = 1.1; // 10% boost
          const intercept = 128 * (1 - contrast);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] * contrast + intercept;
            data[i+1] = data[i+1] * contrast + intercept;
            data[i+2] = data[i+2] * contrast + intercept;
          }
          ctx.putImageData(imageData, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Gagal mengompres gambar"));
          }, 'image/jpeg', 0.85);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("File gambar rusak atau tidak didukung"));
      };
    });
  };

  const handleSaveProgress = async () => {
    if (alreadyUploadedThisWeek) {
      toast.error(`Kamu sudah upload progres minggu ke-${currentWeekNumber}! Tunggu minggu depan ya 💪`);
      return;
    }

    // Phase 1: AI Analysis
    if (skinPhoto && !aiAnalysis) {
      setAnalyzing(true);
      const tid = toast.loading('Memproses & Mengoptimalkan Foto...', { id: 'ai-analyze' });
      
      try {
        let processedBlob;
        try {
          processedBlob = await processAndValidateImage(skinPhoto);
        } catch (e) {
          toast.error(e.message, { id: 'ai-analyze' });
          setAnalyzing(false);
          return;
        }

        toast.loading('Menganalisis dengan AI SahabatMart...', { id: 'ai-analyze' });
        const formData = new FormData();
        formData.append('photo', processedBlob, 'processed_selfie.jpg');
        
        const token = localStorage.getItem('token');
        const aiRes = await fetch(`${API_BASE}/api/skin/analyze`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const aiJson = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiJson?.message || 'Gagal menganalisis foto');

        const aiResult = aiJson?.data ?? aiJson;
        setAiAnalysis(aiResult);

        if (aiResult?.skin_score || aiResult?.emotion_score) {
          setTrackerForm(prev => ({ 
            ...prev, 
            skin_score: aiResult.skin_score || prev.skin_score, 
            emotional_score: aiResult.emotion_score || aiResult.emotional_score || prev.emotional_score,
            selfie_url: aiResult.photo_url || prev.selfie_url 
          }));
        } else if (aiResult?.photo_url) {
          setTrackerForm(prev => ({ ...prev, selfie_url: aiResult.photo_url }));
        }
        
        toast.success('✨ Analisis AI selesai!', { id: 'ai-analyze' });
      } catch (err) {
        toast.error(err.message || 'Gagal menganalisis foto', { id: 'ai-analyze' });
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    // Phase 2: Save Progress
    setSavingProgress(true);
    try {
      const progressForm = {
        skin_score: trackerForm.skin_score,
        emotional_score: trackerForm.emotional_score,
        allow_marketing: trackerForm.allow_marketing,
        notes: trackerForm.notes,
        selfie_url: trackerForm.selfie_url
      };

      const res = await fetchJson(`${API_BASE}/api/skin/progress`, {
        method: 'POST',
        body: JSON.stringify(progressForm)
      });

      toast.success(res.message || 'Progres mingguan tersimpan!');
      setSkinPhoto(null);
      setAiAnalysis(null);
      fetchJourney();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan progres');
    } finally {
      setSavingProgress(false);
    }
  };

  // Auto-trigger AI Analysis as soon as photo is captured/selected
  useEffect(() => {
    if (skinPhoto && !aiAnalysis && !analyzing && showTracker) {
      handleSaveProgress();
    }
  }, [skinPhoto, showTracker, aiAnalysis, analyzing]);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Gagal mengakses kamera');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      setSkinPhoto(blob);
      setAiAnalysis(null);
      setTrackerForm(prev => ({ ...prev, selfie_url: '' }));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleDownloadCertificate = async (historyItem = null) => {
    // If historyItem is passed, we are downloading an old cert
    if (historyItem) {
      setActiveCertificate(historyItem);
    } else {
      setActiveCertificate(null);
    }

    // Small delay to let React update the hidden template
    await new Promise(r => setTimeout(r, 100));

    if (!certificateRef.current) return;
    
    const tid = toast.loading('Memproses sertifikat digital...');
    try {
      const element = certificateRef.current;
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
        }
      });
      
      const link = document.createElement('a');
      const fileName = activeCertificate 
        ? `Sertifikat-${activeCertificate.program_name}-${new Date().getTime()}.png`
        : `Sertifikat-SkinJourney-${new Date().getTime()}.png`;
        
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      
      toast.success('Sertifikat berhasil diunduh! ✨', { id: tid });
    } catch (err) {
      console.error("Download Error:", err);
      toast.error(`Gagal mengunduh: ${err.message || 'Error teknis'}`, { id: tid });
    } finally {
      // Clear active certificate after a while
      setTimeout(() => setActiveCertificate(null), 1000);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/affiliate/skin/journey?token=' + journeyData?.pretest?.barcode_token)}`;

  const renderProgramSelector = () => (
    <div className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-10 duration-700 bg-[#0c1324] min-h-screen">
      <div className="text-center max-w-3xl mx-auto px-6">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-8 border border-rose-500/20 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          Step 1: Pilih Program
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-6 italic tracking-tight leading-tight">
          "Pilih Jalur <span className="text-rose-500">Kecantikanmu.</span>"
        </h1>
        <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl mx-auto">
          Berdasarkan hasil analisis AI Deepglow, kami merekomendasikan program terbaik untuk mencapai <span className="text-white font-bold">Skin Goal</span> impianmu.
        </p>
        {journeyData?.program?.id && (
           <button onClick={() => setShowSelector(false)} className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-sm">Batal Ganti</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-6">
        {loadingPrograms ? (
           <div className="col-span-full py-40 text-center">
             <div className="relative inline-block mb-6">
               <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full animate-pulse" />
               <div className="relative w-16 h-16 border-4 border-white/10 border-t-rose-500 rounded-full animate-spin"></div>
             </div>
             <div className="text-slate-400 font-black text-sm uppercase tracking-[0.3em] animate-pulse">Menyiapkan Rekomendasi...</div>
           </div>
        ) : programs.length > 0 ? programs.map((p) => (
          <div key={p.id} className="group p-8 rounded-[48px] bg-white/5 border border-white/10 hover:border-rose-500/50 transition-all duration-500 flex flex-col justify-between relative overflow-hidden shadow-2xl hover:-translate-y-2">
            {/* Background Accent */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center text-rose-500 mb-8 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500 shadow-inner">
                <span className="material-symbols-outlined text-3xl">spa</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-rose-500 transition-colors">{p.name}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-10 line-clamp-3 font-medium">{p.description || 'Program perawatan kulit intensif untuk hasil maksimal.'}</p>
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                <div className="w-8 h-[1px] bg-slate-100 group-hover:bg-rose-200 transition-colors"></div>
                LEVEL: {p.name.includes('Essential') ? 'Dasar' : p.name.includes('Advanced') ? 'Lanjutan' : 'Intensif'}
              </div>
              <button 
                onClick={() => handleSetProgram(p.id)}
                className="w-full py-5 bg-white/5 border border-white/10 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[24px] shadow-2xl hover:bg-rose-500 hover:border-rose-500 hover:shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
              >
                PILIH PROGRAM INI
                <span className="material-symbols-outlined text-xl group-hover/btn:translate-x-2 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center text-slate-500 font-black text-xs uppercase tracking-[0.3em] border-4 border-dashed border-white/5 rounded-[56px] bg-white/5">
             Belum ada program yang tersedia. Hubungi Admin.
          </div>
        )}
      </div>
    </div>
  );

  const renderCompletionScreen = () => (
    <div className="max-w-5xl mx-auto py-16 px-6 text-center animate-in zoom-in-95 duration-1000">
      <div className="relative mb-20">
        <div className="absolute inset-0 bg-rose-200/40 blur-[140px] rounded-full animate-pulse" />
        <div className="relative z-10 w-40 h-40 bg-gradient-to-br from-rose-400 to-rose-600 rounded-[48px] flex items-center justify-center mx-auto shadow-2xl shadow-rose-200 rotate-12 hover:rotate-0 transition-transform duration-700 cursor-pointer group">
          <span className="material-symbols-outlined text-7xl text-white group-hover:scale-110 transition-transform">workspace_premium</span>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3">
           {[1,2,3,4,5].map(i => (
             <div key={i} className={`w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping delay-${i*300}`} />
           ))}
        </div>
      </div>

      <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-tight italic">
        "Journey <span className="text-rose-500">Accomplished.</span>"
      </h1>
      
      <p className="text-slate-400 text-xl md:text-2xl max-w-3xl mx-auto mb-16 leading-relaxed font-medium">
        Selamat! Kamu telah menyelesaikan program <span className="text-rose-400 font-black">{journeyData?.program?.name}</span> selama {journeyData?.day_count} hari penuh dedikasi. Kulitmu kini lebih kuat, lebih sehat, dan lebih bercahaya.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Total Hari', value: journeyData?.day_count, color: 'rose', icon: 'calendar_month' },
          { label: 'Final Rank', value: journeyData?.warrior_level?.level_name, color: 'indigo', icon: 'military_tech' },
          { label: 'Consistency', value: `${journeyData?.consistency_score}%`, color: 'emerald', icon: 'auto_graph' },
          { label: 'Total EXP', value: journeyData?.warrior_level?.experience?.toLocaleString(), color: 'amber', icon: 'bolt' },
        ].map((item, i) => (
          <div key={i} className="p-8 rounded-[40px] bg-white/5 border border-white/5 shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
            <span className={`material-symbols-outlined text-${item.color}-400 mb-4 block text-3xl transition-transform group-hover:scale-110`}>{item.icon}</span>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{item.label}</p>
            <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">{item.value}</h3>
          </div>
        ))}
      </div>

      {(journeyData?.first_photo || journeyData?.last_photo) && (
        <div className="mb-20">
          <div className="flex items-center justify-center gap-6 mb-12">
            <div className="h-[1px] w-20 bg-white/10"></div>
            <h4 className="text-white font-black text-2xl tracking-tighter flex items-center gap-3 uppercase">
               <span className="material-symbols-outlined text-rose-500 text-3xl">auto_awesome_motion</span>
               Your Skin Evolution
            </h4>
            <div className="h-[1px] w-20 bg-white/10"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {/* Before */}
            <div className="group">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Day 01: Initial State</p>
              <div className="relative aspect-[3/4] rounded-[56px] overflow-hidden border-4 border-white/10 bg-black/40 shadow-2xl group-hover:rotate-[-2deg] transition-transform duration-700">
                {journeyData?.first_photo ? (
                  <img src={journeyData.first_photo} alt="Before" className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-700" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 italic px-10 text-center">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-30">no_photography</span>
                    <p className="text-sm font-black uppercase tracking-widest">No Start Photo</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-10">
                   <span className="text-white font-black text-xs uppercase tracking-[0.3em]">The Beginning</span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="group">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em] mb-4">Today: Result ✨</p>
              <div className="relative aspect-[3/4] rounded-[56px] overflow-hidden border-8 border-rose-500/20 bg-black/40 shadow-2xl group-hover:rotate-[2deg] transition-transform duration-700">
                {journeyData?.last_photo ? (
                  <img src={journeyData.last_photo} alt="After" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 italic px-10 text-center">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-30">no_photography</span>
                    <p className="text-sm font-black uppercase tracking-widest">No Result Photo</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-rose-600/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-10">
                   <span className="text-white font-black text-xs uppercase tracking-[0.3em]">Pure Glow</span>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-12 text-slate-400 text-lg italic max-w-xl mx-auto leading-relaxed">
            "Perubahan kecil setiap hari menghasilkan perbedaan besar di akhir perjalanan."
          </p>
        </div>
      )}

      {journeyData?.voucher && (
        <div className="mb-12 p-8 rounded-[40px] bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-2">Reward Kelulusan 🎓</p>
            <h3 className="text-white font-black text-2xl mb-4">{journeyData?.voucherMessage}</h3>
            <div className="inline-flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xl">
               <span className="text-2xl font-black text-white tracking-widest uppercase">{journeyData?.voucher}</span>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(journeyData?.voucher);
                   toast.success('Kode voucher disalin!');
                 }}
                 className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
               >
                 <span className="material-symbols-outlined text-sm">content_copy</span>
               </button>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-amber-500/10 group-hover:scale-110 transition-transform">confirmation_number</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <button 
          onClick={() => {
            if (window.confirm('Mulai program baru akan menganalisis ulang kondisi kulitmu saat ini. Lanjut?')) {
              window.location.href='/affiliate/skin/pretest';
            }
          }}
          className="w-full sm:w-auto px-10 py-5 bg-white text-slate-950 font-black text-sm rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-3"
        >
          MULAI PROGRAM BARU
          <span className="material-symbols-outlined">refresh</span>
        </button>
        
        <button 
          onClick={handleDownloadCertificate}
          className="w-full sm:w-auto px-10 py-5 bg-slate-800 border border-white/10 text-white font-black text-sm rounded-2xl hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          DOWNLOAD SERTIFIKAT
          <span className="material-symbols-outlined">download</span>
        </button>
      </div>


      <div className="mt-20 p-10 rounded-[48px] bg-gradient-to-br from-slate-900 to-black border border-white/5 text-left relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="text-white font-black text-xl mb-4">Apa Langkah Selanjutnya?</h4>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Kamu sekarang berada di fase <span className="text-rose-400 font-bold">Maintenance</span>. Pertahankan kebiasaan baik ini. Kami merekomendasikan untuk melakukan Pre-test ulang setiap 3 bulan atau saat kamu merasakan perubahan signifikan pada kondisi kulitmu.
          </p>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
             </div>
             <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest italic">Konsistensi adalah kunci kecantikan abadi.</p>
          </div>
        </div>
        <span className="material-symbols-outlined absolute -right-10 -bottom-10 text-[240px] text-white/[0.02] select-none pointer-events-none">auto_fix_high</span>
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

  if (journeyData?.is_completed) return renderCompletionScreen();

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 bg-[#0c1324]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Skin Journey Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Pantau perkembangan kulitmu setiap hari secara personal.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.confirm('Analisis ulang akan mereset data rekomendasi. Lanjut?')) {
                window.location.href='/affiliate/skin/pretest';
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 text-xs font-black transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">rebase_edit</span>
            ANALISIS ULANG
          </button>
          <button 
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-black transition-all"
          >
            <span className="material-symbols-outlined text-lg">swap_horiz</span>
            GANTI PROGRAM
          </button>
          {!journeyData?.is_completed && (
            <button 
              onClick={handleFinishJourney}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-black transition-all"
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              SELESAIKAN PROGRAM
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Hari Ke', value: journeyData?.day_count || 1, icon: 'calendar_today', color: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-400' },
          { label: 'Level', value: journeyData?.warrior_level?.level_name || 'Novice', icon: 'workspace_premium', color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
          { label: 'Total EXP', value: (journeyData?.warrior_level?.experience || 0).toLocaleString(), icon: 'bolt', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400' },
          { label: 'Jurnal', value: journeyData?.journals?.length || 0, icon: 'edit_note', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="group p-6 rounded-[32px] bg-white/5 border border-white/5 shadow-2xl hover:bg-white/10 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <span className={`material-symbols-outlined ${stat.text} text-2xl`}>{stat.icon}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className={`text-2xl font-black text-white tracking-tight`}>{stat.value}</h4>
            </div>
            {/* Hidden subtle icon in background */}
            <span className={`material-symbols-outlined absolute -right-4 -bottom-4 text-8xl ${stat.text} opacity-5 transition-transform group-hover:scale-110 group-hover:opacity-10`}>
              {stat.icon}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Affirmation Card - Premium Dark */}
          <div className="p-10 rounded-[48px] bg-white/5 border border-white/5 relative overflow-hidden shadow-2xl group">
            {/* Background Magic Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-rose-500/10 to-rose-600/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-1000" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full transition-transform group-hover:scale-110 duration-1000 delay-100" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-rose-500/20 shrink-0 animate-bounce-slow">
                <span className="material-symbols-outlined text-white text-5xl">auto_awesome</span>
              </div>
              <div>
                <p className="text-rose-400 text-[10px] font-black tracking-[0.4em] uppercase mb-4 flex items-center gap-2">
                  <span className="w-8 h-[2px] bg-rose-500/30"></span>
                  Daily Affirmation
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-[1.2] italic max-w-2xl tracking-tight">
                  "{journeyData?.affirmations?.[(journeyData?.day_count || 0) % (journeyData?.affirmations?.length || 5)] || 'Kulitmu sedang berproses, hargai setiap langkahnya.'}"
                </h2>
              </div>
            </div>
            
            <div className="absolute bottom-6 right-10">
              <span className="material-symbols-outlined text-rose-500/10 text-6xl rotate-12">sparkles</span>
            </div>
          </div>

          {/* Routine List - Dark Theme */}
          <div className="p-10 bg-white/5 border border-white/5 rounded-[48px] shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-400 text-2xl">task_alt</span>
                </div>
                <div>
                  <h3 className="text-white font-black text-xl uppercase tracking-tight">Rutinitas Hari Ini</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{journeyData?.program?.name || 'Program Dasar'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {journeyData?.routines?.sort((a,b) => (a.step?.order || 0) - (b.step?.order || 0)).map((routine, i) => (
                <div key={i} className={`p-6 rounded-[32px] border transition-all cursor-pointer group flex flex-col justify-between h-full ${completedSteps[routine.id] ? 'bg-emerald-500/10 border-emerald-500/20 opacity-60' : 'bg-white/5 border-white/5 hover:border-rose-500/50 hover:bg-white/10 hover:shadow-2xl hover:shadow-black/40'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${completedSteps[routine.id] ? 'bg-emerald-500 text-white' : 'bg-white/5 text-indigo-400 border border-white/5 shadow-inner'}`}>
                      <span className="material-symbols-outlined text-3xl">{routine.step?.icon || 'spa'}</span>
                    </div>
                    {completedSteps[routine.id] ? (
                      <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); }}
                        className="px-5 py-2 bg-white/5 border border-white/10 hover:border-rose-500 hover:text-rose-500 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-all"
                      >
                        CARA
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className={`font-black text-lg mb-2 leading-tight ${completedSteps[routine.id] ? 'text-emerald-500 line-through' : 'text-white'}`}>{routine.step?.name}</h4>
                    {routine.product?.name && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase rounded-lg border border-rose-500/20">Produk</span>
                        <p className="text-slate-500 text-[10px] font-bold truncate max-w-[120px]">{routine.product.name}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <p className="text-[10px] uppercase font-bold tracking-widest">{routine.step?.time_of_day}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analisis Perkembangan - Premium Dark */}
          <div className="relative p-10 rounded-[48px] bg-white/5 border border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden group">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-white/10 shadow-xl shadow-rose-500/20">
                    <span className="material-symbols-outlined text-rose-400 text-3xl">analytics</span>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Analisis Perkembangan</h3>
                    <p className="text-slate-500 text-xs font-medium">Visualisasi kesehatan kulit berdasarkan analisis AI Deepglow</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  {(() => {
                    let initialScore = 0;
                    try {
                      const profile = JSON.parse(journeyData?.skin_profile_json || '{}');
                      initialScore = profile.skin_score || 0;
                    } catch(e) {}

                    const logs = [...(journeyData?.progress_logs || [])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                    const startScore = initialScore || (logs.length > 0 ? logs[0].skin_score : 0);
                    const latestScore = logs.length > 0 ? logs[logs.length-1].skin_score : startScore;
                    
                    const diff = latestScore - startScore;
                    const percent = startScore > 0 ? ((diff / startScore) * 100).toFixed(1) : 0;
                    
                    return (
                      <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${diff >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${diff >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="font-black text-lg tracking-tighter">{diff >= 0 ? '+' : ''}{percent}%</span>
                      </div>
                    );
                  })()}
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">Overall Progress</span>
                </div>
              </div>

              {/* Chart Container */}
              <div className="relative h-[320px] w-full bg-black/20 rounded-[32px] border border-white/5 p-8 overflow-hidden group/chart">
                {(() => {
                  let initialScore = 0;
                  try {
                    const profile = JSON.parse(journeyData?.skin_profile_json || '{}');
                    initialScore = profile.skin_score || 0;
                  } catch(e) {}

                  const logs = [...(journeyData?.progress_logs || [])].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                  
                  const dataPoints = [];
                  if (initialScore > 0) {
                    dataPoints.push({ score: initialScore, label: 'Awal' });
                  }
                  logs.forEach(log => {
                    dataPoints.push({ 
                      score: log.skin_score, 
                      label: `W${log.week_number}`
                    });
                  });

                  if (dataPoints.length < 2) {
                    return (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
                          <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                            <span className="material-symbols-outlined text-rose-400 text-5xl animate-pulse">insights</span>
                          </div>
                        </div>
                        <h4 className="text-white font-bold text-lg mb-2 tracking-tight">Membutuhkan Lebih Banyak Data</h4>
                        <p className="text-slate-500 text-sm max-w-xs leading-relaxed italic">
                          Update progres mingguanmu untuk melihat tren perkembangan kulit secara akurat.
                        </p>
                      </div>
                    );
                  }

                  const maxScore = 100;
                  const minScore = 0;
                  const range = maxScore - minScore;
                  const padding = 40;
                  const width = 1000;
                  const height = 240;

                  const getX = (i) => (i / (dataPoints.length - 1)) * (width - padding * 2) + padding;
                  const getY = (score) => height - ((score - minScore) / range) * (height - padding * 2) - padding;

                  // Build smooth path
                  let pathData = `M ${getX(0)} ${getY(dataPoints[0].score)}`;
                  for (let i = 0; i < dataPoints.length - 1; i++) {
                    const x1 = getX(i);
                    const y1 = getY(dataPoints[i].score);
                    const x2 = getX(i + 1);
                    const y2 = getY(dataPoints[i + 1].score);
                    const cp1x = x1 + (x2 - x1) / 2;
                    const cp2x = cp1x;
                    pathData += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
                  }

                  const areaPath = `${pathData} L ${getX(dataPoints.length - 1)} ${height} L ${getX(0)} ${height} Z`;

                  return (
                    <div className="w-full h-full">
                      {/* Y-Axis Labels */}
                      <div className="absolute left-4 top-8 bottom-8 flex flex-col justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest py-2">
                        <span>100 — Max</span>
                        <span>50 — Avg</span>
                        <span>0 — Min</span>
                      </div>

                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>

                        {/* Grid Lines - Extra subtle */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                          <line 
                            key={i} 
                            x1={padding} 
                            y1={height - p * (height - padding * 2) - padding} 
                            x2={width - padding} 
                            y2={height - p * (height - padding * 2) - padding} 
                            stroke="rgba(255,255,255,0.03)" 
                            strokeWidth="1"
                          />
                        ))}

                        {/* Area Fill */}
                        <path d={areaPath} fill="url(#areaGradient)" className="animate-in fade-in duration-1000" />
                        
                        {/* The Line */}
                        <path 
                          d={pathData} 
                          fill="none" 
                          stroke="url(#lineGradient)" 
                          strokeWidth="5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          filter="url(#glow)"
                          className="animate-in slide-in-from-left-full duration-1000"
                        />

                        {/* Data Points - Interactive */}
                        {dataPoints.map((p, i) => (
                          <g key={i} className="group/dot cursor-pointer">
                            <circle 
                              cx={getX(i)} 
                              cy={getY(p.score)} 
                              r="12" 
                              fill="white" 
                              fillOpacity="0"
                              className="peer"
                            />
                            <circle 
                              cx={getX(i)} 
                              cy={getY(p.score)} 
                              r="6" 
                              fill="#0f172a" 
                              stroke="url(#lineGradient)" 
                              strokeWidth="4"
                              className="group-hover/dot:scale-150 transition-transform duration-300 shadow-lg"
                            />
                            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-300 pointer-events-none">
                              <rect 
                                x={getX(i) - 30} 
                                y={getY(p.score) - 45} 
                                width="60" 
                                height="30" 
                                rx="10" 
                                fill="#0f172a" 
                              />
                              <text 
                                x={getX(i)} 
                                y={getY(p.score) - 25} 
                                textAnchor="middle" 
                                fill="white" 
                                className="text-[12px] font-black"
                              >
                                {p.score}
                              </text>
                              <path d={`M ${getX(i)-5} ${getY(p.score)-15} L ${getX(i)} ${getY(p.score)-10} L ${getX(i)+5} ${getY(p.score)-15} Z`} fill="#0f172a" />
                            </g>
                            <text 
                              x={getX(i)} 
                              y={height - 5} 
                              textAnchor="middle" 
                              fill="#475569" 
                              className="text-[10px] font-black uppercase tracking-widest group-hover/dot:fill-rose-400 transition-colors"
                            >
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Skin Progress Tracker Card */}
          <div className="p-10 bg-white/5 border border-white/5 rounded-[48px] backdrop-blur-xl shadow-2xl shadow-black/20">
             <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                   <span className="material-symbols-outlined text-rose-500 text-2xl">camera_front</span>
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-tight">Skin Tracker</h3>
                   <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Update foto mingguan</p>
                 </div>
               </div>
               <button 
                 onClick={() => !alreadyUploadedThisWeek && setShowTracker(!showTracker)}
                 disabled={alreadyUploadedThisWeek}
                 className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${alreadyUploadedThisWeek ? 'bg-white/5 text-slate-600 border-white/10 cursor-not-allowed' : 'bg-rose-500 text-white hover:bg-rose-600 border-rose-500 shadow-lg shadow-rose-500/20'}`}
               >
                 {alreadyUploadedThisWeek ? `Week ${currentWeekNumber} Done` : (showTracker ? 'Tutup' : 'Update Sekarang')}
               </button>
             </div>

             {showTracker && !alreadyUploadedThisWeek && (
                <div className="mb-10 p-10 rounded-[40px] bg-black/20 border border-white/5 animate-in slide-in-from-top-4 duration-300 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 block">Selfie Progres (Wajib)</label>
                      <div className="relative group aspect-square rounded-3xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 hover:border-rose-500/50 transition-all cursor-move">
                        {isCameraActive ? (
                          <div className="absolute inset-0 bg-black">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-80">
                               <div className="w-[60%] h-[75%] border-2 border-dashed border-rose-500 rounded-[150px/200px] relative">
                                  <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-rose-500/30" />
                                  <div className="absolute bottom-[20%] left-1/4 right-1/4 h-[1px] bg-rose-500/30" />
                               </div>
                            </div>
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                               <button onClick={capturePhoto} className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40"><span className="material-symbols-outlined">photo_camera</span></button>
                               <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
                            </div>
                          </div>
                        ) : skinPhoto ? (
                          <div 
                            className="relative w-full h-full overflow-hidden"
                            onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - imageAlign.x, y: e.clientY - imageAlign.y }); }}
                            onMouseMove={(e) => { if (isDragging) setImageAlign(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })); }}
                            onMouseUp={() => setIsDragging(false)}
                            onMouseLeave={() => setIsDragging(false)}
                          >
                            <img 
                              src={URL.createObjectURL(skinPhoto)} 
                              className="absolute pointer-events-none" 
                              style={{ 
                                transform: `translate(${imageAlign.x}px, ${imageAlign.y}px) scale(${imageAlign.scale})`,
                                transition: isDragging ? 'none' : 'transform 0.1s'
                              }}
                            />
                            {/* Face Mask Overlay Guide [Interactive] */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-60">
                               <div className="w-[60%] h-[75%] border-4 border-dashed border-rose-500 rounded-[150px/200px] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                  <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-rose-500/50" />
                                  <div className="absolute bottom-[20%] left-1/4 right-1/4 h-[1px] bg-rose-500/50" />
                               </div>
                               <div className="mt-4 flex flex-col items-center">
                                 <p className="text-[8px] text-white font-black uppercase tracking-widest bg-rose-500 px-3 py-1 rounded-full mb-2">Geser & Zoom Foto Agar Pas</p>
                                 <div className="flex gap-2 pointer-events-auto">
                                    <button onClick={() => setImageAlign(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - 0.1) }))} className="w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center"><span className="material-symbols-outlined text-sm">remove</span></button>
                                    <button onClick={() => setImageAlign(prev => ({ ...prev, scale: Math.min(3, prev.scale + 0.1) }))} className="w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center"><span className="material-symbols-outlined text-sm">add</span></button>
                                    <button onClick={() => { setSkinPhoto(null); setImageAlign({x:0, y:0, scale:1}); }} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                                 </div>
                               </div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                             <div className="flex gap-4">
                                <button onClick={startCamera} className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex flex-col items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                                   <span className="material-symbols-outlined mb-1">photo_camera</span>
                                   <span className="text-[8px] font-black uppercase">Ambil</span>
                                </button>
                                <label className="w-16 h-16 rounded-3xl bg-white/5 text-slate-500 flex flex-col items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
                                   <span className="material-symbols-outlined mb-1">upload</span>
                                   <span className="text-[8px] font-black uppercase">Upload</span>
                                   <input type="file" accept="image/*" onChange={(e) => {
                                      setSkinPhoto(e.target.files[0]);
                                      setAiAnalysis(null);
                                      setTrackerForm(prev => ({ ...prev, selfie_url: '' }));
                                   }} className="hidden" />
                                </label>
                             </div>
                             <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Pilih sumber foto</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6">
                      {!skinPhoto ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center bg-white/5 rounded-3xl border border-white/5 shadow-sm">
                           <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
                             <span className="material-symbols-outlined text-rose-400 text-4xl">photo_camera</span>
                           </div>
                           <p className="text-white font-black text-sm uppercase tracking-tight">Belum Ada Foto</p>
                           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-[180px]">
                             Ambil atau upload foto untuk menganalisis kondisi kulitmu
                           </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {analyzing ? (
                            <div className="py-12 text-center">
                               <div className="inline-block w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4"></div>
                               <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Sedang Menganalisis Kondisi Kulitmu...</p>
                            </div>
                          ) : aiAnalysis ? (
                            <>
                              <div>
                                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 block text-center">
                                  Bagaimana Kulitmu? ({trackerForm.skin_score}/100)
                                </label>
                                <input 
                                  type="range" 
                                  min="1" 
                                  max="100" 
                                  value={trackerForm.skin_score} 
                                  onChange={(e) => setTrackerForm({...trackerForm, skin_score: parseInt(e.target.value)})} 
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500" 
                                />
                              </div>
                              <textarea 
                                className="w-full p-5 bg-black/20 border border-white/5 rounded-3xl text-white text-sm focus:border-rose-500/50 focus:ring-0 outline-none h-40 transition-all shadow-inner placeholder-slate-600 mb-6"
                                placeholder="Ada keluhan atau perubahan signifikan hari ini?"
                                value={trackerForm.notes}
                                onChange={(e) => setTrackerForm({...trackerForm, notes: e.target.value})}
                              />
                              <button 
                                onClick={handleSaveProgress}
                                disabled={savingProgress}
                                className="w-full py-5 bg-rose-500 hover:bg-rose-600 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                              >
                                {savingProgress ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                  <span className="material-symbols-outlined text-sm">save</span>
                                )}
                                {savingProgress ? 'MENYIMPAN...' : 'SIMPAN PROGRES'}
                              </button>
                            </>
                          ) : (
                            <div className="py-16 text-center bg-black/20 rounded-[40px] border border-dashed border-white/5 shadow-inner">
                               <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                                 <span className="material-symbols-outlined text-rose-500 text-3xl">psychology</span>
                               </div>
                               <h4 className="text-white font-black text-sm uppercase tracking-tight mb-2">Foto Siap Dianalisis</h4>
                               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">AI Deepglow akan menganalisis kondisi wajahmu</p>
                               <button 
                                 onClick={handleSaveProgress}
                                 className="px-10 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-rose-500/20"
                               >
                                 Mulai Analisis
                                </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                        <span className="material-symbols-outlined text-amber-400 text-xl">lightbulb</span>
                        <p className="text-amber-200 text-[10px] leading-relaxed font-medium">
                          <span className="font-black uppercase block mb-1">Tips Akurasi:</span> Gunakan pencahayaan alami matahari dan pastikan wajah sejajar kamera agar hasil AI Deepglow maksimal.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
             )}

                      {aiAnalysis && skinPhoto && (
                        <div className="p-8 rounded-[40px] bg-indigo-500/10 border border-indigo-500/20 animate-in zoom-in-95 duration-500 shadow-inner">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 shadow-sm flex items-center justify-center">
                              <span className="material-symbols-outlined text-indigo-400 text-2xl">psychology</span>
                            </div>
                            <div>
                              <h4 className="text-white font-black text-sm uppercase tracking-tight">Analisis AI Deepglow</h4>
                              <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest leading-none">Instant Diagnostic Result</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <p className="text-slate-500 text-[9px] uppercase font-bold mb-2">Kondisi Kulit</p>
                              <div 
                                className="text-slate-300 text-sm leading-relaxed mb-6 prose-strong:text-white prose-strong:font-black"
                                dangerouslySetInnerHTML={formatSummary(aiAnalysis.summary)}
                              />
                              {aiAnalysis.recommendations && (
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                                  {aiAnalysis.recommendations.map((rec, i) => (
                                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-200 text-[8px] font-bold border border-indigo-500/30">
                                      <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                      {rec}
                                    </div>
                                  ))}
                                </div>
                              )}
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


            {/* Progress History Logs - Premium Dark */}
            <div className="mt-16 space-y-6 relative z-0">
                <div className="flex items-center justify-between mb-8">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Riwayat Progres</p>
                  <div className="h-[1px] flex-1 bg-white/5 ml-6"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {journeyData?.progress_logs?.slice(0, 4).map((log, i) => (
                    <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer shadow-xl shadow-black/20">
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                          <img src={formatImage(log.selfie_url)} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white text-sm font-black uppercase tracking-tight truncate">Minggu {log.week_number}</p>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          </div>
                          <p className="text-slate-500 text-[10px] font-bold truncate tracking-widest uppercase">{new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-4 flex flex-col items-end">
                         <span className="text-[10px] text-slate-600 font-bold uppercase mb-1">Score</span>
                         <span className="text-xl font-black text-rose-400 tracking-tighter">{log.skin_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Journal - Dark */}
          <div className="p-10 bg-white/5 border border-white/5 rounded-[48px] shadow-2xl backdrop-blur-xl">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                 <span className="material-symbols-outlined text-emerald-400 text-2xl">edit_note</span>
               </div>
               <div>
                 <h3 className="text-white font-black text-xl uppercase tracking-tight">Daily Journal</h3>
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Catat perasaanmu</p>
               </div>
             </div>
             <textarea 
               className="w-full p-6 bg-black/20 border border-white/5 rounded-[32px] text-white text-sm focus:border-emerald-500/50 focus:ring-0 outline-none h-52 mb-6 transition-all shadow-inner placeholder-slate-600"
               placeholder="Bagaimana perasaanmu hari ini? Ceritakan progres kulitmu..."
               value={journalText}
               onChange={(e) => setJournalText(e.target.value)}
             />
             <button 
               onClick={handlePostJournal}
               disabled={savingJournal || !journalText.trim()}
               className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               {savingJournal ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               ) : (
                 <span className="material-symbols-outlined text-sm">send</span>
               )}
               {savingJournal ? 'Menyimpan...' : 'SIMPAN JURNAL'}
             </button>
          </div>

          {/* Jurnal Lawas History - Dark Theme */}
          <div className="p-10 bg-white/5 border border-white/5 rounded-[48px] shadow-2xl backdrop-blur-xl">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                   <span className="material-symbols-outlined text-indigo-400 text-2xl">history</span>
                 </div>
                 <div>
                   <h3 className="text-white font-black text-xl uppercase tracking-tight">Riwayat</h3>
                   <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{journeyData?.journals?.length || 0} Entri</p>
                 </div>
               </div>
             </div>
             
             <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
               {journeyData?.journals?.length > 0 ? (
                 journeyData.journals.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((j, i) => (
                   <div key={i} className="p-6 rounded-[32px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group shadow-lg">
                     <div className="flex items-center justify-between mb-4">
                       <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5 shadow-sm">
                         {new Date(j.created_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                       </p>
                       <span className="material-symbols-outlined text-xl text-slate-700 group-hover:text-emerald-500 transition-colors">verified</span>
                     </div>
                     <p className="text-slate-400 text-sm leading-relaxed italic line-clamp-4">"{j.content}"</p>
                   </div>
                 ))
               ) : (
                 <div className="py-20 text-center bg-black/20 rounded-[40px] border border-dashed border-white/5">
                    <span className="material-symbols-outlined text-slate-700 text-5xl mb-4">history_edu</span>
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Belum ada riwayat jurnal</p>
                 </div>
               )}
             </div>
          </div>

          {/* Riwayat Kelulusan [Point 3] */}
          <div className="p-8 bg-slate-800/40 border border-emerald-500/10 rounded-[40px] backdrop-blur-xl">
            <h3 className="text-white font-black text-lg mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400">workspace_premium</span>
              Riwayat Kelulusan
            </h3>
            {history?.length > 0 ? (
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={i} className="p-5 rounded-[28px] bg-slate-900/40 border border-white/5 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <span className="material-symbols-outlined text-xl">verified</span>
                      </div>
                      <div>
                        <p className="text-white text-[11px] font-black uppercase tracking-tight">{h.program_name}</p>
                        <p className="text-slate-500 text-[9px] font-bold italic">{new Date(h.finished_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownloadCertificate(h)}
                      className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">download</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-3xl">
                <span className="material-symbols-outlined text-slate-700 text-3xl mb-2">military_tech</span>
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Selesaikan program pertamamu<br/>untuk mendapatkan sertifikat!
                </p>
              </div>
            )}
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
          <div className="relative bg-slate-900 border border-white/10 p-10 rounded-[48px] text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-white font-black text-xl mb-6 uppercase tracking-tighter">My Digital Journey</h3>
            <div className="p-6 bg-white rounded-3xl inline-block shadow-2xl shadow-black/40">
              <img src={qrUrl} alt="QR" className="w-48 h-48" />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-8 mb-4">Scan to view profile</p>
            <button 
              onClick={() => setShowQR(false)} 
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
              Tutup
            </button>
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
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-6 text-indigo-200 text-sm leading-relaxed italic">
                  {selectedRoutine.product?.name && (
                    <div className="flex items-center gap-4 mb-4 p-3 bg-white/5 rounded-xl border border-white/5">
                      <img 
                        src={formatImage(selectedRoutine.product.image)} 
                        className="w-12 h-12 rounded-lg object-cover"
                        alt={selectedRoutine.product.name}
                      />
                      <div>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Produk Yang Digunakan:</p>
                        <p className="text-white font-bold text-xs">{selectedRoutine.product.name}</p>
                      </div>
                    </div>
                  )}
                  {selectedRoutine.instructions || selectedRoutine.step?.description || 'Ikuti langkah standar untuk tahap ini.'}
                </div>
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

      {/* Hidden Certificate Template for Export [Always rendered] */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <div 
          ref={certificateRef}
          className="w-[800px] h-[1000px] bg-[#0f172a] p-16 flex flex-col items-center justify-center text-center relative border-[16px] border-double border-rose-500/20"
        >
          {/* Decorative Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent opacity-50" />
          <div className="absolute top-10 left-10 w-24 h-24 border-t-4 border-l-4 border-rose-500/30" />
          <div className="absolute bottom-10 right-10 w-24 h-24 border-b-4 border-r-4 border-rose-500/30" />
          
          <div className="relative z-10 w-full">
            <div className="mb-12 flex justify-center">
               <div className="w-24 h-24 bg-gradient-to-br from-rose-400 to-rose-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-rose-500/40">
                  <span className="material-symbols-outlined text-5xl text-white">workspace_premium</span>
               </div>
            </div>

            <h1 className="text-rose-500 text-xs font-black uppercase tracking-[0.4em] mb-4">Official Certification</h1>
            <h2 className="text-white text-5xl font-black mb-8 italic tracking-tighter">Skin Journey <span className="text-rose-400">Excellence</span></h2>
            
            <div className="w-20 h-[2px] bg-white/20 mx-auto mb-10" />
            <p className="text-slate-400 text-lg mb-2">Dengan bangga mempersembahkan kepada:</p>
            <h3 className="text-white text-4xl font-black mb-12 uppercase tracking-tight underline decoration-rose-500/50 underline-offset-8">
              {journeyData?.user_name || 'Sahabat Glow'}
            </h3>
            
            <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed mb-16">
              Telah menunjukkan dedikasi luar biasa dalam menyelesaikan program 
              <span className="text-white font-bold mx-1">
                {activeCertificate ? activeCertificate.program_name : journeyData?.program?.name}
              </span> 
              selama 
              <span className="text-rose-400 font-bold mx-1">
                {activeCertificate ? activeCertificate.day_count : journeyData?.day_count} Hari
              </span>.
            </p>

            <div className="grid grid-cols-3 gap-8 mb-20 px-20">
               <div>
                  <div className="text-white font-black text-xl">{activeCertificate ? activeCertificate.day_count : journeyData?.day_count}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Total Hari</div>
               </div>
               <div>
                  <div className="text-indigo-400 font-black text-xl">{activeCertificate ? activeCertificate.final_rank : journeyData?.warrior_level?.level_name}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Final Rank</div>
               </div>
               <div>
                  <div className="text-rose-400 font-black text-xl">{activeCertificate ? 500 : (journeyData?.warrior_level?.experience || 0)}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">EXP Point</div>
               </div>
            </div>

            <div className="flex items-center justify-center gap-12">
               <div className="text-center">
                  <div className="w-32 h-[1px] bg-white/10 mb-2" />
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">SahabatMart AI System</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
