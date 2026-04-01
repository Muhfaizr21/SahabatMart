import React, { useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';

const AdminLayout = ({ children }) => {
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
                    <span className="notify-badge">8</span>
                    <i className="bi bi-bell-fill"></i>
                  </div>
                </a>
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
            <li>
              <a href="javascript:;" className="has-arrow">
                <div className="parent-icon"><i className="bi bi-house-fill"></i></div>
                <div className="menu-title">Dashboard</div>
              </a>
              <ul>
                <li> <Link to="/admin"><i className="bi bi-circle"></i>Admin Dashboard</Link></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Color Dashboard 1</a></li>
              </ul>
            </li>
            <li>
              <a href="javascript:;" className="has-arrow">
                <div className="parent-icon"><i className="bi bi-basket2-fill"></i></div>
                <div className="menu-title">eCommerce</div>
              </a>
              <ul>
                <li> <Link to="/admin/products"><i className="bi bi-circle"></i>Products List</Link></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Products Grid</a></li>
                <li> <Link to="/admin/categories"><i className="bi bi-circle"></i>Categories</Link></li>
                <li> <Link to="/admin/orders"><i className="bi bi-circle"></i>Orders</Link></li>
                <li> <Link to="/admin/orders/detail"><i className="bi bi-circle"></i>Order details</Link></li>
                <li> <Link to="/admin/products/add"><i className="bi bi-circle"></i>Add New Product</Link></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Transactions</a></li>
                <li> <Link to="/admin/users"><i className="bi bi-circle"></i>User Accounts</Link></li>
              </ul>
            </li>
            <li className="menu-label">UI Elements</li>
            <li>
              <a href="javascript:;" className="has-arrow">
                <div className="parent-icon"><i className="bi bi-droplet-fill"></i></div>
                <div className="menu-title">Widgets</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Static Widgets</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Data Widgets</a></li>
              </ul>
            </li>
            <li>
              <a className="has-arrow" href="javascript:;">
                <div className="parent-icon"><i className="bi bi-award-fill"></i></div>
                <div className="menu-title">Components</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Alerts</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Accordions</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Modals</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Pagination</a></li>
              </ul>
            </li>
            <li className="menu-label">Forms & Tables</li>
            <li>
              <a className="has-arrow" href="javascript:;">
                <div className="parent-icon"><i className="bi bi-file-earmark-break-fill"></i></div>
                <div className="menu-title">Forms</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Form Elements</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Input Groups</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Forms Layouts</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Form Validation</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Date Pickers</a></li>
              </ul>
            </li>
            <li>
              <a className="has-arrow" href="javascript:;">
                <div className="parent-icon"><i className="bi bi-file-earmark-spreadsheet-fill"></i></div>
                <div className="menu-title">Tables</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Basic Table</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Advance Tables</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Data Table</a></li>
              </ul>
            </li>
            <li className="menu-label">Pages</li>
            <li>
              <a className="has-arrow" href="javascript:;">
                <div className="parent-icon"><i className="bi bi-lock-fill"></i></div>
                <div className="menu-title">Authentication</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Sign In</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Sign Up</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Reset Password</a></li>
              </ul>
            </li>
            <li>
              <a href="javascript:;">
                <div className="parent-icon"><i className="bi bi-person-lines-fill"></i></div>
                <div className="menu-title">User Profile</div>
              </a>
            </li>
            <li>
              <a href="javascript:;">
                <div className="parent-icon"><i className="bi bi-collection-play-fill"></i></div>
                <div className="menu-title">Timeline</div>
              </a>
            </li>
            <li className="menu-label">Charts & Maps</li>
            <li>
              <a className="has-arrow" href="javascript:;">
                <div className="parent-icon"><i className="bi bi-bar-chart-line-fill"></i></div>
                <div className="menu-title">Charts</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Apex</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Chartjs</a></li>
              </ul>
            </li>
            <li>
              <a className="has-arrow" href="javascript:;">
                <div className="parent-icon"><i className="bi bi-pin-map-fill"></i></div>
                <div className="menu-title">Maps</div>
              </a>
              <ul>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Google Maps</a></li>
                <li> <a href="javascript:;"><i className="bi bi-circle"></i>Vector Maps</a></li>
              </ul>
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
