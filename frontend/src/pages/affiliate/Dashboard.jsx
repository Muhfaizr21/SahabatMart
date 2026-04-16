import React from 'react';

export default function AffiliateDashboard() {
  return (
    <div className="card radius-10 border-0 shadow-sm" style={{ borderLeft: '5px solid #6f42c1' }}>
      <div className="card-body p-5">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <h2 className="fw-bold mb-3">Dashboard Affiliate</h2>
            <p className="text-muted lead">Bagikan produk SahabatMart dan dapatkan komisi hingga 5-10% dari setiap penjualan yang Anda referensikan.</p>
            
            <div className="mt-4 p-3 bg-light rounded d-inline-block border">
               <span className="text-muted me-2 small uppercase">Kode Referral Anda:</span>
               <span className="fw-bold text-primary">KLIKUNTUNG</span>
            </div>
          </div>
          <div className="col-lg-4 text-center d-none d-lg-block">
             <i className="bi bi-megaphone-fill text-purple opacity-25" style={{ fontSize: '8rem' }}></i>
          </div>
        </div>

        <div className="row g-4 mt-4">
           {['Total Klik', 'Konversi', 'Komisi Baru', 'Total Ditarik'].map(label => (
             <div key={label} className="col-6 col-md-3">
                <div className="p-3 bg-white border rounded shadow-sm text-center">
                   <div className="small text-muted mb-1">{label}</div>
                   <div className="h4 mb-0 fw-bold">0</div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
