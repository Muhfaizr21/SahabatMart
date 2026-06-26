import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = ADMIN_API_BASE;

const idr = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

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
  if (mapping[normalized]) return mapping[normalized];
  return method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// ─── ELEGANT SVG DONUT CHART ──────────────────────────────────────────
const DonutChart = ({ data }) => {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 70;
  const strokeWidth = 12;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let currentAngle = -Math.PI / 2;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          {/* Background Track */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
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
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total GMV</span>
          <span className="text-sm font-extrabold text-indigo-950 tracking-tight mt-0.5">
            {total > 1 ? idr(total) : 'Rp 0'}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-950 transition-colors">{d.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-950">{idr(d.value)}</span>
              <span className="text-[10px] font-medium text-slate-400 w-8 text-right">{((d.value/total)*100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── ELEGANT HORIZONTAL BAR ───────────────────────────────────────
const HorizontalBar = ({ items, maxVal, colorClass }) => (
  <div className="flex flex-col gap-4">
    {items.map((it, i) => {
      const pct = maxVal > 0 ? (it.value / maxVal) * 100 : 0;
      return (
        <div key={i} className="group">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-950 transition-colors">{it.label}</span>
            <span className="text-xs font-bold text-indigo-950">{it.display}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

// ─── ICON HELPER ──────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => <i className={`bx ${name}`} style={{ fontSize: size }} />;

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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">Sinkronisasi Data...</span>
    </div>
  );

  const fin = overview?.finance || {};
  const how = overview?.how || {};
  const who = overview?.who || {};
  const what = overview?.what || {};
  const where = overview?.where_when || {};

  // Financial Donut Data - Adjusted colors for professional light mode
  const donutData = [
    { label: 'COGS (Modal)', value: fin.cogs || 0, color: '#94A3B8' }, // Slate 400
    { label: 'Net Profit', value: fin.net_profit || 0, color: '#4F46E5' }, // Indigo 600
    { label: 'Merchant Payout', value: fin.merchant_payout || 0, color: '#FCD34D' }, // Amber 300
    { label: 'Komisi Afiliasi', value: fin.affiliates || 0, color: '#A78BFA' }, // Violet 400
    { label: 'Subsidi Diskon', value: fin.discounts || 0, color: '#FDA4AF' }, // Rose 300
    { label: 'Saving Reserves', value: fin.savings || 0, color: '#99F6E4' }, // Teal 200
  ];

  const payments = (how.payments || []).map(p => ({ label: formatPaymentMethod(p.method), value: p.count, display: idr(p.amount) })).sort((a,b) => b.value - a.value);
  const maxPayment = Math.max(...payments.map(p => p.value), 1);
  
  const couriers = (how.logistics || []).map(l => ({ label: l.courier.toUpperCase(), value: l.count, display: `${l.count} resi` })).sort((a,b) => b.value - a.value);
  const maxCourier = Math.max(...couriers.map(c => c.value), 1);

  const peakHours = (where.peak_hours || []).map(h => ({ label: `${h.hour}:00`, value: h.count, display: `${h.count} ord` }));
  const maxHour = Math.max(...peakHours.map(h => h.value), 1);

  const profitMargin = fin.total_revenue > 0 ? ((fin.net_profit / fin.total_revenue) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 selection:bg-slate-200">
      
      {/* ─── HEADER ─── */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-950 tracking-tight">Executive Dashboard</h1>
            <p className="text-xs font-medium text-slate-500 mt-1">Kinerja Finansial & Operasional Ekosistem</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm">
              <Icon name="bxs-file-pdf" size={14} /> PDF
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm">
              <Icon name="bx-table" size={14} /> CSV
            </button>
            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm">
              <Icon name="bx-refresh" size={14} /> Sinkronisasi
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">

        {/* ─── ALERTS WIDGET ─── */}
        <div className="space-y-4">
          {overview?.alerts && (
            (overview.alerts.pending_withdrawals > 0 || overview.alerts.pending_payouts > 0 || overview.alerts.abnormal_expired > 10) && (
              <section className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5 md:mt-0">
                    <Icon name="bx-error" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">Perhatian Superadmin</h3>
                    <div className="text-xs text-rose-700 mt-1 flex flex-col gap-1">
                      {overview.alerts.pending_withdrawals > 0 && <p>&bull; Terdapat <b>{overview.alerts.pending_withdrawals}</b> penarikan komisi affiliate yang menunggu persetujuan.</p>}
                      {overview.alerts.pending_payouts > 0 && <p>&bull; Terdapat <b>{overview.alerts.pending_payouts}</b> permintaan payout merchant yang tertunda.</p>}
                      {overview.alerts.abnormal_expired > 10 && <p>&bull; Terdapat <b>{overview.alerts.abnormal_expired}</b> order expired hari ini (indikasi anomali/spam).</p>}
                    </div>
                  </div>
                </div>
                <Link to="/admin/finance" className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
                  Tinjau Sekarang
                </Link>
              </section>
            )
          )}

          {overview?.what?.inventory && (overview.what.inventory.out_of_stock > 0 || overview.what.inventory.low_stock > 0) && (
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5 md:mt-0">
                  <Icon name="bx-package" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Peringatan Stok</h3>
                  <div className="text-xs text-amber-700 mt-1 flex flex-col gap-1">
                    {overview.what.inventory.out_of_stock > 0 && <p>&bull; <b>{overview.what.inventory.out_of_stock}</b> produk telah habis stok (Out of Stock).</p>}
                    {overview.what.inventory.low_stock > 0 && <p>&bull; <b>{overview.what.inventory.low_stock}</b> produk menipis (sisa 1-4 pcs).</p>}
                  </div>
                </div>
              </div>
              <Link to="/admin/inventory/pusat" className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
                Kelola Inventori
              </Link>
            </section>
          )}
        </div>

        {/* ─── FINANCIAL OVERVIEW ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Alokasi Finansial Utama</h2>
            <Link to="/admin/finance" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Lihat Rincian Ledger &rarr;</Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 xl:col-span-5 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-indigo-950 mb-6 flex items-center gap-2">
                <Icon name="bx-pie-chart-alt-2" /> Distribusi GMV
              </h3>
              <DonutChart data={donutData} />
            </div>

            <div className="lg:col-span-6 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between group hover:border-slate-300 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
                    <Icon name="bx-line-chart" size={16} />
                  </div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit Margin</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-indigo-950 tracking-tighter">{profitMargin}%</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-emerald-600">{idr(fin.net_profit)}</div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5">Pendapatan bersih tercatat</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between group hover:border-slate-300 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
                    <Icon name="bx-shopping-bag" size={16} />
                  </div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Order Value</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-indigo-950 tracking-tighter">{idr(fin.aov)}</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700">{fin.active_orders || 0} Pesanan Aktif</div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5">Volume transaksi berjalan</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── LEADERBOARDS ─── */}
        <section>
          <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Top Kinerja Ekosistem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Top Customers */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-indigo-950 mb-5 flex items-center gap-2">
                <Icon name="bxs-crown" /> Top Customers
              </h3>
              <div className="space-y-4">
                {(who.customers || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0
                      ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-indigo-950 truncate">{c.name}</div>
                      <div className="text-[10px] font-medium text-slate-500">{c.order_count} pesanan</div>
                    </div>
                    <div className="text-xs font-extrabold text-indigo-950 text-right shrink-0">{idr(c.total_spent)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Affiliates */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-indigo-950 mb-5 flex items-center gap-2">
                <Icon name="bxs-network-chart" /> Top Affiliates
              </h3>
              <div className="space-y-4">
                {(who.affiliates || []).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0
                      ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-indigo-950 truncate">{a.name}</div>
                      <div className="text-[10px] font-medium text-slate-500">{a.downlines} downline</div>
                    </div>
                    <div className="text-xs font-extrabold text-indigo-950 text-right shrink-0">{idr(a.earned)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Merchants */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-indigo-950 mb-5 flex items-center gap-2">
                <Icon name="bxs-store-alt" /> Top Merchants
              </h3>
              <div className="space-y-4">
                {(who.merchants || []).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0
                      ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-indigo-950 truncate">{m.name}</div>
                      <div className="text-[10px] font-medium text-slate-500">{m.orders} transaksi</div>
                    </div>
                    <div className="text-xs font-extrabold text-indigo-950 text-right shrink-0">{idr(m.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ─── OPERATIONAL & INVENTORY ─── */}
        <section>
          <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Wawasan Operasional</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-indigo-950 mb-6 flex items-center gap-2">
                <Icon name="bx-credit-card" /> Preferensi Pembayaran
              </h3>
              <HorizontalBar items={payments} maxVal={maxPayment} colorClass="bg-indigo-500" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-indigo-950 mb-6 flex items-center gap-2">
                <Icon name="bx-package" /> Layanan Ekspedisi
              </h3>
              <HorizontalBar items={couriers} maxVal={maxCourier} colorClass="bg-slate-400" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <Icon name="bx-box" /> Kinerja Inventori
                </h3>
              </div>
              
              <div className="flex gap-2 mb-6">
                <div className="flex-1 bg-emerald-50/50 rounded-lg p-2 text-center border border-emerald-100/50">
                  <div className="text-sm font-extrabold text-emerald-700">{what.inventory?.healthy || 0}</div>
                  <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Aman</div>
                </div>
                <div className="flex-1 bg-amber-50/50 rounded-lg p-2 text-center border border-amber-100/50">
                  <div className="text-sm font-extrabold text-amber-700">{what.inventory?.low_stock || 0}</div>
                  <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Kritis</div>
                </div>
                <div className="flex-1 bg-rose-50/50 rounded-lg p-2 text-center border border-rose-100/50">
                  <div className="text-sm font-extrabold text-rose-700">{what.inventory?.out_of_stock || 0}</div>
                  <div className="text-[9px] font-bold text-rose-600 uppercase tracking-wider mt-0.5">Habis</div>
                </div>
              </div>

              <div className="space-y-4">
                {(what.products || []).slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-700 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.qty} unit terjual</div>
                    </div>
                    <div className="text-xs font-extrabold text-indigo-950 shrink-0">{idr(p.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
