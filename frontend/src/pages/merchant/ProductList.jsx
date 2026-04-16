import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';

const MerchantProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await fetchJson(`${MERCHANT_API_BASE}/products`);
            setProducts(data || []);
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus produk ini secara permanen?')) return;
        try {
            await fetchJson(`${MERCHANT_API_BASE}/products/delete?id=${id}`, { method: 'DELETE' });
            setProducts(products.filter(p => p.id !== id));
        } catch (err) {
            alert('Gagal menghapus produk: ' + err.message);
        }
    };

    const filteredProducts = products.filter(p => 
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Luxury Inventory</h2>
                    <p className="text-slate-500 font-medium">Manage and curate your high-end collection.</p>
                </div>
                <Link to="/merchant/products/add" className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-slate-200">
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    New Masterpiece
                </Link>
            </header>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-4">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                        type="text" 
                        placeholder="Search by name or category..." 
                        className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="p-3 bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
                    <span className="material-symbols-outlined">tune</span>
                </button>
            </div>

            {/* Products Table/Grid */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/40 border border-slate-50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Product Detail</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Pricing</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Stock</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                            ) : filteredProducts.length > 0 ? filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                                                <img src={formatImage(product.image)} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm">{product.name || 'Unnamed Product'}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SKU: {String(product.id || '').slice(0,8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{product.category || 'General'}</span>
                                    </td>
                                    <td className="px-8 py-5 font-black text-slate-900 text-sm">
                                        Rp{(product.price || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${(product.stock || 0) > 10 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                            <span className="font-bold text-slate-700 text-sm">{product.stock || 0} Units</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-tighter ${
                                            product.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            <span className="w-1 h-1 rounded-full bg-current"></span>
                                            {product.status || 'pending'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/merchant/products/edit/${product.id}`} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm">
                                                <span className="material-symbols-outlined text-xl">edit_square</span>
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-xl">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                            </div>
                                            <p className="text-slate-400 font-bold text-sm">No products found. Start by adding your first luxury item.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-8 py-5"><div className="flex gap-4 items-center"><div className="w-14 h-14 bg-slate-100 rounded-xl"></div><div className="space-y-2"><div className="h-4 w-32 bg-slate-100 rounded"></div><div className="h-3 w-16 bg-slate-50 rounded"></div></div></div></td>
        <td className="px-8 py-5"><div className="h-6 w-20 bg-slate-100 rounded-lg"></div></td>
        <td className="px-8 py-5"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
        <td className="px-8 py-5"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
        <td className="px-8 py-5"><div className="h-6 w-24 bg-slate-100 rounded-xl"></div></td>
        <td className="px-8 py-5"><div className="flex justify-end gap-2"><div className="w-10 h-10 bg-slate-100 rounded-xl"></div><div className="w-10 h-10 bg-slate-100 rounded-xl"></div></div></td>
    </tr>
);

export default MerchantProducts;
