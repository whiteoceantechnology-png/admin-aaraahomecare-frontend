import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReviewTable from "../table/ReviewTable";
import { getAllDeleteReviewRequest } from "../../redux/slices/reviewSlice";

const Review = ({ title = "Reviews" }) => {
  const dispatch = useDispatch();

  const allReviewValue = useSelector(
    (state) => state.allReviews.allDeleteReviewRequest,
  );
  const loading = useSelector((state) => state.allReviews.loading);
  const error = useSelector((state) => state.allReviews.error);

  useEffect(() => {
    dispatch(getAllDeleteReviewRequest());
  }, [dispatch]);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h2 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
          {title}
        </h2>
        <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
          Moderate customer review and deletion requests.
        </p>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load reviews: {error}
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading reviews…
          </div>
        ) : (
          <ReviewTable data={allReviewValue || []} title={title} />
        )}
      </div>
    </div>
  );
};

export default Review;
