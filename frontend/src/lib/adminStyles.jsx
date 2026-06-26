import React from 'react';
import { createPortal } from 'react-dom';

// ─── SHARED ADMIN DESIGN SYSTEM (PREMIUM) ──────────────
// Elegant, minimal, "Radiant Clinical" style. High contrast, clean spacing.

export const A = {
  // Page wrapper - letting CSS handle most, just ensuring flex gap
  page: {
    display: 'flex', flexDirection: 'column', gap: '1.5rem',
  },

  // Card styles (fallback for those not migrated)
  card: {
    background: '#fff', borderRadius: '1rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    overflow: 'hidden',
  },

  cardBody: { padding: '1.5rem' },

  // Table header cell (Premium look: subtle bg, tight tracking)
  th: {
    padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap', textAlign: 'left'
  },

  // Table body cell
  td: {
    padding: '1rem', borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle', fontSize: '0.875rem', color: '#0f172a',
  },

  // Icon buttons
  iconBtn: (color = '#4f46e5', bg = '#e0e7ff') => ({
    width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', border: 'none',
    background: bg, color: color,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '1.25rem', flexShrink: 0,
    transition: 'all 0.2s ease',
  }),

  // Search input wrapper
  searchWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchInput: {
    padding: '0.625rem 1rem 0.625rem 2.5rem', borderRadius: '0.75rem',
    border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#0f172a',
    background: '#fff', outline: 'none', width: '100%',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  searchIcon: {
    position: 'absolute', left: '0.875rem', fontSize: '1.125rem', color: '#94a3b8', pointerEvents: 'none',
  },

  // Tab
  tab: (active) => ({
    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
    background: active ? '#4f46e5' : 'transparent',
    color: active ? '#fff' : '#64748b',
    transition: 'all 0.2s',
  }),

  // Badge style (used by RestockModeration and other admin pages)
  badge: (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    padding: '0.125rem 0.5rem', borderRadius: '9999px',
    background: bg, color: color,
    fontSize: '0.7rem', fontWeight: 700,
    border: `1px solid ${color}33`,
    whiteSpace: 'nowrap',
  }),

  // Icon box (used by Moderation.jsx)
  iconBox: (color) => ({
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
};

// ─── STATUS BADGE HELPERS ────────────────────────────────
export const statusBadge = (status) => {
  const map = {
    active:     { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    pending:    { color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
    suspended:  { color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
    banned:     { color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
    completed:  { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    approved:   { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    paid:       { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    cancelled:  { color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
    processing: { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
    processed:  { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
    shipped:    { color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe' },
    verified:   { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    published:  { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
    draft:      { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
    taken_down: { color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
    out_of_stock: { color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  };
  const s = map[status?.toLowerCase()] || { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    padding: '0.125rem 0.625rem', borderRadius: '9999px',
    background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 600,
    border: `1px solid ${s.border}`
  };
};

export const roleBadge = (role) => {
  const map = {
    superadmin: { color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe' },
    admin:      { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
    merchant:   { color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
    affiliate:  { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
    buyer:      { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
  };
  const s = map[role?.toLowerCase()] || { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    padding: '0.125rem 0.625rem', borderRadius: '9999px',
    background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    border: `1px solid ${s.border}`
  };
};

// ─── COMPONENTS WITH TAILWIND ─────────────────────────────

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 mb-0">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex items-center gap-3 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
}

export function StatRow({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 transition-shadow hover:shadow-md">
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
            <i className={`bx ${s.icon} text-2xl`} style={{ color: s.color }}></i>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{s.label}</div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight truncate">{s.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TablePanel({ children, toolbar, tabs, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {(toolbar || tabs) && (
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          {tabs && <div className="flex gap-2 flex-wrap">{tabs}</div>}
          {toolbar && <div className="flex gap-3 flex-wrap sm:ml-auto">{toolbar}</div>}
        </div>
      )}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Memuat data...</span>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          {children}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div 
        className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
      >
        {title && (
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="bx bx-x text-xl"></i>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FieldLabel({ children }) {
  return <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{children}</div>;
}

// ─── FORMATTERS ──────────────────────────────────────────
export const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtRelativeTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}j lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}h lalu`;
  return fmtDate(d);
};
