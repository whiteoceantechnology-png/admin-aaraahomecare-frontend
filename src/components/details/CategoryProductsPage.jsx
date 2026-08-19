// src/components/details/CategoryProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Eye, PackageSearch } from "lucide-react";

import { getAllProducts } from "../../redux/slices/productSlice";
import { getAllCategoryList } from "../../redux/slices/categorySlice";
import Breadcrumb from "../common/Breadcrumb";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import ImageCell from "../common/ImageCell";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";
import Skeleton from "../common/Skeleton";

const imageUrl = (path) =>
  `${import.meta.env.VITE_API_BASE_URL}/admin/images/${path}`;

const CategoryProductsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { products = [], loading } = useSelector(
    (state) => state.product || {},
  );
  const { allCategoryList = [] } = useSelector((state) => state.category || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    dispatch(getAllProducts());
    if (allCategoryList.length === 0) dispatch(getAllCategoryList());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const category = allCategoryList.find((c) => String(c.id) === String(id));

  const categoryProducts = useMemo(
    () => products.filter((p) => String(p.categoryId) === String(id)),
    [products, id],
  );

  const filtered = categoryProducts.filter(
    (p) =>
      !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLast = currentPage * itemsPerPage;
  const currentItems = filtered.slice(indexOfLast - itemsPerPage, indexOfLast);

  const columns = [
    {
      key: "productImage",
      header: "Image",
      width: "72px",
      render: (item) => (
        <ImageCell
          src={item?.productImage ? imageUrl(item.productImage) : null}
          alt={item.name}
        />
      ),
    },
    {
      key: "name",
      header: "Name",
      className: "font-medium text-gray-800",
      render: (item) => (
        <button
          type="button"
          onClick={() => navigate(`/products/${item.id}`)}
          className="font-medium text-gray-800 hover:text-[var(--brand-purple)] transition-colors cursor-pointer text-left"
        >
          {item.name}
        </button>
      ),
    },
    {
      key: "discountPrice",
      header: "Price",
      width: "160px",
      render: (item) => (
        <div className="flex items-baseline gap-2">
          <span className="text-gray-900 font-medium tabular-nums">
            ₹{item?.discountPrice}
          </span>
          {Number(item?.actualPrice) > Number(item?.discountPrice) && (
            <span className="text-[12px] text-gray-400 line-through tabular-nums">
              ₹{item?.actualPrice}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (item) => (
        <StatusBadge status={item?.status ? "Active" : "Inactive"} />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Categories", to: "/category" },
            { label: category?.name || "Products" },
          ]}
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
              {category?.name || "Category Products"}
            </h3>
            <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
              {categoryProducts.length}{" "}
              {categoryProducts.length === 1 ? "product" : "products"} in this
              category
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : categoryProducts.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={PackageSearch}
              title="No products in this category"
              description="Products assigned to this category will show up here."
            />
          </div>
        ) : (
          <>
            <TableToolbar
              searchValue={searchTerm}
              onSearchChange={(v) => {
                setSearchTerm(v);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search products..."
            />
            <CommonTable
              columns={columns}
              data={currentItems}
              minWidth="640px"
              rowPaddingY="py-4"
              rowMinH="min-h-11"
              emptyMessage="No products match your search"
              renderRowActions={(item) => (
                <IconButton
                  icon={Eye}
                  label="View details"
                  tone="blue"
                  onClick={() => navigate(`/products/${item.id}`)}
                />
              )}
            />
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(v) => {
                setItemsPerPage(v);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryProductsPage;
