import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, idr, A } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

const API = ADMIN_API_BASE;
const INDIGO = 'linear-gradient(135deg, #6366f1, #4f46e5)';

function rankBadge(i) {
  const colors = ['#f59e0b', '#e2e8f0', '#d97706'];
  return {
    width: 28, height: 28, borderRadius: 8,
    background: colors[i] || '#f1f5f9',
    color: i < 3 ? '#fff' : '#64748b',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 900,
  };
}

const sx = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  },
  modal: {
    background: '#fff', borderRadius: 20, width: 580, maxWidth: '92vw',
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
  },
  header: {
    padding: '22px 28px 18px',
    borderBottom: '1px solid #f1f5f9',
    background: 'linear-gradient(135deg, #fafbff, #f0f4ff)',
  },
  body: {
    padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1,
  },
  footer: {
    padding: '16px 28px', borderTop: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    background: '#fafbfc',
  },
  label: {
    fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block',
    marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase',
  },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
    transition: 'border-color 0.15s',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 8, background: '#eef2ff',
    border: '1px solid #e0e7ff', fontSize: 11, fontWeight: 600, color: '#4338ca',
  },
  btn: (disabled) => ({
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: disabled ? '#cbd5e1' : INDIGO,
    color: '#fff', fontSize: 12, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'all 0.15s',
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
  }),
  closeBtn: {
    background: 'none', border: 'none', width: 32, height: 32, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#94a3b8', fontSize: 20,
    transition: 'all 0.15s',
  },
};

export default function WishlistStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/wishlist/stats`)
      .then(data => setStats(data || []))
      .catch(err => toast.error(err.message === "Load failed" ? 'Gagal terhubung ke server' : err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selCount = Object.values(selected).filter(Boolean).length;
  const allSel = selCount === stats.length && stats.length > 0;

  const toggleSel = (id) => setSelected(p => ({ ...p, [id]: !p[id] }));
  const toggleAll = () => {
    if (allSel) return setSelected({});
    const o = {}; stats.forEach(s => { o[s.product_id] = true }); setSelected(o);
  };

  const fmtUsers = (names) => {
    if (!names) return '-';
    const a = names.split(', ');
    return a.length <= 2 ? names : `${a[0]}, ${a[1]} +${a.length - 2} lain`;
  };

  // ── MODAL ──────────────────────────────────────
  const openNotify = (products) => {
    const list = Array.isArray(products) ? products : [products];
    const allUsers = [];
    const seen = new Set();
    list.forEach(p => {
      const ids = p.user_ids ? p.user_ids.split(',') : [];
      const names = p.user_names ? p.user_names.split(', ') : [];
      ids.forEach((id, i) => {
        if (!seen.has(id)) { seen.add(id); allUsers.push({ id, name: names[i] || id }); }
      });
    });
    setModal({
      products: list,
      sendAll: true, sel: [],
      title: `Produk wishlist sedang promo!`,
      msg: `Hai! Produk yang kamu wishlist sedang ada promo menarik. Yuk cek sekarang!`,
      users: allUsers,
    });
  };

  const closeModal = () => setModal(null);

  const sendNotif = async () => {
    if (!modal) return;
    const payload = {
      product_ids: modal.products.map(p => p.product_id),
      title: modal.title,
      message: modal.msg,
    };
    if (!modal.sendAll) payload.user_ids = modal.sel;
    try {
      const res = await fetchJson(`${API}/wishlist/notify`, { method: 'POST', body: JSON.stringify(payload) });
      toast.success(res.message || 'Notifikasi berhasil dikirim');
      closeModal();
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const toggleUser = (id) => {
    setModal(p => {
      const ids = p.sel.includes(id) ? p.sel.filter(x => x !== id) : [...p.sel, id];
      return { ...p, sel: ids };
    });
  };

  const maxC = stats[0]?.count || 1;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader
        title={<><i className="bx bxs-heart" style={{ color: '#ec4899', marginRight: 8 }} />Wishlist Insight</>}
        subtitle="Produk paling diminati — kirim notifikasi ke peminat secara individu atau massal."
      >
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </PageHeader>

      <TablePanel
        loading={loading}
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
              {stats.length} produk
            </span>
            {selCount > 0 && (
              <>
                <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                  {selCount} terpilih
                </span>
                <button
                  onClick={() => {
                    const sel = stats.filter(s => selected[s.product_id]);
                    openNotify(sel);
                  }}
                  style={sx.btn(false)}
                >
                  <i className="bx bx-bell" />Kirim Notif ke {selCount} Produk
                </button>
                <button
                  onClick={() => setSelected({})}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="bx bx-x" /> Hapus pilihan
                </button>
              </>
            )}
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ ...A.th, textAlign: 'center', width: 36, paddingLeft: 12 }}>
                  <input type="checkbox" checked={allSel} onChange={toggleAll}
                    style={{ cursor: 'pointer', accentColor: '#6366f1' }} />
                </th>
                <th style={{ ...A.th, textAlign: 'center', width: 36, padding: '0 4px' }}>#</th>
                <th style={{ ...A.th, paddingLeft: 10 }}>Produk</th>
                <th style={{ ...A.th, textAlign: 'left' }}>Merchant</th>
                <th style={{ ...A.th, textAlign: 'right' }}>Harga</th>
                <th style={{ ...A.th, textAlign: 'center' }}>Peminat</th>
                <th style={{ ...A.th, textAlign: 'center' }}>Minat</th>
                <th style={{ ...A.th, textAlign: 'center', paddingRight: 12 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="bx bx-heart" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                  Belum ada data wishlist
                </td></tr>
              ) : stats.map((s, i) => {
                const pct = Math.min(100, (s.count / maxC) * 100);
                const barBg = pct > 70 ? 'linear-gradient(90deg, #ec4899, #db2777)' : pct > 30 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #94a3b8, #64748b)';
                return (
                  <tr key={s.product_id}
                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ ...A.td, textAlign: 'center', width: 36, paddingLeft: 12 }}>
                      <input type="checkbox" checked={!!selected[s.product_id]}
                        onChange={() => toggleSel(s.product_id)}
                        style={{ cursor: 'pointer', accentColor: '#6366f1' }} />
                    </td>
                    <td style={{ ...A.td, textAlign: 'center', padding: '0 4px' }}>
                      <div style={rankBadge(i)}>{i + 1}</div>
                    </td>
                    <td style={A.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={formatImage(s.image)} alt=""
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', background: '#f8fafc' }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, lineHeight: '1.2' }}>{s.product_name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.product_id?.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={A.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#f0f4ff', color: '#4f46e5', fontSize: 11, fontWeight: 700 }}>
                        <i className="bx bx-store" />{s.store_name || '-'}
                      </span>
                    </td>
                    <td style={A.td}><div style={{ fontWeight: 600, color: '#334155', fontSize: 13, textAlign: 'right' }}>{idr(s.price)}</div></td>
                    <td style={{ ...A.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <i className="bx bxs-heart" style={{ color: '#ec4899', fontSize: 13 }} />
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>{s.count}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, maxWidth: 140 }} title={s.user_names}>
                        <i className="bx bx-user" style={{ marginRight: 2, fontSize: 9 }} />{fmtUsers(s.user_names)}
                      </div>
                    </td>
                    <td style={A.td}>
                      <div style={{ width: 88 }}>
                        <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barBg, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginTop: 2, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
                      </div>
                    </td>
                    <td style={{ ...A.td, textAlign: 'center', paddingRight: 12 }}>
                      <button onClick={() => openNotify(s)}
                        style={{
                          background: INDIGO, color: '#fff', border: 'none', borderRadius: 6,
                          padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <i className="bx bx-bell" /> Notif
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TablePanel>

      {/* ── MODAL (via portal) ── */}
      {modal && createPortal(
        <div style={sx.overlay} onClick={closeModal}>
          <div style={sx.modal} onClick={e => e.stopPropagation()}>
            {/* HEADER */}
            <div style={sx.header}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: INDIGO, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                    }}>
                      <i className="bx bx-bell" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Kirim Notifikasi</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {modal.products.length} produk • {modal.users.length} penerima
                      </p>
                    </div>
                  </div>
                </div>
                <button onClick={closeModal}
                  style={sx.closeBtn}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8' }}>
                  <i className="bx bx-x" />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div style={sx.body}>
              {/* Selected products */}
              <div>
                <label style={sx.label}>
                  <i className="bx bx-package" style={{ marginRight: 4 }} />Produk Terpilih
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {modal.products.map(p => (
                    <span key={p.product_id} style={sx.chip}>
                      <img src={formatImage(p.image)} alt=""
                        style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }} />
                      {p.product_name?.length > 22 ? p.product_name.slice(0, 22) + '…' : p.product_name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={sx.label}>
                  <i className="bx bx-heading" style={{ marginRight: 4 }} />Judul Notifikasi
                </label>
                <input style={sx.input}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  value={modal.title}
                  onChange={e => setModal(p => ({ ...p, title: e.target.value }))}
                  placeholder="cth: Produk wishlist sedang promo!" />
              </div>

              {/* Message */}
              <div>
                <label style={sx.label}>
                  <i className="bx bx-message-detail" style={{ marginRight: 4 }} />Pesan
                </label>
                <textarea style={{ ...sx.input, resize: 'vertical', minHeight: 70, lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  rows={3} value={modal.msg}
                  onChange={e => setModal(p => ({ ...p, msg: e.target.value }))}
                  placeholder="Tulis pesan untuk pengguna..." />
              </div>

              {/* Recipients */}
              <div>
                <label style={{ ...sx.label, marginBottom: 8 }}>
                  <i className="bx bx-user" style={{ marginRight: 4 }} />Penerima
                  <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>
                    {modal.users.length} orang
                  </span>
                </label>

                <div style={{
                  background: modal.sendAll ? '#f0fdf4' : '#f8fafc',
                  border: modal.sendAll ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderRadius: 12, padding: 12, transition: 'all 0.15s',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      background: modal.sendAll ? '#22c55e' : '#fff',
                      border: modal.sendAll ? 'none' : '2px solid #cbd5e1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {modal.sendAll && <i className="bx bx-check" style={{ color: '#fff', fontSize: 14 }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Kirim ke semua penerima</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Notifikasi akan dikirim ke {modal.users.length} pengguna sekaligus</div>
                    </div>
                    <span style={{
                      marginLeft: 'auto', padding: '2px 10px', borderRadius: 20,
                      background: modal.sendAll ? '#dcfce7' : '#f1f5f9',
                      color: modal.sendAll ? '#16a34a' : '#94a3b8',
                      fontSize: 11, fontWeight: 700,
                    }}>{modal.users.length}</span>
                  </label>
                  <div style={{
                    marginTop: modal.sendAll ? 10 : 0, height: modal.sendAll ? 1 : 0,
                    background: '#e2e8f0', transition: 'all 0.2s', opacity: modal.sendAll ? 1 : 0,
                  }} />
                  <div style={{
                    marginTop: 10, display: modal.sendAll ? 'block' : 'none',
                  }}>
                    <button onClick={() => setModal(p => ({ ...p, sendAll: false }))}
                      style={{
                        background: 'none', border: 'none', color: '#6366f1', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', padding: 0,
                      }}>
                      <i className="bx bx-list-ul" style={{ marginRight: 4 }} />Pilih penerima secara manual
                    </button>
                  </div>
                </div>

                {!modal.sendAll && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {modal.sel.length} dari {modal.users.length} dipilih
                      </span>
                      <button onClick={() => setModal(p => ({ ...p, sel: p.users.map(u => u.id) }))}
                        style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Pilih semua
                      </button>
                    </div>
                    <div style={{
                      maxHeight: 140, overflowY: 'auto',
                      border: '1px solid #e2e8f0', borderRadius: 10, padding: 4,
                    }}>
                      {modal.users.map(u => (
                        <label key={u.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                          fontSize: 12, transition: 'all 0.1s',
                          background: modal.sel.includes(u.id) ? '#f0f4ff' : 'transparent',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = modal.sel.includes(u.id) ? '#eef2ff' : '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = modal.sel.includes(u.id) ? '#f0f4ff' : 'transparent'}
                        >
                          <input type="checkbox" checked={modal.sel.includes(u.id)}
                            onChange={() => toggleUser(u.id)}
                            style={{ accentColor: '#6366f1', margin: 0 }} />
                          <div style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: '#e0e7ff', color: '#4338ca',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, flexShrink: 0,
                          }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color: '#334155', fontWeight: 600, flex: 1 }}>{u.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: 9 }}>{u.id.slice(0, 8)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div style={sx.footer}>
              <button onClick={closeModal}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
                  background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
                Batal
              </button>
              <button onClick={sendNotif}
                disabled={!modal.sendAll && modal.sel.length === 0}
                style={sx.btn(!modal.sendAll && modal.sel.length === 0)}
                onMouseEnter={e => { if (!(!modal.sendAll && modal.sel.length === 0)) e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={e => { if (!(!modal.sendAll && modal.sel.length === 0)) e.currentTarget.style.opacity = '1' }}>
                <i className="bx bx-send" />Kirim Notifikasi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
