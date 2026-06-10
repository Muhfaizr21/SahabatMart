import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, MERCHANT_API_BASE } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, A, idr, fmtDate } from '../../lib/adminStyles.jsx';

const TX_TYPES = {
  commission_earned: { label: 'Komisi Diterima', color: '#10b981', bg: '#ecfdf5', icon: 'bx-trending-up' },
  commission_reversed: { label: 'Komisi Dibatalkan', color: '#ef4444', bg: '#fef2f2', icon: 'bx-trending-down' },
  sale_revenue: { label: 'Pendapatan Penjualan', color: '#10b981', bg: '#ecfdf5', icon: 'bx-plus-circle' },
  sale_revenue_reversed: { label: 'Penjualan Dibatalkan', color: '#ef4444', bg: '#fef2f2', icon: 'bx-minus-circle' },
  withdrawal_request: { label: 'Pengajuan Payout', color: '#f59e0b', bg: '#fffbeb', icon: 'bx-time-five' },
  withdrawal_completed: { label: 'Payout Selesai', color: '#10b981', bg: '#ecfdf5', icon: 'bx-check-circle' },
  withdrawal_rejected: { label: 'Payout Ditolak', color: '#ef4444', bg: '#fef2f2', icon: 'bx-x-circle' },
  platform_fee: { label: 'Biaya Layanan', color: '#64748b', bg: '#f8fafc', icon: 'bx-cog' },
  refund_deduction: { label: 'Potongan Refund', color: '#ef4444', bg: '#fef2f2', icon: 'bx-subdirectory-left' },
  bonus: { label: 'Bonus / Reward', color: '#a855f7', bg: '#faf5ff', icon: 'bx-gift' },
  restock_payment: { label: 'Pembayaran Restok', color: '#ef4444', bg: '#fef2f2', icon: 'bx-cart' }
};

const PAYOUT_STATUS = {
  requested: { label: 'Menunggu', color: '#f59e0b', bg: '#fffbeb' },
  reserved: { label: 'Diproses', color: '#3b82f6', bg: '#eff6ff' },
  approved: { label: 'Disetujui', color: '#10b981', bg: '#ecfdf5' },
  processing: { label: 'Mentransfer', color: '#3b82f6', bg: '#eff6ff' },
  paid: { label: 'Selesai', color: '#10b981', bg: '#ecfdf5' },
  rejected: { label: 'Ditolak', color: '#ef4444', bg: '#fef2f2' }
};

export default function MerchantWallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions'); // transactions, payouts

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wData, txData, payData] = await Promise.all([
        fetchJson(`${MERCHANT_API_BASE}/wallet`),
        fetchJson(`${MERCHANT_API_BASE}/wallet/transactions`),
        fetchJson(`${MERCHANT_API_BASE}/wallet/history`)
      ]);
      setWallet(wData);
      setTransactions(Array.isArray(txData) ? txData : []);
      setPayouts(Array.isArray(payData) ? payData : []);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Buku Kas & Riwayat Keuangan" 
        subtitle="Pantau neraca saldo, histori mutasi kas, dan riwayat payout toko Anda."
      >
        <button style={A.btnGhost} onClick={loadData}>
          <i className="bx bx-refresh" style={{ fontSize: 18 }} /> Perbarui Data
        </button>
      </PageHeader>

      {/* WALLET METRICS */}
      <StatRow stats={[
        { label: 'Saldo Tersedia (Siap Payout)', val: idr(wallet?.balance || 0), icon: 'bxs-wallet', color: '#6366f1' },
        { label: 'Pendapatan Tertunda', val: idr(wallet?.pending_balance || 0), icon: 'bxs-hourglass', color: '#f59e0b' },
        { label: 'Total Penjualan Kotor', val: idr(wallet?.total_earned || 0), icon: 'bxs-badge-dollar', color: '#10b981' }
      ]} />

      {/* HEADQUARTERS PAYOUT NOTICE */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.05)'
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <i className="bx bxs-info-circle" style={{ fontSize: 22, color: '#4f46e5' }} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.01em' }}>
            Kebijakan Pencairan Dana Otomatis (Automatic Payout Hub)
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: '#4338ca', lineHeight: 1.5, fontWeight: 500 }}>
            Saldo Anda akan dicairkan secara berkala oleh <strong>Gudang Pusat AkuGlow</strong> langsung ke rekening terdaftar Anda. Anda tidak perlu mengajukan penarikan manual. Hubungi administrator pusat untuk mengubah detail rekening bank atau info transfer Anda.
          </p>
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 1 }}>
        <button 
          onClick={() => setActiveTab('transactions')} 
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'transactions' ? '2.5px solid #6366f1' : '2.5px solid transparent',
            color: activeTab === 'transactions' ? '#6366f1' : '#64748b',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Riwayat Mutasi Kas
        </button>
        <button 
          onClick={() => setActiveTab('payouts')} 
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'payouts' ? '2.5px solid #6366f1' : '2.5px solid transparent',
            color: activeTab === 'payouts' ? '#6366f1' : '#64748b',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Riwayat Payout
        </button>
      </div>

      {activeTab === 'transactions' && (
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ ...A.th, paddingLeft: 24, width: '22%' }}>Waktu</th>
                <th style={A.th}>Jenis Transaksi</th>
                <th style={{ ...A.th, textAlign: 'right' }}>Jumlah (IDR)</th>
                <th style={A.th}>Deskripsi / Catatan</th>
                <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ ...A.empty, padding: 48 }}>
                    <i className="bx bx-receipt" style={{ fontSize: 48, color: '#94a3b8', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, color: '#475569', fontSize: 14 }}>Belum ada riwayat transaksi kas</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>Setiap penjualan atau pemotongan dana akan tampil di sini.</div>
                  </td>
                </tr>
              ) : transactions.map((t, idx) => {
                const conf = TX_TYPES[t.type] || { label: t.type, color: '#475569', bg: '#f1f5f9', icon: 'bx-receipt' };
                const isPositive = t.amount >= 0;
                
                return (
                  <tr key={t.id} style={{ borderBottom: idx === transactions.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24, color: '#64748b', fontSize: 12.5 }}>
                      {fmtDate(t.created_at)}
                    </td>
                    <td style={A.td}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: conf.bg,
                        color: conf.color,
                        fontSize: 11.5,
                        fontWeight: 800
                      }}>
                        <i className={`bx ${conf.icon}`} />
                        {conf.label}
                      </span>
                    </td>
                    <td style={{ ...A.td, textAlign: 'right', fontWeight: 800, color: isPositive ? '#16a34a' : '#dc2626' }}>
                      {isPositive ? `+${idr(t.amount)}` : idr(t.amount)}
                    </td>
                    <td style={{ ...A.td, fontSize: 13, color: '#64748b' }}>
                      {t.description || '—'}
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {idr(t.balance_after)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TablePanel>
      )}

      {activeTab === 'payouts' && (
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ ...A.th, paddingLeft: 24, width: '22%' }}>Tanggal Pengajuan</th>
                <th style={A.th}>Detail Transfer</th>
                <th style={{ ...A.th, textAlign: 'right' }}>Jumlah Bersih</th>
                <th style={A.th}>Catatan / Catatan Transfer</th>
                <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ ...A.empty, padding: 48 }}>
                    <i className="bx bx-transfer-alt" style={{ fontSize: 48, color: '#94a3b8', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, color: '#475569', fontSize: 14 }}>Belum ada riwayat payout</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>Dana yang ditransfer oleh pusat akan otomatis tercatat di sini.</div>
                  </td>
                </tr>
              ) : payouts.map((p, idx) => {
                const badge = PAYOUT_STATUS[p.status] || { label: p.status, color: '#64748b', bg: '#f1f5f9' };
                
                return (
                  <tr key={p.id} style={{ borderBottom: idx === payouts.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24, color: '#64748b', fontSize: 12.5 }}>
                      {fmtDate(p.requested_at)}
                    </td>
                    <td style={A.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <strong style={{ color: '#0f172a', fontSize: 13 }}>{p.bank_name}</strong>
                        <span style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>
                          Rek. {p.bank_account_number} a/n {p.bank_account_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...A.td, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {idr(p.amount)}
                    </td>
                    <td style={{ ...A.td, fontSize: 13, color: '#64748b' }}>
                      {p.note || '—'}
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: badge.bg,
                        color: badge.color,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TablePanel>
      )}
    </div>
  );
}
