// src/components/data/CustomerDetail.jsx
import React from "react";
import moment from "moment";

const CustomerDetail = ({ data }) => {
  if (!data) {
    return <div>Select a customer from list.</div>;
  }

  return (
    <div className="row">
      {/* profile image */}
      <div className="uprofile-image col-xl-2 col-lg-3 col-md-3 col-sm-4 col-12">
        {data.profilePic ? (
          <img
            alt=""
            src={data.profilePic}
            className="img-fluid rounded"
          />
        ) : null}
      </div>

      {/* basic info */}
      <div className="uprofile-name col-xl-10 col-lg-9 col-md-9 col-sm-8 col-12">
        <h3 className="uprofile-owner">
          {data.userName && (
            <a href="#!" style={{ textTransform: "capitalize" }}>
              {data.userName}
            </a>
          )}
        </h3>

        <div className="clearfix" />
        <p
          style={{
            color: "#aaaaaa",
            display: "inline-block",
          }}
        >
          {data.alaisName}
        </p>
        <div className="clearfix" />

        <div className="row mt-3">
          <div className="col-lg-4 col-md-5 col-sm-6">
            {data.phone && (
              <p>
                <i className="i-screen-smartphone" /> {data.phone}
              </p>
            )}
            {data.email && (
              <p>
                <i className="fa fa-envelope-o" /> {data.email}
              </p>
            )}
            {data.gender && (
              <p style={{ textTransform: "capitalize" }}>
                <i className="fa fa-venus-mars" /> {data.gender}
              </p>
            )}
            {data.dob && data.dob !== "Enter DOB" && (
              <p>
                <i className="fa fa-birthday-cake" />{" "}
                {moment(data.dob).format("LL")}
              </p>
            )}
            {data.status && (
              <p style={{ textTransform: "capitalize" }}>
                <strong>Status:</strong> {data.status}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
