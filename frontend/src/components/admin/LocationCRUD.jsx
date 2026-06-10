import React, { useState } from 'react';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';

const API = ADMIN_API_BASE;
const idr = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

// ─── ICON ─────────────────────────────────────────────────
const Icon = ({ name, size = 14 }) => <i className={`bx ${name}`} style={{ fontSize: size }} />;

// ─── CONFIRM DIALOG ───────────────────────────────────────
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-150">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <Icon name="bxs-trash" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">Batal</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
};

// ─── FORM MODAL ───────────────────────────────────────────
const FormModal = ({ isOpen, mode, location, onClose, onSuccess }) => {
  const [name, setName]       = useState('');
  const [balance, setBalance] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState({});

  React.useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && location) {
        setName(location.name || '');
        setBalance(String(location.balance || 0));
        setIsPrimary(location.is_primary || false);
      } else {
        setName(''); setBalance(''); setIsPrimary(false);
      }
      setErr({});
    }
  }, [isOpen, mode, location]);

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Min. 2 karakter';
    if (!balance.trim() || isNaN(Number(balance))) e.balance = 'Harus angka valid';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let r;
      if (mode === 'create') {
        r = await fetch(`${API}/finance/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ name: name.trim(), balance: Number(balance), is_primary: isPrimary }),
        });
      } else {
        r = await fetch(`${API}/finance/locations/update?id=${location.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ name: name.trim(), balance: Number(balance), is_primary: isPrimary }),
        });
      }
      const res = await r.json();
      if (r.ok) {
        toast.success(mode === 'create' ? 'Kas/Bank ditambahkan' : 'Kas/Bank diperbarui');
        onSuccess();
        onClose();
      } else { toast.error(res.message || 'Gagal menyimpan'); }
    } catch { toast.error('Terjadi kesalahan koneksi'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in duration-150">
        <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-slate-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'create' ? 'bg-indigo-50 text-indigo-500' : 'bg-sky-50 text-sky-500'}`}>
            <Icon name={mode === 'create' ? 'bx-plus-circle' : 'bx-edit'} size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{mode === 'create' ? 'Tambah Kas / Bank' : 'Edit Kas / Bank'}</h3>
            <p className="text-[10px] text-slate-400 font-medium">{mode === 'edit' ? `Mengedit: ${location?.name}` : 'Tambahkan rekening baru'}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 bg-slate-100 hover:bg-rose-50 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all text-slate-400">
            <Icon name="bx-x" size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nama Kas / Bank</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Bank BCA - Utama"
              className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all ${err.name ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-400'}`} />
            {err.name && <p className="text-[10px] text-rose-500 font-semibold mt-1">{err.name}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Saldo (Rp)</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0"
              className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all ${err.balance ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-400'}`} />
            {err.balance && <p className="text-[10px] text-rose-500 font-semibold mt-1">{err.balance}</p>}
            {balance && !isNaN(Number(balance)) && (
              <p className="text-[10px] text-slate-400 font-medium mt-1">{idr(Number(balance))}</p>
            )}
          </div>
          <div
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer select-none"
            onClick={() => setIsPrimary(!isPrimary)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPrimary ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                <Icon name={isPrimary ? 'bx-check-circle' : 'bx-circle'} size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">Jadikan Rekening Utama</div>
                <div className="text-[10px] text-slate-400 font-medium">Hanya 1 yang aktif sebagai utama</div>
              </div>
            </div>
            <div className={`w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all duration-200 ${isPrimary ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
              <div className="w-5 h-5 bg-white rounded-full shadow" />
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
              {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {mode === 'create' ? 'Tambah' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── LOCATION CRUD ───────────────────────────────────────
export default function LocationCRUD({ locations = [], onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editLoc, setEditLoc]   = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalBalance = locations.reduce((s, l) => s + l.balance, 0);
  const primaryLoc   = locations.find(l => l.is_primary);

  const openCreate = () => { setFormMode('create'); setEditLoc(null); setShowForm(true); };
  const openEdit   = (loc) => { setFormMode('edit'); setEditLoc(loc); setShowForm(true); };
  const confirmDelete = (loc) => { setDeleteTarget(loc); setShowConfirm(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API}/finance/locations?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'ngrok-skip-browser-warning': 'true' },
      });
      const res = await r.json();
      if (r.ok) { toast.success('Kas/Bank dihapus'); onRefresh(); }
      else toast.error(res.message || 'Gagal menghapus');
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setDeleting(false); setShowConfirm(false); setDeleteTarget(null); }
  };

  return (
    <>
      {/* Summary Strip */}
      <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-5">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Saldo</div>
          <div className="text-sm font-extrabold text-slate-900">{idr(totalBalance)}</div>
        </div>
        {primaryLoc && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rekening Utama</div>
            <div className="text-sm font-bold text-indigo-600">{primaryLoc.name}</div>
          </div>
        )}
        <div className="ml-auto">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
            <Icon name="bx-plus" size={13} /> Tambah Kas
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Lokasi</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo</th>
              <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {locations.length > 0 ? locations.map((loc, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${loc.is_primary ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon name={loc.name.toLowerCase().includes('kas') ? 'bx-wallet-alt' : 'bx-credit-card'} size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{loc.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {loc.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="font-extrabold text-slate-900">{idr(loc.balance)}</span>
                </td>
                <td className="px-5 py-4 text-center">
                  {loc.is_primary ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Utama
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Biasa
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(loc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                    >
                      <Icon name="bx-edit" size={12} /> Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(loc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-rose-500 bg-white border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                    >
                      <Icon name="bx-trash" size={12} /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Icon name="bx-wallet" size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">Belum ada kas/bank</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Tambahkan lokasi kas untuk mulai mencatat</p>
                    </div>
                    <button onClick={openCreate} className="mt-1 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all">
                      + Tambah Kas Pertama
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        isOpen={showForm}
        mode={formMode}
        location={editLoc}
        onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); onRefresh(); }}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        title="Hapus Kas / Bank?"
        message={deleteTarget ? `Yakin menghapus "${deleteTarget.name}"? Saldo akan dikembalikan.` : ''}
        onConfirm={handleDelete}
        onCancel={() => { setShowConfirm(false); setDeleteTarget(null); }}
      />
    </>
  );
}