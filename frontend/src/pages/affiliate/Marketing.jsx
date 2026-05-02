import { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

export default function MarketingMaterials() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMaterials = useCallback(async (p) => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/promo-materials?page=${p}&limit=12`);
      setAssets(res.data || []);
      setTotalPages(res.total_pages || 1);
      setPage(res.page || p);
    } catch (err) {
      console.error("Gagal memuat materi promo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials(1);

    // Load affiliate profile for ref_code
    fetchJson(`${AFFILIATE_API_BASE}/profile`)
      .then(res => setAffiliate(res))
      .catch(err => console.error("Gagal memuat profile affiliate", err));
  }, [fetchMaterials]);

  const handlePageChange = (p) => {
    fetchMaterials(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyCode = (asset) => {
    const refCode = affiliate?.affiliate?.ref_code || 'AG-PROMO';
    const promoLink = `${window.location.origin}?ref=${refCode}`;
    
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
        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/20">📸</div>
        <div>
          <h2 className="text-2xl font-black text-white leading-tight italic tracking-tighter">Materi Promosi AkuGrow</h2>
          <p className="text-slate-400 text-xs font-medium mt-1">Aset profesional untuk konversi tinggi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
        {assets.map(asset => (
          <div key={asset.id} className="group border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/50 backdrop-blur-xl hover:border-purple-500/50 transition-all duration-500 flex flex-col hover:shadow-xl">
            <div className={`aspect-[4/5] relative overflow-hidden ${asset.type === 'copywriting' ? 'bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6' : 'bg-slate-800'}`}>
               {asset.type === 'copywriting' ? (
                 <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-2xl text-purple-400">content_paste</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-medium italic leading-relaxed line-clamp-4">" {asset.caption} "</p>
                 </div>
               ) : (
                 <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
               )}
               
               <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-purple-400 border border-purple-500/30">
                  {asset.type}
               </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="font-bold text-white text-sm mb-1 tracking-tight line-clamp-1">{asset.title}</h4>
                {asset.type === 'copywriting' && (
                  <p className="text-slate-500 text-[10px] line-clamp-1 leading-relaxed">{asset.caption}</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                 <button 
                  onClick={() => handleCopyCode(asset)}
                  className={`w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                    copied === asset.id ? 'bg-green-500 text-white' : 'bg-white text-slate-900 hover:bg-purple-100'
                  }`}
                >
                  {copied === asset.id ? 'Copied! ✅' : 'Copy Link & Text'}
                </button>
                
                {asset.type === 'copywriting' ? (
                  <button 
                    onClick={() => setSelectedAsset(asset)}
                    className="w-full bg-slate-800 text-slate-300 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest text-center hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    Lihat Full Teks
                  </button>
                ) : (
                  <a 
                    href={asset.file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full bg-slate-800 text-slate-300 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest text-center hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    Download ⬇️
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-12 relative z-10">
          <button 
            onClick={() => handlePageChange(page - 1)} 
            disabled={page === 1}
            className={`p-2.5 rounded-xl border border-slate-800 text-white transition-all ${page === 1 ? 'opacity-20 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          
          <div className="flex gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`w-9 h-9 rounded-xl font-black text-xs transition-all ${page === i + 1 ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => handlePageChange(page + 1)} 
            disabled={page === totalPages}
            className={`p-2.5 rounded-xl border border-slate-800 text-white transition-all ${page === totalPages ? 'opacity-20 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      )}

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
