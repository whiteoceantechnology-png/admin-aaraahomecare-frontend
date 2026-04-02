import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User,
  IndianRupee,
  Edit,
  Trash2,
} from "lucide-react";
import { FaRegMoneyBillAlt } from "react-icons/fa";
import {
  getPartnerDetail,
  getAllPayoutLogs,
  updatePartnerDetail,
  updatePartnerStatus,
  deletePartner,
} from "../../redux/slices/partnersSlice";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

const EditPartnerModal = ({ isOpen, onClose, partnerData, onSave }) => {
  const [name, setName] = useState("");
  const [images, setImages] = useState([]); // can contain URLs or File objects
  const [newImagesAdded, setNewImagesAdded] = useState(false);

  useEffect(() => {
    if (partnerData) {
      setName(partnerData.store_details?.name || "");
      setImages(partnerData.store_details?.images || []); // existing image URLs
      setNewImagesAdded(false);
    }
  }, [partnerData]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files); // replace with new files
    setNewImagesAdded(true); // mark that new images are selected
  };

  const handleSave = () => {
    onSave({ name, images, newImagesAdded });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
      <div className="relative w-full max-w-md mx-auto p-6 rounded-2xl shadow-2xl border border-gray-200 bg-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <XCircle size={24} />
        </button>

        <h3 className="text-xl font-semibold mb-5 text-gray-800 text-center">
          Edit Salon Name & Images
        </h3>

        {/* Salon Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Salon Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter salon name"
          />
        </div>

        {/* Image Upload */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Salon Images
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
          />

          {/* Preview existing or new */}
          <div className="flex flex-wrap gap-2 mt-3">
            {!newImagesAdded
              ? images.map((img, i) => (
                  <img
                    key={i}
                    src={`${import.meta.env.VITE_API_BASE_URL}/images/${img}`}
                    alt={`img-${i}`}
                    className="w-16 h-16 rounded-md object-cover border border-gray-300"
                  />
                ))
              : images.map((file, i) => (
                  <img
                    key={i}
                    src={URL.createObjectURL(file)}
                    alt={`preview-${i}`}
                    className="w-16 h-16 rounded-md object-cover border border-gray-300"
                  />
                ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 cursor-pointer bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 cursor-pointer bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const PartnerDetails = ({ title }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [logData, setLogData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const allPartnerDetail = useSelector(
    (state) => state.allPartners.partnerDetail
  );
  const allPayoutLogs = useSelector((state) => state.allPartners.allPayoutLogs);

  useEffect(() => {
    setLoading(true);
    dispatch(getPartnerDetail({ id }))
      .unwrap()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
    dispatch(getAllPayoutLogs({ id }));
  }, [dispatch, id]);

  useEffect(() => {
    if (allPartnerDetail) setData(allPartnerDetail);
    if (allPayoutLogs) setLogData(allPayoutLogs);
  }, [allPartnerDetail, allPayoutLogs]);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "booked":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusToggle = async () => {
    if (!data?.store_details) return;
    const currentStatus = data.store_details.status;
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    if (
      window.confirm(
        `Are you sure you want to ${
          currentStatus === "active" ? "deactivate" : "activate"
        } this partner?`
      )
    ) {
      try {
        await dispatch(updatePartnerStatus({ id, status: newStatus })).unwrap();
        dispatch(getPartnerDetail({ id }));
      } catch {
        alert("Failed to update status. Please try again.");
      }
    }
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deletePartner({ id })).unwrap();
      setShowDeleteModal(false);
      navigate("/partners");
    } catch {
      alert("Failed to delete partner.");
      setShowDeleteModal(false);
    }
  };

  const handleDeleteCancel = () => setShowDeleteModal(false);

const handleSaveEdit = async (updatedData) => {
  

  try {
    const formData = new FormData();
    formData.append("id", id);                // always send id
    formData.append("name", updatedData.name); // always send name

    // append new images only if selected
    if (updatedData.newImagesAdded && updatedData.images.length > 0) {
      updatedData.images.forEach((file) => {
        formData.append("images", file); // binary files
      });
    }

    // Send FormData directly
    await dispatch(updatePartnerDetail(formData)).unwrap();

    dispatch(getPartnerDetail({ id }));
    setShowEditModal(false);
  } catch (err) {
    console.error(err);
    alert("Failed to save changes. Please try again.");
  }
};


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
        Loading partner details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md">{`Error: ${error}`}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="min-h-screen ">
            <div className="bg-white shadow-lg border-b border-purple-100">
              <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6">
                  <div className="flex gap-4">
                    {data?.store_details?.images?.length ? (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden">
                        <Swiper
                          modules={[Autoplay]}
                          autoplay={{
                            delay: 3000,
                            disableOnInteraction: false,
                          }}
                          loop
                          className="w-full h-full"
                        >
                          {data.store_details.images.map((img, i) => (
                            <SwiperSlide key={i}>
                              <img
                                src={`${
                                  import.meta.env.VITE_API_BASE_URL
                                }/images/${img}`}
                                alt={`store-image-${i}`}
                                className="w-full h-full object-cover"
                              />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {data?.store_details?.name}
                      </h1>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {data?.store_details?.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        data?.store_details?.status
                      )}`}
                    >
                      {data?.store_details?.status
                        ? data.store_details.status.charAt(0).toUpperCase() +
                          data.store_details.status.slice(1)
                        : "Unknown"}
                    </span>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="inline-flex cursor-pointer items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={handleStatusToggle}
                      className="inline-flex cursor-pointer items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {data?.store_details?.status === "active" ? (
                        <XCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      {data?.store_details?.status === "active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      className="inline-flex cursor-pointer items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <nav className="border-b border-gray-200 -mb-px flex space-x-8 overflow-x-auto">
                {[
                  { id: "overview", name: "Overview", icon: Eye },
                  { id: "appointments", name: "Appointments", icon: Calendar },
                  { id: "professionals", name: "Professionals", icon: User },
                  { id: "financial", name: "Financial", icon: IndianRupee },
                  { id: "payout", name: "Payout", icon: FaRegMoneyBillAlt },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? "border-black text-black"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
            {/* Render tab contents here based on selected tab */}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        partnerName={data?.store_details?.name || "this partner"}
      />
      <EditPartnerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        partnerData={data}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default PartnerDetails;
