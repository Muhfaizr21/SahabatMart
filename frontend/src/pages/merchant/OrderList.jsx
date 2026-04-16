import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';

const MerchantOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState('');
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        loadOrders();
    }, [activeStatus]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await fetchJson(`${MERCHANT_API_BASE}/orders?status=${activeStatus}`);
            setOrders(data || []);
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (groupId, newStatus) => {
        let trackingNumber = '';
        let courierCode = '';

        if (newStatus === 'shipped') {
            trackingNumber = window.prompt('Masukkan Nomor Resi (Tracking Number):');
            if (!trackingNumber) return;
            courierCode = window.prompt('Masukkan Kode Kurir (misal: JNE, J&T):', 'JNE');
            if (!courierCode) return;
        }

        setUpdating(groupId);
        try {
            await fetchJson(`${MERCHANT_API_BASE}/orders/status`, {
                method: 'POST',
                body: JSON.stringify({ group_id: groupId, status: newStatus, tracking_number: trackingNumber, courier_code: courierCode })
            });
            loadOrders();
        } catch (err) {
            alert('Gagal update status: ' + err.message);
        } finally {
            setUpdating(null);
        }
    };

    const statuses = [
        { label: 'All Orders', value: '' },
        { label: 'New', value: 'new' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Processing', value: 'processing' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Completed', value: 'completed' },
    ];

    return (
        <div className="space-y-10 animate-fade-in">
            <header>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Order Management</h2>
                <p className="text-slate-500 font-medium">Track and fulfill your luxury shipments.</p>
            </header>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-100">
                {statuses.map(s => (
                    <button
                        key={s.value}
                        onClick={() => setActiveStatus(s.value)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeStatus === s.value 
                                ? 'bg-white text-violet-700 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            <div className="space-y-6">
                {loading ? (
                    [...Array(3)].map((_, i) => <SkeletonOrder key={i} />)
                ) : orders.length > 0 ? orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-50 overflow-hidden group hover:border-violet-100 transition-all">
                        {/* Order Header */}
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined">receipt_long</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 leading-tight">Order #{order.id.slice(0,8).toUpperCase()}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                        Placed on {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                    {order.status}
                                </div>
                                <div className="h-8 w-[1px] bg-slate-100 hidden md:block"></div>
                                <p className="text-xl font-black text-slate-900">Rp{order.merchant_payout.toLocaleString('id-ID')}</p>
                            </div>
                        </div>

                        {/* Order Content */}
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Items */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Contract Items</p>
                                {order.items?.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 shrink-0">
                                            <img src={item.product_image_url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-slate-900 truncate">{item.product_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{item.variant_name || 'Original Edition'}</p>
                                            <p className="text-xs font-bold text-violet-600 mt-2">Qty: {item.quantity} × Rp{item.unit_price.toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Logistics & Actions */}
                            <div className="space-y-8">
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Logistics Details</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400">Carrier</span>
                                            <span className="text-slate-900 uppercase">{order.courier_code || 'Pending Discovery'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400">Tracking Info</span>
                                            <span className="text-slate-900">{order.tracking_number || 'Awaiting Shipment'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {order.status === 'new' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                                            disabled={updating === order.id}
                                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg"
                                        >
                                            Confirm Order
                                        </button>
                                    )}
                                    {order.status === 'confirmed' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(order.id, 'processing')}
                                            disabled={updating === order.id}
                                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg"
                                        >
                                            Process Item
                                        </button>
                                    )}
                                    {order.status === 'processing' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(order.id, 'shipped')}
                                            disabled={updating === order.id}
                                            className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg"
                                        >
                                            Input Resi & Ship
                                        </button>
                                    )}
                                    {order.status === 'shipped' && (
                                        <p className="text-center w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50 rounded-2xl">Package in Transit</p>
                                    )}
                                    {order.status === 'completed' && (
                                        <p className="text-center w-full py-4 text-emerald-600 font-bold text-xs uppercase tracking-widest bg-emerald-50 rounded-2xl">Transaction Finalized</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-32 text-center bg-white rounded-3xl border border-slate-50">
                        <span className="material-symbols-outlined text-6xl text-slate-100 mb-4 block">package_2</span>
                        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No active orders found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SkeletonOrder = () => (
    <div className="bg-white rounded-3xl h-64 border border-slate-100 animate-pulse">
        <div className="p-8 border-b border-slate-50 flex justify-between">
            <div className="w-1/3 h-10 bg-slate-100 rounded-xl"></div>
            <div className="w-20 h-10 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="p-8 flex gap-10">
            <div className="flex-1 h-32 bg-slate-50 rounded-2xl"></div>
            <div className="flex-1 h-32 bg-slate-50 rounded-2xl"></div>
        </div>
    </div>
);

export default MerchantOrders;
