import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';
import { isAuthenticated } from '../lib/auth';
import { ShoppingBag } from 'lucide-react';
import ReviewSection from '../components/ReviewSection';
import RecommendedSection from '../components/RecommendedSection';
import SEO from '../components/SEO';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.floor(rating || 0) ? '#facc15' : '#e5e7eb'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

const tabs = ['Deskripsi', 'Informasi Tambahan', 'Ulasan'];

// ── Markdown → HTML Renderer ─────────────────
function renderMarkdown(md) {
  if (!md) return '';
  const isHtml = /<[a-z][\s\S]*>/i.test(md);
  const rawHtml = isHtml ? md : marked.parse(md, { breaks: true, async: false });
  return DOMPurify.sanitize(rawHtml, { 
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b', 'i', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt']
  });
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('Deskripsi');
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({}); // Track user selections
  const [merchantPage, setMerchantPage] = useState(1);
  const [isDigital, setIsDigital] = useState(false);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Render price range or active variant price (WooCommerce style)
  const renderPrice = () => {
    const isWholesale = user?.role === 'mitra' || user?.role === 'merchant';
    
    // Variable Product
    if (product.variants && product.variants.length > 0) {
      if (selectedVariant) {
        const price = (isWholesale && selectedVariant.wholesale_price > 0) 
          ? selectedVariant.wholesale_price 
          : selectedVariant.price;
        const oldPrice = selectedVariant.old_price > 0 ? selectedVariant.old_price : 0;
        
        return (
          <div className="flex items-baseline gap-4 mb-2">
            <div className="text-4xl sm:text-5xl font-black text-blue-600">
              Rp{price.toLocaleString('id-ID')}
            </div>
            {isWholesale && selectedVariant.wholesale_price > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">Harga Mitra</span>
            )}
            {oldPrice > 0 && !isWholesale && (
              <div className="text-lg sm:text-xl text-gray-300 line-through font-bold">
                 Rp{oldPrice.toLocaleString('id-ID')}
              </div>
            )}
          </div>
        );
      } else {
        // Range
        const prices = product.variants.map(v => {
          return (isWholesale && v.wholesale_price > 0) ? v.wholesale_price : v.price;
        }).filter(Boolean);
        
        if (prices.length > 0) {
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          return (
            <div className="flex items-baseline gap-4 mb-2">
              <div className="text-3xl sm:text-4xl font-black text-blue-600">
                {minPrice === maxPrice 
                  ? `Rp${minPrice.toLocaleString('id-ID')}` 
                  : `Rp${minPrice.toLocaleString('id-ID')} - Rp${maxPrice.toLocaleString('id-ID')}`}
              </div>
              {isWholesale && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">Range Harga Mitra</span>
              )}
            </div>
          );
        }
      }
    }

    // Simple / Digital Product fallback
    const price = (isWholesale && product.wholesale_price > 0) 
      ? product.wholesale_price 
      : product.price || 0;
    const oldPrice = product.old_price > 0 ? product.old_price : 0;
    
    return (
      <div className="flex items-baseline gap-4 mb-2">
        <div className="text-4xl sm:text-5xl font-black text-blue-600">
          Rp{price.toLocaleString('id-ID')}
        </div>
        {isWholesale && product.wholesale_price > 0 && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">Harga Mitra</span>
        )}
        {oldPrice > 0 && !isWholesale && (
          <div className="text-lg sm:text-xl text-gray-300 line-through font-bold">
             Rp{oldPrice.toLocaleString('id-ID')}
          </div>
        )}
      </div>
    );
  };

  // Helper function to check if a specific attribute option is valid given current selections
  const isOptionAvailable = (attrKey, attrValue) => {
    if (!product?.variants || product.variants.length === 0) return true;
    
    // Mock the selection as if this option was chosen
    const mockSelection = { ...selectedAttributes, [attrKey]: attrValue };
    
    // Check if ANY variant exists that satisfies ALL these selections
    return product.variants.some(v => {
      const vNameLower = v.name.toLowerCase();
      return Object.keys(mockSelection).every(k => {
        const val = mockSelection[k];
        return !val || vNameLower.includes(val.toLowerCase());
      });
    });
  };

  // Auto-match selected attributes to active variant (WooCommerce style)
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      let keys = [];
      try {
        const parsed = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
        keys = Object.keys(parsed || {});
      } catch (e) {
        keys = Object.keys(selectedAttributes);
      }

      // Check if we have values for all keys
      if (keys.length === 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        const allSelected = keys.every(k => selectedAttributes[k]);
        if (allSelected) {
          const targetName = keys.map(k => selectedAttributes[k]).join(', ');
          let found = product.variants.find(v => v.name.toLowerCase() === targetName.toLowerCase());
          
          if (!found) {
            found = product.variants.find(v => {
              const vNameLower = v.name.toLowerCase();
              return Object.values(selectedAttributes).every(val => 
                val && vNameLower.includes(val.toLowerCase())
              );
            });
          }
          
          if (found) {
            setSelectedVariant(found);
            if (found.image) {
              setSelectedImage(found.image);
            }
          } else {
            setSelectedVariant(null);
          }
        } else {
          setSelectedVariant(null);
        }
      }
    }
  }, [selectedAttributes, product]);

  // ── AFFILIATE TRACKING SYNC ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && id) {
      fetchJson(`${PUBLIC_API_BASE}/affiliate/track?ref=${ref}&product_id=${id}`)
        .then(res => {
          if (res && res.affiliate_id) {
            localStorage.setItem('affiliate_id', res.affiliate_id);
            console.log('Affiliate tracked:', res.affiliate_id);
          }
        })
        .catch(err => console.error('Tracking failed:', err));
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      try {
        const d = await fetchJson(`${PUBLIC_API_BASE}/products/detail?id=${id}`);
        // Because fetchJson in lib/api.js already unwraps the "data" layer:
        // d is now { product: {...}, sellers: [...], is_digital: bool }
        const productData = d?.product || d;
        const sellersData = d?.sellers || [];
        const digitalFlag  = d?.is_digital || productData?.product_type === 'digital' || productData?.is_virtual || false;
        
        if (d && d.content) {
          setCmsContent(d.content);
        }
        
        if (productData && productData.id) {
          if (cancelled) return;
          setProduct(productData);
          setIsDigital(digitalFlag);

          if (!digitalFlag) {
            // [Akuglow Update] Sort merchants: Prefer local merchant (only for physical products)
            let sortedSellers = sellersData;
            if (sellersData.length > 0) {
              const currentUser = isAuthenticated() ? JSON.parse(localStorage.getItem('user')) : null;
              
              sortedSellers = [...sellersData].sort((a, b) => {
                // 1. Prioritas Pusat (AkuGlow Asli/Gudang Pusat)
                const isAPusat = a.merchant_id === '00000000-0000-0000-0000-000000000000' || (a.city && a.city.toLowerCase() === 'pusat') || a.store_name?.toLowerCase().includes('pusat');
                const isBPusat = b.merchant_id === '00000000-0000-0000-0000-000000000000' || (b.city && b.city.toLowerCase() === 'pusat') || b.store_name?.toLowerCase().includes('pusat');
                if (isAPusat && !isBPusat) return -1;
                if (!isAPusat && isBPusat) return 1;

                // 2. Prioritas Terdekat (City Match)
                const isANear = currentUser?.profile?.city && a.city && a.city.toLowerCase() === currentUser.profile.city.toLowerCase();
                const isBNear = currentUser?.profile?.city && b.city && b.city.toLowerCase() === currentUser.profile.city.toLowerCase();
                if (isANear && !isBNear) return -1;
                if (!isANear && isBNear) return 1;
                
                return 0;
              });

              setSelectedMerchant(sortedSellers[0]);
            }
            setSellers(sortedSellers);
          } else {
            // Fallback for digital products: always ship from HQ (System Pusat)
            setSelectedMerchant({
              merchant_id: '00000000-0000-0000-0000-000000000000',
              store_name: 'Gudang Pusat AkuGlow',
              city: 'Pusat',
              stock: 999999
            });
          }
          
          // Initial Attribute Selection (Default to first value of each)
          try {
             const attrs = JSON.parse(productData.attributes || '{}');
             const initial = {};
             Object.entries(attrs).forEach(([k, v]) => {
                if (Array.isArray(v) && v.length > 0) initial[k] = v[0];
             });
             setSelectedAttributes(initial);
          } catch(e){}

          if (productData.variants && productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0]);
          }
          const pd = await fetchJson(`${PUBLIC_API_BASE}/products`);
          const productList = Array.isArray(pd) ? pd : (pd.data || []);
          const filtered = productList.filter(p => String(p.id) !== String(productData.id) && p.category === productData.category).slice(0, 4);
          setRelated(filtered);

          // [Akuglow AI Recommendation] Track Interaction
          fetchJson(`${PUBLIC_API_BASE}/products/track`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productData.id, type: 'view' })
          }).catch(e => console.error('Tracking failed:', e));
        }
      } catch (_err) {
        console.error(_err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProduct();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated()) {
      alert('Silakan login terlebih dahulu untuk menambah barang ke keranjang.');
      navigate('/login');
      return;
    }

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      alert('Silakan pilih varian produk terlebih dahulu.');
      return;
    }

    if (!selectedMerchant) {
      alert('Silakan pilih merchant/pengiriman terlebih dahulu.');
      return;
    }

    setAddedToCart(true);
    try {
      await fetchJson(`${BUYER_API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          product_variant_id: selectedVariant ? selectedVariant.id : product.id,
          merchant_id: selectedMerchant.merchant_id, // [Akuglow Update] Send selected merchant
          quantity: qty,
          metadata: JSON.stringify(selectedAttributes) // Send selected attributes as metadata
        })
      });
      window.dispatchEvent(new Event('cartUpdate'));
      window.dispatchEvent(new Event('openCart'));

      // [Akuglow AI Recommendation] Track Interaction
      fetchJson(`${PUBLIC_API_BASE}/products/track`, {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id, type: 'click' })
      }).catch(() => {});
    } catch (_err) {
      alert('Gagal menambah ke keranjang: ' + _err.message);
      setAddedToCart(false);
    }
  };

  const [copying, setCopying] = useState(false);
  const user = isAuthenticated() ? JSON.parse(localStorage.getItem('user')) : null;
  // [Akuglow Update] Both Affiliates AND Merchants can share affiliate links
  const isAffiliateMode = user && (user.role === 'affiliate' || user.role === 'merchant');
  
  // Use ref_code from user profile OR fallback to affiliate tracking data
  const refCode = user?.affiliate_ref_code || user?.ref_code || null;

  useEffect(() => {
    let cancelled = false;
    const checkWish = async () => {
      if (!isAuthenticated() || !id) return;
      try {
        const d = await fetchJson(`${BUYER_API_BASE}/wishlist/check?product_id=${id}`);
        if (!cancelled) setIsWishlisted(d.is_wishlisted);
      } catch (_e) { console.error('Wishlist check failed:', _e); }
    };
    checkWish();
    return () => { cancelled = true; };
  }, [id]);

  const toggleWishlist = async () => {
    if (!isAuthenticated()) return navigate('/login');
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await fetchJson(`${BUYER_API_BASE}/wishlist/remove?product_id=${product.id}`, { method: 'DELETE' });
        setIsWishlisted(false);
      } else {
        await fetchJson(`${BUYER_API_BASE}/wishlist/add`, {
          method: 'POST',
          body: JSON.stringify({ product_id: product.id })
        });
        setIsWishlisted(true);
      }
    } catch(e) { 
      alert(e.message); 
    } finally {
      setWishlistLoading(false);
    }
  };

  const productSchema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": formatImage(product.image),
    "description": product.description,
    "sku": `SM-${product.id}`,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "AkuGlow"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "IDR",
      "price": product.price,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating || 5,
      "reviewCount": product.reviews || 1
    }
  } : null;

  const breadcrumbSchema = product ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Marketplace",
        "item": `${window.location.origin}/shop`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": product.category || "Category",
        "item": `${window.location.origin}/shop?category=${encodeURIComponent(product.category || '')}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": window.location.href
      }
    ]
  } : null;

  const combinedSchema = [productSchema, breadcrumbSchema].filter(Boolean);

  const currentStock = selectedMerchant ? selectedMerchant.stock : (selectedVariant ? selectedVariant.stock : product?.stock || 0);
  const isOutOfStock = currentStock <= 0;
  const allowBackorders = product?.backorders === 'allow' || product?.backorders === 'notify';
  const showBackorderBadge = isOutOfStock && product?.backorders === 'notify';
  const isPurchaseDisabled = addedToCart || (product?.variants && product.variants.length > 0 && !selectedVariant) || (isOutOfStock && !allowBackorders);

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Menyinkronkan data produk...</p>
    </div>
  );
  
  if (!product) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white px-6">
        <div className="text-7xl mb-6"></div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Produk Tidak Ditemukan</h2>
        <p className="text-gray-500 text-center max-w-sm mb-8">Maaf, produk yang Anda cari mungkin sudah tidak tersedia atau telah dihapus oleh admin.</p>
        <Link to="/shop" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Kembali ke Toko</Link>
    </div>
  );

  return (
    <>
    <SEO 
      title={product.seo_title || product.name} 
      description={product.seo_description || product.description?.substring(0, 160) || `Beli ${product.name} dengan harga terbaik di AkuGlow.`}
      image={formatImage(product.og_image || product.image)}
      type="article"
      url={product.canonical_url || window.location.href}
      noindex={!!product.no_index}
      schema={combinedSchema}
    />
    <main className="bg-gray-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:py-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          
          {/* Visual Gallery Partition */}
          <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-28">
            <div className="bg-gray-50/50 rounded-[2rem] sm:rounded-[3rem] overflow-hidden aspect-square sm:aspect-[4/5] lg:aspect-square group relative flex items-center justify-center border border-gray-100 shadow-sm">
              <img 
                src={formatImage(selectedImage || product.image)} 
                alt={product.name} 
                className="w-full h-full object-cover mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-700 ease-out" 
              />
              <div className="absolute top-6 left-6">
                <span className="backdrop-blur-md bg-white/80 text-gray-900 text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-sm border border-white/50">Official Store</span>
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {(() => {
                try {
                   const gallery = JSON.parse(product.images || '[]');
                   const all = [product.image, ...gallery].filter(x => x);
                   if (all.length <= 1) return null;
                   return (
                      <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
                         {all.map((img, idx) => (
                            <button 
                               key={idx} 
                               onClick={() => setSelectedImage(img)}
                               className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 transition-all flex-shrink-0 ${ (selectedImage === img || (!selectedImage && idx === 0)) ? 'border-blue-600 scale-105 shadow-lg' : 'border-white hover:border-gray-200'}`}
                            >
                               <img src={formatImage(img)} className="w-full h-full object-cover" alt="" />
                            </button>
                         ))}
                      </div>
                   );
                } catch(e) { return null; }
            })()}
          </div>

          {/* Configuration & Detail Partition */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col pt-4 sm:pt-0">
            <nav className="flex items-center gap-2 sm:gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 sm:mb-6">
              <Link to="/" className="hover:text-blue-600 transition-colors">Marketplace</Link> 
              <span className="text-gray-300">/</span> 
              <Link to="/shop" className="hover:text-blue-600 transition-colors">{product.category}</Link>
            </nav>
            
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-[1.2] mb-5">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6 sm:mb-8 text-sm">
              {product.enable_reviews !== false && (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={product.rating || 0} size={18} />
                  <span className="font-bold text-gray-900">{(product.rating || 0).toFixed(1)}</span>
                  <span className="text-gray-400">({product.reviews || 0} Ulasan)</span>
                </div>
              )}
              {product.enable_reviews !== false && <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}
              <span className="font-medium text-gray-500">Terjual {(product.sold || 0).toLocaleString('id-ID')}+</span>
            </div>

            {renderPrice()}
            
            {showBackorderBadge && (
              <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold shadow-sm">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Tersedia secara Backorder
              </div>
            )}
            
            {/* Short Description — below price */}
            {product.short_description && (
              <div
                className="text-slate-500 text-sm sm:text-base leading-relaxed mb-5 product-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(product.short_description) }}
              />
            )}

            {/* Selected Variant Description */}
            {selectedVariant && selectedVariant.description && (
              <div className="mb-5 p-4 rounded-2xl bg-blue-50/40 border border-blue-100/50 text-xs text-blue-800 italic leading-relaxed">
                 {selectedVariant.description}
              </div>
            )}

            <div className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
               <i className="bx bx-package"></i> Stock: {(() => {
                 if (product.variants && product.variants.length > 0) {
                   if (selectedVariant) return `${selectedVariant.stock} pcs`;
                   const total = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                   return `${total} pcs (total semua varian)`;
                 }
                 return `${selectedMerchant ? selectedMerchant.stock : product.stock} pcs`;
               })()}
            </div>

            {/* SKU and Dimensions Container */}
            <div className="text-[11px] text-gray-500 mb-8 flex flex-col gap-1.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/60 max-w-sm">
               <div>
                  <span className="font-extrabold uppercase text-gray-400 mr-1.5">SKU:</span>
                  <span className="font-mono text-gray-700">
                    {selectedVariant ? selectedVariant.sku : product.sku || `SM-${product.id.slice(0, 5).toUpperCase()}`}
                  </span>
               </div>
               {(selectedVariant ? selectedVariant.weight > 0 : product.weight > 0) && (
                  <div>
                     <span className="font-extrabold uppercase text-gray-400 mr-1.5">Berat:</span>
                     <span className="text-gray-700 font-bold">
                       {selectedVariant ? selectedVariant.weight : product.weight} gram
                     </span>
                  </div>
               )}
               {(() => {
                  const len = selectedVariant ? selectedVariant.length : product.length;
                  const wid = selectedVariant ? selectedVariant.width : product.width;
                  const hei = selectedVariant ? selectedVariant.height : product.height;
                  if (len > 0 || wid > 0 || hei > 0) {
                     return (
                        <div>
                           <span className="font-extrabold uppercase text-gray-400 mr-1.5">Dimensi:</span>
                           <span className="text-gray-700 font-bold">{len} × {wid} × {hei} cm</span>
                        </div>
                     );
                  }
                  return null;
               })()}
            </div>

            {/* GLOBAL ATTRIBUTES SELECTOR (Dynamic from Super Admin) */}
            {(() => {
                try {
                   const attrs = JSON.parse(product.attributes || '{}');
                   if (Object.keys(attrs).length === 0) {
                     // Fallback: If no attributes but product is variable and has variants
                     if (product.product_type === 'variable' && product.variants && product.variants.length > 0) {
                       return (
                         <div className="mb-8 flex flex-col gap-6">
                           <div>
                             <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">Varian Pilihan</h4>
                             <div className="flex flex-wrap gap-2.5">
                               {product.variants.map(v => (
                                 <button
                                   key={v.id}
                                   onClick={() => {
                                     setSelectedVariant(v);
                                     if (v.image) setSelectedImage(v.image);
                                   }}
                                   className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                                     selectedVariant?.id === v.id 
                                       ? 'border-gray-900 bg-gray-900 text-white shadow-md shadow-gray-900/20' 
                                       : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                                   }`}
                                 >
                                   {v.name}
                                 </button>
                               ))}
                             </div>
                           </div>
                         </div>
                       );
                     }
                     return null;
                   }
                   return (
                     <div className="mb-8 flex flex-col gap-6">
                       {Object.entries(attrs).map(([key, vals]) => (
                         <div key={key}>
                           <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">{key}</h4>
                           <div className="flex flex-wrap gap-2.5">
                             {vals.map(v => {
                               const available = isOptionAvailable(key, v);
                               return (
                                 <button 
                                   key={v}
                                   onClick={() => {
                                     // If we want to allow unselecting, we could toggle it, but let's just set it
                                     if (available) {
                                       setSelectedAttributes(prev => {
                                         // Allow unselect if already selected
                                         if (prev[key] === v) {
                                           const newAttrs = { ...prev };
                                           delete newAttrs[key];
                                           return newAttrs;
                                         }
                                         return { ...prev, [key]: v };
                                       });
                                     }
                                   }}
                                   disabled={!available}
                                   className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                                     selectedAttributes[key] === v 
                                       ? 'border-gray-900 bg-gray-900 text-white shadow-md shadow-gray-900/20' 
                                       : available 
                                         ? 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                                         : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                                   }`}
                                 >
                                   {v}
                                 </button>
                               );
                             })}
                           </div>
                         </div>
                       ))}
                     </div>
                   );
                } catch(e) { return null; }
            })()}



            {/* [Akuglow] Sumber Pengiriman — Pusat selalu ada, distributor hanya jika restock */}
            {isDigital ? (
              <div className="mb-10 p-5 rounded-3xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg flex-shrink-0"><i className="bx bx-save"/></div>
                <div>
                  <div className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Produk Digital</div>
                  <h4 className="font-black text-indigo-900 text-sm">Akses Langsung Setelah Pembayaran</h4>
                  <p className="text-xs text-indigo-500 mt-0.5">Tidak ada pengiriman fisik — Anda akan mendapatkan link akses/unduhan segera setelah transaksi berhasil.</p>
                </div>
              </div>
            ) : (
              <div className="mb-10">
                {/* ── GUDANG PUSAT (selalu tampil, auto-selected) ── */}
                {(() => {
                  const pusat = sellers.find(s => s.is_pusat || s.merchant_id === '00000000-0000-0000-0000-000000000000');
                  if (!pusat) return null;
                  
                  const isSelected = selectedMerchant?.merchant_id === pusat.merchant_id;
                  
                  return (
                    <button 
                      onClick={() => setSelectedMerchant(pusat)}
                      className={`w-full text-left relative overflow-hidden rounded-[2rem] border-2 transition-all p-5 mb-4 shadow-lg ${
                        isSelected 
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-blue-200/50' 
                          : 'border-blue-100 bg-white hover:border-blue-300 shadow-blue-100/30'
                      }`}
                    >
                      {/* Badge Official HQ */}
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-l from-blue-600 to-blue-400 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl shadow-sm uppercase tracking-[0.1em]">Official HQ</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gray-400'
                          }`}>
                            <span className="material-symbols-outlined text-xl">verified_user</span>
                          </div>
                          <div>
                            <p className={`font-black text-sm tracking-tight ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{pusat.store_name}</p>
                            <p className={`text-[9px] uppercase tracking-widest font-black ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>Pengiriman Langsung Dari Pusat</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>Stok Tersedia</p>
                          <p className={`font-black text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{pusat.stock.toLocaleString('id-ID')} Unit</p>
                        </div>
                      </div>
                    </button>
                  );
                })()}

                {/* ── MERCHANT DISTRIBUTOR (hanya muncul jika sudah restock) ── */}
                {(() => {
                  const distributors = sellers.filter(s => !s.is_pusat && s.merchant_id !== '00000000-0000-0000-0000-000000000000');
                  if (distributors.length === 0) return null;

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">— Distributor Terdekat —</p>
                        {user?.profile?.city && (
                          <div className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">
                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                            <span className="text-[10px] font-black uppercase">{user.profile.city}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        {distributors.slice((merchantPage - 1) * 3, merchantPage * 3).map((s) => {
                          const isNear = user?.profile?.city && s.city && s.city.toLowerCase() === user.profile.city.toLowerCase();
                          return (
                            <button
                              key={s.merchant_id}
                              onClick={() => setSelectedMerchant(s)}
                              className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${
                                selectedMerchant?.merchant_id === s.merchant_id
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md'
                                  : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                              }`}
                            >
                              {isNear && (
                                <div className="absolute top-0 right-0">
                                  <div className="bg-gradient-to-l from-orange-500 to-amber-400 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl shadow-sm uppercase tracking-tighter">Terdekat</div>
                                </div>
                              )}
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white transition-colors ${selectedMerchant?.merchant_id === s.merchant_id ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                  {s.store_name.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-sm">{s.store_name}</p>
                                    {isNear && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>}
                                  </div>
                                  <p className="text-[10px] uppercase tracking-tighter opacity-70 font-bold">{s.city || 'Regional'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Stok</p>
                                <p className="font-black text-xs">{s.stock} Unit</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Pagination distributor */}
                      {distributors.length > 3 && (
                        <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => setMerchantPage(prev => Math.max(prev - 1, 1))}
                            disabled={merchantPage === 1}
                            className="text-xs font-bold text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-400 flex items-center gap-1 px-2 py-1"
                          >
                            <i className="bx bx-chevron-left text-lg"></i> Prev
                          </button>
                          <span className="text-xs font-bold text-gray-400">
                            {merchantPage} / {Math.ceil(distributors.length / 3)}
                          </span>
                          <button
                            onClick={() => setMerchantPage(prev => Math.min(prev + 1, Math.ceil(distributors.length / 3)))}
                            disabled={merchantPage === Math.ceil(distributors.length / 3)}
                            className="text-xs font-bold text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-400 flex items-center gap-1 px-2 py-1"
                          >
                            Next <i className="bx bx-chevron-right text-lg"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}



            {selectedMerchant && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 mb-10 overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                            {selectedMerchant.store_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-black text-gray-400 uppercase tracking-tighter mb-0.5">Sold & Shipped By</div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-gray-900">{selectedMerchant.store_name}</h4>
                                <span className="bg-green-100 text-green-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Ready Stock</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {product.product_type === 'external' ? (
              <div className="flex gap-3 flex-1 mt-6 sm:mt-10">
                <a 
                  href={product.product_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-14 sm:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black px-6 sm:px-10 rounded-[1.25rem] shadow-2xl shadow-blue-200/50 transition-all flex items-center justify-center gap-3 active:scale-95 text-center"
                >
                  <i className="bx bx-link-external text-xl" />
                  <span className="text-sm sm:text-base uppercase tracking-widest">{product.button_text || 'Beli Sekarang'}</span>
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-8">
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-1.5 sm:w-fit">
                  <button 
                    onClick={() => qty > 1 && setQty(qty-1)} 
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-white transition-all text-xl text-gray-500 hover:text-gray-900 hover:shadow-sm"
                  >-</button>
                  <span className="px-4 text-center font-bold text-lg text-gray-900 w-12">{qty}</span>
                  <button 
                    onClick={() => setQty(qty+1)} 
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-white transition-all text-xl text-gray-500 hover:text-gray-900 hover:shadow-sm"
                  >+</button>
                </div>
                
                <div className="flex gap-3 flex-1">
                  <button 
                    onClick={handleAddToCart}
                    disabled={isPurchaseDisabled}
                    className="flex-1 h-14 sm:h-16 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-6 sm:px-10 rounded-2xl shadow-xl shadow-gray-900/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <ShoppingBag size={20} />
                    <span className="text-sm sm:text-base tracking-wide">
                      {addedToCart 
                        ? 'Menambahkan...' 
                        : (product.variants && product.variants.length > 0 && !selectedVariant 
                            ? 'Pilih Varian' 
                            : (isOutOfStock && !allowBackorders ? 'Habis' : 'Masukkan Keranjang'))}
                    </span>
                  </button>

                  <button 
                    onClick={toggleWishlist}
                    disabled={wishlistLoading}
                    className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl border transition-all flex-shrink-0 ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-gray-50'}`}
                  >
                     {wishlistLoading ? (
                       <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                     ) : (
                       <svg width="24" height="24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                     )}
                  </button>
                </div>
              </div>
            )}

            {/* Affiliate Share Section - Premium Magic UI */}
            {isAffiliateMode && refCode && (
              <div className="mt-8 p-6 rounded-[2rem] bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Affiliate Partner Program</span>
                  </div>
                  <h4 className="font-black text-gray-900 mb-1">Dapatkan Komisi dari Produk Ini!</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Bagikan link khusus Anda dan dapatkan komisi hingga {(product.commission_rate * 100) || 5}% untuk setiap pembelian.</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}?ref=${refCode}`;
                        navigator.clipboard.writeText(url);
                        setCopying(true);
                        setTimeout(() => setCopying(false), 2000);
                      }}
                      className="flex-1 bg-white border border-indigo-200 text-indigo-600 font-black text-xs py-3 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      {copying ? (
                        <><i className="bx bx-check text-lg" /> Berhasil Disalin!</>
                      ) : (
                        <><i className="bx bx-copy-alt text-lg" /> Salin Link Affiliate</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informational Tabs Region */}
        <div className="mt-24 border-t border-gray-100 pt-16">
           <div className="flex gap-12 mb-12 border-b border-gray-100 overflow-x-auto scrollbar-hide">
             {tabs.filter(t => t !== 'Ulasan' || product.enable_reviews !== false).map(t => (
               <button 
                key={t} 
                onClick={() => setActiveTab(t)} 
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === t ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 {t}
                 {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
               </button>
             ))}
           </div>
           
           <div className="max-w-4xl">
              {activeTab === 'Deskripsi' && (
                 product.description
                   ? <div
                       className="text-slate-600 text-base sm:text-[17px] leading-relaxed product-markdown"
                       dangerouslySetInnerHTML={{ __html: renderMarkdown(product.description) }}
                     />
                   : <p className="text-slate-400 italic">Tidak ada deskripsi detail untuk produk ini.</p>
              )}
              {activeTab === 'Informasi Tambahan' && (
                <div className="flex flex-col max-w-2xl divide-y divide-gray-100 border-t border-b border-gray-100">
                  {[
                     { l: 'Brand / Merek', v: product.brand },
                     { l: 'Kategori', v: product.category },
                     { l: 'SKU Identifier', v: selectedVariant?.sku || product.sku || `SM-${(product.id || id).slice(0,5).toUpperCase()}` },
                     { l: 'Stok Gudang', v: (() => {
                         if (product.variants && product.variants.length > 0) {
                             if (selectedVariant) return `${selectedVariant.stock || 0} Unit Tersedia (Varian Pilihan)`;
                             const total = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                             return `${total} Unit Tersedia (Total Seluruh Varian)`;
                         }
                         return `${product.stock || 0} Unit Tersedia`;
                     })() },
                     // Injeksi Atribut Dinamis dari Admin
                     ...(() => {
                         try {
                            const extra = JSON.parse(product.attributes || '{}');
                            return Object.entries(extra).map(([k, v]) => ({
                               l: k,
                               v: Array.isArray(v) ? v.join(", ") : v
                            }));
                         } catch(e) { return []; }
                     })()
                  ].map(item => (
                     <div key={item.l} className="flex flex-col sm:flex-row sm:items-center py-4 px-2 group hover:bg-gray-50/50 transition-colors">
                         <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 sm:mb-0 w-full sm:w-1/3">{item.l}</span>
                         <div className="flex items-center w-full sm:w-2/3">
                            {item.v ? (
                               <span className="font-medium text-gray-900">{item.v}</span>
                            ) : (
                               <span className="text-gray-400 italic text-sm">Tidak tersedia</span>
                            )}
                         </div>
                     </div>
                  ))}
                </div>
              )}
               {activeTab === "Ulasan" && <ReviewSection productID={product.id} />}
            </div>
         </div>
      </div>
      
      <RecommendedSection 
        productId={product.id}
        limit={5} 
        title="Mungkin Kamu Juga Suka ♥" 
        subtitle="Produk lain yang sesuai dengan selera kamu." 
        className="mt-20 border-t border-gray-100/50"
      />
    </main>
  </>
  );
}
