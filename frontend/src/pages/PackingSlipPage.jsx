import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, ADMIN_API_BASE } from '../lib/api';

const idr = (v) => 'Rp ' + (Number(v) || 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

// Simple barcode-like display using monospace characters
function BarcodeDisplay({ value }) {
  if (!value) return null;
  return (
    <div style={{ textAlign: 'center', margin: '6px 0' }}>
      {/* Visual barcode using CSS stripes */}
      <div style={{ display: 'inline-flex', gap: 1, height: 32, alignItems: 'flex-end', margin: '0 auto 4px' }}>
        {value.split('').map((char, i) => {
          const h = ((char.charCodeAt(0) * 17 + i * 7) % 24) + 8;
          const w = i % 3 === 0 ? 3 : 2;
          return <div key={i} style={{ width: w, height: h, background: '#0F172A', borderRadius: 1 }} />;
        })}
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2, color: '#0F172A', fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

export default function PackingSlipPage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role'); // 'admin' = use admin API, else use merchant API
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    if (!groupId) return;
    // Choose API base based on role param
    const apiBase = role === 'admin' ? ADMIN_API_BASE : MERCHANT_API_BASE;
    fetchJson(`${apiBase}/orders/packing-slip?group_id=${groupId}`)
      .then(res => {
        setData(res.data || res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Data tidak ditemukan');
        setLoading(false);
      });
  }, [groupId, role]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FAFC', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
        <i className="bx bx-package" style={{ fontSize: 28, color: '#94A3B8' }} />
      </div>
      <div style={{ fontSize: 15, color: '#64748B', fontWeight: 700 }}>Memuat Packing Slip...</div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#FFF1F2', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}></div>
      <div style={{ fontSize: 16, color: '#BE123C', fontWeight: 800 }}>Gagal memuat packing slip</div>
      <div style={{ fontSize: 14, color: '#9F1239' }}>{error}</div>
    </div>
  );

  const { group, order, merchant } = data || {};
  const items = group?.items || [];
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalWeight = items.reduce((s, i) => s + ((i.weight || 0) * (i.quantity || 0)), 0);

  return (
    <>
      {/* Screen: Control Bar (hidden on print) */}
      <div className="no-print" style={{ background: '#0F172A', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => window.history.back()}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="bx bx-arrow-back" /> Kembali
          </button>
          <div style={{ color: '#94A3B8', fontSize: 14, fontWeight: 700 }}>
            Packing Slip — #{(group?.id || '').slice(0, 8).toUpperCase()}
          </div>
        </div>
        <button
          onClick={handlePrint}
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 14, fontSize: 15, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(124,58,237,0.5)' }}
        >
          <i className="bx bx-printer" style={{ fontSize: 20 }} />
          Cetak / Save PDF
        </button>
      </div>

      {/* Print-area */}
      <div
        ref={printRef}
        style={{ maxWidth: 800, margin: '32px auto', background: '#fff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
        className="print-area"
      >
        {/* ── HEADER ── */}
        <div style={{ padding: '20px 24px 12px', borderBottom: '3px solid #0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 2 }}>
              {merchant?.store_name || 'Toko'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, maxWidth: 280, lineHeight: 1.5 }}>
              {merchant?.store_address || merchant?.address || 'Alamat tidak tersedia'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Packing Slip</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: 1 }}>
              #{(group?.id || '').slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 600 }}>
              {fmtDateTime(group?.created_at)}
            </div>
          </div>
        </div>

        {/* ── BARCODE / RESI ── */}
        {group?.tracking_number && (
          <div style={{ padding: '12px 24px', borderBottom: '1px dashed #CBD5E1', background: '#FAFAFA' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4, textAlign: 'center' }}>Nomor Resi Pengiriman</div>
            <BarcodeDisplay value={group.tracking_number} />
            {group.courier_code && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <span style={{ display: 'inline-block', padding: '3px 12px', background: '#0F172A', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>{group.courier_code}</span>
              </div>
            )}
          </div>
        )}

        {/* ── ADDRESSES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {/* Pengirim */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}> Dari (Pengirim)</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>{merchant?.store_name || '-'}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, lineHeight: 1.6 }}>
              {merchant?.store_address || merchant?.address || '-'}
            </div>
            {merchant?.phone && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: 700 }}> {merchant.phone}</div>
            )}
          </div>

          {/* Penerima */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}> Kepada (Penerima)</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>{order?.shipping_name || '-'}</div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, lineHeight: 1.6 }}>
              {order?.shipping_address && (
                <>{order.shipping_address}</>
              )}
              {order?.shipping_city && <>, {order.shipping_city}</>}
              {order?.shipping_province && <>, {order.shipping_province}</>}
              {order?.shipping_postal_code && <> {order.shipping_postal_code}</>}
            </div>
            {order?.shipping_phone && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: 700 }}> {order.shipping_phone}</div>
            )}
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Daftar Barang</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderRadius: 6 }}>
                <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left' }}>No</th>
                <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'left' }}>Nama Produk</th>
                <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' }}>Harga</th>
                <th style={{ padding: '10px 12px', fontSize: 10, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{item.product_name || '-'}</div>
                    {item.variant_name && (
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, fontWeight: 600 }}>Varian: {item.variant_name}</div>
                    )}
                    {item.sku && (
                      <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 1, fontWeight: 600, fontFamily: 'monospace' }}>SKU: {item.sku}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 900, color: '#0F172A', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#475569', textAlign: 'right' }}>{idr(item.unit_price)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 900, color: '#0F172A', textAlign: 'right' }}>{idr((item.unit_price || 0) * (item.quantity || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #0F172A', background: '#F8FAFC' }}>
                <td colSpan="2" style={{ padding: '12px 12px', fontSize: 13, fontWeight: 900, color: '#0F172A', textAlign: 'left' }}>
                  Total ({totalQty} barang)
                  {totalWeight > 0 && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginLeft: 8 }}>— Berat: ±{totalWeight}g</span>}
                </td>
                <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 900, color: '#0F172A', textAlign: 'center' }}>{totalQty}</td>
                <td style={{ padding: '12px 12px' }}></td>
                <td style={{ padding: '12px 12px', fontSize: 14, fontWeight: 900, color: '#0F172A', textAlign: 'right' }}>{idr(group?.subtotal || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── SHIPPING INFO ── */}
        <div style={{ padding: '0 24px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Info Pengiriman</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Kurir</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' }}>{group?.courier_code || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Layanan</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#0F172A' }}>{order?.courier_service || order?.shipping_service || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Jenis</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#0F172A' }}>{order?.shipping_type === 'pickup' ? 'Pickup' : 'Delivery'}</span>
              </div>
            </div>
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Info Transaksi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>No. Order</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>{order?.order_number || (order?.id || '').slice(0, 12).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Tgl. Pesan</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#0F172A' }}>{fmtDate(order?.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Tgl. Kirim</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#0F172A' }}>{fmtDate(group?.shipped_at || new Date())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── NOTES ── */}
        {order?.notes && (
          <div style={{ margin: '0 24px 16px', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#92400E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}> Catatan dari Pembeli</div>
            <div style={{ fontSize: 12, color: '#78350F', fontWeight: 600, lineHeight: 1.5 }}>{order.notes}</div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ padding: '12px 24px', borderTop: '2px solid #0F172A', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, maxWidth: 360, lineHeight: 1.5 }}>
            Dokumen ini diterbitkan secara otomatis oleh sistem AkuGlow. Harap pastikan kondisi barang sesuai sebelum menyerahkan ke kurir.
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#CBD5E1', fontWeight: 700, marginBottom: 2 }}>AKUGLOW</div>
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Dicetak: {fmtDateTime(new Date())}</div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        
        body { font-family: 'Inter', sans-serif; }
        
        .no-print { display: flex !important; }
        
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0; padding: 0; }
          .print-area {
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 0.8cm;
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
