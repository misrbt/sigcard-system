import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiOutlineCalendar,
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
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

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

// ── Image Viewer ──────────────────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex = 0, onClose, isDormant = false }) => {
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

// ── Customer History Section ──────────────────────────────────────────────────
const HIST_FIELD_LABELS = {
  firstname: "First Name", middlename: "Middle Name", lastname: "Last Name",
  suffix: "Suffix", account_type: "Account Type", risk_level: "Risk Level",
  status: "Status", account_no: "Account No.", date_opened: "Date Opened",
  company_name: "Company Name", branch_id: "Branch",
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

                        {isDocReplaced && meta.archived_file_path && (
                          <div className="bg-orange-50 rounded-xl border border-orange-100 px-4 py-3">
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">
                              Previous Document — {HIST_DOC_LABELS[meta.document_type] ?? meta.document_type ?? "—"}
                            </p>
                            <a href={storageUrl(meta.archived_file_path)} target="_blank" rel="noopener noreferrer" className="inline-block">
                              <img
                                src={storageUrl(meta.archived_file_path)}
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

                        {isDocReplaced && !meta.archived_file_path && (
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
  const isCorporateType = customer.account_type === "Corporate";

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

      {/* Company Name — Corporate */}
      {isCorporateType && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
          <input value={form.company_name} onChange={(e) => setF("company_name", e.target.value)} className={inputCls} />
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
      {/* Risk Level — non-Joint/Corporate */}
      {!isJointType && !isCorporateType && (
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
const CustomerView = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { hasRole } = useAuth();
  const isReadOnly  = hasRole("cashier") || hasRole("manager") || hasRole("admin") || hasRole("compliance-audit");

  const [customer, setCustomer]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [viewer, setViewer]       = useState(null);
  const [activeAcctIdx, setActiveAcctIdx] = useState(1);
  const [otherBusy, setOtherBusy] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(null); // null | "choice" | "customer" | "account"
  const addOtherRef = useRef(null);

  const fetchCustomer = () => {
    setLoading(true);
    api.get(`/customers/${id}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomer(); }, [id]);

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

  const docs      = customer.documents ?? [];
  const holders   = customer.holders   ?? [];
  const isJoint   = customer.account_type === "Joint";
  const isCorporate = customer.account_type === "Corporate";
  const isDormant = customer.status === "dormant";

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
  const totalDocs = docs.length;

  return (
    <>
      {/* Image viewer overlay */}
      <AnimatePresence>
        {viewer && (
          <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} isDormant={isDormant} />
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
                    {isCorporate && <span className="ml-1">· {allHolders.length} signatories</span>}
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

              {/* Edit Docs action — hidden for cashier (view-only role) */}
              {!isReadOnly && (
                <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/user/customers/${customer.id}/edit`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-semibold transition-colors"
                  >
                    <HiOutlinePencilAlt className="w-4 h-4" />
                    Edit Docs
                  </button>
                  {!isJoint && (
                    <button
                      onClick={() => navigate(`/user/customers/${id}/add-account`)}
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
              {!isReadOnly && (
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

          {/* Signatories card — shown for Corporate accounts */}
          {isCorporate && holders.length > 0 && (
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

          {/* Document sections */}
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
                                        className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm"
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
                  {!isReadOnly && (
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
                        {!isReadOnly && (
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

          {/* Audit History — visible to admin, manager, compliance-audit */}
          {hasRole(["admin", "compliance-audit", "manager"]) && (
            <CustomerHistorySection customerId={customer.id} />
          )}

        </div>
      </div>
    </>
  );
};

export default CustomerView;
