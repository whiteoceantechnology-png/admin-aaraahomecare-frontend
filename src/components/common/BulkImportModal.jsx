// Reusable Bulk Import flow (Download Template → Select file → Upload →
// success/error result), shared across modules using their own Master Data
// bulk endpoints. Wraps the same Modal shell everything else uses — not a
// separate upload design.
import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import Modal from "./Modal";

const hasValue = (v) => v !== null && v !== undefined;

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const BulkImportModal = ({
  open,
  onClose,
  title = "Bulk Import",
  onDownloadTemplate,
  onUpload,
  onExport,
  templateFilename = "template.xlsx",
  exportFilename = "export.xlsx",
}) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(null); // "template" | "upload" | "export" | null
  const [result, setResult] = useState(null); // { type, message, detail }

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const pickFile = (f) => {
    if (!f) return;
    setResult(null);
    setFile(f);
  };

  const handleDownloadTemplate = async () => {
    if (!onDownloadTemplate) return;
    setBusy("template");
    try {
      downloadBlob(await onDownloadTemplate(), templateFilename);
    } catch {
      setResult({ type: "error", message: "Failed to download template" });
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    if (!onExport) return;
    setBusy("export");
    try {
      downloadBlob(await onExport(), exportFilename);
    } catch {
      setResult({ type: "error", message: "Failed to export" });
    } finally {
      setBusy(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !onUpload) return;
    setBusy("upload");
    setResult(null);
    try {
      const res = await onUpload(file);
      setResult({ type: "success", message: res?.message || "Upload complete", detail: res });
      setFile(null);
    } catch (err) {
      setResult({ type: "error", message: err?.message || (typeof err === "string" ? err : "Upload failed") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {onDownloadTemplate && (
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={busy === "template"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              {busy === "template" ? "Downloading..." : "Download Template"}
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={busy === "export"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={14} />
              {busy === "export" ? "Exporting..." : "Export"}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] ${
            isDragging
              ? "border-[var(--mk-primary)] bg-[var(--mk-primary-50)]"
              : "border-[var(--mk-line)] hover:border-[var(--mk-primary)]/40 hover:bg-gray-50"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-[var(--mk-primary-50)] flex items-center justify-center text-[var(--mk-primary)]">
            <Upload size={16} />
          </div>
          {file ? (
            <p className="text-[13px] font-medium text-[var(--mk-ink-900)] px-4 truncate max-w-full">{file.name}</p>
          ) : (
            <>
              <p className="text-[13px] font-medium text-[var(--mk-ink-700)]">Click to upload or drag &amp; drop</p>
              <p className="text-[11px] text-[var(--mk-ink-400)]">.xlsx files only</p>
            </>
          )}
        </div>

        {result && (
          <div
            className={`flex items-start gap-2.5 px-3.5 py-3 rounded-[10px] border text-[12.5px] ${
              result.type === "success"
                ? "bg-[var(--mk-ok-bg)] border-[#B7E4CE] text-[#0F6B3F]"
                : "bg-[var(--mk-dgr-bg)] border-[#F3C6C6] text-[var(--mk-dgr)]"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{result.message}</p>
              {hasValue(result.detail?.successCount) && (
                <p className="mt-0.5">
                  {result.detail.successCount} row{result.detail.successCount === 1 ? "" : "s"} imported successfully.
                </p>
              )}
              {hasValue(result.detail?.errorCount) && result.detail.errorCount > 0 && (
                <p className="mt-0.5">
                  {result.detail.errorCount} row{result.detail.errorCount === 1 ? "" : "s"} failed.
                </p>
              )}
              {Array.isArray(result.detail?.errors) && result.detail.errors.length > 0 && (
                <ul className="mt-1.5 list-disc list-inside space-y-0.5">
                  {result.detail.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{typeof e === "string" ? e : JSON.stringify(e)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || busy === "upload"}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy === "upload" ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkImportModal;
