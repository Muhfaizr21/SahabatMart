import React from 'react';
import { Link } from 'react-router-dom';

const AdminAddProduct = () => {
  return (
    <>
      {/* breadcrumb */}
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">eCommerce</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/admin/products">Products List</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Add New Product</li>
            </ol>
          </nav>
        </div>
      </div>
      {/* end breadcrumb */}

      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card">
            <div className="card-header py-3 bg-transparent"> 
              <h5 className="mb-0">Add New Product</h5>
            </div>
            <div className="card-body">
              <div className="border p-3 rounded">
                <form className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Product title</label>
                    <input type="text" className="form-control" placeholder="Product title" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Full description</label>
                    <textarea className="form-control" placeholder="Full description" rows="4" cols="4"></textarea>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Images</label>
                    <input className="form-control" type="file" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Tags</label>
                    <input type="text" className="form-control" placeholder="Enter tags" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Category</label>
                    <select className="form-select">
                      <option>Fashion</option>
                      <option>Electronics</option>
                      <option>Furniture</option>
                      <option>Sports</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Sub-category</label>
                    <select className="form-select">
                      <option>Jeans</option>
                      <option>T-Shirts</option>
                      <option>Shoes</option>
                      <option>Mobiles</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Price</label>
                    <div className="row g-3">
                      <div className="col-lg-9">
                        <input type="text" className="form-control" placeholder="Price" />
                      </div>
                      <div className="col-lg-3">
                        <div className="input-group">
                          <select className="form-select">
                            <option> IDR </option>
                            <option> USD </option>
                            <option> EUR </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" value="" id="flexCheckDefault" />
                      <label className="form-check-label" htmlFor="flexCheckDefault">
                        Publish on website
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <button type="button" className="btn btn-primary px-4">Submit Item</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminAddProduct;
