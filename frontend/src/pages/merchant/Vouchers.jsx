import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';

const MerchantVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        code: '', title: '', discount_type: 'fixed', discount_value: 0, min_order: 0, quota: 0, expiry_date: ''
    });

    useEffect(() => {
        loadVouchers();
    }, []);

    const loadVouchers = async () => {
        try {
            const data = await fetchJson(`${MERCHANT_API_BASE}/vouchers`);
            setVouchers(data.data || []);
        } catch (err) {
            console.error('Failed to load vouchers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetchJson(`${MERCHANT_API_BASE}/vouchers/upsert`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            setShowModal(false);
            setFormData({ code: '', title: '', discount_type: 'fixed', discount_value: 0, min_order: 0, quota: 0, expiry_date: '' });
            loadVouchers();
        } catch (err) {
            alert('Failed to save voucher: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this voucher?')) return;
        try {
            await fetchJson(`${MERCHANT_API_BASE}/vouchers/delete?id=${id}`, { method: 'DELETE' });
            loadVouchers();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in relative pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Promotional Assets</h2>
                    <p className="text-slate-500 font-medium">Create exclusive incentives for your patrons.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-slate-200"
                >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Create Voucher
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse"></div>)
                ) : vouchers.length > 0 ? vouchers.map((v) => (
                    <div key={v.id} className="bg-white p-8 rounded-3xl border border-slate-50 shadow-xl shadow-slate-200/40 relative group overflow-hidden transition-all hover:-translate-y-1">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <span className="px-4 py-2 bg-violet-600 text-white rounded-xl text-lg font-black tracking-tighter">{v.code}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setFormData(v); setShowModal(true); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                                        <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                                    </div>
                                </div>
                                <h4 className="font-extrabold text-slate-900 mt-4 line-clamp-1">{v.title}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {v.discount_type === 'percent' ? `${v.discount_value}% OFF` : `Rp${v.discount_value.toLocaleString('id-ID')} OFF`}
                                </p>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Quota Used</p>
                                    <p className="text-sm font-black text-slate-900">{v.used} <span className="text-slate-300">/</span> {v.quota}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Expires</p>
                                    <p className="text-xs font-bold text-slate-500">{new Date(v.expiry_date).toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white rounded-3xl border border-slate-50">
                        <span className="material-symbols-outlined text-6xl text-slate-100 mb-4 block">confirmation_number</span>
                        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No active vouchers found</p>
                    </div>
                )}
            </div>

            {/* Simple Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <form onSubmit={handleSubmit} className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-200">
                        <header>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Configure Incentive</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Design a reward for your loyal customers.</p>
                        </header>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Code</label>
                                <input name="code" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold uppercase" required />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Title</label>
                                <input name="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                <select value={formData.discount_type} onChange={(e) => setFormData({...formData, discount_type: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold">
                                    <option value="fixed">Fixed (IDR)</option>
                                    <option value="percent">Percent (%)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valuation</label>
                                <input type="number" value={formData.discount_value} onChange={(e) => setFormData({...formData, discount_value: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min. Order</label>
                                <input type="number" value={formData.min_order} onChange={(e) => setFormData({...formData, min_order: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocation (Quota)</label>
                                <input type="number" value={formData.quota} onChange={(e) => setFormData({...formData, quota: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" required />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End of Life (Expiry)</label>
                                <input type="date" value={formData.expiry_date ? formData.expiry_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" required />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-all">Cancel</button>
                            <button type="submit" className="flex-1 py-4 bg-slate-900 font-white text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-slate-200">Save Asset</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MerchantVouchers;
