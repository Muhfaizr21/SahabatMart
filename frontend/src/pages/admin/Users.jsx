import React from 'react';
import { Link } from 'react-router-dom';

const AdminUsers = () => {
  return (
    <>
      {/* breadcrumb */}
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">eCommerce</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Daftar Pengguna</li>
            </ol>
          </nav>
        </div>
        <div className="ms-auto">
          <div className="btn-group">
            <button type="button" className="btn btn-primary"><i className="bi bi-plus"></i> Add New User</button>
          </div>
        </div>
      </div>
      {/* end breadcrumb */}

      <div className="card">
        <div className="card-header py-3">
          <div className="row align-items-center m-0">
            <div className="col-md-4 col-12 me-auto mb-md-0 mb-3">
               <input type="text" className="form-control" placeholder="Search by name, email, or role..." />
            </div>
            <div className="col-md-2 col-6">
              <select className="form-select">
                  <option>Role</option>
                  <option>Super Admin</option>
                  <option>Customer</option>
              </select>
            </div>
            <div className="col-md-2 col-6">
              <select className="form-select">
                  <option>Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle table-striped">
              <thead className="table-light">
                <tr>
                   <th>#ID</th>
                   <th>User Profile</th>
                   <th>Role</th>
                   <th>Status</th>
                   <th>Joined Date</th>
                   <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>USR-2026-001</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="product-box border" style={{ borderRadius: '50%', overflow: 'hidden'}}>
                          <img src="/admin-assets/images/avatars/avatar-1.png" alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Althea Cabardo</h6>
                          <small>althea.cab@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge rounded-pill bg-light-info text-info">Customer</span></td>
                  <td><span className="badge bg-success">Active</span></td>
                  <td><span>Jan 12, 2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Edit info"><i className="bi bi-pencil-fill"></i></a>
                      <a href="javascript:;" className="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Delete"><i className="bi bi-trash-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>USR-2026-004</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="product-box border" style={{ borderRadius: '50%', overflow: 'hidden'}}>
                          <img src="/admin-assets/images/avatars/avatar-4.png" alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Admin Muhfaiizr</h6>
                          <small>admin@sahabatmart.id</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge rounded-pill bg-light-purple text-purple">Super Admin</span></td>
                  <td><span className="badge bg-success">Active</span></td>
                  <td><span>Jan 01, 2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>USR-2026-005</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="product-box border" style={{ borderRadius: '50%', overflow: 'hidden'}}>
                          <img src="/admin-assets/images/avatars/avatar-5.png" alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Dewi Lestari</h6>
                          <small>dewi.l@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge rounded-pill bg-light-info text-info">Customer</span></td>
                  <td><span className="badge bg-danger">Blocked</span></td>
                  <td><span>Mar 10, 2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                      <a href="javascript:;" className="text-danger"><i className="bi bi-trash-fill"></i></a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <nav className="float-end mt-4" aria-label="Page navigation">
            <ul className="pagination">
               <li className="page-item disabled"><a className="page-link" href="#">Previous</a></li>
               <li className="page-item active"><a className="page-link" href="#">1</a></li>
               <li className="page-item"><a className="page-link" href="#">Next</a></li>
            </ul>
          </nav>

        </div>
      </div>
    </>
  );
};

export default AdminUsers;
