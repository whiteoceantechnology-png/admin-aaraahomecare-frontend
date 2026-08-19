import { useEffect } from "react";

// Shared Add/Edit modal shell: backdrop blur, scale/fade animation,
// Escape-to-close, and a body-scroll lock while open. Used by every
// CRUD page's Add/Edit dialog so behavior and look stay identical.
const Modal = ({ open, onClose, title, children, maxWidth = "max-w-lg" }) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-3 bg-white rounded-2xl shadow-2xl animate-modal-panel`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 id="modal-title" className="text-[16px] font-semibold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        <div className="p-2">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
