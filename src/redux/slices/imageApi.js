import api from "../../utils/api";

export const uploadImageFile = (file) => {
  const formData = new FormData();

  // 🔥 IMPORTANT → API expects "files"
  formData.append("files", file);

  return api.post("/admin/images/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
