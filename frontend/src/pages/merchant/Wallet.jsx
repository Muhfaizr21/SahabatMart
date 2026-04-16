import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';

const MerchantWallet = () => {
    const [wallet, setWallet] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawData, setWithdrawData] = useState({ amount: '', note: '' });
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        loadFinanceData();
    }, []);

    const loadFinanceData = async () => {
        try {
            const [walletData, historyData] = await Promise.all([
                fetchJson(`${MERCHANT_API_BASE}/wallet`),
                fetchJson(`${MERCHANT_API_BASE}/wallet/history`)
            ]);
            setWallet(walletData);
            setHistory(historyData || []);
        } catch (err) {
            console.error('Failed to load finance data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (Number(withdrawData.amount) > wallet.available_balance) {
            alert('Insufficient balance.');
            return;
        }
        setRequesting(true);
        try {
            await fetchJson(`${MERCHANT_API_BASE}/wallet/withdraw`, {
                method: 'POST',
                body: JSON.stringify({ amount: Number(withdrawData.amount), note: withdrawData.note })
            });
            alert('Withdrawal request submitted!');
            setWithdrawData({ amount: '', note: '' });
            loadFinanceData();
        } catch (err) {
            alert('Withdrawal failed: ' + err.message);
        } finally {
            setRequesting(false);
        }
    };

    if (loading) return <div className="animate-pulse space-y-10">
        <div className="h-40 bg-slate-100 rounded-3xl"></div>
        <div className="h-64 bg-slate-100 rounded-3xl"></div>
    </div>;

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <header>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Wallet</h2>
                <p className="text-slate-500 font-medium">Control your revenue streams and cash-outs.</p>
            </header>

            <div className="grid grid-cols-12 gap-10">
                {/* Balance Cards */}
                <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 p-10 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Available for Payout</p>
                            <h3 className="text-4xl font-black tracking-tighter">Rp{wallet.available_balance.toLocaleString('id-ID')}</h3>
                            <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Verified Liquidity</span>
                                </div>
                                <span className="material-symbols-outlined text-white/20 text-3xl">account_balance_wallet</span>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    </div>

                    <div className="bg-white p-10 rounded-3xl border border-slate-50 shadow-xl shadow-slate-200/40 relative group overflow-hidden transition-all hover:-translate-y-1">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Pending Escrow</p>
                            <h3 className="text-4xl font-black tracking-tighter text-slate-900">Rp{wallet.pending_balance.toLocaleString('id-ID')}</h3>
                            <p className="text-xs font-medium text-slate-500 mt-6 leading-relaxed">Funds held securely in platform escrow until order completion.</p>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    </div>
                </div>

                {/* Withdrawal Form */}
                <div className="col-span-12 lg:col-span-4 lg:row-span-2">
                    <form onSubmit={handleWithdraw} className="bg-white p-10 rounded-3xl border border-slate-50 shadow-2xl shadow-slate-200/60 sticky top-28 space-y-8">
                        <div>
                            <h4 className="font-black text-slate-900 text-lg tracking-tight mb-2">Quick Payout</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Request transfer to your registered business bank account.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (IDR)</label>
                                <input 
                                    type="number"
                                    placeholder="Enter amount..."
                                    value={withdrawData.amount}
                                    onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner"
                                    required
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Note (Optional)</label>
                                <textarea 
                                    placeholder="Add a remark..."
                                    value={withdrawData.note}
                                    onChange={(e) => setWithdrawData({ ...withdrawData, note: e.target.value })}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 transition-all shadow-inner resize-none h-24"
                                ></textarea>
                            </div>
                        </div>

                        <button 
                            disabled={requesting || !withdrawData.amount || Number(withdrawData.amount) <= 0}
                            className="w-full py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {requesting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Process Payout'}
                        </button>
                    </form>
                </div>

                {/* Payout History */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="bg-white rounded-3xl border border-slate-50 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h4 className="font-black text-slate-900 tracking-tight">Transaction History</h4>
                            <span className="material-symbols-outlined text-slate-300">history</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/30">
                                    <tr>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reference</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.length > 0 ? history.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-10 py-5">
                                                <p className="text-xs font-bold text-slate-900">{new Date(item.requested_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(item.requested_at).toLocaleTimeString('id-ID')}</p>
                                            </td>
                                            <td className="px-10 py-5 font-black text-slate-900 text-sm">
                                                - Rp{item.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-10 py-5 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    item.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                    item.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-5 text-right font-black text-slate-300 text-[10px] uppercase tracking-tighter">
                                                #{item.id.slice(0,8).toUpperCase()}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-10 py-20 text-center">
                                                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No payout records found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MerchantWallet;
