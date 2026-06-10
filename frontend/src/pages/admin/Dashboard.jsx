import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = ADMIN_API_BASE;

const idr = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const getMonthName = (monthString) => {
  try {
    const parts = monthString.split('-');
    if (parts.length === 2) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      return new Date(2000, monthIndex, 1).toLocaleString('id-ID', { month: 'short' });
    }
  } catch (e) {}
  return monthString;
};

const timeAgo = (dateString) => {
  try {
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${Math.floor(diffHours / 24)}h lalu`;
  } catch (e) {
    return dateString;
  }
};

const formatPaymentMethod = (method) => {
  if (!method) return '-';
  const mapping = {
    'virtual_account': 'Virtual Account',
    'bank_transfer': 'Transfer Bank',
    'credit_card': 'Kartu Kredit',
    'cod': 'COD (Bayar di Tempat)',
    'e_wallet': 'E-Wallet',
    'qris': 'QRIS',
    'gopay': 'GoPay',
    'ovo': 'OVO',
    'dana': 'DANA'
  };
  const normalized = method.toLowerCase();
  if (mapping[normalized]) {
    return mapping[normalized];
  }
  return method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// ─── STYLES ────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .adm-db * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }

  .adm-db .stat-card {
    position: relative; overflow: hidden; border-radius: 16px; padding: 24px;
    cursor: default; transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .adm-db .stat-card:hover {
    transform: translateY(-3px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.25) !important;
  }
  .adm-db .stat-card::after {
    content: ''; position: absolute; top: -30%; right: -10%;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,0.08); pointer-events: none;
  }
  
  .adm-db .card-white {
    background: #ffffff; border: 1px solid #e8edf4; border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
    padding: 24px;
  }
  .adm-db .card-title {
    font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; margin: 0 0 16px;
    display: flex; align-items: center; gap: 8px;
  }

  /* Grid Layouts */
  .adm-db .grid-1 { display: grid; grid-template-columns: 1fr; gap: 20px; }
  .adm-db .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .adm-db .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .adm-db .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  
  /* Leaderboard Rows */
  .adm-db .lb-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .adm-db .lb-row:last-child { border-bottom: none; }
  .adm-db .lb-rank {
    width: 24px; height: 24px; border-radius: 6px; background: #f1f5f9;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #64748b;
  }
  .adm-db .lb-rank.top-1 { background: #fef08a; color: #854d0e; }
  .adm-db .lb-rank.top-2 { background: #e2e8f0; color: #475569; }
  .adm-db .lb-rank.top-3 { background: #fed7aa; color: #9a3412; }

  .adm-db .progress-bar { height: 6px; background: #e8edf4; border-radius: 99px; overflow: hidden; }
  .adm-db .progress-fill { height: 100%; border-radius: 99px; transition: width 0.8s; }

  @media (max-width: 1200px) {
    .adm-db .grid-4, .adm-db .grid-3 { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .adm-db .grid-4, .adm-db .grid-3, .adm-db .grid-2 { grid-template-columns: 1fr; }
  }
`;

// ─── SVG DONUT CHART ──────────────────────────────────────────
const DonutChart = ({ data }) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const strokeWidth = 25;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let currentAngle = -Math.PI / 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          if (d.value === 0) return null;
          const angle = (d.value / total) * Math.PI * 2;
          const x1 = cx + radius * Math.cos(currentAngle);
          const y1 = cy + radius * Math.sin(currentAngle);
          const x2 = cx + radius * Math.cos(currentAngle + angle);
          const y2 = cy + radius * Math.sin(currentAngle + angle);
          const largeArc = angle > Math.PI ? 1 : 0;
          
          const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
          currentAngle += angle;

          return (
            <path
              key={i}
              d={pathData}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              style={{ transition: 'all 0.3s' }}
            />
          );
        })}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">Total GMV</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f172a">
          {total > 1 ? idr(total) : 'Rp 0'}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 100 }}>{d.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{idr(d.value)}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>({((d.value/total)*100).toFixed(1)}%)</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SVG HORIZONTAL BAR ───────────────────────────────────────
const HorizontalBar = ({ items, maxVal, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {items.map((it, i) => {
      const pct = maxVal > 0 ? (it.value / maxVal) * 100 : 0;
      return (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            <span style={{ color: '#334155' }}>{it.label}</span>
            <span style={{ color: '#0f172a' }}>{it.display}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      );
    })}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetchJson(API + '/overview')
      .then(res => setOverview(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const exportExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/export-report`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Gagal mengunduh laporan');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `akuglow_report_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Gagal mendownload laporan Excel/CSV');
    }
  };

  const exportPDF = () => {
    if (!overview) return;
    try {
      const doc = new jsPDF();
      
      // Header / Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Laporan Analitik Ekosistem AkuGlow", 14, 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Waktu Ekspor: ${new Date().toLocaleString('id-ID')}`, 14, 27);
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, 32, 196, 32);

      let currentY = 40;

      // 1. Ringkasan Keuangan
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("1. Ringkasan Keuangan (Financial Summary)", 14, currentY);
      currentY += 8;

      const fin = overview.finance || {};
      const finRows = [
        ["Total GMV (Revenue + Manual Income)", idr(fin.total_revenue)],
        ["COGS (Modal Pembelian)", idr(fin.cogs)],
        ["Net Profit (Laba Bersih)", idr(fin.net_profit)],
        ["Platform Fee (Fee System)", idr(fin.platform_fee)],
        ["Merchant Payout (Bagi Hasil Toko)", idr(fin.merchant_payout)],
        ["Komisi Afiliasi (Jaringan)", idr(fin.affiliates)],
        ["Dana Cadangan (Saving)", idr(fin.savings)],
        ["Subsidi Diskon", idr(fin.discounts)],
        ["Average Order Value (AOV)", idr(fin.aov)],
        ["Jumlah Pesanan Aktif", `${fin.active_orders || 0} pesanan`]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metrik Keuangan", "Nilai (IDR)"]],
        body: finRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 15;
        }
      });

      // Check if we need to add a page
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      // 2. Metode Pembayaran & Distribusi Logistik
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("2. Operasional & Metode Pembayaran", 14, currentY);
      currentY += 8;

      const how = overview.how || {};
      const paymentsData = (how.payments || []).map(p => [formatPaymentMethod(p.method), `${p.count} Transaksi`, idr(p.amount)]);
      const logisticsData = (how.logistics || []).map(l => [l.courier.toUpperCase(), `${l.count} Resi`]);

      autoTable(doc, {
        startY: currentY,
        head: [["Metode Pembayaran", "Jumlah Penggunaan", "Total Nominal"]],
        body: paymentsData.length > 0 ? paymentsData : [["-", "-", "-"]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // Blue 500
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        head: [["Kurir / Ekspedisi", "Jumlah Resi"]],
        body: logisticsData.length > 0 ? logisticsData : [["-", "-"]],
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] }, // Amber 500
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 15;
        }
      });

      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      // 3. Leaderboards
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("3. Ekosistem Leaderboards (Top Performance)", 14, currentY);
      currentY += 8;

      const who = overview.who || {};
      const topCustRows = (who.customers || []).map((c, idx) => [idx + 1, c.name, `${c.order_count} pesanan`, idr(c.total_spent)]);
      const topAffRows = (who.affiliates || []).map((a, idx) => [idx + 1, a.name, `${a.downlines} downlines`, idr(a.earned)]);
      const topMerchRows = (who.merchants || []).map((m, idx) => [idx + 1, m.name, `${m.orders} pesanan`, idr(m.revenue)]);

      doc.setFontSize(11);
      doc.text("Top Customers:", 14, currentY);
      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [["No", "Nama Pelanggan", "Jumlah Order", "Total Belanja"]],
        body: topCustRows.length > 0 ? topCustRows : [["-", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Top Affiliates:", 14, currentY);
      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [["No", "Nama Affiliate", "Downlines Aktif", "Total Pendapatan"]],
        body: topAffRows.length > 0 ? topAffRows : [["-", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }, // Violet 500
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Top Merchants:", 14, currentY);
      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [["No", "Nama Toko / Merchant", "Transaksi Sukses", "Total Omset"]],
        body: topMerchRows.length > 0 ? topMerchRows : [["-", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Blue 500
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 15;
        }
      });

      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      // 4. Inventori & Produk
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("4. Kinerja Produk & Inventori", 14, currentY);
      currentY += 8;

      const what = overview.what || {};
      const inv = what.inventory || {};
      const prodRows = (what.products || []).map((p, idx) => [idx + 1, p.name, `${p.qty} terjual`, idr(p.revenue)]);

      doc.setFontSize(11);
      doc.text(`Kesehatan Inventori: ${inv.healthy || 0} Sehat | ${inv.low_stock || 0} Kritis | ${inv.out_of_stock || 0} Habis`, 14, currentY);
      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        head: [["Peringkat", "Nama Produk", "Kuantitas Terjual", "Total Omset"]],
        body: prodRows.length > 0 ? prodRows : [["-", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor.y + 15;
        }
      });

      // Save the PDF
      doc.save(`akuglow_dashboard_report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal mendownload laporan PDF');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', flexDirection: 'column', gap: 16 }}>
      <style>{GLOBAL_CSS}</style>
      <div className="adm-db">
        <div style={{ width: 36, height: 36, border: '3px solid #e8edf4', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    </div>
  );

  const fin = overview?.finance || {};
  const how = overview?.how || {};
  const who = overview?.who || {};
  const what = overview?.what || {};
  const where = overview?.where_when || {};

  // Financial Donut Data
  const donutData = [
    { label: 'COGS (Modal)', value: fin.cogs || 0, color: '#94a3b8' },
    { label: 'Net Profit', value: fin.net_profit || 0, color: '#10b981' },
    { label: 'Merchant Payout', value: fin.merchant_payout || 0, color: '#3b82f6' },
    { label: 'Komisi Afiliasi', value: fin.affiliates || 0, color: '#8b5cf6' },
    { label: 'Subsidi Diskon', value: fin.discounts || 0, color: '#f43f5e' },
    { label: 'Saving Reserves', value: fin.savings || 0, color: '#f59e0b' },
  ];

  // Logistics & Payments
  const payments = (how.payments || []).map(p => ({ label: formatPaymentMethod(p.method), value: p.count, display: idr(p.amount) })).sort((a,b) => b.value - a.value);
  const maxPayment = Math.max(...payments.map(p => p.value), 1);
  
  const couriers = (how.logistics || []).map(l => ({ label: l.courier.toUpperCase(), value: l.count, display: `${l.count} resi` })).sort((a,b) => b.value - a.value);
  const maxCourier = Math.max(...couriers.map(c => c.value), 1);

  // Peak Hours
  const peakHours = (where.peak_hours || []).map(h => ({ label: `${h.hour}:00`, value: h.count, display: `${h.count} ord` }));
  const maxHour = Math.max(...peakHours.map(h => h.value), 1);

  return (
    <div className="adm-db" style={{ paddingBottom: 48 }}>
      <style>{GLOBAL_CSS}</style>

      {/* ─── HEADER STRIP ─── */}
      <div className="card-white" style={{ marginBottom: 24, padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 850, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Dashboard AkuGlow</h1>
          </div>
          <div style={{display:'flex', gap: 8}}>
            <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #ef4444', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              <i className="bx bxs-file-pdf" style={{ fontSize: 16 }} /> Export PDF
            </button>
            <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #10b981', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              <i className="bx bxs-file-blank" style={{ fontSize: 16 }} /> Export Excel (CSV)
            </button>
            <Link to="/admin/finance" style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: 8, border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Rincian Keuangan
            </Link>
            <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* ─── FINANCIAL ECONOMICS ─── */}
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Financial & Unit Economics</h2>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card-white" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title"><i className="bx bx-pie-chart-alt-2" /> Ledger Allocation (GMV)</h3>
          <DonutChart data={donutData} />
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Net Profit Margin</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '8px 0' }}>
            {fin.total_revenue > 0 ? ((fin.net_profit / fin.total_revenue) * 100).toFixed(1) : 0}%
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{idr(fin.net_profit)} bersih</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Average Order Value (AOV)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '8px 0' }}>{idr(fin.aov)}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Dari {fin.active_orders || 0} pesanan aktif</div>
        </div>
      </div>

      {/* ─── ACTOR LEADERBOARDS ─── */}
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 32 }}>Ekosistem Leaderboards</h2>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card-white">
          <h3 className="card-title"><i className="bx bxs-crown" style={{color: '#eab308'}} /> Top Customers</h3>
          {(who.customers || []).map((c, i) => (
            <div key={i} className="lb-row">
              <div className={`lb-rank ${i < 3 ? 'top-'+(i+1) : ''}`}>{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{c.order_count} pesanan</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{idr(c.total_spent)}</div>
            </div>
          ))}
        </div>
        <div className="card-white">
          <h3 className="card-title"><i className="bx bxs-network-chart" style={{color: '#6366f1'}} /> Top Affiliates</h3>
          {(who.affiliates || []).map((a, i) => (
            <div key={i} className="lb-row">
              <div className={`lb-rank ${i < 3 ? 'top-'+(i+1) : ''}`}>{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{a.downlines} downlines aktif</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#8b5cf6' }}>{idr(a.earned)}</div>
            </div>
          ))}
        </div>
        <div className="card-white">
          <h3 className="card-title"><i className="bx bxs-store" style={{color: '#3b82f6'}} /> Top Merchants</h3>
          {(who.merchants || []).map((m, i) => (
            <div key={i} className="lb-row">
              <div className={`lb-rank ${i < 3 ? 'top-'+(i+1) : ''}`}>{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{m.orders} pesanan sukses</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6' }}>{idr(m.revenue)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── LOGISTICS, PAYMENTS, LOCATIONS ─── */}
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 32 }}>Operasional & Geografis</h2>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card-white">
          <h3 className="card-title"><i className="bx bx-credit-card" /> Metode Pembayaran</h3>
          <HorizontalBar items={payments} maxVal={maxPayment} color="#4f46e5" />
        </div>
        <div className="card-white">
          <h3 className="card-title"><i className="bx bx-package" /> Distribusi Ekspedisi</h3>
          <HorizontalBar items={couriers} maxVal={maxCourier} color="#f59e0b" />
        </div>
        <div className="card-white">
          <h3 className="card-title"><i className="bx bx-map" /> Top 5 Kota Pengiriman</h3>
          {(where.cities || []).map((city, i) => (
            <div key={i} className="lb-row">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <i className="bx bx-map-pin" style={{ fontSize: 12 }} />
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{city.city}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{city.count} paket</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PRODUCTS & TIME ─── */}
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 32 }}>Produk & Waktu</h2>
      <div className="grid-2">
        <div className="card-white">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <h3 className="card-title" style={{ margin: 0 }}><i className="bx bx-box" /> Kinerja Inventori</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>{what.inventory?.healthy || 0} Sehat</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fef9c3', color: '#854d0e', fontWeight: 700 }}>{what.inventory?.low_stock || 0} Kritis</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>{what.inventory?.out_of_stock || 0} Habis</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase' }}>Produk Paling Laris</div>
            {(what.products || []).map((p, i) => (
              <div key={i} className="lb-row">
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#64748b' }}>{i+1}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{p.qty} terjual</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{idr(p.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-white">
          <h3 className="card-title"><i className="bx bx-time" /> Peak Order Hours (Waktu Sibuk)</h3>
          <HorizontalBar items={peakHours} maxVal={maxHour} color="#0ea5e9" />
        </div>
      </div>

    </div>
  );
}
