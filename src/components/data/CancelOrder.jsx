// src/components/order/CancelOrder.jsx
import React, { useState } from "react";
import { Form, FormGroup, Label, Input } from "reactstrap";

const CancelOrder = ({ order }) => {
  const [reason, setReason] = useState("");

  if (!order) {
    return <div style={{ padding: "20px" }}>Select an order to cancel.</div>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Order ${order.orderId} cancelled. Reason: ${reason}`);
  };

  return (
    <section className="box">
      <header className="panel_header">
        <h2 className="title float-left">Cancel Order – {order.orderId}</h2>
      </header>
       <div className="px-4 pt-3 pb-2 bg-white text-sm">
       
      </div>
      <div className="content-body pt-3 mt-5">
        <div className="row">
          <div className="col-12 col-md-6">
            <h5>Cancel this order</h5>
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="cancelReason">Reason for cancellation</Label>
                <Input
                  type="textarea"
                  rows={3}
                  id="cancelReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Type your reason..."
                />
              </FormGroup>
              <FormGroup style={{ marginBottom: "0px" }}>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ color: "#fff", backgroundColor: "#dc3545" }}
                >
                  Confirm Cancel
                </button>
              </FormGroup>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CancelOrder;
