import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A } from '../../lib/adminStyles';

const API = ADMIN_API_BASE;

const AdminAttributes = () => {
  const [attrs, setAttrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'dropdown', values: [] });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAttrs = () => {
    setLoading(true);
    fetchJson(`${API}/attributes`)
      .then(d => {
        const processed = (d.data || []).map(a => ({
          ...a,
          values: a.values ? a.values.split(',').map(v => v.trim()) : []
        }));
        setAttrs(processed);
      })
      .catch(err => console.error("Error loading attributes:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAttrs(); }, []);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !formData.values.includes(val)) {
        setFormData({ ...formData, values: [...formData.values, val] });
      }
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    const newTags = [...formData.values];
    newTags.splice(index, 1);
    setFormData({ ...formData, values: newTags });
  };

  const openForm = (attr = null) => {
    if (attr) {
      setFormData(attr);
    } else {
      setFormData({ name: '', type: 'dropdown', values: [] });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formData, values: formData.values.join(',') };

    fetchJson(`${API}/attributes/upsert`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => {
      loadAttrs();
      setShowModal(false);
    }).catch(err => alert("Gagal: " + err.message))
      .finally(() => setSaving(false));
  };

  const deleteAttr = (id) => {
    if (!window.confirm("Hapus atribut ini secara permanen?")) return;
    fetchJson(`${API}/attributes/delete?id=${id}`, { method: 'DELETE' })
      .then(() => loadAttrs())
      .catch(err => alert("Gagal: " + err.message));
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'color': return 'bx-palette';
      case 'checkbox': return 'bx-check-square';
      default: return 'bx-list-ul';
    }
  };

  return (
    <div style={{ padding: '0 20px 40px' }} className="fade-in">
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: window.innerWidth < 640 ? 'column' : 'row', justifyContent: 'space-between', alignItems: window.innerWidth < 640 ? 'flex-start' : 'center', gap: 20, marginBottom: 25 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
            <i className="bx bx-chevron-right" />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Global Attributes</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
             Platform Specifications
          </h2>
        </div>
        <button 
          onClick={() => openForm()}
          style={{ width: window.innerWidth < 640 ? '100%' : 'auto', padding: '10px 24px', borderRadius: 10, border: 'none', background: '#4361ee', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <i className="bx bx-plus-circle fs-5" /> Define New Attribute
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 100, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #4361ee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {attrs.length === 0 ? (
             <div style={{ gridColumn: '1/-1', ...A.card, padding: '100px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-slider-alt" style={{ fontSize: 48, marginBottom: 15, opacity: 0.3 }} />
                <h5 style={{ fontWeight: 700, color: '#64748b' }}>No Attributes Found</h5>
                <p style={{ fontSize: 13 }}>Click the button above to start defining product specifications.</p>
             </div>
          ) : attrs.map(a => (
            <div key={a.id} style={{ ...A.card, padding: 0, overflow: 'hidden' }}>
               <div style={{ padding: '20px 20px 15px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4361ee' }}>
                      <i className={`bx ${getTypeIcon(a.type)} fs-4`} />
                    </div>
                    <div>
                      <h6 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>{a.name}</h6>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type: {a.type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openForm(a)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#ecf0ff', color: '#4361ee', cursor: 'pointer' }}><i className="bx bx-edit-alt" /></button>
                    <button onClick={() => deleteAttr(a.id)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#fff1f2', color: '#ef4444', cursor: 'pointer' }}><i className="bx bx-trash" /></button>
                  </div>
               </div>
               <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.02em' }}>Available Values ({a.values.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {a.values.map((v, i) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>{v}</span>
                    ))}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 450, background: '#fff', borderRadius: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', overflow: 'hidden' }} className="zoom-in">
            <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>{formData.id ? 'Modify Attribute' : 'New Attribute'}</h5>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}><i className="bx bx-x" /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 30 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Property Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Size, Material, Storage"
                  required 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>U.I. Interaction</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { id: 'dropdown', label: 'Dropdown', icon: 'bx-list-ul' },
                    { id: 'checkbox', label: 'Multi Chk', icon: 'bx-checkbox-checked' },
                    { id: 'color', label: 'Color Chip', icon: 'bx-palette' }
                  ].map(t => (
                    <button 
                      key={t.id} type="button" onClick={() => setFormData({...formData, type: t.id})}
                      style={{ 
                        padding: '12px 6px', borderRadius: 12, border: `2px solid ${formData.type === t.id ? '#4361ee' : '#f1f5f9'}`,
                        background: formData.type === t.id ? '#edf0ff' : '#fff', color: formData.type === t.id ? '#4361ee' : '#64748b',
                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                      }}
                    >
                      <i className={`bx ${t.icon} fs-4`} />
                      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 25 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Options Values</label>
                <div style={{ 
                  width: '100%', minHeight: 100, padding: 12, borderRadius: 12, border: '2px dashed #f1f5f9', background: '#f8fafc',
                  display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start'
                }}>
                  {formData.values.map((v, i) => (
                    <div key={i} style={{ padding: '6px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1e293b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      {v}
                      <i className="bx bx-x" style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => removeTag(i)} />
                    </div>
                  ))}
                  <input 
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: 6, fontSize: 13, flex: 1, minWidth: 100, fontWeight: 600 }}
                    placeholder={formData.values.length === 0 ? "Type & Hit Enter..." : "Add more..."}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#4361ee', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)' }}>
                  {saving ? 'Syncing...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttributes;
