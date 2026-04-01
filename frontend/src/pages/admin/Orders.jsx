import React from 'react';
import { Link } from 'react-router-dom';

const AdminOrders = () => {
  return (
    <>
      {/* breadcrumb */}
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">eCommerce</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Orders</li>
            </ol>
          </nav>
        </div>
      </div>
      {/* end breadcrumb */}

      <div className="card">
        <div className="card-header py-3">
          <div className="row align-items-center m-0">
            <div className="col-md-3 col-12 me-auto mb-md-0 mb-3">
              <select className="form-select">
                  <option>All category</option>
                  <option>Fashion</option>
                  <option>Electronics</option>
                  <option>Furniture</option>
                  <option>Sports</option>
              </select>
            </div>
            <div className="col-md-2 col-6">
              <input type="date" className="form-control" />
            </div>
            <div className="col-md-2 col-6">
              <select className="form-select">
                  <option>Status</option>
                  <option>Active</option>
                  <option>Disabled</option>
                  <option>Show all</option>
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
                   <th>Customer</th>
                   <th>Status</th>
                   <th>Total</th>
                   <th>Date</th>
                   <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#ORD-89742</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="product-box border">
                          <img src="/admin-assets/images/avatars/avatar-1.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Althea Cabardo</h6>
                          <small>althea@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge rounded-pill bg-success">Completed</span></td>
                  <td><span>$214.00</span></td>
                  <td><span>Apr 8, 2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary"><i className="bi bi-eye-fill"></i></a>
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>#ORD-68570</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="product-box border">
                          <img src="/admin-assets/images/avatars/avatar-2.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Budi Santoso</h6>
                          <small>budi@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge rounded-pill bg-warning text-dark">Pending</span></td>
                  <td><span>$185.00</span></td>
                  <td><span>Apr 9, 2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary"><i className="bi bi-eye-fill"></i></a>
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>#ORD-38567</td>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="product-box border">
                          <img src="/admin-assets/images/avatars/avatar-3.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Muhfaiizr</h6>
                          <small>muhfa@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge rounded-pill bg-danger">Cancelled</span></td>
                  <td><span>$356.00</span></td>
                  <td><span>Apr 10, 2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary"><i className="bi bi-eye-fill"></i></a>
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
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
              <li className="page-item"><a className="page-link" href="#">2</a></li>
              <li className="page-item"><a className="page-link" href="#">3</a></li>
              <li className="page-item"><a className="page-link" href="#">Next</a></li>
            </ul>
          </nav>

        </div>
      </div>
    </>
  );
};

export default AdminOrders;
