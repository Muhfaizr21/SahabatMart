import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage, uploadFile } from '../../lib/api';
import { A, PageHeader, Modal, FieldLabel, idr } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: 0, title: '', subtitle: '', badge: '', offer: '', image: '', bg_color: '#3b82f6', link: '/', order: 0, is_active: true });
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/banners`)
      .then(res => setBanners(Array.isArray(res) ? res : (res.data || [])))
      .catch(() => toast.error('Gagal memuat banner'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const resp = await uploadFile(`${ADMIN_API_BASE}/upload`, file);
      const url = resp.imageUrl || resp.url || resp.data?.url;
      if (url) {
        setFormData({ ...formData, image: url });
        toast.success('Gambar terunggah');
      }
    } catch { 
      toast.error('Upload gagal'); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    fetchJson(`${ADMIN_API_BASE}/banners`, {
      method: 'POST',
      body: JSON.stringify(formData)
    }).then(() => {
      toast.success('Config banner berhasil disimpan');
      setShowModal(false);
      load();
    }).catch(err => toast.error(err.message));
  };

  const deleteBanner = (id) => {
    if (!window.confirm('Hapus banner promo ini secara permanen?')) return;
    fetchJson(`${ADMIN_API_BASE}/banners/delete?id=${id}`, { method: 'DELETE' })
      .then(() => { toast.success('Banner terhapus'); load(); });
  };

  return (
    <div style={A.page}>
      <PageHeader 
        title="Hero Banners" 
        subtitle="Manage home page slider and promotional content"
      >
        <button onClick={() => { setFormData({ id: 0, title: '', subtitle: '', badge: '', offer: '', image: '', bg_color: '#3b82f6', link: '/', order: 0, is_active: true }); setShowModal(true); }} style={A.btnPrimary}>
          <i className="bx bx-plus" /> Add New Banner
        </button>
      </PageHeader>

      {loading ? (
        <div style={A.empty}>
           <div className="spinner-border text-primary" />
           <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 10 }}>Syncing assets...</p>
        </div>
      ) : banners.length === 0 ? (
        <div style={A.empty}>
           <i className="bx bx-image-alt" style={{ fontSize: 48, color: '#e2e8f0' }} />
           <p style={{ color: '#94a3b8', fontWeight: 600 }}>No banners configured yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map(b => (
            <div key={b.id} style={{ ...A.card, position: 'relative' }} className="group">
               {/* Preview Image */}
               <div style={{ height: 160, background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
                  <img src={formatImage(b.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <div style={{ 
                      position: 'absolute', top: 12, left: 12, 
                      padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', 
                      backdropFilter: 'blur(4px)', color: '#6366f1', fontSize: 10, fontWeight: 900, 
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)', textTransform: 'uppercase' 
                  }}>
                    {b.badge || 'PROMO'}
                  </div>
                  {!b.is_active && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hidden</span>
                    </div>
                  )}
               </div>

               {/* Info */}
               <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                     <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>ORDER #{b.order}</span>
                     <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setFormData(b); setShowModal(true); }} style={A.iconBtn('#6366f1', '#f5f3ff')}><i className="bx bx-edit-alt" /></button>
                        <button onClick={() => deleteBanner(b.id)} style={A.iconBtn('#ef4444', '#fef2f2')}><i className="bx bx-trash" /></button>
                     </div>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 4, lineHeight: 1.2 }}>{b.title}</h3>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.subtitle}</p>
               </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={formData.id ? 'Edit Banner' : 'Configure New Banner'} onClose={() => setShowModal(false)} wide>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Banner Title</FieldLabel>
                    <input style={A.input} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g. Mega Sale 12.12" />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Badge Text</FieldLabel>
                    <input style={A.input} value={formData.badge} onChange={e => setFormData({ ...formData, badge: e.target.value })} placeholder="e.g. HOT, NEW, LIMITED" />
                 </div>
                 <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Subtitle / Description</FieldLabel>
                    <input style={A.input} value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Short promotional text..." />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Offer Label</FieldLabel>
                    <input style={A.input} value={formData.offer} onChange={e => setFormData({ ...formData, offer: e.target.value })} placeholder="e.g. Disc 50% Off" />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Target Link</FieldLabel>
                    <input style={A.input} value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="/shop/promo" />
                 </div>

                 <div className="col-span-2">
                    <FieldLabel>Asset Image</FieldLabel>
                    <div style={{ 
                        height: 180, borderRadius: 16, border: '2px dashed #e2e8f0', 
                        background: '#f8fafc', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', position: 'relative', overflow: 'hidden' 
                    }}>
                       {formData.image ? (
                         <img src={formatImage(formData.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                       ) : (
                         <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                            <i className="bx bx-image-add" style={{ fontSize: 32 }} />
                            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>UPLOAD HERO IMAGE</div>
                         </div>
                       )}
                       <input type="file" onChange={handleUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*" />
                       {uploading && (
                         <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="spinner-border text-primary" />
                         </div>
                       )}
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Sort Order</FieldLabel>
                    <input type="number" style={A.input} value={formData.order} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel>Background Accent</FieldLabel>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input type="color" style={{ width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer' }} value={formData.bg_color} onChange={e => setFormData({ ...formData, bg_color: e.target.value })} />
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#64748b' }}>{formData.bg_color}</span>
                    </div>
                 </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#f8fafc', borderRadius: 16 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setFormData({...formData, is_active: !formData.is_active})}>
                    <div style={{ 
                        width: 40, height: 20, borderRadius: 20, background: formData.is_active ? '#16a34a' : '#cbd5e1', 
                        position: 'relative', transition: 'all 0.2s' 
                    }}>
                       <div style={{ 
                           width: 14, height: 14, borderRadius: '50%', background: '#fff', 
                           position: 'absolute', top: 3, left: formData.is_active ? 23 : 3, transition: 'all 0.2s' 
                       }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Active on Homepage</span>
                 </div>
                 <button type="submit" style={A.btnPrimary}>
                    {formData.id ? 'Update Banner' : 'Create Banner'}
                 </button>
              </div>
           </form>
        </Modal>
      )}

      <style>{`
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) { .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1024px) { .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .col-span-2 { grid-column: span 2 / span 2; }
      `}</style>
    </div>
  );
}
