import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PartnerTable from "../table/PartnerTable";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";
import { Toaster, toast } from "react-hot-toast";

const Partner = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();

  const allPartnersValue = useSelector(
    (state) => state.allPartners.allPartnersList,
  );
  const loading = useSelector((state) => state.allPartners.loading);
  const error = useSelector((state) => state.allPartners.error);

  useEffect(() => {
    dispatch(getAllPartnersList());
  }, [dispatch]);

  useEffect(() => {
    if (allPartnersValue) {
      setData(allPartnersValue);
    }
  }, [allPartnersValue]);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h2 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
          {title}
        </h2>
        <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
          Manage the partner stores on your platform.
        </p>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load partners: {error}
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading partners…
          </div>
        ) : (
          <PartnerTable data={data} title={title} />
        )}
      </div>
    </div>
  );
};

export default Partner;
