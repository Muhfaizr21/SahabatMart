import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import AdminSelect from '../../components/admin/AdminSelect';

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
        const data = Array.isArray(d) ? d : (d?.data || []);
        const processed = data.map(a => ({
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
    <div className="admin-page-container fade-in pb-16">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <Link to="/admin" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <i className="bx bx-chevron-right" />
            <span className="text-slate-800">Global Attributes</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
            Platform Specifications
          </h2>
        </div>
        <button 
          onClick={() => openForm()}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
        >
          <i className="bx bx-plus-circle text-lg" /> Define New Attribute
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {attrs.length === 0 ? (
             <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <i className="bx bx-slider-alt text-5xl text-slate-300 mb-4" />
                <h5 className="text-lg font-bold text-slate-700 mb-2">No Attributes Found</h5>
                <p className="text-sm text-slate-500">Click the button above to start defining product specifications.</p>
             </div>
          ) : attrs.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
               <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <i className={`bx ${getTypeIcon(a.type)} text-xl`} />
                    </div>
                    <div>
                      <h6 className="text-base font-extrabold text-slate-900 m-0 leading-tight mb-1">{a.name}</h6>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type: {a.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openForm(a)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors">
                      <i className="bx bx-edit-alt" />
                    </button>
                    <button onClick={() => deleteAttr(a.id)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors">
                      <i className="bx bx-trash" />
                    </button>
                  </div>
               </div>
               <div className="p-5 flex-1 bg-slate-50/50">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Available Values ({a.values.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {a.values.map((v, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                        {v}
                      </span>
                    ))}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Premium Glass Modal */}
      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-lg font-bold text-slate-900">
                {formData.id ? 'Modify Attribute' : 'New Attribute'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <i className="bx bx-x text-xl" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-5">
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Property Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Size, Material, Storage"
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="mb-5">
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">U.I. Interaction</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dropdown', label: 'Dropdown', icon: 'bx-list-ul' },
                    { id: 'checkbox', label: 'Multi Chk', icon: 'bx-checkbox-checked' },
                    { id: 'color', label: 'Color Chip', icon: 'bx-palette' }
                  ].map(t => (
                    <button 
                      key={t.id} type="button" onClick={() => setFormData({...formData, type: t.id})}
                      className={`py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.type === t.id 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <i className={`bx ${t.icon} text-xl`} />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Options Values</label>
                <div className="w-full min-h-[100px] p-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-wrap gap-2 items-start focus-within:border-indigo-400 focus-within:bg-indigo-50/10 transition-colors">
                  {formData.values.map((v, i) => (
                    <div key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-700 shadow-sm">
                      {v}
                      <i className="bx bx-x text-slate-400 hover:text-rose-500 cursor-pointer transition-colors" onClick={() => removeTag(i)} />
                    </div>
                  ))}
                  <input 
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none py-1.5 px-2 text-sm font-semibold text-slate-700 placeholder:text-slate-400"
                    placeholder={formData.values.length === 0 ? "Type & Hit Enter..." : "Add more..."}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3.5 rounded-xl border-none bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all disabled:opacity-70">
                  {saving ? 'Syncing...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminAttributes;
