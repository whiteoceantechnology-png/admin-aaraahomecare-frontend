// src/components/data/Customer.jsx
import { useEffect, useState } from "react";
import CustomerTable from "../table/CustomerTable";
import CustomerDetail from "./CustomerDetail"; // detail tab component
import { toast } from "react-hot-toast";

const Customer = ({ title = "Customers" }) => {
  const [data, setData] = useState([
    {
      id: 1,
      userName: "Rahul Kumar",
      phone: "9876543210",
      gender: "male",
      email: "rahul@example.com",
      status: "active",
      alaisName: "Rahul",
      profilePic: "/images/customer1.jpg",
      dob: "1995-06-10",
    },
    {
      id: 2,
      userName: "Anu Priya",
      phone: "9876500000",
      gender: "female",
      email: "anu@example.com",
      status: "inactive",
      alaisName: "Anu",
      profilePic: "/images/customer2.jpg",
      dob: "1998-03-22",
    },
  ]);

  const [activeTab, setActiveTab] = useState("table"); // table | view
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRowClick = (record) => {
    setSelectedCustomer(record);
    setActiveTab("view");
  };

  const handleDeleteCustomer = (id) => {
    const toastId = "deletecustomer-toast";
    setData((prev) => prev.filter((item) => item.id !== id));
    toast.success("Customer deleted!", { id: toastId });
  };

  const handleTabClick = (tab) => setActiveTab(tab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <svg
          className="animate-spin h-5 w-5 text-purple-500 mr-2"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        Loading Customers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

        <div>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              style={{ cursor: "pointer" }}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-2 ${
                activeTab === "table"
                  ? "bg-white border border-gray-200 border-b-white text-blue-600"
                  : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => handleTabClick("table")}
            >
              Customer List
            </button>

            <button
              style={{ cursor: "pointer" }}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
                activeTab === "view"
                  ? "bg-white border border-gray-200 border-b-white text-blue-600"
                  : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => {
                if (selectedCustomer) setActiveTab("view");
              }}
              disabled={!selectedCustomer}
            >
              View Customer
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {activeTab === "view" ? (
              <div className="p-6">
                <CustomerDetail data={selectedCustomer} />
              </div>
            ) : (
              <div>
                <CustomerTable
                  data={data}
                  title={title}
                  onRowClick={handleRowClick}
                  onDelete={handleDeleteCustomer}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customer;
