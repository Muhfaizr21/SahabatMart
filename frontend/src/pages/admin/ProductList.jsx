import React from 'react';
import { Link } from 'react-router-dom';

const AdminProductList = () => {
  return (
    <>
      {/* breadcrumb */}
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">eCommerce</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Products List</li>
            </ol>
          </nav>
        </div>
        <div className="ms-auto">
          <div className="btn-group">
            <Link to="/admin/products/add" className="btn btn-primary">Add New Product</Link>
          </div>
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
              <tbody>
                <tr>
                  <td>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" />
                    </div>
                  </td>
                  <td className="productlist">
                    <a className="d-flex align-items-center gap-2" href="#">
                      <div className="product-box">
                          <img src="/admin-assets/images/products/01.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Men White Polo T-shirt</h6>
                      </div>
                      </a>
                  </td>
                  <td><span>$18.00</span></td>
                  <td><span className="badge rounded-pill bg-success">Active</span></td>
                  <td><span>5-31-2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary" data-bs-toggle="tooltip" data-bs-placement="bottom" title="View detail"><i className="bi bi-eye-fill"></i></a>
                      <a href="javascript:;" className="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Edit info"><i className="bi bi-pencil-fill"></i></a>
                      <a href="javascript:;" className="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Delete"><i className="bi bi-trash-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" />
                    </div>
                  </td>
                  <td className="productlist">
                    <a className="d-flex align-items-center gap-2" href="#">
                      <div className="product-box">
                          <img src="/admin-assets/images/products/02.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Formal Black Coat Pant</h6>
                      </div>
                      </a>
                  </td>
                  <td><span>$18.00</span></td>
                  <td><span className="badge rounded-pill bg-success">Active</span></td>
                  <td><span>5-31-2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary"><i className="bi bi-eye-fill"></i></a>
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                      <a href="javascript:;" className="text-danger"><i className="bi bi-trash-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" />
                    </div>
                  </td>
                  <td className="productlist">
                    <a className="d-flex align-items-center gap-2" href="#">
                      <div className="product-box">
                          <img src="/admin-assets/images/products/03.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Blue Shade Jeans</h6>
                      </div>
                      </a>
                  </td>
                  <td><span>$18.00</span></td>
                  <td><span className="badge rounded-pill bg-warning text-dark">Archived</span></td>
                  <td><span>5-31-2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary"><i className="bi bi-eye-fill"></i></a>
                      <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                      <a href="javascript:;" className="text-danger"><i className="bi bi-trash-fill"></i></a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" />
                    </div>
                  </td>
                  <td className="productlist">
                    <a className="d-flex align-items-center gap-2" href="#">
                      <div className="product-box">
                          <img src="/admin-assets/images/products/04.png" alt="" />
                      </div>
                      <div>
                          <h6 className="mb-0 product-title">Yellow Winter Jacket for Men</h6>
                      </div>
                      </a>
                  </td>
                  <td><span>$18.00</span></td>
                  <td><span className="badge rounded-pill bg-danger">Disabled</span></td>
                  <td><span>5-31-2026</span></td>
                  <td>
                    <div className="d-flex align-items-center gap-3 fs-6">
                      <a href="javascript:;" className="text-secondary"><i className="bi bi-eye-fill"></i></a>
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

export default AdminProductList;
