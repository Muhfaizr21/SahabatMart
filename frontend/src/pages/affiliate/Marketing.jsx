import { useState } from 'react';

const assets = [
  { id: 1, title: 'Banner Promo AkuGrow #1', type: 'Image', url: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1000' },
  { id: 2, title: 'AkuGrow Story Pack 1080p', type: 'Video/Mp4', url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1000' },
  { id: 3, title: 'Logo AkuGrow Vector', type: 'PDF/PNG', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=1000' },
];

export default function MarketingMaterials() {
  const [copied, setCopied] = useState(null);

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl">📸</div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight italic tracking-tighter">Materi Promosi AkuGrow</h2>
          <p className="text-gray-500 font-medium mt-1">Gunakan aset profesional untuk meningkatkan konversi iklanmu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {assets.map(asset => (
          <div key={asset.id} className="group border border-gray-100 rounded-[2rem] overflow-hidden bg-gray-50 hover:shadow-2xl hover:shadow-purple-200/50 transition-all duration-500">
            <div className="aspect-square relative overflow-hidden">
               <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-purple-600 border border-purple-100">
                  {asset.type}
               </div>
            </div>
            <div className="p-6">
              <h4 className="font-bold text-gray-900 text-sm mb-4 line-clamp-1">{asset.title}</h4>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleCopy(asset.url, asset.id)}
                  className={`py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    copied === asset.id ? 'bg-green-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {copied === asset.id ? 'Copied! ✅' : 'Copy Link 🔗'}
                </button>
                <a 
                  href={asset.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-purple-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center shadow-lg shadow-purple-200"
                >
                  Download ⬇️
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
