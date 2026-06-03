import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MaintenancePage({ message }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = () => {
    setChecking(true);
    const base = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE)
      ? window.APP_CONFIG.API_BASE.replace(/\/+$/, '')
      : (import.meta.env.VITE_API_BASE || '');
    fetch(`${base}/api/public/configs`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    })
      .then(r => {
        if (r.status === 503) return null;
        return r.json();
      })
      .then(data => {
        if (!data) { setChecking(false); return; }
        const raw = data.data || {};
        const maint = raw.platform_maintenance || raw['platform_maintenance'] || '';
        if (maint !== 'true' && maint !== true) {
          navigate(0); // reload
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: 24,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background circles */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(67,97,238,0.15) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        animation: 'pulse 3s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,63,94,0.1) 0%, transparent 70%)',
        top: '20%', right: '-10%',
        animation: 'pulse 4s ease-in-out infinite 1s',
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>

      {/* Gear icon with spin */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: 'linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        boxShadow: '0 0 60px rgba(67,97,238,0.4)',
        animation: 'float 3s ease-in-out infinite',
      }}>
        <i className="bx bx-wrench-alt-2" style={{ fontSize: 48, color: '#fff' }} />
      </div>

      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 20px', borderRadius: 9999,
        background: 'rgba(67,97,238,0.2)',
        border: '1px solid rgba(67,97,238,0.4)',
        marginBottom: 24,
        fontSize: 13, fontWeight: 700,
        color: '#818cf8', letterSpacing: '1px', textTransform: 'uppercase',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#f59e0b',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        Pemeliharaan Sistem
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
        Sedang Dalam<br />
        <span style={{
          background: 'linear-gradient(135deg, #818cf8 0%, #f472b6 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Pemeliharaan</span>
      </h1>

      <p style={{
        fontSize: 16, color: '#94a3b8', maxWidth: 480,
        lineHeight: 1.7, marginBottom: 16,
      }}>
        {message || 'Platform sedang dalam pemeliharaan rutin. Mohon tunggu sebentar, kami akan kembali segera.'}
      </p>

      {/* Estimated time */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: 40,
        fontSize: 14, color: '#cbd5e1',
      }}>
        <i className="bx bx-time-five" style={{ fontSize: 18, color: '#818cf8' }} />
        Estimasi selesai: <strong style={{ color: '#e2e8f0' }}>± 30 menit</strong>
      </div>

      {/* Check again button */}
      <button
        onClick={handleCheckAgain}
        disabled={checking}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', borderRadius: 10,
          border: 'none', cursor: checking ? 'not-allowed' : 'pointer',
          background: checking ? 'rgba(99,102,241,0.5)' : '#4338ca',
          color: '#fff', fontSize: 14, fontWeight: 600,
          marginBottom: 28,
          transition: 'all 0.2s',
        }}
      >
        {checking ? (
          <>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            Memeriksa...
          </>
        ) : (
          <>
            <i className="bx bx-refresh" style={{ fontSize: 18 }} />
            Cek Lagi
          </>
        )}
      </button>

      {/* Contact info */}
      <div style={{ fontSize: 13, color: '#64748b' }}>
        Butuh bantuan? Hubungi kami di{' '}
        <a href="mailto:support@akuglow.id" style={{ color: '#818cf8', textDecoration: 'none' }}>
          support@akuglow.id
        </a>
        {' '}atau{' '}
        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer"
          style={{ color: '#818cf8', textDecoration: 'none' }}>
          WhatsApp
        </a>
      </div>

      {/* Logo footer */}
      <div style={{ position: 'absolute', bottom: 32, fontSize: 13, color: '#475569', fontWeight: 600, letterSpacing: '0.5px' }}>
        AkuGlow Platform
      </div>
    </div>
  );
}