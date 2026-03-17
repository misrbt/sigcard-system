import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineInformationCircle,
  HiOutlineOfficeBuilding,
  HiOutlinePhotograph,
  HiOutlineShieldCheck,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineX,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
} from "react-icons/hi";
import api from "../../services/api";

const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

const DOC_SECTIONS = [
  { key: "sigcard", label: "Signature Card", front: "sigcard_front", back: "sigcard_back"  },
  { key: "nais",    label: "NAIS",           front: "nais_front",    back: "nais_back"     },
  { key: "privacy", label: "Data Privacy",   front: "privacy_front", back: "privacy_back"  },
];

const docLabel = {
  sigcard_front:  "Sigcard Front",
  sigcard_back:   "Sigcard Back",
  nais_front:     "NAIS Front",
  nais_back:      "NAIS Back",
  privacy_front:  "Data Privacy Front",
  privacy_back:   "Data Privacy Back",
  other:          "Other Document",
};

const statusStyle = {
  active:      "bg-green-100 text-green-700 border border-green-300",
  dormant:     "bg-yellow-100 text-yellow-700 border border-yellow-300",
  escheat:     "bg-orange-100 text-orange-700 border border-orange-300",
  closed:      "bg-red-100 text-red-700 border border-red-300",
  reactivated: "bg-teal-100 text-teal-700 border border-teal-300",
};

const riskStyle = {
  "Low Risk":    "bg-emerald-50 text-emerald-700",
  "Medium Risk": "bg-yellow-50 text-yellow-700",
  "High Risk":   "bg-red-50 text-red-700",
};

const accountStyle = {
  Regular:   "bg-blue-50 text-blue-700",
  Joint:     "bg-purple-50 text-purple-700",
  Corporate: "bg-slate-100 text-slate-700",
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const initials = (c) => {
  const f = c?.firstname?.[0] ?? "";
  const l = c?.lastname?.[0]  ?? "";
  return (f + l).toUpperCase() || "?";
};

// ── Image Viewer ───────────────────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex = 0, onClose, isDormant = false }) => {
  const [idx, setIdx]       = useState(initialIndex);
  const [zoom, setZoom]     = useState(1);
  const [pan, setPan]       = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [idx]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(i - 1, 0));
      if (e.key === "+")          setZoom((z) => Math.min(z + 0.5, 5));
      if (e.key === "-")          setZoom((z) => Math.max(z - 0.5, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + (e.deltaY < 0 ? 0.25 : -0.25), 1), 5));
  };

  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setPan({ x: dragRef.current.px + e.clientX - dragRef.current.sx, y: dragRef.current.py + e.clientY - dragRef.current.sy });
  };
  const onMouseUp = () => setDragging(false);

  const cur = images[idx];

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col select-none">
      <div className="flex items-center justify-between px-5 py-3 bg-black/70 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm truncate max-w-xs">{cur.label}</span>
          {cur.person && <span className="text-white/40 text-xs">Person {cur.person}</span>}
          <span className="text-white/30 text-xs">{idx + 1} / {images.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <HiOutlineZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 5))}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <HiOutlineZoomIn className="w-5 h-5" />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors">
            Reset
          </button>
          <button onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-2">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden flex items-center justify-center relative"
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {idx > 0 && (
          <button onClick={() => setIdx((i) => i - 1)}
            className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors border border-white/10">
            <HiOutlineChevronLeft className="w-6 h-6" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button onClick={() => setIdx((i) => i + 1)}
            className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors border border-white/10">
            <HiOutlineChevronRight className="w-6 h-6" />
          </button>
        )}
        <img
          src={cur.src}
          alt={cur.label}
          draggable={false}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.15s ease",
            maxWidth: "90vw",
            maxHeight: "75vh",
            objectFit: "contain",
            filter: isDormant ? "blur(12px)" : "none",
          }}
        />
      </div>

      <div className="flex gap-2 px-4 py-3 bg-black/70 border-t border-white/10 overflow-x-auto flex-shrink-0">
        {images.map((img, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? "border-blue-400 opacity-100" : "border-transparent opacity-50 hover:opacity-80"}`}>
            <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Customer History Section (Enhanced Audit Trail) ──────────────────────────
const HIST_FIELD_LABELS = {
  firstname: "First Name", middlename: "Middle Name", lastname: "Last Name",
  suffix: "Suffix", account_type: "Account Type", risk_level: "Risk Level",
  status: "Status", account_no: "Account No.", date_opened: "Date Opened",
  company_name: "Company Name", branch_id: "Branch", date_updated: "Date Updated",
  joint_sub_type: "Joint Sub-Type",
};

const HIST_STATUS_COLORS = {
  active:      { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", dot: "bg-green-500" },
  dormant:     { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", dot: "bg-yellow-500" },
  closed:      { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", dot: "bg-red-500" },
  escheat:     { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-500" },
  reactivated: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300", dot: "bg-teal-500" },
};

const HIST_RISK_COLORS = {
  "Low Risk":    { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  "Medium Risk": { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  "High Risk":   { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
};

const HIST_DOC_LABELS = {
  sigcard_front: "Sigcard Front", sigcard_back: "Sigcard Back",
  nais_front: "NAIS Front", nais_back: "NAIS Back",
  privacy_front: "Data Privacy Front", privacy_back: "Data Privacy Back",
  other: "Other Document",
};

const FILTER_TABS = [
  { key: "all",      label: "All Events" },
  { key: "status",   label: "Status Changes" },
  { key: "document", label: "Document Changes" },
  { key: "info",     label: "Info Updates" },
  { key: "created",  label: "Creation" },
];

const classifyEvent = (entry) => {
  const desc = (entry.description ?? "").toLowerCase();
  const diff = entry.diff ?? {};
  if (desc.includes("created") || entry.event === "created") return "created";
  if (desc.includes("replaced") || desc.includes("uploaded") || (desc.includes("deleted") && desc.includes("doc"))) return "document";
  if (diff.status) return "status";
  return "info";
};

const histEventConfig = (event, description) => {
  const desc = (description ?? "").toLowerCase();
  if (desc.includes("replaced"))                         return { label: "Document Replaced", dot: "bg-orange-500", textColor: "text-orange-700", icon: "replace" };
  if (desc.includes("deleted") && desc.includes("doc")) return { label: "Document Deleted",  dot: "bg-red-500",    textColor: "text-red-700",    icon: "delete" };
  if (desc.includes("uploaded"))                         return { label: "Document Uploaded", dot: "bg-purple-500", textColor: "text-purple-700", icon: "upload" };
  if (desc.includes("created") || event === "created")  return { label: "Account Created",   dot: "bg-green-500",  textColor: "text-green-700",  icon: "create" };
  if (desc.includes("updated") || event === "updated")  return { label: "Info Updated",      dot: "bg-blue-500",   textColor: "text-blue-700",   icon: "update" };
  if (desc.includes("deleted"))                          return { label: "Record Deleted",    dot: "bg-red-500",    textColor: "text-red-700",    icon: "delete" };
  return { label: description ?? event ?? "Event",              dot: "bg-slate-400",  textColor: "text-slate-600",  icon: "other" };
};

const HistValueBadge = ({ field, value }) => {
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-400 italic text-[11px]">--</span>;
  if (field === "status") {
    const sc = HIST_STATUS_COLORS[value] ?? { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${sc.bg} ${sc.text} ${sc.border}`}>{value}</span>;
  }
  if (field === "risk_level") {
    const rc = HIST_RISK_COLORS[value] ?? { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" };
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${rc.bg} ${rc.text} ${rc.border}`}>{value}</span>;
  }
  return <span className="text-[11px] text-slate-800 font-medium">{String(value)}</span>;
};

// Side-by-side image comparison for document replacements
const DocComparison = ({ meta }) => {
  const [previewImg, setPreviewImg] = useState(null);

  return (
    <>
      <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Document Comparison — {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "--"}
            {meta.person_index > 1 && ` (Person ${meta.person_index})`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Old (Archived) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-orange-600 uppercase">Before (Archived)</span>
            </div>
            {meta.archived_file_path ? (
              <button onClick={() => setPreviewImg(storageUrl(meta.archived_file_path))} className="block w-full">
                <img
                  src={storageUrl(meta.archived_file_path)}
                  alt="Previous document"
                  className="w-full h-40 object-contain rounded-lg border-2 border-orange-200 bg-white hover:border-orange-400 transition-colors cursor-pointer"
                />
              </button>
            ) : (
              <div className="w-full h-40 rounded-lg border-2 border-dashed border-orange-200 bg-white flex items-center justify-center">
                <span className="text-[11px] text-slate-400">No archived image</span>
              </div>
            )}
            {meta.replaced_file && (
              <p className="text-[10px] text-slate-500 truncate font-mono">{meta.replaced_file}</p>
            )}
          </div>
          {/* New (Current) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-blue-600 uppercase">After (Current)</span>
            </div>
            {meta.current_file_path ? (
              <button onClick={() => setPreviewImg(storageUrl(meta.current_file_path))} className="block w-full">
                <img
                  src={storageUrl(meta.current_file_path)}
                  alt="Current document"
                  className="w-full h-40 object-contain rounded-lg border-2 border-blue-200 bg-white hover:border-blue-400 transition-colors cursor-pointer"
                />
              </button>
            ) : meta.new_file_name ? (
              <div className="w-full h-40 rounded-lg border-2 border-dashed border-blue-200 bg-white flex items-center justify-center">
                <span className="text-[11px] text-slate-400">Document has since been replaced again</span>
              </div>
            ) : (
              <div className="w-full h-40 rounded-lg border-2 border-dashed border-blue-200 bg-white flex items-center justify-center">
                <span className="text-[11px] text-slate-400">No preview available</span>
              </div>
            )}
            {meta.new_file_name && (
              <p className="text-[10px] text-slate-500 truncate font-mono">{meta.new_file_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 z-10"
            >
              <HiOutlineX className="w-4 h-4" />
            </button>
            <img src={previewImg} alt="Full preview" className="max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white" />
          </div>
        </div>
      )}
    </>
  );
};

// Thumbnail for initial document uploads with click-to-preview
const InitialDocThumb = ({ doc }) => {
  const [preview, setPreview] = useState(false);
  const label = HIST_DOC_LABELS[doc.document_type] ?? doc.document_type;
  const personLabel = doc.person_index > 1 ? ` (P${doc.person_index})` : "";

  return (
    <>
      <button onClick={() => setPreview(true)} className="text-left group">
        <div className="rounded-lg border-2 border-green-200 bg-white overflow-hidden hover:border-green-400 transition-colors">
          <img
            src={storageUrl(doc.file_path)}
            alt={label}
            className="w-full h-28 object-contain bg-white group-hover:opacity-90 transition-opacity"
          />
        </div>
        <p className="text-[10px] text-green-700 font-medium mt-1 truncate">{label}{personLabel}</p>
      </button>
      {preview && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 z-10"
            >
              <HiOutlineX className="w-4 h-4" />
            </button>
            <div className="bg-white rounded-xl shadow-2xl p-2">
              <p className="text-xs font-semibold text-slate-700 mb-2 px-2">{label}{personLabel}</p>
              <img src={storageUrl(doc.file_path)} alt={label} className="max-h-[80vh] rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Status change visual: before -> after arrow
const StatusChangeCard = ({ diff }) => {
  const statusDiff = diff.status;
  const riskDiff = diff.risk_level;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      {statusDiff && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status Change</p>
          <div className="flex items-center gap-3 flex-wrap">
            <HistValueBadge field="status" value={statusDiff.before} />
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <HistValueBadge field="status" value={statusDiff.after} />
          </div>
        </div>
      )}
      {riskDiff && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Level Change</p>
          <div className="flex items-center gap-3 flex-wrap">
            <HistValueBadge field="risk_level" value={riskDiff.before} />
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <HistValueBadge field="risk_level" value={riskDiff.after} />
          </div>
        </div>
      )}
      {/* Other field changes */}
      {Object.entries(diff).filter(([f]) => f !== "status" && f !== "risk_level").length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Field Changes</p>
          <div className="space-y-2">
            {Object.entries(diff).filter(([f]) => f !== "status" && f !== "risk_level").map(([field, { before, after }]) => (
              <div key={field} className="grid grid-cols-[120px_1fr_auto_1fr] gap-2 items-center text-[11px]">
                <span className="text-slate-500 font-medium truncate">{HIST_FIELD_LABELS[field] ?? field}</span>
                <HistValueBadge field={field} value={before} />
                <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <HistValueBadge field={field} value={after} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerHistorySection = ({ customerId }) => {
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter]       = useState("all");

  useEffect(() => {
    api.get(`/customers/${customerId}/history`)
      .then(({ data }) => setHistory(data.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const filteredHistory = filter === "all"
    ? history
    : history.filter((entry) => classifyEvent(entry) === filter);

  // Count events by type for filter badges
  const eventCounts = history.reduce((acc, entry) => {
    const type = classifyEvent(entry);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <HiOutlineShieldCheck className="w-5 h-5 text-indigo-500" />
        <h2 className="text-sm font-bold text-slate-900">Audit Trail</h2>
        {!loading && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-600">
            {history.length} event{history.length !== 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">{collapsed ? "Show" : "Hide"}</span>
      </button>

      {!collapsed && (
        <div className="px-5 py-5">
          {/* Filter Tabs */}
          {!loading && history.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-slate-100">
              {FILTER_TABS.map((tab) => {
                const count = tab.key === "all" ? history.length : (eventCounts[tab.key] || 0);
                if (tab.key !== "all" && count === 0) return null;
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading audit trail...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {filter === "all" ? "No history recorded yet." : "No events found for this filter."}
            </p>
          ) : (
            <ol className="relative border-l-2 border-slate-200 space-y-4 ml-2">
              {filteredHistory.map((entry) => {
                const cfg         = histEventConfig(entry.event, entry.description);
                const isExp       = expanded[entry.id];
                const diff        = entry.diff ?? {};
                const meta        = entry.meta ?? {};
                const hasDiff     = Object.keys(diff).length > 0;
                const desc        = (entry.description ?? "").toLowerCase();
                const isDocReplaced = desc.includes("replaced");
                const isDocDeleted  = desc.includes("deleted") && desc.includes("doc");
                const isCreated     = desc.includes("created") || entry.event === "created";
                const hasInitialDocs = isCreated && meta.documents_uploaded && Object.keys(meta.documents_uploaded).length > 0;
                const hasCurrentDocs = isCreated && meta.current_documents && meta.current_documents.length > 0;
                const hasDetails    = hasDiff || isDocReplaced || isDocDeleted || hasInitialDocs;
                const eventType     = classifyEvent(entry);

                return (
                  <li key={entry.id} className="ml-6 pb-1">
                    <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white shadow-sm ${cfg.dot}`} />
                    <div className={`rounded-xl border transition-all ${isExp ? "border-indigo-200 bg-indigo-50/30 shadow-sm" : "border-transparent hover:border-slate-100"} p-3`}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(entry.created_at)}</span>
                        {entry.causer && (
                          <span className="text-[11px] text-slate-400">
                            by <span className="font-medium text-slate-600">{entry.causer.name ?? entry.causer.email}</span>
                          </span>
                        )}
                        {hasDetails && (
                          <button onClick={() => toggle(entry.id)}
                            className={`text-[11px] font-semibold ml-auto px-2.5 py-1 rounded-lg transition-colors ${
                              isExp ? "bg-indigo-100 text-indigo-600" : "text-indigo-500 hover:bg-indigo-50"
                            }`}
                          >
                            {isExp ? "Hide details" : "View details"}
                          </button>
                        )}
                      </div>

                      {/* Quick summary for status changes (always visible) */}
                      {eventType === "status" && diff.status && !isExp && (
                        <div className="flex items-center gap-2 mt-2">
                          <HistValueBadge field="status" value={diff.status.before} />
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <HistValueBadge field="status" value={diff.status.after} />
                        </div>
                      )}

                      {/* Quick summary for doc replace (always visible) */}
                      {isDocReplaced && !isExp && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "--"}
                          {meta.person_index > 1 && ` (Person ${meta.person_index})`}
                          {meta.replaced_file && <span className="text-slate-400"> — was {meta.replaced_file}</span>}
                        </p>
                      )}

                      {/* Expanded details */}
                      {isExp && (
                        <div className="mt-3 space-y-3">
                          {/* Status/risk/field changes with visual arrow */}
                          {hasDiff && <StatusChangeCard diff={diff} />}

                          {/* Initial document upload — show actual images */}
                          {hasInitialDocs && (
                            <div className="bg-green-50 rounded-xl border border-green-200 px-4 py-3">
                              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-3">Documents Uploaded on Creation</p>
                              {/* Badge summary */}
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {Object.entries(meta.documents_uploaded).map(([type, count]) => (
                                  <span key={type} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                                    {HIST_DOC_LABELS[type] ?? type} x{count}
                                  </span>
                                ))}
                              </div>
                              {/* Actual document image thumbnails */}
                              {hasCurrentDocs && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {meta.current_documents.map((doc, idx) => (
                                    <InitialDocThumb key={idx} doc={doc} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Document replacement side-by-side comparison */}
                          {isDocReplaced && <DocComparison meta={meta} />}

                          {/* Document deleted */}
                          {isDocDeleted && (meta.file_name || meta.file_path) && (
                            <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-3">
                              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">
                                Deleted — {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "--"}
                                {meta.person_index > 1 && ` (Person ${meta.person_index})`}
                              </p>
                              <p className="text-[11px] text-slate-600 font-mono">{meta.file_name ?? meta.file_path?.split("/").pop()}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main page (read-only for admin / compliance-audit) ──────────────────────
const AdminCustomerView = ({ basePath = '/admin' }) => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [customer, setCustomer]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [viewer, setViewer]       = useState(null);
  const [activeAcctIdx, setActiveAcctIdx] = useState(1);

  const fetchCustomer = () => {
    setLoading(true);
    api.get(`/customers/${id}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomer(); }, [id]);

  // Joint sub-type helpers (safe to reference in closures — called after render)
  const isITF = customer?.account_type === "Joint" && customer?.joint_sub_type === "ITF";
  const isNonITF = customer?.account_type === "Joint" && customer?.joint_sub_type === "Non-ITF";
  const isSharedDoc = (secKey) => {
    if (isITF) return true;
    if (isNonITF && secKey === "privacy") return true;
    return false;
  };

  const buildImages = (startType = null, startPerson = null) => {
    if (!customer?.documents) return { images: [], index: 0 };
    const imgs = [];
    let startIdx = 0;

    // When customer has multiple accounts (non-Joint), filter to active account tab
    const hasMultiAccounts = customer?.account_type !== "Joint" && (customer?.accounts?.length ?? 0) >= 1;
    const viewDocs = hasMultiAccounts
      ? customer.documents.filter((d) => d.person_index === activeAcctIdx)
      : customer.documents;

    const persons = [...new Set(
      viewDocs
        .filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type))
        .map((d) => d.person_index)
    )].sort();

    DOC_SECTIONS.forEach((sec) => {
      if (isSharedDoc(sec.key)) {
        // Shared docs: collect all with person_index=1
        ["front", "back"].forEach((side) => {
          const type = sec[side];
          viewDocs.filter((d) => d.document_type === type && d.person_index === 1).forEach((doc) => {
            imgs.push({ src: storageUrl(doc.file_path), label: `${docLabel[type] ?? type} (Shared)`, person: null });
          });
        });
      } else {
        (persons.length ? persons : [1]).forEach((p) => {
          ["front", "back"].forEach((side) => {
            const type = sec[side];
            const doc  = viewDocs.find((d) => d.document_type === type && d.person_index === p);
            if (doc) {
              if (startType === type && startPerson === p) startIdx = imgs.length;
              imgs.push({ src: storageUrl(doc.file_path), label: docLabel[type] ?? type, person: persons.length > 1 ? p : null });
            }
          });
        });
      }
    });

    viewDocs.filter((d) => d.document_type === "other").forEach((doc) => {
      imgs.push({ src: storageUrl(doc.file_path), label: "Other Document", person: null });
    });

    return { images: imgs, index: startIdx };
  };

  const openViewer = (docType, personIndex) => {
    const { images, index } = buildImages(docType, personIndex);
    if (images.length) setViewer({ images, index });
  };

  const openViewerByPath = (filePath) => {
    const { images } = buildImages();
    const idx = images.findIndex((img) => img.src === storageUrl(filePath));
    if (images.length) setViewer({ images, index: Math.max(idx, 0) });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading customer…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-slate-500 font-semibold">Customer not found.</p>
        <button onClick={() => navigate(`${basePath}/customers`)} className="text-sm text-blue-600 hover:underline">← Back to Customers</button>
      </div>
    );
  }

  const docs      = customer.documents ?? [];
  const holders   = customer.holders   ?? [];
  const isJoint     = customer.account_type === "Joint";
  const isCorporate = customer.account_type === "Corporate";
  const isDormant   = customer.status === "dormant";

  // Multi-account tabs (non-Joint only)
  const allAccounts = !isJoint ? [
    { account_no: customer.account_no, risk_level: customer.risk_level, date_opened: customer.date_opened, status: customer.status, acctIndex: 1 },
    ...(customer.accounts ?? []).map((a, i) => ({
      account_no: a.account_no, risk_level: a.risk_level, date_opened: a.date_opened, status: a.status, acctIndex: i + 2,
    })),
  ] : [];
  const showAccountTabs = allAccounts.length >= 2;

  // Docs filtered by active account tab (for non-Joint multi-account)
  const docsForSection = showAccountTabs
    ? docs.filter((d) => d.person_index === activeAcctIdx)
    : docs;

  const allHolders = [
    { person_index: 1, firstname: customer.firstname, middlename: customer.middlename, lastname: customer.lastname, suffix: customer.suffix, risk_level: customer.risk_level },
    ...holders,
  ];

  const holderName = (personIndex) => {
    const h = allHolders.find((x) => x.person_index === personIndex);
    if (!h) return `Person ${personIndex}`;
    return `${h.firstname}${h.middlename ? " " + h.middlename : ""} ${h.lastname}${h.suffix ? " " + h.suffix : ""}`;
  };

  const persons = isJoint
    ? [...new Set(docs.filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type)).map((d) => d.person_index))].sort()
    : showAccountTabs
      ? [activeAcctIdx]
      : [...new Set(docs.filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type)).map((d) => d.person_index))].sort();
  const otherDocs = docsForSection.filter((d) => d.document_type === "other");
  const totalDocs = docs.length;

  return (
    <>
      <AnimatePresence>
        {viewer && (
          <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} isDormant={isDormant} />
        )}
      </AnimatePresence>

      <div className="bg-gray-50 min-h-screen">

        {/* Hero header */}
        <div className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

            <button
              onClick={() => navigate(`${basePath}/customers`)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-medium mb-4 transition-colors"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
              Back to Customer Profiles
            </button>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                {customer.photo ? (
                  <img src={storageUrl(customer.photo)} alt="Customer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1877F2] to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {initials(customer)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-white">{customer.full_name}</h1>
                  {isJoint && holders.length > 0 && (
                    <span className="text-sm text-white/50 font-medium">
                      + {holders.map((h) => `${h.firstname} ${h.lastname}`).join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50 mt-1">
                  <span className="flex items-center gap-1.5">
                    <HiOutlineCreditCard className="w-3.5 h-3.5" />
                    {customer.account_type}
                    {isJoint && <span className="ml-1">· {allHolders.length} holders</span>}
                  </span>
                  {!isJoint && (
                    <span className="flex items-center gap-1.5">
                      <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                      {customer.risk_level}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <HiOutlineOfficeBuilding className="w-3.5 h-3.5" />
                    {customer.branch?.branch_name ?? "—"}
                  </span>
                  {customer.account_no && (
                    <span className="flex items-center gap-1.5">
                      <HiOutlineDocumentText className="w-3.5 h-3.5" />
                      {customer.account_no}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <HiOutlineCalendar className="w-3.5 h-3.5" />
                    {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Customer Details card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <HiOutlineInformationCircle className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Customer Details</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">

              {/* Full Name */}
              <div className="flex items-start gap-3">
                <HiOutlineUser className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Name</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {[customer.firstname, customer.middlename, customer.lastname, customer.suffix].filter(Boolean).join(" ") || "—"}
                  </p>
                </div>
              </div>

              {/* Account Type */}
              <div className="flex items-start gap-3">
                <HiOutlineCreditCard className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account Type</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${accountStyle[customer.account_type] ?? "bg-slate-100 text-slate-600"}`}>
                    {customer.account_type ?? "—"}
                  </span>
                </div>
              </div>

              {/* Joint Sub Type — Joint only */}
              {isJoint && (
                <div className="flex items-start gap-3">
                  <HiOutlineTag className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Joint Sub Type</p>
                    <p className="text-sm font-semibold text-slate-800">{customer.joint_sub_type ?? "—"}</p>
                  </div>
                </div>
              )}

              {/* Company Name — Corporate only */}
              {isCorporate && customer.company_name && (
                <div className="flex items-start gap-3">
                  <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Company Name</p>
                    <p className="text-sm font-semibold text-slate-800">{customer.company_name}</p>
                  </div>
                </div>
              )}

              {/* Account No. */}
              <div className="flex items-start gap-3">
                <HiOutlineDocumentText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account No.</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">{customer.account_no ?? "—"}</p>
                </div>
              </div>

              {/* Risk Level — Regular only */}
              {!isJoint && !isCorporate && (
                <div className="flex items-start gap-3">
                  <HiOutlineShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Risk Level</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${riskStyle[customer.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
                      {customer.risk_level ?? "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Status — single account shows one badge; multi-account shows per-account */}
              <div className="flex items-start gap-3">
                <HiOutlineShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  {showAccountTabs ? (
                    <div className="space-y-1.5">
                      {allAccounts.map((acct, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">{acct.acctIndex}</span>
                          <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{acct.account_no ?? "—"}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${statusStyle[acct.status] ?? "bg-slate-100 text-slate-500"}`}>
                            {acct.status ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase ${statusStyle[customer.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {customer.status ?? "—"}
                    </span>
                  )}
                </div>
              </div>

              {/* Date Opened */}
              <div className="flex items-start gap-3">
                <HiOutlineCalendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date Opened</p>
                  <p className="text-sm font-semibold text-slate-800">{customer.date_opened ? formatDate(customer.date_opened) : "—"}</p>
                </div>
              </div>

              {/* Date Updated */}
              <div className="flex items-start gap-3">
                <HiOutlineCalendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date Updated</p>
                  <p className="text-sm font-semibold text-slate-800">{customer.date_updated ? formatDate(customer.date_updated) : "—"}</p>
                </div>
              </div>

              {/* Branch */}
              <div className="flex items-start gap-3">
                <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Branch</p>
                  <p className="text-sm font-semibold text-slate-800">{customer.branch?.branch_name ?? "—"}</p>
                </div>
              </div>

              {/* Date Added */}
              <div className="flex items-start gap-3">
                <HiOutlineCalendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date Added</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDate(customer.created_at)}</p>
                </div>
              </div>

              {/* Uploaded By */}
              <div className="flex items-start gap-3">
                <HiOutlineUser className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Uploaded By</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {customer.uploader
                      ? (customer.uploader.full_name || `${customer.uploader.firstname ?? ""} ${customer.uploader.lastname ?? ""}`.trim() || customer.uploader.username)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Total Documents */}
              <div className="flex items-start gap-3">
                <HiOutlineDocumentText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Documents</p>
                  <p className="text-sm font-semibold text-slate-800">{totalDocs} file{totalDocs !== 1 ? "s" : ""}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Additional Accounts card */}
          {customer.accounts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <HiOutlineCreditCard className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-900">Additional Accounts</h2>
                <span className="ml-auto text-xs text-slate-400">{customer.accounts.length + 1} accounts</span>
              </div>
              <div className="px-5 py-4 space-y-2">
                {/* Primary account */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">1</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 font-mono">{customer.account_no ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">{customer.risk_level}</p>
                  </div>
                  {customer.date_opened && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <HiOutlineCalendar className="w-3 h-3" />
                      {formatDate(customer.date_opened)}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle[customer.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {customer.status}
                  </span>
                </div>
                {/* Additional accounts */}
                {customer.accounts.map((acct, i) => (
                  <div key={acct.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">{i + 2}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 font-mono">{acct.account_no ?? "—"}</p>
                      <p className="text-[10px] text-slate-400">{acct.risk_level}</p>
                    </div>
                    {acct.date_opened && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <HiOutlineCalendar className="w-3 h-3" />
                        {formatDate(acct.date_opened)}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle[acct.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {acct.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Holders — Joint only */}
          {isJoint && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <HiOutlineUsers className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-bold text-slate-900">Account Holders</h2>
                <span className="ml-auto text-xs text-slate-400">{allHolders.length} holders</span>
              </div>
              <div className="px-5 py-4 space-y-2">
                {allHolders.map((h) => (
                  <div key={h.person_index} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${h.person_index === 1 ? "bg-[#1877F2]" : "bg-purple-600"}`}>
                      {h.person_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {h.firstname}{h.middlename ? ` ${h.middlename}` : ""} {h.lastname}{h.suffix ? ` ${h.suffix}` : ""}
                      </p>
                      <p className="text-xs text-slate-400">
                        {h.person_index === 1 ? "Primary Account Holder" : "Secondary Account Holder"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${riskStyle[h.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
                      {h.risk_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <HiOutlineDocumentText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Documents</h2>
              {isDormant && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                  Dormant — Documents Restricted
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400">{totalDocs} file{totalDocs !== 1 ? "s" : ""}</span>
            </div>

            {/* Account tabs — shown when customer has 2+ accounts (non-Joint) */}
            {showAccountTabs && (
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Account</p>
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {allAccounts.map((acct) => {
                    const isActive = activeAcctIdx === acct.acctIndex;
                    return (
                      <button
                        key={acct.acctIndex}
                        onClick={() => setActiveAcctIdx(acct.acctIndex)}
                        className={`flex flex-col gap-1 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border-2 flex-shrink-0 text-left ${
                          isActive
                            ? "bg-[#1877F2] text-white border-[#1877F2] shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-[#1877F2]/50 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <HiOutlineCreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{acct.account_no ?? `Account ${acct.acctIndex}`}</span>
                          {acct.acctIndex === 1 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                              Primary
                            </span>
                          )}
                        </div>
                        <span className={`self-start px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          isActive
                            ? "bg-white/20 text-white"
                            : (statusStyle[acct.status] ?? "bg-slate-100 text-slate-500")
                        }`}>
                          {acct.status ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="px-5 py-5 space-y-6">
              {DOC_SECTIONS.map((sec) => {
                const shared = isSharedDoc(sec.key);
                const secDocs = shared
                  ? docs.filter((d) => (d.document_type === sec.front || d.document_type === sec.back) && d.person_index === 1)
                  : docsForSection.filter((d) => d.document_type === sec.front || d.document_type === sec.back);

                return (
                  <div key={sec.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{sec.label}</p>
                      {shared && secDocs.length > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-full">Shared</span>
                      )}
                    </div>
                    {secDocs.length === 0 ? (
                      <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <HiOutlinePhotograph className="w-4 h-4 text-slate-300" />
                        <p className="text-sm text-slate-400">No documents uploaded</p>
                      </div>
                    ) : shared ? (
                      /* ── Shared doc rendering: group all person_index=1 docs into front/back pairs ── */
                      <div className="space-y-3">
                        {(() => {
                          const allFront = docs.filter((d) => d.document_type === sec.front && d.person_index === 1);
                          const allBack  = docs.filter((d) => d.document_type === sec.back  && d.person_index === 1);
                          const pairCount = Math.max(allFront.length, allBack.length);
                          return Array.from({ length: pairCount }, (_, i) => {
                            const frontDoc = allFront[i] ?? null;
                            const backDoc  = allBack[i]  ?? null;
                            return (
                              <div key={i}>
                                {pairCount > 1 && (
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Set {i + 1}</p>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                  {[{ doc: frontDoc, lbl: "Front" }, { doc: backDoc, lbl: "Back" }].map(({ doc, lbl }) => (
                                    <div key={lbl}>
                                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{lbl}</p>
                                      {doc ? (
                                        <button
                                          onClick={() => openViewerByPath(doc.file_path)}
                                          className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-[#1877F2] transition-all bg-slate-50 shadow-sm"
                                        >
                                          <img src={storageUrl(doc.file_path)} alt={lbl} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="bg-white/90 rounded-full p-1.5 shadow">
                                              <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                            </div>
                                          </div>
                                        </button>
                                      ) : (
                                        <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                                          <HiOutlinePhotograph className="w-5 h-5 text-slate-200" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      /* ── Per-person doc rendering (non-shared) ── */
                      <div className="space-y-3">
                        {(persons.length ? persons : [1]).map((p) => {
                          const frontDoc = docsForSection.find((d) => d.document_type === sec.front && d.person_index === p);
                          const backDoc  = docsForSection.find((d) => d.document_type === sec.back  && d.person_index === p);
                          if (!frontDoc && !backDoc) return null;
                          return (
                            <div key={p}>
                              {isJoint && persons.length > 1 && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Person {p} — {holderName(p)}
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                {[{ doc: frontDoc, type: sec.front, lbl: "Front" }, { doc: backDoc, type: sec.back, lbl: "Back" }].map(({ doc, type, lbl }) => (
                                  <div key={lbl}>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{lbl}</p>
                                    {doc ? (
                                      <button
                                        onClick={() => openViewer(type, p)}
                                        className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-[#1877F2] transition-all bg-slate-50 shadow-sm"
                                      >
                                        <img src={storageUrl(doc.file_path)} alt={lbl} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <div className="bg-white/90 rounded-full p-1.5 shadow">
                                            <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                          </div>
                                        </div>
                                      </button>
                                    ) : (
                                      <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                                        <HiOutlinePhotograph className="w-5 h-5 text-slate-200" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Other documents */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Other Documents</p>
                </div>
                {otherDocs.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {otherDocs.map((doc, i) => (
                      <div key={doc.id} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-[#1877F2] transition-all bg-slate-50 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const { images } = buildImages();
                            const otherStart = images.findIndex((img) => img.src === storageUrl(doc.file_path));
                            setViewer({ images, index: Math.max(otherStart, 0) });
                          }}
                          className="absolute inset-0 w-full h-full"
                        />
                        <img src={storageUrl(doc.file_path)} alt={`Other ${i + 1}`} className={`w-full h-full object-cover transition-all${isDormant ? " blur-md" : ""}`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                          <div className="bg-white/90 rounded-full p-1.5 shadow">
                            <HiOutlineEye className="w-4 h-4 text-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                    <HiOutlinePhotograph className="w-4 h-4 text-slate-300" />
                    <p className="text-sm text-slate-400">No other documents</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit history is available in System Audit Logs (/admin/audit-logs) */}

        </div>
      </div>
    </>
  );
};

export default AdminCustomerView;
