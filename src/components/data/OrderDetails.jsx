// src/components/order/OrderDetails.jsx
import React from "react";
import moment from "moment";

const OrderDetails = ({ data }) => {
  // இப்போத்தைக்கு dummy data
  const dummy = {
    fetchOrder: {
      orderId: "12",
      orderStatus: "processing",
      createdAt: "2017-01-07T01:21:49",
      totalAmount: 311.04,
      paymentMethod: "Cash On Delivery",
      paymentStatus: "Paid",
      deliveryType: "Flat Shipping Rate",
      trackingInfo: "C12345, BlueDart",
      txnToken: "TXN123456",
      txnStatus: "TXN_SUCCESS",
    },
    fetchUser: {
      userName: "Anthony Blair",
      email: "anthonyblair@abantecart.com",
      phone: "9876543210",
      isMailVerified: "Yes",
      isPhoneVerified: "Yes",
      status: "active",
      dob: "1990-01-01",
    },
    fetchAddress: {
      address: "12, Main Street, Chennai",
      addressType: "Home",
      state: "Tamil Nadu",
      phone: "9876543210",
    },
  };

  const src = data || dummy;
  const order = src.fetchOrder || {};
  const user = src.fetchUser || {};
  const address = src.fetchAddress || {};

  const trackingSplit = order.trackingInfo ? order.trackingInfo.split(",") : [];
  const courierId = trackingSplit[0] || "";
  const courierName = (trackingSplit[1] || "").trim();

  return (
    <section className="box ">
      <header className="panel_header mb-5">
        <h2 className="title float-left">Order Summary</h2>
      </header>

      {/* Top summary (screenshot style) */}
      <div className="content-body p-4 mt-5">
        <div className="border border-gray-200 rounded-md bg-white px-4 py-3 text-sm mb-4 mt-5">
          <div className="row">
            {/* Left column */}
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Order ID:</span>
                <span>#{order.orderId}</span>
              </div>

              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Customer:</span>
                <span>{user.userName}</span>
              </div>

              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Date Added:</span>
                <span>
                  {order.createdAt
                    ? moment(order.createdAt).format("DD/MM/YYYY hh:mm:ss A")
                    : "-"}
                </span>
              </div>

              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Shipping Method:</span>
                <span>
                  {order.deliveryType || address.addressType || "Flat Shipping Rate"}
                </span>
              </div>
            </div>

            {/* Right column */}
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Order Status:</span>
                <span className="text-capitalize">{order.orderStatus}</span>
              </div>

              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">E-Mail:</span>
                <span style={{ textTransform: "lowercase" }}>
                  {user.email}
                </span>
              </div>

              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Original Order Total:</span>
                <span>₹{order.totalAmount}</span>
              </div>

              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Payment Method:</span>
                <span className="text-capitalize">
                  {order.paymentMethod}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Profile Details */}
        <div className="border border-gray-200 rounded-md bg-white px-4 py-3 text-sm mb-4">
          <h5 className="mb-3">Customer Profile Details</h5>
          <div className="row">
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Name:</span>
                <span>{user.userName}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Email:</span>
                <span style={{ textTransform: "lowercase" }}>{user.email}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Phone:</span>
                <span>{address.phone}</span>
              </div>
            </div>

            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Mail Verified:</span>
                <span>{user.isMailVerified}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Phone Verified:</span>
                <span>{user.isPhoneVerified}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Customer Status:</span>
                <span className="text-capitalize">{user.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="border border-gray-200 rounded-md bg-white px-4 py-3 text-sm mb-4">
          <h5 className="mb-3">Address Details</h5>
          <div className="row">
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Address:</span>
                <span>{address.address}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Address Type:</span>
                <span className="text-capitalize">{address.addressType}</span>
              </div>
            </div>
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">State:</span>
                <span className="text-capitalize">{address.state}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details (full) */}
        <div className="border border-gray-200 rounded-md bg-white px-4 py-3 text-sm mb-4">
          <h5 className="mb-3">Order Details</h5>
          <div className="row">
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Order ID:</span>
                <span>{order.orderId}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Order Placed Date:</span>
                <span>
                  {order.createdAt
                    ? moment(order.createdAt).format("DD-MM-YYYY")
                    : "-"}
                </span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Total Amount:</span>
                <span>₹{order.totalAmount}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Payment Method:</span>
                <span className="text-capitalize">{order.paymentMethod}</span>
              </div>
            </div>

            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Payment Status:</span>
                <span className="text-capitalize">{order.paymentStatus}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Order Status:</span>
                <span className="text-capitalize">{order.orderStatus}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Transaction ID:</span>
                <span>{order.txnToken}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Transaction Status:</span>
                <span className="text-capitalize">{order.txnStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Info (read-only) */}
        <div className="border border-gray-200 rounded-md bg-white px-4 py-3 text-sm">
          <h5 className="mb-3">Tracking Information</h5>
          <div className="row">
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Courier ID:</span>
                <span>{courierId || "-"}</span>
              </div>
            </div>
            <div className="col-md-6 col-sm-12">
              <div className="d-flex mb-2">
                <span className="font-semibold mr-2">Courier Name:</span>
                <span>{courierName || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderDetails;
