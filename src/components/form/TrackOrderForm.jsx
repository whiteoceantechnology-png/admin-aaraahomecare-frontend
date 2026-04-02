// src/components/order/TrackOrderForm.jsx
import React, { useState, useEffect } from "react";
import { Form, FormGroup, Label, Input } from "reactstrap";

const TrackOrderForm = ({ order }) => {
  const dummyOrder = {
    orderId: "12",
    trackingInfo: "C12345, BlueDart",
    orderStatus: "Processing",
  };

  const currentOrder = order || dummyOrder;

  const [courierId, setCourierId] = useState("");
  const [courierName, setCourierName] = useState("");

  useEffect(() => {
    if (currentOrder && currentOrder.trackingInfo) {
      const split = currentOrder.trackingInfo.split(",");
      setCourierId(split[0] || "");
      setCourierName((split[1] || "").trim());
    } else {
      setCourierId("");
      setCourierName("");
    }
  }, [currentOrder]);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `Tracking updated for ${currentOrder.orderId}: ${courierId}, ${courierName}`
    );
  };

  return (
    <section className="box">
      <header className="panel_header">
        <h4 className="title float-left">
          Track Order – {currentOrder.orderId}
        </h4>
      </header>

    
      <div className="px-4 pt-3 pb-2 bg-white text-sm">
       
      </div>

     
      <div className="content-body pt-3 mt-5">
        <div className="row">
          <div className="col-12 col-sm-6 col-md-5">
            <h5>Current Tracking Information</h5>
            <ul>
              <li>
                Courier Id{" "}
                <span>
                  {currentOrder.trackingInfo
                    ? currentOrder.trackingInfo.split(",")[0]
                    : "NA"}
                </span>
              </li>
              <li>
                Courier Name{" "}
                <span>
                  {currentOrder.trackingInfo
                    ? (currentOrder.trackingInfo.split(",")[1] || "").trim()
                    : "NA"}
                </span>
              </li>
            </ul>
          </div>

          <div className="col-12 col-sm-6 col-md-5">
            <h5>Add Tracking Information</h5>
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="courierId">Courier Id</Label>
                <Input
                  type="text"
                  id="courierId"
                  value={courierId}
                  onChange={(e) => setCourierId(e.target.value)}
                  placeholder="Enter Courier Id"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="courierName">Courier Name</Label>
                <Input
                  type="text"
                  id="courierName"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Enter Courier Name"
                />
              </FormGroup>
              <FormGroup style={{ marginBottom: "0px" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    color: "#fff",
                    backgroundColor: "#247554",
                  }}
                >
                  Add tracking Info
                </button>
              </FormGroup>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackOrderForm;
