// src/components/details/AddCategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import {
  getAllCategoryList,
  addCategory,
  updateCategory,
} from "../../redux/slices/categorySlice";
import CategoryForm from "../form/CategoryForm";
import Breadcrumb from "../common/Breadcrumb";
import Skeleton from "../common/Skeleton";

const AddCategoryPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { allCategoryList = [], loading } = useSelector(
    (state) => state.category || {},
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && allCategoryList.length === 0) {
      dispatch(getAllCategoryList());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isEdit]);

  const category = useMemo(
    () => allCategoryList.find((c) => String(c.id) === String(id)),
    [allCategoryList, id],
  );

  const defaultValues = isEdit
    ? { id: category?.id, name: category?.name, image: category?.categoryImage }
    : { id: null, name: "" };

  const handleSubmit = async ({ id: categoryId, data }) => {
    setSubmitting(true);
    const res = categoryId
      ? await dispatch(updateCategory({ id: categoryId, data }))
      : await dispatch(addCategory(data));
    setSubmitting(false);

    const success = categoryId
      ? updateCategory.fulfilled.match(res)
      : addCategory.fulfilled.match(res);

    if (success) {
      toast.success(categoryId ? "Category updated" : "Category added");
      navigate("/category");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Categories", to: "/category" },
            { label: isEdit ? "Edit Category" : "Add Category" },
          ]}
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
              {isEdit ? "Edit Category" : "Add Category"}
            </h1>
            <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
              {isEdit
                ? "Update this category's details."
                : "Create a new product category."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] p-6 max-w-2xl">
        {isEdit && loading && !category ? (
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : (
          <CategoryForm
            defaultValues={defaultValues}
            loading={submitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/category")}
          />
        )}
      </div>
    </div>
  );
};

export default AddCategoryPage;
