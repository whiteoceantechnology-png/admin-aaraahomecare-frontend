import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import UsersTable from "../table/UsersTable";
import { getAllUsersList } from "../../redux/slices/allUsersSlice";

const AllUsers = ({ title = "Users" }) => {
  const dispatch = useDispatch();

  const allUsersValue = useSelector((state) => state.allUsers.allUsersList);
  const loading = useSelector((state) => state.allUsers.loading);

  useEffect(() => {
    dispatch(getAllUsersList());
  }, [dispatch]);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h2 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
          {title}
        </h2>
        <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
          View and manage registered users.
        </p>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading users…
          </div>
        ) : (
          <UsersTable data={allUsersValue || []} title={title} />
        )}
      </div>
    </div>
  );
};

export default AllUsers;
