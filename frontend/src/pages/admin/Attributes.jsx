import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

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

  return (
    <div className="fade-in pb-5">
      {/* Premium Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-5 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="w-12 h-12 rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-lg">
             <i className="bx bx-slider-alt fs-3" />
          </div>
          <div>
            <h4 className="fw-black text-dark mb-0 tracking-tight">Master Atribut</h4>
            <p className="text-secondary small mb-0 font-medium">Global specifications management system.</p>
          </div>
        </div>
        <button 
          className="btn btn-dark px-4 py-2.5 rounded-3 fw-black d-flex align-items-center gap-2 shadow-sm transform transition-all hover:scale-105" 
          onClick={() => openForm()}
        >
          <i className="bx bx-plus-circle fs-5" /> Tambah Atribut
        </button>
      </div>

      {/* Modern Data Management Area */}
      <div className="bg-white rounded-4 shadow-sm border border-light overflow-hidden">
        <div className="p-4 bg-light/30 border-bottom border-light flex items-center justify-between">
            <h6 className="mb-0 fw-black text-secondary uppercase tracking-widest" style={{ fontSize: 10 }}>Active Variations Inventory</h6>
            <div className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1.5 fw-bold">{attrs.length} Total Atribut</div>
        </div>
        
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="bg-light/30">
                <th className="ps-4 py-3 text-uppercase small fw-black text-muted-foreground tracking-tighter" style={{ fontSize: 11 }}>Details</th>
                <th className="py-3 text-uppercase small fw-black text-muted-foreground tracking-tighter" style={{ fontSize: 11 }}>Input Logic</th>
                <th className="py-3 text-uppercase small fw-black text-muted-foreground tracking-tighter" style={{ fontSize: 11 }}>Selection Values</th>
                <th className="pe-4 py-3 text-uppercase small fw-black text-muted-foreground tracking-tighter text-end" style={{ fontSize: 11 }}>Control</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5 border-0"><div className="spinner-border text-primary opacity-50" /></td></tr>
              ) : attrs.length === 0 ? (
                <tr>
                   <td colSpan={4} className="text-center py-20 border-0">
                      <div className="opacity-20 fs-1 mb-3">🧺</div>
                      <h6 className="fw-black text-muted">Belum ada atribut global.</h6>
                      <p className="text-secondary small">Klik tombol di atas untuk membuat variasi pertama Anda.</p>
                   </td>
                </tr>
              ) : attrs.map(a => (
                <tr key={a.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="ps-4 py-4">
                    <div className="fw-black text-dark mb-1">{a.name}</div>
                    <div className="font-mono text-muted uppercase" style={{ fontSize: 10 }}>ID Reference: <span className="text-primary fw-bold">#{a.id}</span></div>
                  </td>
                  <td>
                    <div className={`d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill fw-black uppercase tracking-tighter shadow-sm border ${
                      a.type === 'color' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                      a.type === 'checkbox' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`} style={{ fontSize: 9 }}>
                        <i className={`bx ${a.type === 'color' ? 'bx-palette' : a.type === 'checkbox' ? 'bx-check-square' : 'bx-chevron-down-circle'}`} />
                        {a.type}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2 py-2 max-w-md">
                      {a.values.map((v, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-light rounded-2 small text-dark fw-bold shadow-sm" style={{ fontSize: 11 }}>{v}</span>
                      ))}
                    </div>
                  </td>
                  <td className="pe-4 text-end">
                    <div className="d-flex justify-content-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-outline-warning btn-sm rounded-3 px-3 py-1.5 border-dashed" onClick={() => openForm(a)}>
                        <i className="bx bx-edit-alt" />
                      </button>
                      <button className="btn btn-outline-danger btn-sm rounded-3 px-3 py-1.5 border-dashed" onClick={() => deleteAttr(a.id)}>
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MONSTER MODAL - REDESIGNED */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(12px)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-[2rem] shadow-2xl overflow-hidden transform animate-in zoom-in duration-300">
              <div className="modal-header border-0 bg-slate-50 px-5 py-4 flex items-center justify-between">
                <div className="d-flex align-items-center gap-3">
                   <div className="w-10 h-10 rounded-2 bg-white shadow-sm d-flex align-items-center justify-center text-primary border border-light">
                      <i className="bx bx-layer fs-4" />
                   </div>
                   <h5 className="modal-title fw-black text-dark tracking-tighter">
                     {formData.id ? 'Modify Attribute' : 'New Configuration'}
                   </h5>
                </div>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body p-5 bg-white">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Friendly Property Name</label>
                    <input 
                      type="text" 
                      className="form-control form-control-lg border-2 rounded-3 fw-bold bg-light/50 focus:bg-white transition-all text-sm h-14" 
                      placeholder="e.g. Storage Capacity, Fabric Type" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="mb-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Interaction Method</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'dropdown', label: 'Dropdown', icon: 'bx-list-ul' },
                            { id: 'checkbox', label: 'Multi Chk', icon: 'bx-checkbox-checked' },
                            { id: 'color', label: 'Colors', icon: 'bx-palette' }
                        ].map(type => (
                            <button 
                                key={type.id}
                                type="button"
                                onClick={() => setFormData({...formData, type: type.id})}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                                    formData.type === type.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-50 text-gray-400 hover:border-gray-200'
                                }`}
                            >
                                <i className={`bx ${type.icon} text-xl`} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">{type.label}</span>
                            </button>
                        ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Value Options Collection</label>
                    <div className="p-3 border-2 border-dashed rounded-3 bg-slate-50/50 flex flex-wrap gap-2 align-items-center min-h-24">
                      {formData.values.map((v, i) => (
                        <div key={i} className="bg-white border text-dark font-bold px-3 py-2 rounded-xl text-xs d-flex align-items-center gap-2 shadow-sm animate-in slide-in-from-left">
                          {v} 
                          <button type="button" className="border-0 bg-transparent text-gray-300 hover:text-danger p-0 leading-none" onClick={() => removeTag(i)}>
                             <i className="bx bx-x text-base" />
                          </button>
                        </div>
                      ))}
                      <input 
                        className="bg-transparent border-0 flex-grow-1 p-2 outline-none text-sm fw-bold text-dark" 
                        placeholder={formData.values.length === 0 ? "Type & Hit Enter..." : "Add more..."}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        style={{ outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div className="d-flex gap-3 mt-8">
                    <button type="button" className="btn btn-light flex-1 py-3 rounded-2xl fw-black text-secondary uppercase tracking-tighter" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary flex-1 py-3 rounded-2xl fw-black shadow-lg shadow-primary/20 uppercase tracking-tighter" disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm" /> : <span>Confirm & Save</span>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttributes;
