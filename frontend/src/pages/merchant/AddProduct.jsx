import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, formatImage, PUBLIC_API_BASE } from '../../lib/api';

const AddEditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        price: 0,
        stock: 0,
        category: '',
        brand: '',
        image: '',
        status: 'active'
    });

    const [variants, setVariants] = useState([]);

    useEffect(() => {
        // Load Support Data
        fetchJson(`${PUBLIC_API_BASE}/categories`).then(res => setCategories(res.data || [])).catch(() => {});
        fetchJson(`${PUBLIC_API_BASE}/brands`).then(res => setBrands(res.data || [])).catch(() => {});

        if (isEdit) {
            setLoading(true);
            loadProductData();
        }
    }, [id]);

    const loadProductData = async () => {
        try {
            const data = await fetchJson(`${MERCHANT_API_BASE}/products`);
            const product = data.find(p => p.id === id);
            if (product) {
                setFormData(product);
                setVariants(product.variants || []);
            }
        } catch (err) {
            console.error('Failed to load product:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'price' || name === 'stock' ? Number(value) : value,
            slug: name === 'name' ? value.toLowerCase().replace(/ /g, '-') : prev.slug
        }));
    };

    const addVariant = () => {
        setVariants([...variants, { id: Date.now().toString(), name: '', sku: '', price: formData.price, stock: 0 }]);
    };

    const handleVariantChange = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = field === 'price' || field === 'stock' ? Number(value) : value;
        setVariants(newVariants);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isEdit ? `${MERCHANT_API_BASE}/products/update` : `${MERCHANT_API_BASE}/products/add`;
            await fetchJson(endpoint, {
                method: 'POST',
                body: JSON.stringify({ product: formData, variants })
            });
            alert(isEdit ? 'Product updated successfully!' : 'Product added successfully! Waiting for admin review.');
            navigate('/merchant/products');
        } catch (err) {
            alert('Operation failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {isEdit ? 'Refine Masterpiece' : 'Create New Asset'}
                    </h2>
                    <p className="text-slate-500 font-medium">Define your luxury product's core identity.</p>
                </div>
                <button 
                  onClick={() => navigate('/merchant/products')}
                  className="px-6 py-3 bg-white border border-slate-100 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all shadow-sm"
                >
                  Discard Changes
                </button>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-10">
                {/* Left Column: Essential Info */}
                <div className="col-span-12 lg:col-span-7 space-y-8">
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-50 space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Product Title</label>
                            <input 
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="Enter a descriptive title..." 
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Category</label>
                                <select 
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Brand</label>
                                <select 
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all shadow-inner appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">Select Brand</option>
                                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Description</label>
                            <textarea 
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="6" 
                                placeholder="Tell the story behind this product..." 
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 transition-all shadow-inner resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Variant Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-50 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">Product Variants</h3>
                            <button 
                                type="button"
                                onClick={addVariant}
                                className="flex items-center gap-2 text-violet-700 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                            >
                                <span className="material-symbols-outlined text-base">add</span>
                                Add Variation
                            </button>
                        </div>

                        <div className="space-y-4">
                            {variants.map((variant, idx) => (
                                <div key={variant.id || idx} className="grid grid-cols-12 gap-4 p-5 bg-slate-50 rounded-2xl group border border-transparent hover:border-violet-100 transition-all">
                                    <div className="col-span-4">
                                        <input 
                                            placeholder="Name (e.g. Red, XL)" 
                                            value={variant.name}
                                            onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                                            className="w-full bg-white border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            placeholder="Price" 
                                            type="number"
                                            value={variant.price}
                                            onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                                            className="w-full bg-white border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            placeholder="Stock" 
                                            type="number"
                                            value={variant.stock}
                                            onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                                            className="w-full bg-white border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <button 
                                            type="button"
                                            onClick={() => removeVariant(idx)}
                                            className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {variants.length === 0 && (
                                <p className="text-center py-6 text-slate-400 font-bold text-xs">No variations currently defined.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Visuals & Pricing */}
                <div className="col-span-12 lg:col-span-5 space-y-8">
                    {/* Media Upload (Simulated for this demo) */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-50 space-y-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1 text-center">Main Asset Visualization</label>
                        <div className="aspect-square rounded-3xl bg-slate-50 border-4 border-dashed border-slate-100 relative group overflow-hidden">
                            {formData.image ? (
                                <img src={formatImage(formData.image)} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-5xl">add_photo_alternate</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Select Image</p>
                                </div>
                            )}
                            <input 
                                type="text"
                                name="image"
                                value={formData.image}
                                onChange={handleInputChange}
                                placeholder="Enter Image URL"
                                className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur border-none rounded-xl px-4 py-2 text-[10px] font-black focus:ring-0 shadow-lg"
                            />
                        </div>
                        <p className="text-[10px] text-center text-slate-400 font-medium">Supported formats: JPG, PNG, WEBP. Max size: 2MB.</p>
                    </div>

                    {/* Pricing Card */}
                    <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl shadow-indigo-200/50 text-white space-y-8 relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block ml-1">Base Valuation (Rp)</label>
                                <input 
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    type="number" 
                                    className="w-full bg-white/10 border-none rounded-2xl px-6 py-4 text-2xl font-black focus:ring-2 focus:ring-violet-400 transition-all placeholder:text-white/20"
                                    required
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block ml-1">Starting Stock Units</label>
                                <input 
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleInputChange}
                                    type="number" 
                                    className="w-full bg-white/10 border-none rounded-2xl px-6 py-4 text-xl font-bold focus:ring-2 focus:ring-violet-400 transition-all placeholder:text-white/20"
                                    required
                                />
                            </div>
                        </div>
                        
                        <button 
                            disabled={loading}
                            className="w-full relative z-10 py-5 bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading && <span className="material-symbols-outlined animate-spin">refresh</span>}
                            {isEdit ? 'Finalize Updates' : 'Publish Masterpiece'}
                        </button>

                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddEditProduct;
