import { useState, useEffect } from 'react';
import { fetchJson } from '../../lib/api';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson('/api/affiliate/events').then(res => {
      setEvents(res);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-6 italic tracking-tight">Event Terdekat Akuglow</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-100 p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">
                {event.type}
              </div>
              
              <div className="mb-4">
                <span className="material-symbols-outlined text-3xl text-blue-500 mb-2">calendar_month</span>
                <div className="text-xl font-bold text-gray-900 mb-1">{event.title}</div>
                <div className="text-sm font-bold text-gray-500 italic">
                  {new Date(event.date).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              {event.type === 'Online' ? (
                <a href={event.url} target="_blank" rel="noreferrer" className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-center block shadow-lg shadow-blue-200">
                  Join Webinar <i className='bx bx-video ml-1'></i>
                </a>
              ) : (
                <div className="flex items-center gap-2 text-gray-600 font-bold text-xs uppercase tracking-widest">
                  <i className='bx bxs-map text-red-500'></i> {event.location}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
