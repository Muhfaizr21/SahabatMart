import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';

const MerchantAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJson(`${MERCHANT_API_BASE}/affiliate-stats`)
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 animate-pulse bg-slate-100 rounded-3xl h-96"></div>;

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <header>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Performance Analytics</h2>
                <p className="text-slate-500 font-medium">Deep insights into your shop's growth and affiliate conversions.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCard label="Affiliate Attribution" value={`${stats?.affiliate_orders || 0} Orders`} sub="Conversions driven by partners" />
                <MetricCard label="Network Commission" value={`Rp${(stats?.affiliate_commissions || 0).toLocaleString('id-ID')}`} sub="Total payout to your affiliates" />
                <MetricCard label="Partner Revenue" value={`Rp${(stats?.affiliate_sales || 0).toLocaleString('id-ID')}`} sub="Gross sales from referral traffic" highlight />
            </div>

            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-200/40">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Sales Trajectory</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daily interaction and conversion volume</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-400">Export PDF</button>
                    </div>
                </div>
                
                {/* Visual Placeholder for a real chart */}
                <div className="h-80 w-full flex items-end justify-between gap-4">
                    {[30, 45, 25, 60, 80, 50, 40, 70, 90, 65, 55, 75].map((h, i) => (
                        <div key={i} className="flex-1 bg-slate-50 rounded-t-2xl relative group cursor-pointer transition-all hover:bg-slate-100" style={{ height: `${h}%` }}>
                            <div className={`absolute bottom-0 w-full rounded-t-2xl transition-all duration-700 ${i === 8 ? 'h-full bg-violet-600' : 'h-0 group-hover:h-full bg-indigo-100'}`}></div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-6 px-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, sub, highlight }) => (
    <div className={`p-8 rounded-3xl border border-slate-50 shadow-lg transition-all hover:-translate-y-1 ${highlight ? 'bg-slate-900 text-white shadow-indigo-100' : 'bg-white text-slate-900 shadow-slate-200/40'}`}>
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 ${highlight ? 'text-white/40' : 'text-slate-400'}`}>{label}</p>
        <h4 className="text-3xl font-black tracking-tighter mb-2">{value}</h4>
        <p className={`text-[10px] font-medium ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{sub}</p>
    </div>
);

export default MerchantAnalytics;
