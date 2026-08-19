import api from "../../utils/api";

export const fetchProducts = () => api.get("/admin/products");

export const fetchProductById = (id) => api.get(`/admin/products/${id}`);

export const createProduct = (payload) => api.post("/admin/products", payload);

export const editProduct = (id, data) => api.put(`/admin/products/${id}`, data);

export const addProductImageRequest = (productId, payload) =>
  api.post(`/admin/products/${productId}/images`, payload);

export const removeProductImageRequest = (imageId) =>
  api.delete(`/admin/images/${imageId}`);

export const saveProductSpecificationRequest = (productId, payload) =>
  api.put(`/admin/products/${productId}/specification`, payload);

export const removeProductSpecificationRequest = (productId) =>
  api.delete(`/admin/products/${productId}/specification`);

/* ---------------- Technical documents (COA / MSDS / SDS) ---------------- */

export const fetchProductDocuments = (productId) =>
  api.get(`/admin/products/${productId}/documents`);

/**
 * `payload` is a FormData carrying documentType, documentTitle and document.
 * The multipart boundary has to come from the browser, so the header is set
 * explicitly here — same arrangement as the bulk import below.
 */
export const createProductDocumentRequest = (productId, payload) =>
  api.post(`/admin/products/${productId}/documents`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/** Same multipart shape; only the fields being changed need to be present. */
export const editProductDocumentRequest = (productId, documentId, payload) =>
  api.put(`/admin/products/${productId}/documents/${documentId}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const removeProductDocumentRequest = (productId, documentId) =>
  api.delete(`/admin/products/${productId}/documents/${documentId}`);

export const importProductsFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/masterdata/products/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const removeProduct = (id) => api.delete(`/admin/products/${id}`);
