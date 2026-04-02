// src/components/table/VariantTable.jsx
import { Edit, Trash2 } from "lucide-react";

const VariantTable = ({ data, title, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Product ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Product Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Variant Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Variant Image
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Color
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actual / Discount
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Updated
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-100">
          {data.length ? (
            data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                {/* ID */}
                <td className="px-4 py-3 text-sm text-gray-900">#{item.id}</td>

                {/* Product ID */}
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.productId}
                </td>

                {/* Product Name */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {item.productName}
                </td>

                {/* Variant Name */}
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.variantName}
                </td>

                {/* Variant Image */}
                <td className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {(item.variantImage || []).slice(0, 3).map((img, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full border border-white overflow-hidden bg-gray-100"
                      >
                        <img
                          src={`https://via.placeholder.com/80x80/0F172A/FFFFFF?text=${encodeURIComponent(
                            img
                          )}`}
                          alt={img}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {item.variantImage && item.variantImage.length > 3 && (
                      <div className="w-8 h-8 rounded-full border border-white bg-gray-200 flex items-center justify-center text-[10px] text-gray-700">
                        +{item.variantImage.length - 3}
                      </div>
                    )}
                  </div>
                </td>

                {/* Color */}
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.variantColor || "-"}
                </td>

                {/* Prices */}
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className="line-through text-gray-400">
                      ₹{item.actualPrice}
                    </span>
                    <span className="font-semibold text-green-700">
                      ₹{item.discountPrice}
                    </span>
                  </div>
                </td>

                {/* Created */}
                <td className="px-4 py-3 text-xs text-gray-500">
                  {item.createdAt}
                </td>

                {/* Updated */}
                <td className="px-4 py-3 text-xs text-gray-500">
                  {item.updatedAt}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                      item.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                {/* Action */}
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 mr-2"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={11}
                className="px-4 py-6 text-center text-sm text-gray-500"
              >
                No {title?.toLowerCase() || "variants"} found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VariantTable;
