import React from 'react';
import { Link } from 'react-router-dom';

const AdminCategories = () => {
  return (
    <>
      {/* breadcrumb */}
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">eCommerce</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Categories</li>
            </ol>
          </nav>
        </div>
      </div>
      {/* end breadcrumb */}

      <div className="card">
        <div className="card-header py-3">
          <h6 className="mb-0">Add Product Category</h6>
        </div>
        <div className="card-body">
            <div className="row">
              <div className="col-12 col-lg-4 d-flex">
                <div className="card border shadow-none w-100">
                  <div className="card-body">
                    <form className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Name</label>
                        <input type="text" className="form-control" placeholder="Category name" />
                      </div>
                      <div className="col-12">
                      <label className="form-label">Slug</label>
                      <input type="text" className="form-control" placeholder="Slug name" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Parent</label>
                      <select className="form-select">
                        <option>Fashion</option>
                        <option>Electronics</option>
                        <option>Furniture</option>
                        <option>Sports</option>
                      </select> 
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows="3" cols="3" placeholder="Product Description"></textarea>
                    </div>
                    <div className="col-12">
                      <div className="d-grid">
                        <button type="button" className="btn btn-primary">Add Category</button>
                      </div>
                    </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-8 d-flex">
              <div className="card border shadow-none w-100">
                <div className="card-body">
                  <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th><input className="form-check-input" type="checkbox" /></th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Slug</th>
                            <th>Order</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><input className="form-check-input" type="checkbox" /></td>
                            <td>#85462</td>
                            <td>Fashion</td>
                            <td>Some lorem ipsum</td>
                            <td>/fashion</td>
                            <td>54</td>
                            <td>
                            <div className="d-flex align-items-center gap-3 fs-6">
                              <a href="javascript:;" className="text-primary" data-bs-toggle="tooltip" data-bs-placement="bottom" title="View detail"><i className="bi bi-eye-fill"></i></a>
                              <a href="javascript:;" className="text-warning" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Edit info"><i className="bi bi-pencil-fill"></i></a>
                              <a href="javascript:;" className="text-danger" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Delete"><i className="bi bi-trash-fill"></i></a>
                            </div>
                            </td>
                          </tr>
                          <tr>
                          <td><input className="form-check-input" type="checkbox" /></td>
                          <td>#63524</td>
                          <td>Jeans</td>
                          <td>Some lorem ipsum</td>
                          <td>/jeans</td>
                          <td>24</td>
                          <td>
                            <div className="d-flex align-items-center gap-3 fs-6">
                              <a href="javascript:;" className="text-primary"><i className="bi bi-eye-fill"></i></a>
                              <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                              <a href="javascript:;" className="text-danger"><i className="bi bi-trash-fill"></i></a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td><input className="form-check-input" type="checkbox" /></td>
                          <td>#98653</td>
                          <td>Electronics</td>
                          <td>Some lorem ipsum</td>
                          <td>/electronics</td>
                          <td>52</td>
                          <td>
                            <div className="d-flex align-items-center gap-3 fs-6">
                              <a href="javascript:;" className="text-primary"><i className="bi bi-eye-fill"></i></a>
                              <a href="javascript:;" className="text-warning"><i className="bi bi-pencil-fill"></i></a>
                              <a href="javascript:;" className="text-danger"><i className="bi bi-trash-fill"></i></a>
                            </div>
                          </td>
                        </tr>
                        </tbody>
                      </table>
                  </div>
                  <nav className="float-end mt-0" aria-label="Page navigation">
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
            </div>
            </div>{/* end row */}
        </div>
      </div>
    </>
  );
};

export default AdminCategories;
