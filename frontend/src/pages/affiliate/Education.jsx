import React from 'react';

const EducationItem = ({ title, description, icon, duration }) => (
  <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl hover:border-purple-500/50 transition-all group cursor-pointer">
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md uppercase tracking-wider">
        {duration}
      </span>
    </div>
    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-300 transition-colors">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    <div className="mt-6 flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
      Mulai Belajar
      <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </div>
  </div>
);

export default function BusinessEducation() {
  const courses = [
    {
      title: 'Cara Kerja Bisnis AkuGrow',
      description: 'Pelajari konsep hybrid marketplace dan bagaimana sistem komisi kami bekerja untuk Anda.',
      icon: 'architecture',
      duration: '10 Menit'
    },
    {
      title: 'Strategi Promosi Digital',
      description: 'Tingkatkan jangkauan affiliate Anda dengan teknik promosi di Social Media dan materi konten.',
      icon: 'campaign',
      duration: '15 Menit'
    },
    {
      title: 'Optimalisasi Komisi',
      description: 'Tips dan trik mendapatkan penghasilan maksimal dari setiap transaksi dan tim Anda.',
      icon: 'payments',
      duration: '12 Menit'
    },
    {
      title: 'Membangun Tim Solid',
      description: 'Panduan merekrut mitra baru dan mengelola jaringan untuk passive income jangka panjang.',
      icon: 'group_add',
      duration: '20 Menit'
    },
    {
      title: 'Karir & Jenjang Pro',
      description: 'Langkah demi langkah menjadi Merchant Leader dan mendapatkan jatah distribusi nasional.',
      icon: 'trending_up',
      duration: '8 Menit'
    },
    {
      title: 'Public Speaking & Closing',
      description: 'Teknik berkomunikasi dan mempresentasikan AkuGrow agar calon mitra langsung bergabung.',
      icon: 'record_voice_over',
      duration: '25 Menit'
    }
  ];

  return (
    <div className="space-y-10">
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
                <span className="text-purple-400">12</span> Materi Video
             </div>
             <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-bold border border-white/5">
                <span className="text-purple-400">8</span> PDF Panduan
             </div>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, i) => (
          <EducationItem key={i} {...course} />
        ))}
      </div>

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
