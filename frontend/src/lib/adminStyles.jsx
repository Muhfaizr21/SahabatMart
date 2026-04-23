import React from 'react';
import { createPortal } from 'react-dom';
// ─── SHARED ADMIN DESIGN SYSTEM ─────────────────────────
// Use this across all admin pages for consistent, clean UI

export const A = {
  // Page wrapper
  page: {
    display: 'flex', flexDirection: 'column', gap: 24,
    fontFamily: "'Inter', sans-serif",
  },

  // Card (white panel)
  card: {
    background: '#fff', borderRadius: 16,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
    overflow: 'hidden',
  },

  // Card with padding
  cardBody: { padding: '20px 24px' },

  // Stat card (KPI mini)
  statCard: (color) => ({
    background: '#fff', borderRadius: 16, padding: '20px 20px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column', gap: 12,
  }),

  // Icon box
  iconBox: (color) => ({
    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
    background: color + '12',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),

  // Heading row (page title + actions)
  pageHead: {
    display: 'flex', alignItems: 'flex-end',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
  },

  // Table header cell
  th: {
    padding: '11px 16px', fontSize: 10, fontWeight: 800,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em',
    background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap',
  },

  // Table body cell
  td: {
    padding: '13px 16px', borderBottom: '1px solid #f8fafc',
    verticalAlign: 'middle', fontSize: 13.5, color: '#334155',
  },

  // Primary button
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', borderRadius: 11, border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
  },

  // Ghost button
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', borderRadius: 11,
    border: '1px solid #e2e8f0', background: '#fff',
    color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },

  // Small icon action button
  iconBtn: (color = '#6366f1', bg = 'rgba(99,102,241,0.08)') => ({
    width: 34, height: 34, borderRadius: 10, border: 'none',
    background: bg, color: color,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 16, flexShrink: 0,
  }),

  // Badge / pill
  badge: (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 20,
    background: bg, color: color,
    fontSize: 11, fontWeight: 700,
  }),

  // Filter tab button
  tab: (active) => ({
    padding: '7px 16px', borderRadius: 10, border: 'none',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
    background: active ? '#6366f1' : 'transparent',
    color: active ? '#fff' : '#64748b',
    transition: 'all 0.15s',
  }),

  // Search input wrapper
  searchWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchInput: {
    padding: '9px 12px 9px 36px', borderRadius: 11,
    border: '1px solid #e2e8f0', fontSize: 13, color: '#334155',
    background: '#f8fafc', outline: 'none', width: 220,
  },
  searchIcon: {
    position: 'absolute', left: 11, fontSize: 16, color: '#94a3b8', pointerEvents: 'none',
  },

  // Modal overlay
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500,
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalHead: {
    background: '#0f172a', color: '#f1f5f9',
    padding: '20px 24px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
  },
  modalBody: { padding: 24 },

  // Empty state
  empty: {
    textAlign: 'center', padding: '60px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },

  // Select input
  select: {
    padding: '9px 12px', borderRadius: 11, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#334155', background: '#f8fafc',
    outline: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  },

  // Standard Text Input
  input: {
    padding: '11px 16px', borderRadius: 11, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#334155', background: '#f8fafc',
    outline: 'none', width: '100%', fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s', boxSizing: 'border-box'
  },

  // Textarea
  textarea: {
    padding: '10px 14px', borderRadius: 11, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#334155', background: '#f8fafc',
    outline: 'none', width: '100%', fontFamily: "'Inter', sans-serif",
    resize: 'vertical',
  },
};

// ─── STATUS BADGE HELPERS ────────────────────────────────
export const statusBadge = (status) => {
  const map = {
    active:     { color: '#16a34a', bg: '#f0fdf4' },
    pending:    { color: '#d97706', bg: '#fffbeb' },
    suspended:  { color: '#dc2626', bg: '#fff1f2' },
    banned:     { color: '#7f1d1d', bg: '#fee2e2' },
    completed:  { color: '#16a34a', bg: '#f0fdf4' },
    cancelled:  { color: '#dc2626', bg: '#fff1f2' },
    processing: { color: '#2563eb', bg: '#eff6ff' },
    shipped:    { color: '#7c3aed', bg: '#f5f3ff' },
    verified:   { color: '#16a34a', bg: '#f0fdf4' },
    published:  { color: '#16a34a', bg: '#f0fdf4' },
    draft:      { color: '#64748b', bg: '#f1f5f9' },
    taken_down: { color: '#dc2626', bg: '#fff1f2' },
    out_of_stock: { color: '#ef4444', bg: '#fef2f2' },
  };
  const s = map[status] || { color: '#64748b', bg: '#f1f5f9' };
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 20,
    background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
  };
};

export const roleBadge = (role) => {
  const map = {
    superadmin: { color: '#7c3aed', bg: '#f5f3ff' },
    admin:      { color: '#2563eb', bg: '#eff6ff' },
    merchant:   { color: '#0891b2', bg: '#ecfeff' },
    affiliate:  { color: '#ea580c', bg: '#fff7ed' },
    buyer:      { color: '#64748b', bg: '#f1f5f9' },
  };
  const s = map[role] || { color: '#64748b', bg: '#f1f5f9' };
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 20,
    background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };
};

// ─── COMMON PAGE HEADER ──────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 0 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: subtitle ? 4 : 0, margin: 0 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 0, fontWeight: 400, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>{children}</div>
      )}
    </div>
  );
}

// ─── KPI STAT ROW ────────────────────────────────────────
export function StatRow({ stats }) {
  const cols = stats.length;
  return (
    <>
      <style>{`
        .admin-stat-row {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .admin-stat-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 520px) {
          .admin-stat-row {
            grid-template-columns: repeat(1, 1fr);
          }
        }
      `}</style>
      <div className="admin-stat-row">
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 16, padding: '18px 20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: s.color + '14',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`bx ${s.icon}`} style={{ fontSize: 22, color: s.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, whiteSpace: 'nowrap' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── TABLE PANEL ─────────────────────────────────────────
export function TablePanel({ children, toolbar, tabs, loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header toolbar */}
      {(toolbar || tabs) && (
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          {tabs && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{tabs}</div>
          )}
          {toolbar && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: tabs ? 'auto' : 0 }}>{toolbar}</div>
          )}
        </div>
      )}
      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid #e0e7ff', borderTopColor: '#6366f1',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Memuat data...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>{children}</div>
      )}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000000,
      background: 'rgba(15, 23, 42, 0.7)', 
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
      overflowY: 'auto',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      {/* Floating Close Button Outside (Premium Style) */}
      <button 
        onClick={onClose}
        style={{
          position: 'fixed', top: 30, right: 30,
          width: 54, height: 54, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer', fontSize: 32, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 1000001
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'; e.currentTarget.style.background = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      >
        <i className='bx bx-x'></i>
      </button>

      <div style={{
        background: '#fff', borderRadius: 32,
        width: '100%', maxWidth: wide ? 900 : 550,
        margin: 'auto',
        boxShadow: '0 100px 150px -30px rgba(0,0,0,0.5)',
        animation: 'modalEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden', position: 'relative'
      }}>
        {title && (
          <div style={{ padding: '35px 45px 25px', display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 6, height: 24, background: '#4f46e5', borderRadius: 10 }}></div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.7px' }}>{title}</h2>
          </div>
        )}
        <div style={{ padding: '0 45px 45px' }}>{children}</div>
      </div>

      <style>{`
        @keyframes modalEntrance { 
           from { opacity: 0; transform: translateY(50px) scale(0.9); } 
           to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─── LABEL ───────────────────────────────────────────────
export function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{children}</div>;
}

// ─── IDR FORMAT ──────────────────────────────────────────
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
