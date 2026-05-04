import { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = useCallback(async (p) => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/events?page=${p}&limit=6`);
      setEvents(res.data || []);
      setTotalPages(res.total_pages || 1);
      setPage(res.page || p);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  const handlePageChange = (p) => {
    fetchEvents(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">error</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Gagal memuat event</h3>
        <p className="text-gray-500 max-w-xs mx-auto">{error}</p>
      </div>
      <button 
        onClick={() => fetchEvents(1)}
        className="px-6 py-2 bg-blue-600 text-white rounded-2xl font-bold text-sm"
      >
        Coba Lagi
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/40 backdrop-blur-md p-8 rounded-3xl shadow-xl shadow-black/20 border border-white/5">
        <h2 className="text-2xl font-black text-white mb-6 italic tracking-tight">Event Terdekat AkuGlow</h2>
        
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">event_busy</span>
            <h3 className="text-xl font-bold text-slate-400">Belum Ada Event</h3>
            <p className="text-slate-500 text-sm">Cek kembali nanti untuk jadwal webinar dan kopdar terbaru.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, idx) => (
                <div key={idx} className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-between">
                  <div>
                    <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
                      {event.type}
                    </div>
                    
                    <div className="mb-4">
                      <span className="material-symbols-outlined text-3xl text-indigo-500 mb-2">calendar_month</span>
                      <div className="text-lg font-bold text-white mb-1 line-clamp-2">{event.title}</div>
                      <div className="text-[11px] font-bold text-slate-400 italic">
                        {new Date(event.start_time).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    {event.type.toLowerCase() === 'online' ? (
                      <a href={event.location} target="_blank" rel="noreferrer" className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-center block shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors">
                        Join Webinar <i className='bx bx-video ml-1'></i>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-800/30 p-3 rounded-xl border border-white/5">
                        <i className='bx bxs-map text-rose-500'></i> {event.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <button 
                  onClick={() => handlePageChange(page - 1)} 
                  disabled={page === 1}
                  className={`p-3 rounded-xl border border-white/5 text-white transition-all ${page === 1 ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => handlePageChange(page + 1)} 
                  disabled={page === totalPages}
                  className={`p-3 rounded-xl border border-white/5 text-white transition-all ${page === totalPages ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
