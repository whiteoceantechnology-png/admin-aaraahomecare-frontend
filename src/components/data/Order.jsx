// src/components/data/Order.jsx
import React, { useEffect, useState } from "react";
import { Row, Col } from "reactstrap";
import Nav from "react-bootstrap/Nav";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import styled from "styled-components";
import moment from "moment";

import OrderTable from "../table/OrderTable";
import OrderDetails from "./OrderDetails";
import TrackOrder from "../form/TrackOrderForm";
import CancelOrder from "./CancelOrder";

const CustomTabContent = styled.div`
  .tab-content {
    background-color: transparent;
    padding: 0px;
    border: none;
  }
`;

const StyledTabs = styled(Tabs)`
  margin-bottom: 1rem;
`;

const Order = () => {
  const [activeTab, setActiveTab] = useState("list"); // list | view | track | cancel
  const [filterStatus, setFilterStatus] = useState("allorder");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const dummy = [
      {
        id: 1,
        orderId: "ORD1001",
        orderType: "normal",
        totalAmount: 1499,
        paymentStatus: "success",
        orderStatus: "pending",
        createdAt: "2025-12-15T10:30:00Z",
        txnStatus: "TXN_SUCCESS",
        trackingInfo: "BL1234, BlueDart",
        user: {
          userName: "Rahul",
          phone: "9876543210",
          email: "rahul@example.com",
          gender: "male",
          status: "active",
        },
        address: {
          street: "12, Main Street",
          landmark: "Near Park",
          zipcode: "600001",
          city: "Chennai",
          district: "Chennai",
          state: "Tamil Nadu",
          addressType: "Home",
        },
      },
      {
        id: 2,
        orderId: "ORD1002",
        orderType: "subscription",
        totalAmount: 899,
        paymentStatus: "pending",
        orderStatus: "accepted",
        createdAt: "2025-12-14T09:15:00Z",
        txnStatus: "TXN_PENDING",
        trackingInfo: "",
        user: {
          userName: "Anu",
          phone: "9876500000",
          email: "anu@example.com",
          gender: "female",
          status: "active",
        },
        address: {
          street: "45, Cross Street",
          landmark: "Near Mall",
          zipcode: "600020",
          city: "Chennai",
          district: "Chennai",
          state: "Tamil Nadu",
          addressType: "Office",
        },
      },
    ];

    const mapped = dummy.map((o) => ({
      ...o,
      txnTimeStamp: moment(o.createdAt).format("DD MM YYYY"),
    }));
    setOrders(mapped);
  }, []);

  const filteredOrders =
    filterStatus === "allorder"
      ? orders
      : orders.filter((o) => o.orderStatus === filterStatus);

  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setActiveTab("view");
  };

  const handleTrackClick = (order) => {
    setSelectedOrder(order);
    setActiveTab("track");
  };

  const handleCancelClick = (order) => {
    setSelectedOrder(order);
    setActiveTab("cancel");
  };

  return (
    <div className="content">
      <Row>
        <Col xs={12} md={12}>
          {/* Status filter (top nav) */}
          {/* <Nav
            style={{ marginTop: "20px", fontSize: "16px" }}
            variant="underline"
            activeKey={filterStatus}
            onSelect={(selectedKey) => setFilterStatus(selectedKey)}
          >
            {[
              ["allorder", "All orders"],
              ["pending", "Pending"],
              ["accepted", "Accepted"],
              ["packaging", "Packaging"],
              ["dispatched", "Dispatched"],
              ["delivered", "Delivered"],
              ["declined", "Declined"],
            ].map(([key, label]) => (
              <Nav.Item key={key}>
                <Nav.Link
                  eventKey={key}
                  style={{
                    color: filterStatus === key ? "#c8832b" : "#000",
                    paddingBottom: "5px",
                    borderBottom:
                      filterStatus === key ? "3px solid #c8832b" : "none",
                  }}
                >
                  {label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav> */}

          {/* Main tabs like category */}
          <CustomTabContent>
            <StyledTabs
              id="orders-main-tabs"
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab eventKey="list" title="Order List">
                <OrderTable
                  data={filteredOrders}  
                  onView={handleViewClick}
                  onTrack={handleTrackClick}
                  onCancel={handleCancelClick}
                />
              </Tab>

              <Tab eventKey="view" title="View Order">
                <OrderDetails order={selectedOrder} />
              </Tab>

              <Tab eventKey="track" title="Track Order">
                <TrackOrder order={selectedOrder} />
              </Tab>

              <Tab eventKey="cancel" title="Cancel Order">
                <CancelOrder order={selectedOrder} />
              </Tab>
            </StyledTabs>
          </CustomTabContent>
        </Col>
      </Row>
    </div>
  );
};

export default Order;
