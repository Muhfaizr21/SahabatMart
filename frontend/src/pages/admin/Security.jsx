import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, TablePanel, statusBadge, fmtDate, StatRow } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

const AdminSecurity = () => {
    const [clicks, setClicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, fraud: 0, bots: 0, secure: 0 });

    const loadClicks = () => {
        setLoading(true);
        fetchJson(`${ADMIN_API_BASE}/affiliate-clicks`)
            .then(d => {
                const list = (Array.isArray(d) ? d : d.data) || [];
                setClicks(list);
                setStats({
                    total: list.length,
                    fraud: list.filter(c => c.is_fraud).length,
                    bots: list.filter(c => c.is_bot).length,
                    secure: list.filter(c => !c.is_fraud && !c.is_bot).length
                });
            })
            .catch(err => toast.error('Gagal memuat log keamanan'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadClicks(); }, []);

    // Security score calculation
    const securityScore = stats.total > 0 ? Math.round((stats.secure / stats.total) * 100) : 100;
    const scoreColor = securityScore > 90 ? '#10b981' : securityScore > 70 ? '#f59e0b' : '#ef4444';

    const kpiStats = [
        { label: 'Total Clicks', val: stats.total.toLocaleString(), icon: 'bx-mouse', color: '#6366f1' },
        { label: 'Fraud Alerts', val: stats.fraud.toLocaleString(), icon: 'bx-shield-x', color: '#ef4444' },
        { label: 'Bot Traffic', val: stats.bots.toLocaleString(), icon: 'bx-bot', color: '#f59e0b' },
        { label: 'Auth Failures', val: '12', icon: 'bx-lock-alt', color: '#0f172a' }
    ];

    return (
        <div style={A.page}>
            <div style={A.pageHead}>
                <PageHeader 
                    title="Security & Fraud Center" 
                    subtitle="Monitor platform integrity and affiliate click patterns."
                />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ 
                        background: 'white', padding: '8px 16px', borderRadius: 12, 
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Security Score</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{securityScore}%</div>
                    </div>
                    <button onClick={loadClicks} style={A.btnGhost}>
                        <i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <StatRow stats={kpiStats} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                <TablePanel loading={loading}>
                    <div style={{ padding: '0 24px', borderBottom: '1px solid #f1f5f9', height: 60, display: 'flex', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bx bx-list-ul text-blue-500" /> Audit Log Klik Afiliasi
                        </h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...A.th, paddingLeft: 24 }}>Waktu / IP Address</th>
                                <th style={A.th}>Affiliate</th>
                                <th style={A.th}>Referrer</th>
                                <th style={A.th}>Status</th>
                                <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clicks.map(c => (
                                <tr key={c.id} style={A.tr}>
                                    <td style={{ ...A.td, paddingLeft: 24 }}>
                                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13 }}>{c.ip_address}</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{fmtDate(c.created_at)}</div>
                                    </td>
                                    <td style={A.td}>
                                        <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                                            {c.affiliate_id.slice(0, 8)}
                                        </div>
                                    </td>
                                    <td style={{ ...A.td, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: 12, color: '#64748b' }}>{c.referrer || 'Direct'}</span>
                                    </td>
                                    <td style={A.td}>
                                        <span style={statusBadge(c.is_fraud ? 'cancelled' : (c.is_bot ? 'shipped' : 'published'))}>
                                            {c.is_fraud ? 'FRAUD' : (c.is_bot ? 'BOT' : 'SECURE')}
                                        </span>
                                    </td>
                                    <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                                        <button style={A.iconBtn('#ef4444', '#fef2f2')} title="Block"><i className="bx bx-block" /></button>
                                    </td>
                                </tr>
                            ))}
                            {clicks.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>Belum ada data audit terkini.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TablePanel>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ ...A.card, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bx bx-info-circle text-blue-400" />
                            </div>
                            <h4 style={{ fontWeight: 800, margin: 0 }}>Intelligence Tips</h4>
                        </div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 0 }}>
                            Sistem mendeteksi pola klik tidak wajar seperti IP duplikat, UA bot, dan anomali referrer. 
                            Super Admin berhak membatalkan komisi jika ditemukan kecurangan.
                        </p>
                    </div>

                    <div style={{ ...A.card, padding: 24 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 900, marginBottom: 16, margin: 0 }}>Security Actions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                            <button style={{ ...A.btnGhost, justifyContent: 'start', width: '100%', fontSize: 13 }}>
                                <i className="bx bx-fingerprint opacity-50" /> Purge Logs
                            </button>
                            <button style={{ ...A.btnGhost, justifyContent: 'start', width: '100%', fontSize: 13 }}>
                                <i className="bx bx-history opacity-50" /> Whitelist IP
                            </button>
                            <button style={{ ...A.btnGhost, justifyContent: 'start', width: '100%', color: '#ef4444', fontSize: 13 }}>
                                <i className="bx bx-power-off opacity-50" /> Lockdown Mode
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSecurity;
