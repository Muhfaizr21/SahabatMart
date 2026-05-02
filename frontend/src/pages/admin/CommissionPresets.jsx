import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import toast from 'react-hot-toast';
import { A } from '../../lib/adminStyles';

const API = ADMIN_API_BASE;

const EMPTY_PRESET = {
  id: '',
  name: '',
  description: '',
  is_active: true,
  levels: [{ level: 1, rate: 10 }],
};

export default function CommissionPresets() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | preset object
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/commission-presets`)
      .then(d => setPresets(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => toast.error('Gagal memuat data preset'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => setModal({ ...EMPTY_PRESET, levels: [{ level: 1, rate: 10 }] });
  const openEdit = (p) => setModal({
    ...p,
    levels: (p.levels || []).map(lv => ({ ...lv, rate: +(lv.rate * 100).toFixed(2) })),
  });

  const addLevel = () => {
    setModal(prev => {
      const nextLevel = (prev.levels?.length || 0) + 1;
      return { ...prev, levels: [...(prev.levels || []), { level: nextLevel, rate: 0 }] };
    });
  };

  const removeLevel = (idx) => {
    setModal(prev => {
      const updated = prev.levels.filter((_, i) => i !== idx).map((lv, i) => ({ ...lv, level: i + 1 }));
      return { ...prev, levels: updated };
    });
  };

  const updateLevel = (idx, rate) => {
    setModal(prev => {
      const levels = [...prev.levels];
      levels[idx] = { ...levels[idx], rate: parseFloat(rate) || 0 };
      return { ...prev, levels };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!modal.name.trim()) { toast.error('Nama preset wajib diisi'); return; }
    if (!modal.levels?.length) { toast.error('Minimal 1 level komisi'); return; }

    setSaving(true);
    fetchJson(`${API}/commission-presets/upsert`, {
      method: 'POST',
      body: JSON.stringify({
        id: modal.id || undefined,
        name: modal.name,
        description: modal.description,
        is_active: modal.is_active,
        levels: modal.levels,
      })
    })
      .then(() => { toast.success('Preset berhasil disimpan!'); setModal(null); load(); })
      .catch(e => toast.error(e.message))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Hapus preset ini?')) return;
    setDeleting(id);
    fetchJson(`${API}/commission-presets/delete?id=${id}`, { method: 'DELETE' })
      .then(() => { toast.success('Preset dihapus'); load(); })
      .catch(e => toast.error(e.message))
      .finally(() => setDeleting(null));
  };

  const totalRate = (levels) => levels?.reduce((sum, lv) => sum + (lv.rate || 0), 0) || 0;

  return (
    <div style={{ padding: '0 20px 40px', fontFamily: "'Inter', sans-serif" }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
            <i className="bx bx-chevron-right" />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Commission Presets</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Commission Presets
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Template distribusi komisi multi-level ke jaringan upline affiliate. Assign preset ke produk untuk distribusi otomatis.
          </p>
        </div>
        <button onClick={openNew} style={{ ...A.btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bx bx-plus" /> Tambah Preset
        </button>
      </div>

      {/* Explanation Card */}
      <div style={{ background: 'linear-gradient(135deg, #4361ee15, #7c3aed10)', border: '1px solid #4361ee30', borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="bx bx-git-branch" style={{ fontSize: 20, color: '#fff', transform: 'rotate(90deg)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>Cara Kerja Commission Preset</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            Saat produk terjual, sistem berjalan <strong>naik ke jaringan upline</strong> sesuai kedalaman preset.
            Level 1 = referrer langsung, Level 2 = upline dari referrer, dst.
            Jika upline tidak ada di level tertentu, distribusi berhenti di sana.
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { lv: 'Level 1', eg: '10%', desc: 'Referrer langsung (yang share link)' },
              { lv: 'Level 2', eg: '5%', desc: 'Upline dari referrer' },
              { lv: 'Level 3', eg: '2%', desc: 'Upline dari level 2, dst.' },
            ].map(({ lv, eg, desc }) => (
              <div key={lv} style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', border: '1px solid #e2e8f0', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#4361ee' }}>{lv}: {eg}</span>
                <span style={{ color: '#64748b', marginLeft: 6 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 32 }} />
          <div style={{ marginTop: 12 }}>Memuat preset...</div>
        </div>
      ) : presets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
          <i className="bx bx-git-branch" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Belum ada Commission Preset</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Buat preset pertama untuk mendistribusikan komisi ke jaringan upline.</div>
          <button onClick={openNew} style={A.btnPrimary}>Buat Preset Pertama</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {presets.map(preset => (
            <div key={preset.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {/* Card Header */}
              <div style={{ padding: '18px 20px', background: preset.is_active ? 'linear-gradient(135deg, #4361ee08, #7c3aed05)' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{preset.name}</div>
                    {preset.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{preset.description}</div>}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: preset.is_active ? '#dcfce7' : '#fff1f2',
                    color: preset.is_active ? '#166534' : '#991b1b'
                  }}>
                    {preset.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                  Total rate terdistribusi: <strong style={{ color: '#4361ee' }}>{totalRate(preset.levels).toFixed(1)}%</strong>
                  {' '}ke {preset.levels?.length || 0} level jaringan
                </div>
              </div>

              {/* Level Breakdown */}
              <div style={{ padding: '14px 20px' }}>
                {(preset.levels || []).map(lv => (
                  <div key={lv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: `hsl(${220 + lv.level * 15}, 80%, ${55 + lv.level * 5}%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: '#fff'
                    }}>
                      {lv.level}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {lv.level === 1 ? 'Referrer Langsung' : `Upline Level ${lv.level}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
                      {(lv.rate * 100).toFixed(1)}%
                    </div>
                    {/* Visual bar */}
                    <div style={{ width: 60, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(lv.rate * 100 * 5, 100)}%`, background: '#4361ee', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f8fafc', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => openEdit(preset)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#4361ee', cursor: 'pointer' }}>
                  <i className="bx bx-pencil" /> Edit
                </button>
                <button onClick={() => handleDelete(preset.id)} disabled={deleting === preset.id} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', fontSize: 12, fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>
                  {deleting === preset.id ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-trash" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {modal.id ? 'Edit Preset' : 'Tambah Commission Preset'}
              </h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px 28px' }}>
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Nama Preset *</label>
                <input
                  type="text"
                  placeholder="Misal: Standard MLM, Agresif 5 Level..."
                  value={modal.name}
                  onChange={e => setModal(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Deskripsi</label>
                <textarea
                  placeholder="Jelaskan tujuan atau cara penggunaan preset ini..."
                  value={modal.description}
                  onChange={e => setModal(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Active toggle */}
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  onClick={() => setModal(p => ({ ...p, is_active: !p.is_active }))}
                  style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}
                >
                  <div style={{ width: 44, height: 24, borderRadius: 24, background: modal.is_active ? '#22c55e' : '#e2e8f0', transition: '0.3s' }} />
                  <div style={{ position: 'absolute', top: 2, left: modal.is_active ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Preset Aktif</span>
              </div>

              {/* Level Builder */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Distribusi Per Level Jaringan
                  </label>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    Total: <strong style={{ color: totalRate(modal.levels) > 100 ? '#ef4444' : '#4361ee' }}>
                      {totalRate(modal.levels).toFixed(1)}%
                    </strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {modal.levels?.map((lv, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '1px solid #f1f5f9' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${220 + lv.level * 15}, 70%, ${55 + lv.level * 5}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {lv.level}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        {lv.level === 1 ? 'Referrer Langsung' : `Upline Level ${lv.level}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={lv.rate}
                          onChange={e => updateLevel(idx, e.target.value)}
                          style={{ width: 70, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, textAlign: 'right', outline: 'none' }}
                        />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>%</span>
                      </div>
                      {modal.levels.length > 1 && (
                        <button type="button" onClick={() => removeLevel(idx)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>
                          <i className="bx bx-minus-circle" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addLevel}
                  style={{ marginTop: 10, width: '100%', padding: '9px', borderRadius: 10, border: '1.5px dashed #c7d2fe', background: '#f5f7ff', fontSize: 13, fontWeight: 600, color: '#4361ee', cursor: 'pointer' }}
                >
                  <i className="bx bx-plus" /> Tambah Level
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={saving} style={{ padding: '12px', borderRadius: 10, border: 'none', background: '#4361ee', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(67,97,238,0.3)' }}>
                  {saving ? 'Menyimpan...' : 'Simpan Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
