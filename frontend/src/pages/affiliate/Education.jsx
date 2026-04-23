import { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

const EducationModal = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col lg:flex-row">
          {/* Media Section */}
          <div className="lg:w-3/5 bg-black flex items-center justify-center aspect-video lg:aspect-auto min-h-[300px]">
             {item.video_url ? (
               <iframe 
                 src={item.video_url.replace('watch?v=', 'embed/')}
                 className="w-full h-full border-none"
                 allowFullScreen
               />
             ) : item.image_url ? (
               <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
             ) : (
               <div className="text-slate-700 flex flex-col items-center">
                  <span className="material-symbols-outlined text-6xl">school</span>
                  <p className="text-xs font-bold uppercase tracking-wider mt-2">Preview Tidak Tersedia</p>
               </div>
             )}
          </div>

          {/* Content Section */}
          <div className="lg:w-2/5 p-8 flex flex-col">
            <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full uppercase tracking-widest w-fit mb-4">
              {item.category || 'Materi'}
            </span>
            <h2 className="text-2xl font-black text-white mb-4 leading-tight">{item.title}</h2>
            <div className="flex-1 overflow-y-auto max-h-[200px] text-slate-400 text-sm leading-relaxed mb-6 scrollbar-hide">
              {item.content}
            </div>
            
            <div className="space-y-3">
              {item.video_url && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
                   <span className="material-symbols-outlined text-purple-400">play_circle</span>
                   Materi Video Tersedia
                </div>
              )}
              {item.file_url ? (
                 <a 
                   href={item.file_url} 
                   target="_blank" 
                   rel="noreferrer"
                   className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 transition-all"
                 >
                   <span className="material-symbols-outlined">description</span>
                   Download PDF Panduan
                 </a>
              ) : (
                 <button 
                   disabled
                   className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-slate-500 font-bold text-sm cursor-not-allowed"
                 >
                   <span className="material-symbols-outlined">file_download_off</span>
                   PDF Tidak Tersedia
                 </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EducationItem = ({ item, onClick }) => {
  const getIcon = (cat) => {
    switch(cat?.toLowerCase()) {
      case 'marketing': return 'campaign';
      case 'product': return 'inventory_2';
      case 'sales': return 'payments';
      default: return 'school';
    }
  };

  return (
    <div 
      onClick={() => onClick(item)}
      className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl hover:border-purple-500/50 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-2xl">{getIcon(item.category)}</span>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-bold text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md uppercase tracking-wider mb-1">
             {item.category || 'Materi'}
           </span>
           {item.video_url && (
             <span className="material-symbols-outlined text-xs text-red-500">videocam</span>
           )}
        </div>
      </div>
      <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-300 transition-colors uppercase tracking-tight">{item.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{item.content}</p>
      <div className="mt-6 flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
        {item.video_url ? 'Tonton Video' : 'Mulai Belajar'}
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </div>
    </div>
  );
};

export default function BusinessEducation() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchJson(`${AFFILIATE_API_BASE}/educations`)
      .then(res => {
        setCourses(res || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal memuat edukasi", err);
        setLoading(false);
      });
  }, []);

  // Hitung jumlah tipe materi secara dinamis
  const videoCount = courses.filter(c => c.video_url).length;
  const pdfCount = courses.filter(c => c.file_url).length;

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-10">
      <EducationModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-indigo-200 text-xs font-bold uppercase tracking-widest mb-6 border border-white/5">
            <span className="material-symbols-outlined text-sm">school</span>
            AkuGrow Academy
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            Level Up Bisnis Anda <br/> di <span className="text-purple-300">AkuGrow</span>
          </h1>
          <p className="text-indigo-100/70 text-lg mb-8 leading-relaxed">
            Pusat edukasi lengkap untuk para Mitra. Pelajari rahasia sukses membangun jaringan distribusi dan affiliate dari nol hingga profesional.
          </p>
          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-bold border border-white/5">
                <span className="text-purple-400">{videoCount}</span> Materi Video
             </div>
             <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-bold border border-white/5">
                <span className="text-purple-400">{pdfCount}</span> PDF Panduan
             </div>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-20 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">school</span>
          <h3 className="text-xl font-bold text-slate-400">Belum Ada Materi</h3>
          <p className="text-slate-500 text-sm">Nantikan update materi terbaru dari tim AkuGrow.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <EducationItem key={i} item={course} onClick={setSelectedItem} />
          ))}
        </div>
      )}

      {/* Webinar/Event Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
           <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-widest mb-2">
              <span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              Live Webinar
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Kick-Off Meeting AkuGrow 2026</h2>
           <p className="text-slate-400 text-sm">Besok, pukul 19:30 WIB • Via Zoom (Link di Mitra Area)</p>
        </div>
        <button className="bg-white text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-purple-100 transition-colors">
          Ingatkan Saya
        </button>
      </div>
    </div>
  );
}
