import React from 'react';
import { Link } from 'react-router-dom';

const AdminOrderDetail = () => {
  return (
    <>
      {/* breadcrumb */}
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">eCommerce</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item"><Link to="/admin/orders">Orders</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Order details</li> 
            </ol>
          </nav>
        </div>
        <div className="ms-auto">
          <div className="btn-group">
            <button type="button" className="btn btn-primary">Settings</button>
          </div>
        </div>
      </div>
      {/* end breadcrumb */}

      <div className="card">
        <div className="card-header py-3"> 
          <div className="row g-3 align-items-center">
            <div className="col-12 col-lg-4 col-md-6 me-auto">
              <h5 className="mb-1">Tue, Apr 15, 2026, 8:44PM</h5>
              <p className="mb-0">Order ID : #8965327</p>
            </div>
            <div className="col-12 col-lg-3 col-6 col-md-3">
              <select className="form-select">
                <option>Change Status</option>
                <option>Awaiting Payment</option>
                <option>Confirmed</option>
                <option>Shipped</option>
                <option>Delivered</option>
              </select>
            </div>
            <div className="col-12 col-lg-3 col-6 col-md-3">
                <button type="button" className="btn btn-primary me-2">Save</button>
                <button type="button" className="btn btn-secondary"><i className="bi bi-printer-fill"></i> Print</button>
            </div>
          </div>
          </div>
        <div className="card-body">
            <div className="row row-cols-1 row-cols-xl-2 row-cols-xxl-3">
                <div className="col">
                  <div className="card border shadow-none radius-10">
                    <div className="card-body">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box bg-light-primary border-0">
                        <i className="bi bi-person text-primary"></i>
                      </div>
                      <div className="info">
                          <h6 className="mb-2">Customer</h6>
                          <p className="mb-1">Budi Santoso</p>
                          <p className="mb-1">budi@example.com</p>
                          <p className="mb-1">+62-812XXXXXX</p>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
                <div className="col">
                <div className="card border shadow-none radius-10">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box bg-light-success border-0">
                        <i className="bi bi-truck text-success"></i>
                      </div>
                      <div className="info">
                          <h6 className="mb-2">Order info</h6>
                          <p className="mb-1"><strong>Shipping</strong> : JNE Express</p>
                          <p className="mb-1"><strong>Pay Method</strong> : Bank Transfer</p>
                          <p className="mb-1"><strong>Status</strong> : New</p>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              <div className="col">
                <div className="card border shadow-none radius-10">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box bg-light-danger border-0">
                        <i className="bi bi-geo-alt text-danger"></i>
                      </div>
                      <div className="info">
                        <h6 className="mb-2">Deliver to</h6>
                        <p className="mb-1"><strong>City</strong> : Jakarta, Indonesia</p>
                        <p className="mb-1"><strong>Address</strong> : Jl. Merdeka No 45, <br/>Jakarta Selatan</p>
                      </div>
                    </div>
                  </div>
                  </div>
            </div>
          </div>{/* end row */}

          <div className="row">
              <div className="col-12 col-lg-8">
                  <div className="card border shadow-none radius-10">
                    <div className="card-body">
                        <div className="table-responsive">
                          <table className="table align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Product</th>
                                <th>Unit Price</th>
                                <th>Quantity</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <div className="orderlist">
                                  <a className="d-flex align-items-center gap-2" href="javascript:;">
                                    <div className="product-box">
                                        <img src="/admin-assets/images/products/01.png" alt="" />
                                    </div>
                                    <div>
                                        <p className="mb-0 product-title">Men White Polo T-shirt</p>
                                    </div>
                                    </a>
                                  </div>
                                </td>
                                <td>$35.00</td>
                                <td>2</td>
                                <td>$70.00</td>
                              </tr>
                              <tr>
                              <td>
                                <div className="orderlist">
                                  <a className="d-flex align-items-center gap-2" href="javascript:;">
                                    <div className="product-box">
                                        <img src="/admin-assets/images/products/02.png" alt="" />
                                    </div>
                                    <div>
                                        <p className="mb-0 product-title">Formal Black Coat Pant</p>
                                    </div>
                                  </a>
                                </div>
                              </td>
                              <td>$25.00</td>
                              <td>1</td>
                              <td>$25.00</td>
                            </tr>
                            <tr>
                              <td>
                                <div className="orderlist">
                                  <a className="d-flex align-items-center gap-2" href="javascript:;">
                                    <div className="product-box">
                                        <img src="/admin-assets/images/products/03.png" alt="" />
                                    </div>
                                    <div>
                                        <p className="mb-0 product-title">Blue Shade Jeans</p>
                                    </div>
                                  </a>
                                </div>
                              </td>
                              <td>$65.00</td>
                              <td>2</td>
                              <td>$130.00</td>
                            </tr>
                            </tbody>
                          </table>
                        </div>
                    </div>
                  </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="card border shadow-none bg-light radius-10">
                  <div className="card-body">
                      <div className="d-flex align-items-center mb-4">
                          <div>
                            <h5 className="mb-0">Order Summary</h5>
                          </div>
                          <div className="ms-auto">
                            <button type="button" className="btn alert-success radius-30 px-4">Confirmed</button>
                        </div>
                      </div>
                        <div className="d-flex align-items-center mb-3">
                          <div>
                            <p className="mb-0">Subtotal</p>
                          </div>
                          <div className="ms-auto">
                            <h5 className="mb-0">$198.00</h5>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div>
                          <p className="mb-0">Shipping Price</p>
                        </div>
                        <div className="ms-auto">
                          <h5 className="mb-0">$0.00</h5>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div>
                          <p className="mb-0">Taxes</p>
                        </div>
                        <div className="ms-auto">
                          <h5 className="mb-0">$24.00</h5>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div>
                          <p className="mb-0">Payment Fee</p>
                        </div>
                        <div className="ms-auto">
                          <h5 className="mb-0">$14.00</h5>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div>
                          <p className="mb-0">Discount</p>
                        </div>
                        <div className="ms-auto">
                          <h5 className="mb-0 text-danger">-$36.00</h5>
                        </div>
                      </div>
                  </div>
                </div>

                <div className="card border shadow-none bg-warning radius-10">
                  <div className="card-body">
                      <h5>Payment info</h5>
                        <div className="d-flex align-items-center gap-3">
                          <div className="fs-1">
                            <i className="bi bi-credit-card-2-back-fill"></i>
                          </div>
                          <div className="">
                            <p className="mb-0 fs-6">Master Card **** **** 8956 </p>
                          </div>
                        </div>
                      <p>SahabatMart Corp <br/>
                          Phone: +62-812XXXXXX
                      </p>
                  </div>
                </div>

              </div>
          </div>{/* end row */}

        </div>
      </div>
    </>
  );
};

export default AdminOrderDetail;
