import React from 'react';
import { A } from './adminStyles.jsx';
/* ─── SEARCH ─────────────────── */
export function AdminSearch({ value, onChange, placeholder, ...props }) {
  return (
    <div style={A.searchWrap}>
      <i className="bx bx-search" style={A.searchIcon} />
      <input
        className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
}

/* ─── INPUT ──────────────────── */
export function AdminInput({ value, onChange, placeholder, ...props }) {
  return (
    <input
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  );
}

/* ─── TEXTAREA ───────────────── */
export function AdminTextarea({ value, onChange, placeholder, rows = 3, ...props }) {
  return (
    <textarea
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all resize-y placeholder:text-slate-400"
      style={{ minHeight: 28 * rows }}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

/* ─── FORM ACTIONS (Batal/Simpan) ─── */
export function AdminFormActions({ onCancel, onSave, saving, label = 'Simpan', icon = 'bx-save', savingLabel }) {
  const handleSave = (e) => {
    if (onSave) { e.preventDefault(); onSave(); }
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
        onClick={onCancel}
      >
        Batal
      </button>
      <button
        type={onSave ? 'button' : 'submit'}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? (savingLabel || '...') : <><i className={`bx ${icon}`} /> {label}</>}
      </button>
    </div>
  );
}

/* ─── PAGINATION ─────────────── */
export function AdminPagination({ page, totalPages, totalItems, onChange, label = 'item', pageSize = 8 }) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const btn = (p, label) => (
    <button
      disabled={p === page}
      onClick={() => onChange(p)}
      style={{
        width: 32, height: 32, borderRadius: 8,
        border: page === p ? 'none' : '1px solid #e2e8f0',
        background: page === p ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#fff',
        color: page === p ? '#fff' : '#475569',
        fontSize: 12, fontWeight: 700, cursor: page === p ? 'default' : 'pointer',
      }}
    >
      {label ?? p}
    </button>
  );

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 24px', background: '#fff', borderTop: '1px solid #f1f5f9',
      fontSize: 13, color: '#64748b',
    }}>
      <div>
        Menampilkan <strong>{firstItem}</strong> - <strong>{lastItem}</strong> dari <strong>{totalItems}</strong> {label}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            opacity: page === 1 ? 0.5 : 1,
            border: '1px solid #e2e8f0', background: '#fff',
            fontWeight: 700, color: '#475569',
          }}
        >
          Sebelumnya
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {getPages().map((n, i) =>
            n === '...'
              ? <span key={`e-${i}`} style={{ width: 32, textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 14 }}>...</span>
              : btn(n)
          )}
        </div>
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12,
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
            opacity: page === totalPages ? 0.5 : 1,
            border: '1px solid #e2e8f0', background: '#fff',
            fontWeight: 700, color: '#475569',
          }}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}

/* ─── EMPTY STATE (table row) ── */
export function AdminEmptyState({ colSpan = 5, icon = 'bx-package', message = 'Tidak ada data.', subtitle }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
        <i className={`bx ${icon}`} style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.2 }} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>{message}</div>
        {subtitle && <div style={{ fontSize: 13, marginTop: 4, color: '#94a3b8' }}>{subtitle}</div>}
      </td>
    </tr>
  );
}

/* ─── ACTION BUTTONS ─────────── */
export function AdminActionButtons({ onEdit, onDelete, children }) {
  return (
    <div style={{ display: 'inline-flex', gap: 6 }}>
      {onEdit && (
        <button style={A.iconBtn('#f59e0b', '#fffbeb')} onClick={onEdit} title="Edit">
          <i className="bx bx-pencil" />
        </button>
      )}
      {onDelete && (
        <button style={A.iconBtn('#ef4444', '#fff1f2')} onClick={onDelete} title="Hapus">
          <i className="bx bx-trash" />
        </button>
      )}
      {children}
    </div>
  );
}

/* ─── BULK ACTIONS ───────────── */
export function AdminBulkActions({ count, onDelete, label = 'Terpilih' }) {
  if (!count) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fee2e2' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{count} {label}</span>
      <button
        onClick={onDelete}
        className="flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        style={{ background: '#ef4444', height: 32, padding: '0 12px', fontSize: 12 }}
      >
        <i className="bx bx-trash" /> Hapus Terpilih
      </button>
    </div>
  );
}

/* ─── TOOLBAR ROW (flex group) ─ */
export function AdminToolbarLeft({ children }) {
  return <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>;
}

export function AdminToolbarRight({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>{children}</div>;
}

/* ─── PAGE TOOLBAR ───────────── */
export function AdminToolbar({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
      {children}
    </div>
  );
}



