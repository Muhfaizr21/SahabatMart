import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';

const MerchantSettings = () => {
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchJson(`${MERCHANT_API_BASE}/store`)
            .then(data => setStore(data))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setStore({ ...store, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await fetchJson(`${MERCHANT_API_BASE}/store/update`, {
                method: 'POST',
                body: JSON.stringify(store)
            });
            alert('Store profile updated!');
        } catch (err) {
            alert('Update failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 animate-pulse bg-slate-100 rounded-3xl h-96"></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
            <header>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identity & Aesthetics</h2>
                <p className="text-slate-500 font-medium">Customize your digital storefront's brand presence.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-50 space-y-10">
                    {/* Visual Branding */}
                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div className="shrink-0 relative">
                            <div className="w-32 h-32 rounded-3xl bg-slate-50 border-4 border-white shadow-xl overflow-hidden ring-1 ring-slate-100">
                                <img src={formatImage(store?.logo_url) || 'https://via.placeholder.com/200'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <button type="button" className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                            </button>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Logo URL</label>
                                <input name="logo_url" value={store?.logo_url || ''} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hero Banner URL</label>
                                <input name="banner_url" value={store?.banner_url || ''} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner" />
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-50" />

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Establishment Name</label>
                                <input name="store_name" value={store?.store_name || ''} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Slug (URL)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold font-mono">/shop/</span>
                                    <input name="slug" value={store?.slug || ''} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-6 py-4 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-violet-500 transition-all shadow-inner" required />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Manifesto (Description)</label>
                            <textarea name="description" value={store?.description || ''} onChange={handleChange} rows="5" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 transition-all shadow-inner resize-none"></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            disabled={saving}
                            className="bg-slate-900 border border-slate-800 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:bg-violet-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {saving && <span className="material-symbols-outlined animate-spin text-lg">refresh</span>}
                            Commit Changes
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default MerchantSettings;
