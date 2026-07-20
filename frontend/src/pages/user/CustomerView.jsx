import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { AnimatePresence } from "framer-motion";
import {
  HiOutlineCalendar,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineInformationCircle,
  HiOutlineOfficeBuilding,
  HiOutlinePencilAlt,
  HiOutlinePhotograph,
  HiOutlinePlus,
  HiOutlineShieldCheck,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineX,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
} from "react-icons/hi";
import { MdFingerprint } from "react-icons/md";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import DocImageDropZone from "../../components/common/DocImageDropZone";
import MultiFileDropZone from "../../components/common/MultiFileDropZone";

// ── Helpers / constants ───────────────────────────────────────────────────────
const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

const DOC_SECTIONS = [
  { key: "sigcard", label: "Signature Card", front: "sigcard_front", back: "sigcard_back"  },
  { key: "nais",    label: "NAIS",           front: "nais_front",    back: "nais_back"     },
  { key: "privacy", label: "Data Privacy",   front: "privacy_front", back: "privacy_back"  },
];

const UPLOAD_TYPE_MAP = {
  sigcard: ["sigcard_front", "sigcard_back"],
  nais:    ["nais_front",    "nais_back"],
  privacy: ["privacy_front", "privacy_back"],
  other:   ["other"],
};

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

const STATUS_DATE_LABELS = {
  dormant:     "Date of Dormancy",
  reactivated: "Date of Reactivation",
  escheat:     "Date of Escheat",
  closed:      "Date of Closure",
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

// ── Image Viewer ──────────────────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex = 0, onClose }) => {
  const [idx, setIdx]       = useState(initialIndex);
  const [zoom, setZoom]     = useState(1);
  const [pan, setPan]       = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [idx]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowRight")  setIdx((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft")   setIdx((i) => Math.max(i - 1, 0));
      if (e.key === "+")           setZoom((z) => Math.min(z + 0.5, 5));
      if (e.key === "-")           setZoom((z) => Math.max(z - 0.5, 1));
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
            filter: cur.isDormant ? "blur(12px)" : "none",
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

// ── Customer History Section ──────────────────────────────────────────────────
const HIST_FIELD_LABELS = {
  firstname: "First Name", middlename: "Middle Name", lastname: "Last Name",
  suffix: "Suffix", account_type: "Account Type", risk_level: "Risk Level",
  status: "Status", account_no: "Account No.", date_opened: "Date Opened",
  company_name: "Company Name", branch_id: "Branch",
  corporate_sub_type: "Corp. Sub Type",
};

const HIST_STATUS_COLORS = {
  active:      "bg-green-100 text-green-700",
  dormant:     "bg-yellow-100 text-yellow-700",
  closed:      "bg-red-100 text-red-700",
  escheat:     "bg-orange-100 text-orange-700",
  reactivated: "bg-teal-100 text-teal-700",
};

const HIST_DOC_LABELS = {
  sigcard_front: "Sigcard Front", sigcard_back: "Sigcard Back",
  nais_front: "NAIS Front", nais_back: "NAIS Back",
  privacy_front: "Data Privacy Front", privacy_back: "Data Privacy Back",
  other: "Other Document",
};

const histEventConfig = (event, description) => {
  const desc = (description ?? "").toLowerCase();
  if (desc.includes("replaced"))                         return { label: "Document Replaced", dot: "bg-orange-500", textColor: "text-orange-700" };
  if (desc.includes("deleted") && desc.includes("doc")) return { label: "Document Deleted",  dot: "bg-red-500",    textColor: "text-red-700"    };
  if (desc.includes("uploaded"))                         return { label: "Document Uploaded", dot: "bg-purple-500", textColor: "text-purple-700" };
  if (desc.includes("created") || event === "created")  return { label: "Account Created",   dot: "bg-green-500",  textColor: "text-green-700"  };
  if (desc.includes("updated") || event === "updated")  return { label: "Info Updated",       dot: "bg-blue-500",   textColor: "text-blue-700"   };
  if (desc.includes("deleted"))                          return { label: "Record Deleted",    dot: "bg-red-500",    textColor: "text-red-700"    };
  return { label: description ?? event ?? "Event",               dot: "bg-slate-400",  textColor: "text-slate-600"  };
};

const HistValueBadge = ({ field, value }) => {
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-400 italic text-[11px]">—</span>;
  if (field === "status")
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${HIST_STATUS_COLORS[value] ?? "bg-slate-100 text-slate-600"}`}>{value}</span>;
  return <span className="text-[11px] text-slate-800 font-medium">{String(value)}</span>;
};

const CustomerHistorySection = ({ customerId }) => {
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.get(`/customers/${customerId}/history`)
      .then(({ data }) => setHistory(data.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <HiOutlineDocumentText className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900">Audit History</h2>
        {!loading && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
            {history.length} event{history.length !== 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">{collapsed ? "Show" : "Hide"}</span>
      </button>

      {!collapsed && (
        <div className="px-5 py-5">
          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading history…</span>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No history recorded yet.</p>
          ) : (
            <ol className="relative border-l border-slate-200 space-y-5 ml-2">
              {history.map((entry) => {
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
                const hasDetails    = hasDiff || isDocReplaced || isDocDeleted || hasInitialDocs;

                return (
                  <li key={entry.id} className="ml-5 pb-1">
                    <span className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${cfg.dot}`} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</span>
                      <span className="text-[11px] text-slate-400">{formatDate(entry.created_at)}</span>
                      {entry.causer && (
                        <span className="text-[11px] text-slate-400">
                          by <span className="font-medium text-slate-600">{entry.causer.name ?? entry.causer.email}</span>
                        </span>
                      )}
                      {hasDetails && (
                        <button onClick={() => toggle(entry.id)} className="text-[11px] text-blue-600 hover:underline ml-auto">
                          {isExp ? "Hide details" : "View details"}
                        </button>
                      )}
                    </div>

                    {entry.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{entry.description}</p>
                    )}

                    {isExp && (
                      <div className="mt-2 space-y-2">
                        {hasDiff && (
                          <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Changes</p>
                            <div className="space-y-2">
                              {Object.entries(diff).map(([field, { before, after }]) => (
                                <div key={field} className="grid grid-cols-[130px_1fr_1fr] gap-2 items-center text-[11px]">
                                  <span className="text-slate-500 font-medium truncate">{HIST_FIELD_LABELS[field] ?? field}</span>
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-slate-400 uppercase font-bold shrink-0">Before</span>
                                    <HistValueBadge field={field} value={before} />
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-slate-400 uppercase font-bold shrink-0">After</span>
                                    <HistValueBadge field={field} value={after} />
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {hasInitialDocs && (
                          <div className="bg-green-50 rounded-xl border border-green-100 px-4 py-3">
                            <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2">Documents Uploaded</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(meta.documents_uploaded).map(([type, count]) => (
                                <span key={type} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                  {HIST_DOC_LABELS[type] ?? type} ×{count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {isDocReplaced && (meta.versioned_file_path || meta.archived_file_path) && (
                          <div className="bg-orange-50 rounded-xl border border-orange-100 px-4 py-3">
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">
                              Previous Document — {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "—"}
                            </p>
                            <a href={storageUrl(meta.versioned_file_path ?? meta.archived_file_path)} target="_blank" rel="noopener noreferrer" className="inline-block">
                              <img
                                src={storageUrl(meta.versioned_file_path ?? meta.archived_file_path)}
                                alt="Previous document"
                                className="w-28 h-36 object-contain rounded-lg border border-orange-200 bg-white hover:opacity-80 transition-opacity"
                              />
                            </a>
                            {meta.replaced_file && (
                              <p className="text-[10px] text-slate-500 mt-1">Was: <span className="font-medium font-mono">{meta.replaced_file}</span></p>
                            )}
                            {meta.new_file_name && (
                              <p className="text-[10px] text-slate-500">Now: <span className="font-medium font-mono">{meta.new_file_name}</span></p>
                            )}
                          </div>
                        )}

                        {isDocReplaced && !(meta.versioned_file_path || meta.archived_file_path) && (
                          <div className="bg-orange-50 rounded-xl border border-orange-100 px-4 py-3">
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">
                              Document Replaced — {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "—"}
                            </p>
                            <p className="text-[11px] text-slate-500">No archived image available for this replacement.</p>
                          </div>
                        )}

                        {isDocDeleted && (meta.file_name || meta.file_path) && (
                          <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3">
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">
                              Deleted — {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "—"}
                            </p>
                            <p className="text-[11px] text-slate-600 font-mono">{meta.file_name ?? meta.file_path?.split("/").pop()}</p>
                          </div>
                        )}
                      </div>
                    )}
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

// ── Edit Info Modals ──────────────────────────────────────────────────────────
const RISK_OPTIONS = [
  { value: "Low Risk",    label: "Low Risk",    cls: "border-emerald-400 text-emerald-700 bg-emerald-50 ring-2 ring-emerald-400/20" },
  { value: "Medium Risk", label: "Medium Risk", cls: "border-yellow-400 text-yellow-700 bg-yellow-50 ring-2 ring-yellow-400/20" },
  { value: "High Risk",   label: "High Risk",   cls: "border-red-400 text-red-700 bg-red-50 ring-2 ring-red-400/20" },
];

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";

const ModalShell = ({ title, subtitle, onClose, children, footer }) => (
  <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <HiOutlineX className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
      {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">{footer}</div>}
    </div>
  </div>
);

// Choice picker — ask what to edit
const EditChoiceModal = ({ customer, onClose, onPick }) => (
  <ModalShell title="Edit Info" subtitle={customer.full_name} onClose={onClose}>
    <p className="text-xs text-slate-500">Select what you would like to edit.</p>
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onPick("customer")}
        className="flex flex-col items-center gap-3 px-4 py-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <HiOutlineUser className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Customer Info</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Name, photo</p>
        </div>
      </button>
      <button
        onClick={() => onPick("account")}
        className="flex flex-col items-center gap-3 px-4 py-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
          <HiOutlineCreditCard className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Account Info</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Risk level, dates, account no.</p>
        </div>
      </button>
    </div>
  </ModalShell>
);

// Edit customer personal info — name / photo
const EditCustomerInfoModal = ({ customer, onClose, onSaved, onBack }) => {
  const isCorporateType  = customer.account_type === "Corporate";
  const isSolePropType   = isCorporateType && customer.corporate_sub_type === "Sole Proprietorship";

  const [form, setForm] = useState({
    firstname:    customer.firstname    ?? "",
    middlename:   customer.middlename   ?? "",
    lastname:     customer.lastname     ?? "",
    suffix:       customer.suffix       ?? "",
    company_name: customer.company_name ?? "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(customer.photo ? storageUrl(customer.photo) : null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("_method", "PUT");
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
      if (photoFile) fd.append("photo", photoFile);
      if (removePhoto) fd.append("remove_photo", "1");
      await api.post(`/customers/${customer.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Edit Customer Info"
      subtitle={customer.full_name}
      onClose={onClose}
      footer={
        <>
          <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            ← Back
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-xl transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {/* Photo */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Photo</p>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 flex-shrink-0">
              <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(true); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">✕</button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 flex-shrink-0">
              <HiOutlinePhotograph className="w-8 h-8" />
            </div>
          )}
          <label className="cursor-pointer flex-1">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); setRemovePhoto(false); }
                e.target.value = "";
              }} />
            <div className="px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-center">
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </div>
          </label>
        </div>
      </div>

      {/* Name — non-Corporate */}
      {!isCorporateType && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">First Name</label>
              <input value={form.firstname} onChange={(e) => setF("firstname", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Middle Name</label>
              <input value={form.middlename} onChange={(e) => setF("middlename", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Last Name</label>
              <input value={form.lastname} onChange={(e) => setF("lastname", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Suffix</label>
              <input value={form.suffix} onChange={(e) => setF("suffix", e.target.value)} className={inputCls} placeholder="Jr., Sr., III" />
            </div>
          </div>
        </div>
      )}

      {/* Company Name — Corporate (both sub-types) */}
      {isCorporateType && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
          <input value={form.company_name} onChange={(e) => setF("company_name", e.target.value)} className={inputCls} />
        </div>
      )}

      {/* Proprietor Name — Sole Proprietorship only */}
      {isSolePropType && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proprietor Name</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">First Name</label>
              <input value={form.firstname} onChange={(e) => setF("firstname", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Middle Name</label>
              <input value={form.middlename} onChange={(e) => setF("middlename", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Last Name</label>
              <input value={form.lastname} onChange={(e) => setF("lastname", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Suffix</label>
              <input value={form.suffix} onChange={(e) => setF("suffix", e.target.value)} className={inputCls} placeholder="Jr., Sr., III" />
            </div>
          </div>
        </div>
      )}

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
    </ModalShell>
  );
};

// Edit account details — risk level, account no., dates (no status)
const EditAccountInfoModal = ({ customer, onClose, onSaved, onBack }) => {
  const isJointType     = customer.account_type === "Joint";
  const isCorporateType = customer.account_type === "Corporate";
  const isSolePropType  = isCorporateType && customer.corporate_sub_type === "Sole Proprietorship";

  const [form, setForm] = useState({
    risk_level:   customer.risk_level   ?? "Low Risk",
    account_no:   customer.account_no   ?? "",
    date_opened:  customer.date_opened  ? customer.date_opened.substring(0, 10)  : "",
    date_updated: customer.date_updated ? customer.date_updated.substring(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Convert empty strings to null so backend nullable validation passes
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
      );
      await api.put(`/customers/${customer.id}`, payload);
      onSaved();
      onClose();
    } catch (e) {
      const data = e?.response?.data;
      const msg = data?.errors
        ? Object.values(data.errors).flat().join("\n")
        : data?.message ?? "Failed to save changes.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Edit Account Info"
      subtitle={customer.full_name}
      onClose={onClose}
      footer={
        <>
          <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            ← Back
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-xl transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {/* Risk Level — non-Joint, and non-Corporate (or Sole Proprietorship) */}
      {!isJointType && (!isCorporateType || isSolePropType) && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Level</p>
          <div className="flex flex-wrap gap-2">
            {RISK_OPTIONS.map(({ value, label, cls }) => (
              <button key={value} type="button" onClick={() => setF("risk_level", value)}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.risk_level === value ? cls : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account No + Dates */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Details</p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Account No.</label>
            <input value={form.account_no} onChange={(e) => setF("account_no", e.target.value)} className={inputCls} placeholder="e.g. 1234-5678-9012" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date Opened</label>
              <input type="date" value={form.date_opened} onChange={(e) => setF("date_opened", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date Updated <span className="text-slate-400">(Optional)</span></label>
              <input type="date" value={form.date_updated} onChange={(e) => setF("date_updated", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
    </ModalShell>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CustomerView = ({ basePath = '/user' }) => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit   = hasPermission('edit-customers');
  const canCreate = hasPermission('create-customers');

  const [customer, setCustomer]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [viewer, setViewer]       = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadParam          = searchParams.get("upload");
  const newStatusParam       = searchParams.get("newStatus");       // legacy: status already saved
  const statusLogIdParam     = searchParams.get("statusLogId");     // legacy: existing log id
  const acctParam            = searchParams.get("acct");
  const statusDateParam      = searchParams.get("statusDate");      // legacy date
  const pendingStatusParam   = searchParams.get("pendingStatus");   // new: status not yet saved
  const pendingStatusDateParam = searchParams.get("pendingStatusDate");
  const pendingAcctIdParam   = searchParams.get("pendingAcctId");

  // True when the status change hasn't been saved yet — upload commits everything atomically
  const isPendingUpload = !!(pendingStatusParam && uploadParam);

  // Unified display values (pending takes precedence over legacy saved)
  const activeStatusParam   = pendingStatusParam ?? newStatusParam;
  const activeStatusDate    = pendingStatusDateParam ?? statusDateParam;

  const escheatYear = (activeStatusParam === "escheat" && activeStatusDate)
    ? new Date(activeStatusDate).getFullYear()
    : null;
  const privacyNotRequired = activeStatusParam === "escheat" && escheatYear !== null && escheatYear <= 2021;

  // Intercept the browser back button when a status change is pending (popstate works with BrowserRouter)
  // Intercept the browser back button while a status change is pending.
  // We capture the current URL so we can push back to it after the popstate fires.
  useEffect(() => {
    if (!isPendingUpload) return;

    const currentUrl = window.location.href;

    const handlePopState = () => {
      // The browser has already moved back — push this page's URL back to stay here
      window.history.pushState(null, "", currentUrl);
      Swal.fire({
        icon: "warning",
        title: "Leave without uploading?",
        html: `<p style="font-size:14px;color:#374151;">The account status change to <strong style="text-transform:capitalize">${pendingStatusParam}</strong> will <strong>not be saved</strong> if you leave now.</p><p style="margin-top:8px;font-size:12px;color:#6b7280;">Stay on this page to finish uploading the supporting documents.</p>`,
        showCancelButton: true,
        confirmButtonText: "Leave anyway",
        cancelButtonText: "Stay & upload",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#2563eb",
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          // User chose to leave — remove guard and go back past the entry we re-pushed
          window.removeEventListener("popstate", handlePopState);
          window.history.back();
        }
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isPendingUpload, pendingStatusParam]);

  const [activeAcctIdx, setActiveAcctIdx] = useState(1);

  // Sync account tab from URL ?acct=N before browser paints (no flash).
  // useLayoutEffect fires on every render where acctParam changes, covering both
  // fresh mounts and React Router reusing the same component instance.
  useLayoutEffect(() => {
    if (!acctParam) return;
    const n = parseInt(acctParam, 10);
    if (!isNaN(n) && n >= 1) setActiveAcctIdx(n);
  }, [acctParam]);

  const [otherBusy, setOtherBusy] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(null); // null | "choice" | "customer" | "account"
  const addOtherRef = useRef(null);
  const [docUploadFiles, setDocUploadFiles]     = useState({});
  const [otherUploadFiles, setOtherUploadFiles] = useState([]);
  const [docUploadBusy, setDocUploadBusy]       = useState(false);
  const [historyExpanded, setHistoryExpanded]   = useState({});

  // Per-account-type upload state (for status-change document uploads)
  const [itfHasSecondFront,    setItfHasSecondFront]    = useState(false);
  const [itfSecondFront,        setItfSecondFront]        = useState(null);
  const [nonItfSigcardFront,    setNonItfSigcardFront]    = useState(null);
  const [perPersonSigcardBacks, setPerPersonSigcardBacks] = useState({}); // { [personIndex]: File }
  const [corpSigcardFronts,     setCorpSigcardFronts]     = useState([null]);
  const [perPersonCorpBacks,    setPerPersonCorpBacks]    = useState({}); // { [personIndex]: File }

  // showSpinner=true for initial page load; false for silent background refreshes
  const fetchCustomer = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { data } = await api.get(`/customers/${id}`);
      setCustomer(data);
    } catch {
      setCustomer(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCustomer(true); }, [fetchCustomer]);

  useEffect(() => {
    if (!customer) return;
    const acctCount = 1 + (customer.accounts?.length ?? 0);
    setActiveAcctIdx((prev) => (prev > acctCount ? 1 : prev));
  }, [customer]);

  const clearUploadPanel = () => {
    // replace:true overwrites the current history entry so pressing back
    // after a successful upload goes to the previous page, not this URL with params
    setSearchParams({}, { replace: true });
    setDocUploadFiles({});
    setOtherUploadFiles([]);
    setItfHasSecondFront(false);
    setItfSecondFront(null);
    setNonItfSigcardFront(null);
    setPerPersonSigcardBacks({});
    setCorpSigcardFronts([null]);
    setPerPersonCorpBacks({});
  };

  const resetUploadPanel = async () => {
    if (isPendingUpload) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Cancel status change?",
        html: `<p style="font-size:14px;color:#374151;">If you cancel now, the account status will <strong>not</strong> be updated to <strong class="capitalize">${pendingStatusParam}</strong>.</p>`,
        showCancelButton: true,
        confirmButtonText: "Yes, cancel it",
        cancelButtonText: "Keep uploading",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#2563eb",
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
    }
    clearUploadPanel();
  };

  const handleUploadForStatus = async () => {
    if (!activeStatusParam || !customer) return;

    const uploadsSelected = (uploadParam ?? "").split(",").filter(Boolean);
    const acctType  = customer.account_type;
    const jointSub  = customer.joint_sub_type;
    const isItfUpload    = acctType === "Joint" && jointSub === "ITF";
    const isNonItfUpload = acctType === "Joint" && jointSub === "Non-ITF";
    const isCorpUpload   = acctType === "Corporate" && customer.corporate_sub_type !== "Sole Proprietorship";

    const hasFiles =
      Object.values(docUploadFiles).some(Boolean)
      || otherUploadFiles.length > 0
      || nonItfSigcardFront !== null
      || Object.values(perPersonSigcardBacks).some(Boolean)
      || corpSigcardFronts.some(Boolean)
      || Object.values(perPersonCorpBacks).some(Boolean)
      || (itfHasSecondFront && itfSecondFront !== null);

    if (!hasFiles) return;

    setDocUploadBusy(true);
    try {
      const fd = new FormData();
      if (isPendingUpload) {
        // Status not yet saved — backend will atomically update status + upload docs
        fd.append("pending_status", pendingStatusParam);
        if (pendingStatusDateParam) fd.append("pending_status_date", pendingStatusDateParam);
        if (pendingAcctIdParam) fd.append("pending_acct_id", pendingAcctIdParam);
      } else {
        // Legacy path: status was already saved before navigating here
        fd.append("account_status", newStatusParam);
        if (statusLogIdParam) fd.append("status_log_id", statusLogIdParam);
      }

      if (isNonItfUpload) {
        // Sigcard: shared front at person 1 + per-holder backs
        if (uploadsSelected.includes("sigcard")) {
          let pairIdx = 0;
          const p1Front = nonItfSigcardFront;
          const p1Back  = perPersonSigcardBacks[1] ?? null;
          if (p1Front || p1Back) {
            fd.append(`sigcardPairs[${pairIdx}][person_index]`, 1);
            if (p1Front) fd.append(`sigcardPairs[${pairIdx}][front]`, p1Front);
            if (p1Back)  fd.append(`sigcardPairs[${pairIdx}][back]`,  p1Back);
            pairIdx++;
          }
          Object.entries(perPersonSigcardBacks)
            .filter(([pi]) => Number(pi) >= 2)
            .sort(([a], [b]) => Number(a) - Number(b))
            .forEach(([pi, backFile]) => {
              if (backFile) {
                fd.append(`sigcardPairs[${pairIdx}][person_index]`, Number(pi));
                fd.append(`sigcardPairs[${pairIdx}][back]`, backFile);
                pairIdx++;
              }
            });
        }
        // NAIS + Privacy: simple front/back per account
        for (const { key, pKey, frontKey, backKey } of [
          { key: "nais",    pKey: "naisPairs",    frontKey: "nais_front",    backKey: "nais_back"    },
          { key: "privacy", pKey: "privacyPairs", frontKey: "privacy_front", backKey: "privacy_back" },
        ]) {
          if (!uploadsSelected.includes(key)) continue;
          const f = docUploadFiles[frontKey];
          const b = docUploadFiles[backKey];
          if (f || b) {
            fd.append(`${pKey}[0][person_index]`, activeAcctIdx);
            if (f) fd.append(`${pKey}[0][front]`, f);
            if (b) fd.append(`${pKey}[0][back]`,  b);
          }
        }

      } else if (isCorpUpload) {
        // Corporate sigcard: one or more fronts + per-signatory backs
        if (uploadsSelected.includes("sigcard")) {
          let pairIdx = 0;
          corpSigcardFronts.forEach((front, i) => {
            if (front) {
              fd.append(`sigcardPairs[${pairIdx}][person_index]`, i + 1);
              fd.append(`sigcardPairs[${pairIdx}][front]`, front);
              pairIdx++;
            }
          });
          Object.entries(perPersonCorpBacks)
            .sort(([a], [b]) => Number(a) - Number(b))
            .forEach(([pi, backFile]) => {
              if (backFile) {
                fd.append(`sigcardPairs[${pairIdx}][person_index]`, Number(pi));
                fd.append(`sigcardPairs[${pairIdx}][back]`, backFile);
                pairIdx++;
              }
            });
        }
        // NAIS + Privacy: simple front/back per account
        for (const { key, pKey, frontKey, backKey } of [
          { key: "nais",    pKey: "naisPairs",    frontKey: "nais_front",    backKey: "nais_back"    },
          { key: "privacy", pKey: "privacyPairs", frontKey: "privacy_front", backKey: "privacy_back" },
        ]) {
          if (!uploadsSelected.includes(key)) continue;
          const f = docUploadFiles[frontKey];
          const b = docUploadFiles[backKey];
          if (f || b) {
            fd.append(`${pKey}[0][person_index]`, activeAcctIdx);
            if (f) fd.append(`${pKey}[0][front]`, f);
            if (b) fd.append(`${pKey}[0][back]`,  b);
          }
        }

      } else {
        // Regular + Joint ITF: simple front/back for each selected doc type
        for (const { key, pKey, frontKey, backKey } of [
          { key: "sigcard", pKey: "sigcardPairs", frontKey: "sigcard_front", backKey: "sigcard_back" },
          { key: "nais",    pKey: "naisPairs",    frontKey: "nais_front",    backKey: "nais_back"    },
          { key: "privacy", pKey: "privacyPairs", frontKey: "privacy_front", backKey: "privacy_back" },
        ]) {
          if (!uploadsSelected.includes(key)) continue;
          const f = docUploadFiles[frontKey];
          const b = docUploadFiles[backKey];
          if (f || b) {
            fd.append(`${pKey}[0][person_index]`, isItfUpload ? 1 : activeAcctIdx);
            if (f) fd.append(`${pKey}[0][front]`, f);
            if (b) fd.append(`${pKey}[0][back]`,  b);
          }
        }
        // ITF optional 2nd person sigcard front
        if (isItfUpload && uploadsSelected.includes("sigcard") && itfHasSecondFront && itfSecondFront) {
          fd.append(`sigcardPairs[1][person_index]`, 2);
          fd.append(`sigcardPairs[1][front]`, itfSecondFront);
        }
      }

      // Other docs
      if (uploadsSelected.includes("other")) {
        otherUploadFiles.forEach((file) => fd.append(`otherDocs[${activeAcctIdx}][]`, file));
      }

      // Capture display values before clearing URL params
      const wasAtomicSave   = isPendingUpload;
      const savedStatus     = activeStatusParam;
      const savedStatusDate = activeStatusDate;
      const savedDocTypes   = uploadsSelected;

      const { data: uploadData } = await api.post(`/customers/${id}/upload-status-document`, fd, { headers: { "Content-Type": "multipart/form-data" } });

      clearUploadPanel();
      if (uploadData?.customer) {
        setCustomer(uploadData.customer);
      } else {
        await fetchCustomer();
      }

      const docLabels = {
        sigcard: "Signature Card",
        nais:    "NAIS",
        privacy: "Data Privacy",
        other:   "Other Documents",
      };
      const docListHtml = savedDocTypes
        .map((t) => `<li style="margin:2px 0">&#x2713; ${docLabels[t] ?? t}</li>`)
        .join("");
      const dateDisplay = savedStatusDate
        ? new Date(savedStatusDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        : "Today";

      Swal.fire({
        icon: "success",
        title: wasAtomicSave ? "Status Updated" : "Documents Uploaded",
        html: wasAtomicSave
          ? `<div style="text-align:left;font-size:13px;color:#374151;line-height:1.7">
               <p style="margin-bottom:8px">Account status is now <strong style="text-transform:capitalize">${savedStatus}</strong> as of <strong>${dateDisplay}</strong>.</p>
               <p style="font-size:12px;color:#6b7280;margin-bottom:4px">Documents uploaded:</p>
               <ul style="padding-left:16px;font-size:12px;color:#2563eb">${docListHtml}</ul>
             </div>`
          : `<div style="text-align:left;font-size:13px;color:#374151;line-height:1.7">
               <p style="margin-bottom:8px">Documents saved for <strong style="text-transform:capitalize">${savedStatus}</strong> status.</p>
               <ul style="padding-left:16px;font-size:12px;color:#2563eb">${docListHtml}</ul>
             </div>`,
        confirmButtonColor: "#2563eb",
        timer: 4000,
        timerProgressBar: true,
      });
    } catch {
      Swal.fire({ icon: "error", title: "Upload Failed", text: "Unable to upload one or more documents. Please try again.", confirmButtonColor: "#dc2626" });
    } finally {
      setDocUploadBusy(false);
    }
  };

  const handleReplaceOtherDoc = async (doc, file) => {
    setOtherBusy(true);
    try {
      const fd = new FormData();
      fd.append("document_type", "other");
      fd.append("person_index", doc.person_index);
      fd.append("document_id", doc.id);
      fd.append("file", file);
      await api.post(`/customers/${id}/replace-document`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchCustomer();
    } catch {
      /* silent */
    } finally {
      setOtherBusy(false);
    }
  };

  const handleAddOtherDocs = async (files, personIndex) => {
    setOtherBusy(true);
    try {
      const fd = new FormData();
      fd.append("_method", "PUT");
      files.forEach((f) => fd.append(`otherDocs[${personIndex}][]`, f));
      await api.post(`/customers/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchCustomer();
    } catch {
      /* silent */
    } finally {
      setOtherBusy(false);
    }
  };

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

    // Reuse the same current/latest-status-group filtered list the thumbnails use
    // (docsForSection already excludes archived is_current=false docs and scopes to
    // the active account tab), so the full-size viewer never shows a stale replaced document.
    const viewDocs = docsForSection;

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

  // ── Loading ─────────────────────────────────────────────────────────────────
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
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">← Go back</button>
      </div>
    );
  }

  const initialDocs = (customer.documents ?? []).filter((d) => !d.account_status);
  const statusDocs  = (customer.documents ?? []).filter((d) => !!d.account_status);
  const holders     = customer.holders   ?? [];
  const isJoint              = customer.account_type === "Joint";
  const isCorporate          = customer.account_type === "Corporate";
  const isSoleProprietorship = isCorporate && customer.corporate_sub_type === "Sole Proprietorship";

  // status_logs sorted newest-first (backend uses .latest(); serialized as snake_case)
  const statusLogs = customer.status_logs ?? [];
  // Most recent status log that has documents (new feature path)
  const latestLogWithDocs = statusLogs.find((log) => (log.documents ?? []).length > 0) ?? null;

  // Legacy status groups: docs with account_status but no status_log_id (uploaded before log feature)
  // Sorted newest-first so legacyGroups[0] is the most recent group
  const legacyGroups = Object.values(
    statusDocs.filter((d) => !d.status_log_id).reduce((acc, doc) => {
      const key = doc.account_status;
      if (!acc[key]) acc[key] = { status: doc.account_status, docs: [], latestDate: null };
      acc[key].docs.push(doc);
      if (!acc[key].latestDate || doc.created_at > acc[key].latestDate) acc[key].latestDate = doc.created_at;
      return acc;
    }, {})
  ).sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""));

  // Determine what the top Documents section shows:
  //  1. Most recent status log with docs (preferred — log-linked)
  //  2. Most recent legacy group (status docs without a log, e.g. uploaded before the log feature)
  //  3. Initial docs (original upload, shown when no status-change uploads exist at all)
  const latestLegacyGroup = legacyGroups[0] ?? null;
  // Filter out archived (is_current=false) documents so replacements made in Edit Docs
  // are immediately visible — the status log relation returns both old and new records.
  const docs = (latestLogWithDocs
    ? (latestLogWithDocs.documents ?? [])
    : latestLegacyGroup
      ? latestLegacyGroup.docs
      : initialDocs
  ).filter((d) => d.is_current !== false);

  // Status at the time of the initial upload — oldest log's previous_status, fallback to current status
  const initialStatus = statusLogs.length > 0
    ? (statusLogs[statusLogs.length - 1]?.previous_status ?? customer.status)
    : customer.status;

  // Which status label to show in the Documents header
  const currentDocsStatus = latestLogWithDocs?.status ?? latestLegacyGroup?.status ?? null;

  // History section content:
  //  - historyLogs: all logs except the one shown at top
  //  - historyLegacyGroups: all legacy groups except the one shown at top
  //  - showInitialInHistory: initial docs shown collapsible when something newer is at top
  const historyLogs          = latestLogWithDocs
    ? statusLogs.filter((log) => log.id !== latestLogWithDocs.id && (log.documents ?? []).length > 0)
    : statusLogs.filter((log) => (log.documents ?? []).length > 0);
  const historyLegacyGroups  = latestLogWithDocs ? legacyGroups : legacyGroups.slice(1);
  const showInitialInHistory = (!!latestLogWithDocs || !!latestLegacyGroup) && initialDocs.length > 0;

  // Multi-account tabs (non-Joint only)
  const allAccounts = !isJoint ? [
    { account_no: customer.account_no, risk_level: customer.risk_level, date_opened: customer.date_opened, status: customer.status, status_date: customer.status_date, acctIndex: 1 },
    ...(customer.accounts ?? []).map((a, i) => ({
      account_no: a.account_no, risk_level: a.risk_level, date_opened: a.date_opened, status: a.status, status_date: a.status_date, acctIndex: i + 2,
    })),
  ] : [];
  const showAccountTabs = allAccounts.length >= 2;

  // Per-account latest log: most recent log that has docs for the active account tab.
  // Derived before history arrays so they can exclude it (not the global latestLogWithDocs).
  const latestLogForAcct = showAccountTabs
    ? statusLogs.find(
        (log) => (log.documents ?? []).length > 0 &&
                 (log.documents ?? []).some((d) => d.person_index === activeAcctIdx)
      ) ?? null
    : latestLogWithDocs;

  // The current legacy group for the active account (used when no status log exists for this acct).
  const legacyForAcct = showAccountTabs
    ? legacyGroups.find((g) => g.docs.some((d) => d.person_index === activeAcctIdx)) ?? null
    : null;

  // Account-scoped Status Change History — excludes latestLogForAcct (per-account current)
  // so Account 2's docs don't appear in both Documents and History simultaneously.
  const historyLogsForAcct = showAccountTabs
    ? statusLogs.filter((log) =>
        log.id !== latestLogForAcct?.id &&
        (log.documents ?? []).length > 0 &&
        (log.documents ?? []).some((d) => d.person_index === activeAcctIdx)
      )
    : historyLogs;
  const historyLegacyGroupsForAcct = showAccountTabs
    ? historyLegacyGroups
        .filter((g) => g !== legacyForAcct)
        .map((g) => ({ ...g, docs: g.docs.filter((d) => d.person_index === activeAcctIdx) }))
        .filter((g) => g.docs.length > 0)
    : historyLegacyGroups;
  const initialDocsForHistory = showAccountTabs
    ? initialDocs.filter((d) => d.person_index === activeAcctIdx)
    : initialDocs;
  const showInitialForAcct = showAccountTabs
    ? (!!latestLogForAcct || !!legacyForAcct) && initialDocsForHistory.length > 0
    : showInitialInHistory;
  const activeAcctObj = showAccountTabs ? allAccounts.find((a) => a.acctIndex === activeAcctIdx) : null;

  // Blur only when the currently-viewed account is dormant
  const activeAcctStatus = showAccountTabs
    ? (allAccounts.find((a) => a.acctIndex === activeAcctIdx)?.status ?? customer.status)
    : customer.status;
  const isDormant = activeAcctStatus === "dormant";

  // Docs for the active account tab: use per-account log → legacy group → initial docs
  const docsForSection = showAccountTabs
    ? latestLogForAcct
      ? (latestLogForAcct.documents ?? []).filter((d) => d.is_current !== false && d.person_index === activeAcctIdx)
      : legacyForAcct
        ? legacyForAcct.docs.filter((d) => d.person_index === activeAcctIdx)
        : initialDocs.filter((d) => d.person_index === activeAcctIdx)
    : docs;

  // Per-account status label shown in the Documents section header
  const currentDocsStatusForAcct = showAccountTabs
    ? latestLogForAcct?.status ?? legacyForAcct?.status ?? null
    : currentDocsStatus;

  // All holders in order: Person 1 (from customer) + Person 2+ (from holders relation)
  const allHolders = [
    { person_index: 1, firstname: customer.firstname, middlename: customer.middlename, lastname: customer.lastname, suffix: customer.suffix, risk_level: customer.risk_level },
    ...holders,
  ];

  const holderName = (personIndex) => {
    const h = allHolders.find((x) => x.person_index === personIndex);
    if (!h) return `Person ${personIndex}`;
    return `${h.firstname}${h.middlename ? " " + h.middlename : ""} ${h.lastname}${h.suffix ? " " + h.suffix : ""}`;
  };

  // persons for Joint (all person_index values); for multi-account tabs, scoped to active account
  const persons = isJoint
    ? [...new Set(docs.filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type)).map((d) => d.person_index))].sort()
    : showAccountTabs
      ? [activeAcctIdx]
      : [...new Set(docs.filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type)).map((d) => d.person_index))].sort();
  const otherDocs = docsForSection.filter((d) => d.document_type === "other");
  const totalDocs = docsForSection.length;

  const currentLatestDate = docsForSection.reduce((latest, d) => (!latest || d.created_at > latest ? d.created_at : latest), null);

  return (
    <>
      {/* Image viewer overlay */}
      <AnimatePresence>
        {viewer && (
          <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} />
        )}
      </AnimatePresence>

      {/* Edit Info modals */}
      {editInfoOpen === "choice" && (
        <EditChoiceModal
          customer={customer}
          onClose={() => setEditInfoOpen(null)}
          onPick={(v) => setEditInfoOpen(v)}
        />
      )}
      {editInfoOpen === "customer" && (
        <EditCustomerInfoModal
          customer={customer}
          onClose={() => setEditInfoOpen(null)}
          onSaved={fetchCustomer}
          onBack={() => setEditInfoOpen("choice")}
        />
      )}
      {editInfoOpen === "account" && (
        <EditAccountInfoModal
          customer={customer}
          onClose={() => setEditInfoOpen(null)}
          onSaved={fetchCustomer}
          onBack={() => setEditInfoOpen("choice")}
        />
      )}

      <div className="bg-gray-50 min-h-screen">

        {/* ── Hero header ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

            {/* Back nav */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-medium mb-4 transition-colors"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
              Back to Customers
            </button>

            {/* Profile row */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                {customer.photo ? (
                  <img src={storageUrl(customer.photo)} alt="Customer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {initials(customer)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-white">{customer.full_name}</h1>
                  {(isJoint || isCorporate) && holders.length > 0 && (
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
                    {isCorporate && !isSoleProprietorship && <span className="ml-1">· {allHolders.length} signatories</span>}
                    {isSoleProprietorship && <span className="ml-1">· Sole Proprietorship</span>}
                  </span>
                  {!isJoint && !isCorporate && (
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

              {/* Action buttons — shown only to roles with the matching permission */}
              {(canEdit || canCreate) && (
                <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => navigate(`${basePath}/customers/${customer.id}/edit`)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-semibold transition-colors"
                    >
                      <HiOutlinePencilAlt className="w-4 h-4" />
                      Edit Docs
                    </button>
                  )}
                  {canCreate && (
                    <button
                      onClick={() => navigate(`${basePath}/customers/${id}/add-account`)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-xl text-white text-sm font-semibold transition-colors"
                    >
                      <HiOutlinePlus className="w-4 h-4" />
                      Add Account
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Customer Details card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <HiOutlineInformationCircle className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Customer Details</h2>
              {canEdit && (
                <button onClick={() => setEditInfoOpen("choice")}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <HiOutlinePencilAlt className="w-3.5 h-3.5" />
                  Edit Info
                </button>
              )}
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

              {/* Corporate Sub Type — Corporate only */}
              {isCorporate && customer.corporate_sub_type && (
                <div className="flex items-start gap-3">
                  <HiOutlineTag className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Corporate Sub Type</p>
                    <p className="text-sm font-semibold text-slate-800">{customer.corporate_sub_type}</p>
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

              {/* Risk Level — Regular only (Joint/Corporate show per holder) */}
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
                    <div className="space-y-2">
                      {allAccounts.map((acct, i) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">{acct.acctIndex}</span>
                            <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{acct.account_no ?? "—"}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${statusStyle[acct.status] ?? "bg-slate-100 text-slate-500"}`}>
                              {acct.status ?? "—"}
                            </span>
                          </div>
                          {acct.status_date && acct.status !== "active" && (
                            <div className="ml-6 flex items-center gap-1">
                              <span className="text-[9px] text-slate-400">{STATUS_DATE_LABELS[acct.status] ?? "Status Date"}:</span>
                              <span className="text-[9px] font-semibold text-slate-600">{formatDate(acct.status_date)}</span>
                            </div>
                          )}
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

              {/* Status Date — shows date of dormancy / reactivation / escheat / closure */}
              {customer.status_date && customer.status !== "active" && (
                <div className="flex items-start gap-3">
                  <HiOutlineCalendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {STATUS_DATE_LABELS[customer.status] ?? "Status Date"}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(customer.status_date)}</p>
                  </div>
                </div>
              )}

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

          {/* Additional Accounts card — shown when customer has extra accounts */}
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

          {/* Account Holders card — shown for Joint accounts */}
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${h.person_index === 1 ? "bg-blue-600" : "bg-purple-600"}`}>
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

          {/* Signatories card — shown for standard Corporate accounts with multiple signatories */}
          {isCorporate && !isSoleProprietorship && holders.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <HiOutlineUsers className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900">Authorized Signatories</h2>
                <span className="ml-auto text-xs text-slate-400">{allHolders.length} signatories</span>
              </div>
              <div className="px-5 py-4 space-y-2">
                {allHolders.map((h) => (
                  <div key={h.person_index} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${h.person_index === 1 ? "bg-blue-600" : "bg-slate-600"}`}>
                      {h.person_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {h.firstname}{h.middlename ? ` ${h.middlename}` : ""} {h.lastname}{h.suffix ? ` ${h.suffix}` : ""}
                      </p>
                      <p className="text-xs text-slate-400">
                        {h.person_index === 1 ? "Primary Signatory" : `Signatory ${h.person_index}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proprietor card — shown for Sole Proprietorship accounts */}
          {isSoleProprietorship && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <HiOutlineUser className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900">Proprietor</h2>
                <span className="ml-auto text-xs text-slate-400">Sole owner</span>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {customer.firstname}{customer.middlename ? ` ${customer.middlename}` : ""} {customer.lastname}{customer.suffix ? ` ${customer.suffix}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">Sole Proprietor</p>
                  </div>
                  {customer.risk_level && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${riskStyle[customer.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
                      {customer.risk_level}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Document sections */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <HiOutlineDocumentText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Documents</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle[customer.status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {customer.status ?? "—"}
              </span>
              {currentDocsStatusForAcct && (
                <span className="text-[10px] text-slate-400">Latest upload</span>
              )}
              {isDormant && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                  Documents Restricted
                </span>
              )}
              {uploadParam && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border animate-pulse ${isPendingUpload ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-blue-100 text-blue-700 border-blue-300"}`}>
                  {isPendingUpload ? "Status pending upload" : "Upload pending"}
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {currentLatestDate ? formatDate(currentLatestDate) : ""} · {totalDocs} file{totalDocs !== 1 ? "s" : ""}
              </span>
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
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
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
              {/* Upload panel for status-change document uploads */}
              {uploadParam && activeStatusParam && canEdit && (() => {
                const uploadsSelected = uploadParam.split(",").filter(Boolean);

                const stagedCount = [
                  ...Object.values(docUploadFiles).filter(Boolean),
                  ...otherUploadFiles,
                  nonItfSigcardFront,
                  ...Object.values(perPersonSigcardBacks).filter(Boolean),
                  ...corpSigcardFronts.filter(Boolean),
                  ...Object.values(perPersonCorpBacks).filter(Boolean),
                  itfHasSecondFront && itfSecondFront,
                ].filter(Boolean).length;

                return (
                  <div className={`rounded-2xl border-2 overflow-hidden ${isPendingUpload ? "border-amber-400" : "border-blue-400"}`}>
                    {/* Header */}
                    <div className={`flex items-center gap-3 px-4 py-3 ${isPendingUpload ? "bg-amber-500" : "bg-blue-600"}`}>
                      <HiOutlinePhotograph className="w-4 h-4 text-white flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">
                          {isPendingUpload
                            ? <>Confirm status change — <span className="capitalize">{activeStatusParam}</span></>
                            : <>Upload documents — <span className="capitalize">{activeStatusParam}</span></>
                          }
                        </p>
                        {showAccountTabs && activeAcctObj && (
                          <p className="text-xs text-white/70 mt-0.5">
                            Account: <span className="font-semibold text-white">{activeAcctObj.account_no ?? `Account ${activeAcctIdx}`}</span>
                            {activeAcctIdx === 1 && <span className="ml-1 text-white/60">(Primary)</span>}
                          </p>
                        )}
                      </div>
                      <button onClick={resetUploadPanel} className="text-white/60 hover:text-white transition-colors">
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Pending-status warning banner */}
                    {isPendingUpload && (
                      <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                        <HiOutlineInformationCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                          The account status has <strong>not been saved yet.</strong>{" "}
                          Upload the documents below to confirm the change to{" "}
                          <span className="capitalize font-bold">{activeStatusParam}</span>.
                          Closing this panel will cancel the status change.
                        </p>
                      </div>
                    )}

                    {/* Body */}
                    <div className="px-4 py-4 bg-blue-50 space-y-5">
                      {uploadsSelected.map((uploadType) => {

                        // ── Other Documents ──────────────────────────────────
                        if (uploadType === "other") {
                          return (
                            <div key="other">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Other Documents</p>
                              <MultiFileDropZone files={otherUploadFiles} onChange={setOtherUploadFiles} />
                            </div>
                          );
                        }

                        // ── Signature Card ───────────────────────────────────
                        if (uploadType === "sigcard") {
                          // Joint Non-ITF: shared front + per-holder back
                          if (isNonITF) {
                            return (
                              <div key="sigcard" className="space-y-3">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card</p>
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-slate-500">Front — Shared</p>
                                  <div className="w-1/2 pr-1.5">
                                    <DocImageDropZone compact label="Sigcard Front"
                                      file={nonItfSigcardFront}
                                      onChange={setNonItfSigcardFront} />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-slate-500">Back — Per Account Holder</p>
                                  <div className="space-y-2">
                                    {allHolders.map((h) => (
                                      <div key={h.person_index} className="flex items-center gap-3 bg-white rounded-xl border border-blue-200 px-3 py-2.5">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${h.person_index === 1 ? "bg-blue-600" : "bg-purple-600"}`}>
                                          {h.person_index}
                                        </div>
                                        <p className="text-xs text-slate-700 font-semibold w-28 truncate flex-shrink-0">
                                          {h.firstname} {h.lastname}
                                        </p>
                                        <div className="flex-1">
                                          <DocImageDropZone compact label="Risk Profiling"
                                            file={perPersonSigcardBacks[h.person_index] ?? null}
                                            onChange={(f) => setPerPersonSigcardBacks((prev) => ({ ...prev, [h.person_index]: f }))} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Corporate (multi-signatory only): one or more fronts + per-signatory backs
                          if (isCorporate && !isSoleProprietorship) {
                            return (
                              <div key="sigcard" className="space-y-3">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card</p>
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-slate-500">Front(s) — Shared</p>
                                  <div className={`grid gap-3 ${corpSigcardFronts.length === 1 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                                    {corpSigcardFronts.map((file, i) => (
                                      <DocImageDropZone key={i} compact
                                        label={corpSigcardFronts.length > 1 ? `Front ${i + 1}` : "Sigcard Front"}
                                        file={file}
                                        onChange={(f) => setCorpSigcardFronts((prev) => { const a = [...prev]; a[i] = f; return a; })} />
                                    ))}
                                  </div>
                                  {corpSigcardFronts.length < allHolders.length && (
                                    <button type="button"
                                      onClick={() => setCorpSigcardFronts((p) => [...p, null])}
                                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-dashed border-blue-300 rounded-lg px-3 py-1.5 bg-white hover:bg-blue-50 transition-colors">
                                      <HiOutlinePlus className="w-3.5 h-3.5" /> Add Front
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-slate-500">Risk Profiling — Per Signatory</p>
                                  <div className="space-y-2">
                                    {allHolders.map((h) => (
                                      <div key={h.person_index} className="flex items-center gap-3 bg-white rounded-xl border border-blue-200 px-3 py-2.5">
                                        <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                          {h.person_index}
                                        </div>
                                        <p className="text-xs text-slate-700 font-semibold w-28 truncate flex-shrink-0">
                                          {h.firstname} {h.lastname}
                                        </p>
                                        <div className="flex-1">
                                          <DocImageDropZone compact label="Risk Profiling"
                                            file={perPersonCorpBacks[h.person_index] ?? null}
                                            onChange={(f) => setPerPersonCorpBacks((prev) => ({ ...prev, [h.person_index]: f }))} />
                                        </div>
                                      </div>
                                    ))}
                                    {/* Extra back for corporate entity itself */}
                                    {(() => {
                                      const corpBackKey = allHolders.length + 1;
                                      return (
                                        <div className="flex items-center gap-3 bg-white rounded-xl border border-blue-200 px-3 py-2.5">
                                          <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                            C
                                          </div>
                                          <p className="text-xs text-slate-700 font-semibold w-28 truncate flex-shrink-0">
                                            Corporate
                                          </p>
                                          <div className="flex-1">
                                            <DocImageDropZone compact label="Risk Profiling"
                                              file={perPersonCorpBacks[corpBackKey] ?? null}
                                              onChange={(f) => setPerPersonCorpBacks((prev) => ({ ...prev, [corpBackKey]: f }))} />
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Joint ITF: shared front+back + optional 2nd person front
                          if (isITF) {
                            const scFront = docUploadFiles["sigcard_front"] ?? null;
                            const scBack  = docUploadFiles["sigcard_back"]  ?? null;
                            return (
                              <div key="sigcard" className="space-y-3">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card — Shared</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <DocImageDropZone compact label="Sigcard Front (Shared)"
                                    file={scFront}
                                    onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_front: f ?? undefined }))} />
                                  <DocImageDropZone compact label="Sigcard Back (Shared)"
                                    file={scBack}
                                    onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_back: f ?? undefined }))} />
                                </div>
                                {!itfHasSecondFront ? (
                                  <button type="button" onClick={() => setItfHasSecondFront(true)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 border border-dashed border-purple-300 rounded-lg px-3 py-1.5 bg-white hover:bg-purple-50 transition-colors">
                                    <HiOutlinePlus className="w-3.5 h-3.5" /> Add 2nd Person Front
                                  </button>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-[10px]">2</div>
                                      <p className="text-xs font-semibold text-slate-500">2nd Person — Sigcard Front</p>
                                      <button type="button" onClick={() => { setItfHasSecondFront(false); setItfSecondFront(null); }}
                                        className="ml-auto text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">Remove</button>
                                    </div>
                                    <div className="w-1/2 pr-1.5">
                                      <DocImageDropZone compact label="Front (Person 2)"
                                        file={itfSecondFront}
                                        onChange={setItfSecondFront} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Regular: simple front + back
                          const scFront = docUploadFiles["sigcard_front"] ?? null;
                          const scBack  = docUploadFiles["sigcard_back"]  ?? null;
                          return (
                            <div key="sigcard" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Signature Card</p>
                              <div className="grid grid-cols-2 gap-3">
                                <DocImageDropZone compact label="Sigcard Front"
                                  file={scFront}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_front: f ?? undefined }))} />
                                <DocImageDropZone compact label="Sigcard Back"
                                  file={scBack}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, sigcard_back: f ?? undefined }))} />
                              </div>
                              {(scFront || scBack) && (
                                <div className="flex justify-center">
                                  <button type="button"
                                    onClick={() => { const src = scFront ?? scBack; setDocUploadFiles((p) => ({ ...p, sigcard_front: src, sigcard_back: src })); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition-colors shadow-sm">
                                    <HiOutlinePhotograph className="w-3.5 h-3.5 flex-shrink-0" />
                                    Use same image for both sides
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // ── NAIS ─────────────────────────────────────────────
                        if (uploadType === "nais") {
                          const nFront = docUploadFiles["nais_front"] ?? null;
                          const nBack  = docUploadFiles["nais_back"]  ?? null;
                          return (
                            <div key="nais" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NAIS</p>
                              <div className="grid grid-cols-2 gap-3">
                                <DocImageDropZone compact label="NAIS Front"
                                  file={nFront}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, nais_front: f ?? undefined }))} />
                                <DocImageDropZone compact label="NAIS Back"
                                  file={nBack}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, nais_back: f ?? undefined }))} />
                              </div>
                              {(nFront || nBack) && (
                                <div className="flex justify-center">
                                  <button type="button"
                                    onClick={() => { const src = nFront ?? nBack; setDocUploadFiles((p) => ({ ...p, nais_front: src, nais_back: src })); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition-colors shadow-sm">
                                    <HiOutlinePhotograph className="w-3.5 h-3.5 flex-shrink-0" />
                                    Use same image for both sides
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // ── Data Privacy ──────────────────────────────────────
                        if (uploadType === "privacy") {
                          // Data Privacy was only implemented in 2022; skip for escheat accounts dated ≤ 2021
                          if (privacyNotRequired) return null;
                          const pFront = docUploadFiles["privacy_front"] ?? null;
                          const pBack  = docUploadFiles["privacy_back"]  ?? null;
                          return (
                            <div key="privacy" className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data Privacy</p>
                              <div className="grid grid-cols-2 gap-3">
                                <DocImageDropZone compact label="Privacy Front"
                                  file={pFront}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, privacy_front: f ?? undefined }))} />
                                <DocImageDropZone compact label="Privacy Back"
                                  file={pBack}
                                  onChange={(f) => setDocUploadFiles((p) => ({ ...p, privacy_back: f ?? undefined }))} />
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })}

                      {/* Footer */}
                      <div className={`flex items-center justify-between gap-3 pt-2 border-t ${isPendingUpload ? "border-amber-200" : "border-blue-200"}`}>
                        <p className="text-[10px] text-slate-400">
                          {stagedCount} file{stagedCount !== 1 ? "s" : ""} ready
                        </p>
                        {isPendingUpload ? (
                          <span className="text-[10px] font-semibold text-amber-600 flex-shrink-0">
                            Upload to confirm status
                          </span>
                        ) : (
                          <button onClick={resetUploadPanel}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0">
                            Skip
                          </button>
                        )}
                        <button onClick={handleUploadForStatus}
                          disabled={docUploadBusy || stagedCount === 0}
                          className={`px-4 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 transition-colors ${isPendingUpload ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                          {docUploadBusy
                            ? "Saving…"
                            : isPendingUpload
                              ? "Upload & Save Status"
                              : "Upload Documents"
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {DOC_SECTIONS.map((sec) => {
                // Corporate sigcard: fronts (each with unique person_index) + per-signatory backs
                if (isCorporate && sec.key === "sigcard") {
                  const allFronts = docs.filter((d) => d.document_type === sec.front);
                  const allBacks  = docs.filter((d) => d.document_type === sec.back);
                  const hasDocs = allFronts.length > 0 || allBacks.length > 0;
                  return (
                    <div key={sec.key}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{sec.label}</p>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-full">Corporate</span>
                      </div>
                      {!hasDocs ? (
                        <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                          <HiOutlinePhotograph className="w-4 h-4 text-slate-300" />
                          <p className="text-sm text-slate-400">No documents uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Sigcard Fronts — shared */}
                          {allFronts.length > 0 && (
                            <div className="space-y-3">
                              {allFronts.length > 1 && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Front ({allFronts.length})</p>
                              )}
                              <div className={`grid gap-3 ${allFronts.length === 1 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                                {allFronts.map((doc, i) => (
                                  <div key={doc.id}>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                                      {allFronts.length === 1 ? "Front" : `Front ${i + 1}`}
                                    </p>
                                    <button
                                      onClick={() => openViewerByPath(doc.file_path)}
                                      className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm"
                                    >
                                      <img src={storageUrl(doc.file_path)} alt={`Front ${i + 1}`} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="bg-white/90 rounded-full p-1.5 shadow">
                                          <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                        </div>
                                      </div>
                                    </button>
                                    {doc.has_thumbmark === false && (
                                      <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 w-fit">
                                        <MdFingerprint className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                        <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">No thumbmark</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {allFronts.length === 1 && <div />}
                              </div>
                            </div>
                          )}

                          {/* Sigcard Backs — per signatory */}
                          {allBacks.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-slate-200" />
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Back — per signatory</p>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {allHolders.map((h) => {
                                  const backDoc = allBacks.find((d) => d.person_index === h.person_index);
                                  return (
                                    <div key={h.person_index}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${h.person_index === 1 ? "bg-blue-600" : "bg-slate-600"}`}>
                                          {h.person_index}
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                                          {h.firstname} {h.lastname}
                                        </p>
                                      </div>
                                      {backDoc ? (
                                        <button
                                          onClick={() => openViewer("sigcard_back", h.person_index)}
                                          className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm"
                                        >
                                          <img src={storageUrl(backDoc.file_path)} alt={`Back — ${h.firstname}`} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
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
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

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
                                        <>
                                          <button
                                            onClick={() => openViewerByPath(doc.file_path)}
                                            className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm"
                                          >
                                            <img src={storageUrl(doc.file_path)} alt={lbl} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                              <div className="bg-white/90 rounded-full p-1.5 shadow">
                                                <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                              </div>
                                            </div>
                                          </button>
                                          {doc.document_type === "sigcard_front" && doc.has_thumbmark === false && (
                                            <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 w-fit">
                                              <MdFingerprint className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                              <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">No thumbmark</span>
                                            </div>
                                          )}
                                        </>
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
                                      <>
                                        <button
                                          onClick={() => openViewer(type, p)}
                                          className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm"
                                        >
                                          <img src={storageUrl(doc.file_path)} alt={lbl} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="bg-white/90 rounded-full p-1.5 shadow">
                                              <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                            </div>
                                          </div>
                                        </button>
                                        {type === "sigcard_front" && doc.has_thumbmark === false && (
                                          <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 w-fit">
                                            <MdFingerprint className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                            <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">No thumbmark</span>
                                          </div>
                                        )}
                                      </>
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
                  {canEdit && (
                    <>
                      <input
                        type="file" accept="image/*" multiple className="hidden" ref={addOtherRef}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length) handleAddOtherDocs(files, activeAcctIdx);
                          e.target.value = "";
                        }}
                      />
                      <button type="button" disabled={otherBusy}
                        onClick={() => addOtherRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40"
                      >
                        <HiOutlinePlus className="w-3 h-3" />
                        Add Docs
                      </button>
                    </>
                  )}
                </div>
                {otherDocs.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {otherDocs.map((doc, i) => (
                      <div key={doc.id} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm">
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
                        {canEdit && (
                          <>
                            <input
                              type="file" accept="image/*" id={`replace-other-${doc.id}`} className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleReplaceOtherDoc(doc, file);
                                e.target.value = "";
                              }}
                            />
                            <label
                              htmlFor={`replace-other-${doc.id}`}
                              className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100 z-10"
                            >
                              Replace
                            </label>
                          </>
                        )}
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

          {/* Status Change History */}
          {(historyLogsForAcct.length > 0 || historyLegacyGroupsForAcct.length > 0 || showInitialForAcct) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <HiOutlineCalendar className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Status Change History</h2>
                {showAccountTabs && activeAcctObj && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    <HiOutlineCreditCard className="w-3 h-3" />
                    {activeAcctObj.account_no ?? `Account ${activeAcctIdx}`}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {historyLogsForAcct.length + historyLegacyGroupsForAcct.length + (showInitialForAcct ? 1 : 0)}{" "}
                  change{(historyLogsForAcct.length + historyLegacyGroupsForAcct.length + (showInitialForAcct ? 1 : 0)) !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {historyLogsForAcct.map((log) => {
                  const logKey     = `log-${log.id}`;
                  const isExpanded = historyExpanded[logKey] ?? false;
                  const logDocs    = showAccountTabs
                    ? (log.documents ?? []).filter((d) => d.person_index === activeAcctIdx)
                    : (log.documents ?? []);
                  const changer    = log.changed_by
                    ? (log.changed_by.full_name || `${log.changed_by.firstname ?? ""} ${log.changed_by.lastname ?? ""}`.trim() || log.changed_by.username)
                    : null;

                  return (
                    <div key={log.id}>
                      <button
                        onClick={() => setHistoryExpanded((prev) => ({ ...prev, [logKey]: !isExpanded }))}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyle[log.status] ?? "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                            {log.status}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Previous → New */}
                          {log.previous_status && (
                            <p className="text-[10px] text-slate-400 mb-0.5">
                              <span className={`font-semibold ${statusStyle[log.previous_status] ? "text-slate-500" : "text-slate-400"}`}>
                                {log.previous_status.charAt(0).toUpperCase() + log.previous_status.slice(1)}
                              </span>
                              {" → "}
                              <span className="font-semibold text-slate-700">
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </span>
                            </p>
                          )}
                          <p className="text-xs text-slate-500 truncate">
                            {formatDate(log.created_at)}
                            {changer && <span className="text-slate-400"> · {changer}</span>}
                            {logDocs.length > 0 && (
                              <span className="ml-1.5 text-blue-500 font-semibold">
                                · {logDocs.length} doc{logDocs.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {logDocs.length === 0 && (
                              <span className="ml-1.5 text-slate-300">· no documents</span>
                            )}
                          </p>
                        </div>

                        <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/40">
                          {logDocs.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No documents were uploaded for this status change.</p>
                          ) : (
                            <>
                              {DOC_SECTIONS.map((sec) => {
                                const frontDocs = logDocs.filter((d) => d.document_type === sec.front);
                                const backDocs  = logDocs.filter((d) => d.document_type === sec.back);
                                if (!frontDocs.length && !backDocs.length) return null;
                                const personsInLog = [...new Set([...frontDocs, ...backDocs].map((d) => d.person_index))].sort();
                                return (
                                  <div key={sec.key} className="mb-5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.label}</p>
                                    {personsInLog.map((pi) => {
                                      const fDoc = frontDocs.find((d) => d.person_index === pi);
                                      const bDoc = backDocs.find((d) => d.person_index === pi);
                                      return (
                                        <div key={pi} className="mb-3">
                                          {personsInLog.length > 1 && (
                                            <p className="text-[10px] text-slate-400 mb-1">{holderName(pi)}</p>
                                          )}
                                          <div className="grid grid-cols-2 gap-2">
                                            {[{ doc: fDoc, side: "Front" }, { doc: bDoc, side: "Back" }].map(({ doc, side }) => (
                                              <div key={side}>
                                                <p className="text-[10px] text-slate-400 mb-1">{side}</p>
                                                {doc ? (
                                                  <button
                                                    onClick={() => setViewer({ images: [{ src: storageUrl(doc.file_path), label: `${sec.label} ${side}`, person: pi > 1 ? pi : null }], index: 0 })}
                                                    className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm"
                                                  >
                                                    <img src={storageUrl(doc.file_path)} alt={`${sec.label} ${side}`} className="w-full h-full object-contain" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                      <div className="bg-white/90 rounded-full p-1.5 shadow">
                                                        <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                                      </div>
                                                    </div>
                                                  </button>
                                                ) : (
                                                  <div className="w-full aspect-[3/4] rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                                                    <span className="text-[10px] text-slate-300">—</span>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {/* Other docs */}
                              {logDocs.filter((d) => d.document_type === "other").length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Other Documents</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {logDocs.filter((d) => d.document_type === "other").map((doc) => (
                                      <button
                                        key={doc.id}
                                        onClick={() => setViewer({ images: [{ src: storageUrl(doc.file_path), label: "Other Document", person: doc.person_index > 1 ? doc.person_index : null }], index: 0 })}
                                        className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm"
                                      >
                                        <img src={storageUrl(doc.file_path)} alt="Other Document" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <div className="bg-white/90 rounded-full p-1.5 shadow">
                                            <HiOutlineEye className="w-4 h-4 text-slate-700" />
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Legacy groups: status-change docs uploaded before the log feature */}
                {historyLegacyGroupsForAcct.map((group) => {
                  const legacyKey  = `legacy-${group.status}`;
                  const isExpanded = historyExpanded[legacyKey] ?? false;
                  return (
                    <div key={legacyKey}>
                      <button
                        onClick={() => setHistoryExpanded((prev) => ({ ...prev, [legacyKey]: !isExpanded }))}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${statusStyle[group.status] ?? "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          {group.status}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 truncate">
                            {formatDate(group.latestDate)}
                            <span className="ml-1.5 text-blue-500 font-semibold">· {group.docs.length} doc{group.docs.length !== 1 ? "s" : ""}</span>
                          </p>
                        </div>
                        <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/40">
                          {DOC_SECTIONS.map((sec) => {
                            const fDocs = group.docs.filter((d) => d.document_type === sec.front);
                            const bDocs = group.docs.filter((d) => d.document_type === sec.back);
                            if (!fDocs.length && !bDocs.length) return null;
                            return (
                              <div key={sec.key} className="mb-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.label}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[{ docs: fDocs, side: "Front" }, { docs: bDocs, side: "Back" }].map(({ docs: sideDocs, side }) => (
                                    <div key={side}>
                                      <p className="text-[10px] text-slate-400 mb-1">{side}</p>
                                      {sideDocs.length > 0 ? sideDocs.map((doc) => (
                                        <button key={doc.id}
                                          onClick={() => setViewer({ images: [{ src: storageUrl(doc.file_path), label: `${sec.label} ${side}` }], index: 0 })}
                                          className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm mb-1"
                                        >
                                          <img src={storageUrl(doc.file_path)} alt={`${sec.label} ${side}`} className="w-full h-full object-contain" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="bg-white/90 rounded-full p-1.5 shadow"><HiOutlineEye className="w-4 h-4 text-slate-700" /></div>
                                          </div>
                                        </button>
                                      )) : (
                                        <div className="w-full aspect-[3/4] rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                                          <span className="text-[10px] text-slate-300">—</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {group.docs.filter((d) => d.document_type === "other").length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Other Documents</p>
                              <div className="grid grid-cols-3 gap-2">
                                {group.docs.filter((d) => d.document_type === "other").map((doc) => (
                                  <button key={doc.id}
                                    onClick={() => setViewer({ images: [{ src: storageUrl(doc.file_path), label: "Other Document" }], index: 0 })}
                                    className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm"
                                  >
                                    <img src={storageUrl(doc.file_path)} alt="Other" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="bg-white/90 rounded-full p-1.5 shadow"><HiOutlineEye className="w-4 h-4 text-slate-700" /></div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Initial Upload — shown in history when status-change uploads exist */}
                {showInitialForAcct && (() => {
                  const initKey     = "initial-upload";
                  const isExpanded  = historyExpanded[initKey] ?? false;
                  const initDate    = initialDocsForHistory.reduce((latest, d) => (!latest || d.created_at > latest ? d.created_at : latest), null);
                  return (
                    <div key={initKey}>
                      <button
                        onClick={() => setHistoryExpanded((prev) => ({ ...prev, [initKey]: !isExpanded }))}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex-shrink-0">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusStyle[initialStatus] ?? "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                            {initialStatus ?? "active"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 mb-0.5 font-semibold">Initial Upload</p>
                          <p className="text-xs text-slate-500 truncate">
                            {formatDate(initDate)}
                            <span className="ml-1.5 text-blue-500 font-semibold">· {initialDocsForHistory.length} doc{initialDocsForHistory.length !== 1 ? "s" : ""}</span>
                          </p>
                        </div>
                        <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/40">
                          {DOC_SECTIONS.map((sec) => {
                            const frontDocs = initialDocsForHistory.filter((d) => d.document_type === sec.front);
                            const backDocs  = initialDocsForHistory.filter((d) => d.document_type === sec.back);
                            if (!frontDocs.length && !backDocs.length) return null;
                            const personsInInit = [...new Set([...frontDocs, ...backDocs].map((d) => d.person_index))].sort();
                            return (
                              <div key={sec.key} className="mb-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.label}</p>
                                {personsInInit.map((pi) => {
                                  const fDoc = frontDocs.find((d) => d.person_index === pi);
                                  const bDoc = backDocs.find((d) => d.person_index === pi);
                                  return (
                                    <div key={pi} className="mb-3">
                                      {personsInInit.length > 1 && <p className="text-[10px] text-slate-400 mb-1">{holderName(pi)}</p>}
                                      <div className="grid grid-cols-2 gap-2">
                                        {[{ doc: fDoc, side: "Front" }, { doc: bDoc, side: "Back" }].map(({ doc, side }) => (
                                          <div key={side}>
                                            <p className="text-[10px] text-slate-400 mb-1">{side}</p>
                                            {doc ? (
                                              <button
                                                onClick={() => setViewer({ images: [{ src: storageUrl(doc.file_path), label: `${sec.label} ${side}` }], index: 0 })}
                                                className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm"
                                              >
                                                <img src={storageUrl(doc.file_path)} alt={`${sec.label} ${side}`} className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                  <div className="bg-white/90 rounded-full p-1.5 shadow"><HiOutlineEye className="w-4 h-4 text-slate-700" /></div>
                                                </div>
                                              </button>
                                            ) : (
                                              <div className="w-full aspect-[3/4] rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                                                <span className="text-[10px] text-slate-300">—</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {initialDocsForHistory.filter((d) => d.document_type === "other").length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Other Documents</p>
                              <div className="grid grid-cols-3 gap-2">
                                {initialDocsForHistory.filter((d) => d.document_type === "other").map((doc) => (
                                  <button key={doc.id}
                                    onClick={() => setViewer({ images: [{ src: storageUrl(doc.file_path), label: "Other Document" }], index: 0 })}
                                    className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm"
                                  >
                                    <img src={storageUrl(doc.file_path)} alt="Other" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="bg-white/90 rounded-full p-1.5 shadow"><HiOutlineEye className="w-4 h-4 text-slate-700" /></div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Audit History — visible to admin, manager, compliance, audit */}
          {hasPermission('view-audit-logs') && (
            <CustomerHistorySection customerId={customer.id} />
          )}

        </div>
      </div>
    </>
  );
};

export default CustomerView;
