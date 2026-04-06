import React, { useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const AdminLayout = () => {
  const location = useLocation();

  // Tutup sidebar saat pindah halaman (khusus mobile overlay)
  useEffect(() => {
    const wrapper = document.querySelector('.wrapper');
    if (wrapper && wrapper.classList.contains('toggled')) {
      wrapper.classList.remove('toggled');
    }
  }, [location.pathname]);

  useEffect(() => {
    // 1. Load CSS Admin on Mount
    const cssLinks = [
      "/admin-assets/plugins/vectormap/jquery-jvectormap-2.0.2.css",
      "/admin-assets/plugins/simplebar/css/simplebar.css",
      "/admin-assets/plugins/perfect-scrollbar/css/perfect-scrollbar.css",
      "/admin-assets/plugins/metismenu/css/metisMenu.min.css",
      "/admin-assets/css/bootstrap.min.css",
      "/admin-assets/css/bootstrap-extended.css",
      "/admin-assets/css/style.css",
      "/admin-assets/css/icons.css",
      "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap",
      "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css",
      "/admin-assets/css/pace.min.css",
      "/admin-assets/css/dark-theme.css",
      "/admin-assets/css/light-theme.css",
      "/admin-assets/css/semi-dark.css",
      "/admin-assets/css/header-colors.css"
    ];

    cssLinks.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.className = 'admin-template-style';
        document.head.appendChild(link);
      }
    });

    // 2. Load JS Admin Sequentially
    const scriptSources = [
      "/admin-assets/js/jquery.min.js",
      "/admin-assets/js/bootstrap.bundle.min.js",
      "/admin-assets/plugins/simplebar/js/simplebar.min.js",
      "/admin-assets/plugins/metismenu/js/metisMenu.min.js",
      "/admin-assets/plugins/perfect-scrollbar/js/perfect-scrollbar.js",
      "/admin-assets/js/pace.min.js",
      "/admin-assets/js/app.js"
    ];

    const loadScripts = (index) => {
      if (index >= scriptSources.length) return;
      if (document.querySelector(`script[src="${scriptSources[index]}"]`)) {
         loadScripts(index + 1);
         return;
      }
      const script = document.createElement('script');
      script.src = scriptSources[index];
      script.async = false;
      script.className = 'admin-template-script';
      script.onload = () => loadScripts(index + 1);
      document.body.appendChild(script);
    };

    loadScripts(0);

    return () => {
      // Cleanup styles on unmount
      document.querySelectorAll('.admin-template-style').forEach(el => el.remove());
      // Scripts are left to prevent errors when re-mounting
      document.body.classList.remove('toggled');
    };
  }, []);

  const [notifications, setNotif] = React.useState([]);
  
  const loadNotif = () => {
    fetchJson(`${ADMIN_API_BASE}/notifications`)
      .then(d => setNotif(d.data || []))
      .catch(() => setNotif([]));
  };
  
  useEffect(() => { loadNotif(); }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = (id) => {
    fetch(`${ADMIN_API_BASE}/notifications/read?id=${id}`)
      .then(() => loadNotif());
  };

  return (
    <div className="wrapper">
      {/* start top header */}
      <header className="top-header">        
        <nav className="navbar navbar-expand gap-3">
          <div className="mobile-toggle-icon fs-3 d-flex d-lg-none">
            <i className="bi bi-list"></i>
          </div>
          <form className="searchbar">
            <div className="position-absolute top-50 translate-middle-y search-icon ms-3">
              <i className="bi bi-search"></i>
            </div>
            <input className="form-control" type="text" placeholder="Type here to search" />
            <div className="position-absolute top-50 translate-middle-y search-close-icon">
              <i className="bi bi-x-lg"></i>
            </div>
          </form>
          <div className="top-navbar-right ms-auto">
            <ul className="navbar-nav align-items-center gap-1">
               <li className="nav-item">
                  <Link to="/" className="btn btn-primary d-none d-sm-block">Kembali ke Toko</Link>
               </li>
               <li className="nav-item dropdown dropdown-large">
                <a className="nav-link dropdown-toggle dropdown-toggle-nocaret" href="#" data-bs-toggle="dropdown">
                  <div className="notifications">
                    {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
                    <i className="bi bi-bell-fill"></i>
                  </div>
                </a>
                <div className="dropdown-menu dropdown-menu-end p-0">
                  <div className="p-2 border-bottom fw-bold d-flex align-items-center">
                    <span>Notifikasi Admin</span>
                    <button className="btn btn-xs btn-link ms-auto text-decoration-none" onClick={loadNotif}>Refresh</button>
                  </div>
                  <div className="header-notifications-list p-2" style={{maxHeight: 300, overflowY:'auto'}}>
                    {notifications.length === 0 ? (
                      <p className="text-center text-muted small py-3">Tidak ada notifikasi</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`d-flex align-items-start gap-3 p-2 rounded mb-1 ${n.is_read ? 'bg-light opacity-50' : 'bg-white border'}`}>
                        <div className="flex-grow-1">
                           <h6 className="mb-0 small fw-bold">{n.message}</h6>
                           <small className="text-muted" style={{fontSize: 10}}>{new Date(n.created_at).toLocaleString()}</small>
                        </div>
                        {!n.is_read && <button className="btn btn-xs btn-outline-primary" onClick={() => markRead(n.id)}><i className="bi bi-check"></i></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div className="dropdown dropdown-user-setting">
            <a className="dropdown-toggle dropdown-toggle-nocaret" href="#" data-bs-toggle="dropdown">
              <div className="user-setting d-flex align-items-center gap-3">
                <img src="/admin-assets/images/avatars/avatar-1.png" className="user-img" alt="" />
                <div className="d-none d-sm-block">
                  <p className="user-name mb-0">Admin Muhfa</p>
                  <small className="mb-0 dropdown-user-designation">Super Admin</small>
                </div>
              </div>
            </a>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <a className="dropdown-item" href="#">
                  <div className="d-flex align-items-center">
                    <div className=""><i className="bi bi-lock-fill"></i></div>
                    <div className="ms-3"><span>Logout</span></div>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </header>
       {/* end top header */}

        {/* start sidebar */}
        <aside className="sidebar-wrapper" data-simplebar="true">
          <div className="sidebar-header">
            <div>
              <img src="/admin-assets/images/logo-icon.png" className="logo-icon" alt="logo icon" />
            </div>
            <div>
              <h4 className="logo-text">AdminMart</h4>
            </div>
            <div className="toggle-icon ms-auto"><i className="bi bi-list"></i></div>
          </div>
          {/* navigation */}
          <ul className="metismenu" id="menu">

            {/* ── Overview ─────────────────────────────── */}
            <li>
              <Link to="/admin">
                <div className="parent-icon"><i className="bx bxs-dashboard"></i></div>
                <div className="menu-title">Dashboard Overview</div>
              </Link>
            </li>

            <li className="menu-label">User Ecosystem</li>

            {/* ── Users ───────────────────────────────── */}
            <li>
              <a href="javascript:;" className="has-arrow">
                <div className="parent-icon"><i className="bx bxs-user-account"></i></div>
                <div className="menu-title">Users & Members</div>
              </a>
              <ul>
                <li><Link to="/admin/users"><i className="bx bx-circle"></i>Platform Users</Link></li>
                <li><Link to="/admin/affiliates"><i className="bx bx-circle"></i>Affiliate Members</Link></li>
              </ul>
            </li>

            {/* ── Merchants ───────────────────────────── */}
            <li>
              <Link to="/admin/merchants">
                <div className="parent-icon"><i className="bx bxs-store-alt"></i></div>
                <div className="menu-title">Merchant Management</div>
              </Link>
            </li>

            <li className="menu-label">Product Catalog</li>

            {/* ── Products ────────────────────────────── */}
            <li>
              <a href="javascript:;" className="has-arrow">
                <div className="parent-icon"><i className="bx bxs-package"></i></div>
                <div className="menu-title">Products Monitoring</div>
              </a>
              <ul>
                <li><Link to="/admin/products"><i className="bx bx-circle"></i>Product List</Link></li>
                <li><Link to="/admin/products/add"><i className="bx bx-circle"></i>Direct Publish</Link></li>
                <li><Link to="/admin/categories"><i className="bx bx-circle"></i>Categories</Link></li>
                <li><Link to="/admin/brands"><i className="bx bx-circle"></i>Brands</Link></li>
                <li><Link to="/admin/attributes"><i className="bx bx-circle"></i>Global Attributes</Link></li>
                <li><Link to="/admin/moderation"><i className="bx bx-circle"></i>Moderation Queue</Link></li>
              </ul>
            </li>

            {/* ── Orders ──────────────────────────────── */}
            <li>
              <a href="javascript:;" className="has-arrow">
                <div className="parent-icon"><i className="bx bxs-receipt"></i></div>
                <div className="menu-title">Order Lifecycle</div>
              </a>
              <ul>
                <li><Link to="/admin/orders"><i className="bx bx-circle"></i>Order History</Link></li>
                <li><Link to="/admin/disputes"><i className="bx bx-circle"></i>Dispute Arbitration</Link></li>
              </ul>
            </li>

            <li className="menu-label">Marketing & Logistics</li>
            <li>
              <Link to="/admin/vouchers">
                <div className="parent-icon"><i className="bx bxs-coupon"></i></div>
                <div className="menu-title">Platform Vouchers</div>
              </Link>
            </li>
            <li>
              <Link to="/admin/logistics">
                <div className="parent-icon"><i className="bx bxs-truck"></i></div>
                <div className="menu-title">Logistics & Shipping</div>
              </Link>
            </li>

            <li className="menu-label">Content & Media</li>
            <li>
              <Link to="/admin/blogs">
                <div className="parent-icon"><i className="bx bxs-news"></i></div>
                <div className="menu-title">Blog & Articles</div>
              </Link>
            </li>

            <li className="menu-label">Finance & Audit</li>

            {/* ── Finance ─────────────────────────────── */}
            <li>
              <Link to="/admin/finance">
                <div className="parent-icon"><i className="bx bxs-bar-chart-alt-2"></i></div>
                <div className="menu-title">Financial Ledger</div>
              </Link>
            </li>

            {/* ── Commissions ─────────────────────────── */}
            <li>
              <Link to="/admin/commissions">
                <div className="parent-icon"><i className="bx bxs-percentage"></i></div>
                <div className="menu-title">Commission Engine</div>
              </Link>
            </li>

            {/* ── Payouts ─────────────────────────────── */}
            <li>
              <Link to="/admin/payouts">
                <div className="parent-icon"><i className="bx bxs-wallet"></i></div>
                <div className="menu-title">Payout Operations</div>
              </Link>
            </li>

            <li className="menu-label">Settings & Forensic</li>

            {/* ── Audit Log ───────────────────────────── */}
            <li>
              <Link to="/admin/audit">
                <div className="parent-icon"><i className="bx bxs-file-find"></i></div>
                <div className="menu-title">Audit Log Forensic</div>
              </Link>
            </li>

            {/* ── Security ────────────────────────────── */}
            <li>
              <Link to="/admin/security">
                <div className="parent-icon"><i className="bx bxs-shield-alt-2"></i></div>
                <div className="menu-title">Security & Fraud</div>
              </Link>
            </li>

          </ul>
          {/* end navigation */}
       </aside>
       {/* end sidebar */}

       {/* start content */}
       <main className="page-content">
          <Outlet />
       </main>
       {/* end page main */}

       {/* start overlay */}
       <div className="overlay nav-toggle-icon"></div>
       {/* end overlay */}

       {/* start footer */}
       <footer className="footer" style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 10 }}>
        <div className="footer-text">
           Copyright © 2026 SahabatMart Admin. All right reserved.
        </div>
       </footer>
       {/* end footer */}
    </div>
  );
};

export default AdminLayout;
