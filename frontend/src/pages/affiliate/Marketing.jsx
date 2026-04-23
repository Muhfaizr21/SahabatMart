import { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

export default function MarketingMaterials() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const [affiliate, setAffiliate] = useState(null);

  useEffect(() => {
    // Load materials
    fetchJson(`${AFFILIATE_API_BASE}/promo-materials`)
      .then(res => {
        setAssets(res || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal memuat materi promo", err);
        setLoading(false);
      });

    // Load affiliate profile for ref_code
    fetchJson(`${AFFILIATE_API_BASE}/profile`)
      .then(res => setAffiliate(res))
      .catch(err => console.error("Gagal memuat profile affiliate", err));
  }, []);

  const handleCopyCode = (asset) => {
    const refCode = affiliate?.affiliate?.ref_code || 'AG-PROMO';
    const promoLink = `${window.location.origin}?ref=${refCode}`;
    
    // Include caption if available
    const textToCopy = asset.caption 
      ? `${asset.caption}\n\nLink: ${promoLink}`
      : promoLink;

    navigator.clipboard.writeText(textToCopy);
    setCopied(asset.id);
    toast.success('Link & Caption disalin!');
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="bg-[#0f172a] p-4 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
      
      <div className="flex items-center gap-6 mb-12 relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-purple-500/20">📸</div>
        <div>
          <h2 className="text-3xl font-black text-white leading-tight italic tracking-tighter">Materi Promosi AkuGrow</h2>
          <p className="text-slate-400 font-medium mt-1">Gunakan aset profesional untuk meningkatkan konversi iklanmu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
        {assets.map(asset => (
          <div key={asset.id} className="group border border-slate-800 rounded-[2.5rem] overflow-hidden bg-slate-900/50 backdrop-blur-xl hover:border-purple-500/50 transition-all duration-500 flex flex-col hover:shadow-2xl hover:shadow-purple-500/10">
            <div className={`aspect-square relative overflow-hidden ${asset.type === 'copywriting' ? 'bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-10' : 'bg-slate-800'}`}>
               {asset.type === 'copywriting' ? (
                 <div className="text-center">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <span className="material-symbols-outlined text-4xl text-purple-400">content_paste</span>
                    </div>
                    <p className="text-slate-400 text-xs font-medium italic leading-relaxed">" {asset.caption?.substring(0, 120)}... "</p>
                 </div>
               ) : (
                 <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
               )}
               
               <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-purple-400 border border-purple-500/30">
                  {asset.type}
               </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-lg mb-3 tracking-tight">{asset.title}</h4>
                {asset.type === 'copywriting' && (
                  <p className="text-slate-500 text-xs line-clamp-2 mb-6 leading-relaxed">{asset.caption}</p>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={() => handleCopyCode(asset)}
                  className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                    copied === asset.id ? 'bg-green-500 text-white' : 'bg-white text-slate-900 hover:bg-purple-100 shadow-xl shadow-white/5'
                  }`}
                >
                  {copied === asset.id ? 'Copied! ✅' : (
                    <span className="flex items-center justify-center gap-2">
                       Copy Link & Text <span className="material-symbols-outlined text-sm">content_copy</span>
                    </span>
                  )}
                </button>
                
                {asset.type === 'copywriting' ? (
                  <button 
                    onClick={() => setSelectedAsset(asset)}
                    className="w-full bg-slate-800 text-slate-300 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-center hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    Lihat Full Teks
                  </button>
                ) : (
                  <a 
                    href={asset.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full bg-slate-800 text-slate-300 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-center hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    Download Asset ⬇️
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Modal for Full Text */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedAsset(null)}></div>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined">content_paste</span>
                   </div>
                   <h3 className="text-white font-bold text-lg">{selectedAsset.title}</h3>
                </div>
                <button onClick={() => setSelectedAsset(null)} className="text-slate-500 hover:text-white transition-colors">
                   <span className="material-symbols-outlined">close</span>
                </button>
             </div>
             
             <div className="p-8 max-h-[60vh] overflow-y-auto">
                <pre className="text-slate-300 font-medium whitespace-pre-wrap leading-relaxed text-sm font-sans">
                   {selectedAsset.caption}
                </pre>
             </div>

             <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-4">
                <button 
                  onClick={() => {
                    handleCopyCode(selectedAsset);
                    setSelectedAsset(null);
                  }}
                  className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center justify-center gap-2"
                >
                  Copy & Close <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="px-8 bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700"
                >
                  Tutup
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
