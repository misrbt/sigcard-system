import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSearch,
  HiOutlineOfficeBuilding,
  HiOutlineDocumentText,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineChevronDown,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlinePencilAlt,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineCalendar,
  HiOutlinePhotograph,
  HiOutlineLockClosed,
  HiOutlineTag,
  HiOutlineInformationCircle,
} from "react-icons/hi";
import { MdFingerprint } from "react-icons/md";
import Swal from "sweetalert2";
import api from "../../services/api";
import ThumbmarkSearchModal from "../../components/common/ThumbmarkSearchModal";

const PAGE_SIZE = 10;

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

const docLabel = {
  sigcard_front:  "Sigcard Front",
  sigcard_back:   "Sigcard Back",
  nais_front:     "NAIS Front",
  nais_back:      "NAIS Back",
  privacy_front:  "Data Privacy Front",
  privacy_back:   "Data Privacy Back",
  other:          "Other Document",
};

const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

const DOC_SECTIONS = [
  { key: "sigcard", label: "Signature Card",  front: "sigcard_front", back: "sigcard_back"  },
  { key: "nais",    label: "NAIS",            front: "nais_front",    back: "nais_back"     },
  { key: "privacy", label: "Data Privacy",    front: "privacy_front", back: "privacy_back"  },
];

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const customerId = (id) => `C-${String(id).padStart(4, "0")}`;

const initials = (customer) => {
  const f = customer?.firstname?.[0] ?? "";
  const l = customer?.lastname?.[0]  ?? "";
  return (f + l).toUpperCase() || "?";
};

// ── AccountsCell — collapsed summary, expandable on click ────────────────────
const AccountsCell = ({ c }) => {
  const [open, setOpen] = useState(false);
  const allAccts = [
    { account_no: c.account_no, status: c.status, risk_level: c.risk_level },
    ...(c.accounts ?? []).map((a) => ({ account_no: a.account_no, status: a.status, risk_level: a.risk_level })),
  ];

  if (allAccts.length === 1) {
    return <span className="text-[11px] text-slate-600 font-mono">{c.account_no ?? "—"}</span>;
  }

  return (
    <div className="min-w-0">
      {/* Collapsed pill — click to expand */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-400 transition-colors group"
      >
        <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">
          {allAccts.length}
        </span>
        <span className="text-[11px] font-semibold text-blue-700">accounts</span>
        <HiOutlineChevronRight className={`w-3 h-3 text-blue-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded list */}
      {open && (
        <div className="mt-1.5 space-y-1 pl-0.5">
          {allAccts.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-slate-100 shadow-sm">
              <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">{i + 1}</span>
              <span className="text-[11px] text-slate-700 font-mono flex-1 min-w-0 truncate">{a.account_no ?? "—"}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${statusStyle[a.status] ?? "bg-slate-100 text-slate-500"}`}>{a.status ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Image Viewer (fullscreen carousel + zoom/pan) ────────────────────────────
const ImageViewer = ({ images, initialIndex = 0, onClose, isDormant = false }) => {
  const [idx, setIdx]       = useState(initialIndex);
  const [zoom, setZoom]     = useState(1);
  const [pan, setPan]       = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });

  // Reset zoom/pan on slide change
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [idx]);

  // Keyboard navigation
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
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/70 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm truncate max-w-xs">{cur.label}</span>
          {cur.person && <span className="text-white/40 text-xs">Person {cur.person}</span>}
          <span className="text-white/30 text-xs">{idx + 1} / {images.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Zoom out (-)">
            <HiOutlineZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 5))}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Zoom in (+)">
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

      {/* Main image area */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center relative"
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Prev */}
        {idx > 0 && (
          <button onClick={() => setIdx((i) => i - 1)}
            className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors border border-white/10">
            <HiOutlineChevronLeft className="w-6 h-6" />
          </button>
        )}
        {/* Next */}
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

      {/* Thumbnail strip */}
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

// ── Audit History ─────────────────────────────────────────────────────────────
const HIST_STATUS_COLORS = {
  active:      "bg-green-100 text-green-700",
  dormant:     "bg-yellow-100 text-yellow-700",
  closed:      "bg-red-100 text-red-700",
  escheat:     "bg-orange-100 text-orange-700",
  reactivated: "bg-teal-100 text-teal-700",
};
const HIST_FIELD_LABELS = {
  firstname: "First Name", middlename: "Middle Name", lastname: "Last Name",
  suffix: "Suffix", account_type: "Account Type", risk_level: "Risk Level",
  status: "Status", account_no: "Account No.", date_opened: "Date Opened",
  company_name: "Company Name", branch_id: "Branch",
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
  const [history, setHistory]   = useState([]);
  const [hLoading, setHLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    api.get(`/customers/${customerId}/history`)
      .then(({ data }) => setHistory(data.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHLoading(false));
  }, [customerId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <HiOutlineDocumentText className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900">Audit History</h2>
        {!hLoading && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
            {history.length} event{history.length !== 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">{collapsed ? "Show" : "Hide"}</span>
      </button>
      {!collapsed && (
        <div className="px-5 py-5">
          {hLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading history…</span>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No history recorded yet.</p>
          ) : (
            <ol className="relative border-l border-slate-200 space-y-5 ml-2">
              {history.map((entry) => {
                const cfg      = histEventConfig(entry.event, entry.description);
                const isExp    = expanded[entry.id];
                const diff     = entry.diff ?? {};
                const meta     = entry.meta ?? {};
                const changed  = Object.keys(diff).filter((k) => diff[k].old !== diff[k].new);
                return (
                  <li key={entry.id} className="ml-4">
                    <div className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${cfg.textColor}`}>{cfg.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(entry.created_at)}
                        {entry.causer && <span className="ml-1.5">· {entry.causer.firstname} {entry.causer.lastname}</span>}
                      </p>
                      {(changed.length > 0 || meta.file_name) && (
                        <button
                          onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                          className="mt-1.5 text-[10px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          {isExp ? "Hide details" : "Show details"}
                        </button>
                      )}
                      {isExp && (
                        <div className="mt-2 space-y-2">
                          {changed.map((k) => (
                            <div key={k} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="font-semibold text-slate-500">{HIST_FIELD_LABELS[k] ?? k}:</span>
                              <HistValueBadge field={k} value={diff[k].old} />
                              <span className="text-slate-300">→</span>
                              <HistValueBadge field={k} value={diff[k].new} />
                            </div>
                          ))}
                          {meta.file_name && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400">File:</span>
                              <span className="text-slate-600 font-mono">{meta.file_name ?? meta.file_path?.split("/").pop()}</span>
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

// ── Customer Detail View ──────────────────────────────────────────────────────
const CustomerDetailView = ({ customerId: cid, onClose }) => {
  const [customer, setCustomer]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [viewer, setViewer]       = useState(null);
  const [activeAcctIdx, setActiveAcctIdx] = useState(1);
  const [historyExpanded, setHistoryExpanded] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get(`/customers/${cid}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [cid]);

  // Build flat image array for carousel
  const buildImages = (startType = null, startPerson = null) => {
    if (!customer?.documents) return { images: [], index: 0 };
    const imgs = [];
    let startIdx = 0;

    const hasMultiAccounts = customer?.account_type !== "Joint" && (customer?.accounts?.length ?? 0) >= 1;
    // Use status-aware docs for the carousel
    const _statusLogs = customer.status_logs ?? [];
    const _latestLogWithDocs = _statusLogs.find((log) => (log.documents ?? []).length > 0) ?? null;
    const _statusDocs = (customer.documents ?? []).filter((d) => !!d.account_status);
    const _legacyDocs = _statusDocs.filter((d) => !d.status_log_id);
    const _legacyGroups = Object.values(
      _legacyDocs.reduce((acc, doc) => {
        const key = doc.account_status;
        if (!acc[key]) acc[key] = { docs: [], latestDate: null };
        acc[key].docs.push(doc);
        if (!acc[key].latestDate || doc.created_at > acc[key].latestDate) acc[key].latestDate = doc.created_at;
        return acc;
      }, {})
    ).sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""));
    const _initialDocs = (customer.documents ?? []).filter((d) => !d.account_status);
    const baseDocs = (_latestLogWithDocs
      ? (_latestLogWithDocs.documents ?? [])
      : _legacyGroups[0]?.docs ?? _initialDocs
    ).filter((d) => d.is_current !== false);

    const viewDocs = hasMultiAccounts
      ? baseDocs.filter((d) => d.person_index === activeAcctIdx)
      : baseDocs;

    // Grouped: sigcard/nais/privacy per person
    const persons = [...new Set(
      viewDocs
        .filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type))
        .map((d) => d.person_index)
    )].sort();

    DOC_SECTIONS.forEach((sec) => {
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
    });

    // Other docs
    viewDocs.filter((d) => d.document_type === "other").forEach((doc) => {
      imgs.push({ src: storageUrl(doc.file_path), label: "Other Document", person: null });
    });

    return { images: imgs, index: startIdx };
  };

  const openViewer = (docType, personIndex) => {
    const { images, index } = buildImages(docType, personIndex);
    if (images.length) setViewer({ images, index });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading customer…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-slate-500 font-medium">Customer not found.</p>
      </div>
    );
  }

  // ── Status-log-aware data computation ────────────────────────────────────────
  const holders     = customer.holders ?? [];
  const isJoint     = customer.account_type === "Joint";
  const isCorporate = customer.account_type === "Corporate";

  const statusLogs        = customer.status_logs ?? [];
  const initialDocs       = (customer.documents ?? []).filter((d) => !d.account_status);
  const statusDocs        = (customer.documents ?? []).filter((d) => !!d.account_status);
  const latestLogWithDocs = statusLogs.find((log) => (log.documents ?? []).length > 0) ?? null;

  const legacyGroups = Object.values(
    statusDocs.filter((d) => !d.status_log_id).reduce((acc, doc) => {
      const key = doc.account_status;
      if (!acc[key]) acc[key] = { status: doc.account_status, docs: [], latestDate: null };
      acc[key].docs.push(doc);
      if (!acc[key].latestDate || doc.created_at > acc[key].latestDate) acc[key].latestDate = doc.created_at;
      return acc;
    }, {})
  ).sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""));

  const latestLegacyGroup = legacyGroups[0] ?? null;

  const docs = (latestLogWithDocs
    ? (latestLogWithDocs.documents ?? [])
    : latestLegacyGroup ? latestLegacyGroup.docs : initialDocs
  ).filter((d) => d.is_current !== false);

  const initialStatus     = statusLogs.length > 0
    ? (statusLogs[statusLogs.length - 1]?.previous_status ?? customer.status)
    : customer.status;
  const currentDocsStatus = latestLogWithDocs?.status ?? latestLegacyGroup?.status ?? null;

  const historyLogs          = latestLogWithDocs
    ? statusLogs.filter((log) => log.id !== latestLogWithDocs.id && (log.documents ?? []).length > 0)
    : statusLogs.filter((log) => (log.documents ?? []).length > 0);
  const historyLegacyGroups  = latestLogWithDocs ? legacyGroups : legacyGroups.slice(1);
  const showInitialInHistory = (!!latestLogWithDocs || !!latestLegacyGroup) && initialDocs.length > 0;

  const allAccounts = !isJoint ? [
    { account_no: customer.account_no, risk_level: customer.risk_level, date_opened: customer.date_opened, status: customer.status, acctIndex: 1 },
    ...(customer.accounts ?? []).map((a, i) => ({
      account_no: a.account_no, risk_level: a.risk_level, date_opened: a.date_opened, status: a.status, acctIndex: i + 2,
    })),
  ] : [];
  const showAccountTabs = allAccounts.length >= 2;

  const latestLogForAcct = showAccountTabs
    ? statusLogs.find(
        (log) => (log.documents ?? []).length > 0 &&
                 (log.documents ?? []).some((d) => d.person_index === activeAcctIdx)
      ) ?? null
    : latestLogWithDocs;

  const docsForSection = showAccountTabs
    ? (() => {
        if (latestLogForAcct) {
          return (latestLogForAcct.documents ?? [])
            .filter((d) => d.is_current !== false && d.person_index === activeAcctIdx);
        }
        const legacyForAcct = legacyGroups.find((g) => g.docs.some((d) => d.person_index === activeAcctIdx));
        if (legacyForAcct) return legacyForAcct.docs.filter((d) => d.person_index === activeAcctIdx);
        return initialDocs.filter((d) => d.person_index === activeAcctIdx);
      })()
    : docs;

  const currentDocsStatusForAcct = showAccountTabs
    ? latestLogForAcct?.status ?? (() => {
        const legacyForAcct = legacyGroups.find((g) => g.docs.some((d) => d.person_index === activeAcctIdx));
        return legacyForAcct?.status ?? null;
      })()
    : currentDocsStatus;

  const historyLogsForAcct = showAccountTabs
    ? historyLogs.filter((log) => (log.documents ?? []).some((d) => d.person_index === activeAcctIdx))
    : historyLogs;
  const historyLegacyGroupsForAcct = showAccountTabs
    ? historyLegacyGroups
        .map((g) => ({ ...g, docs: g.docs.filter((d) => d.person_index === activeAcctIdx) }))
        .filter((g) => g.docs.length > 0)
    : historyLegacyGroups;
  const initialDocsForHistory = showAccountTabs
    ? initialDocs.filter((d) => d.person_index === activeAcctIdx)
    : initialDocs;
  const showInitialForAcct = showAccountTabs
    ? (!!latestLogWithDocs || !!latestLegacyGroup) && initialDocsForHistory.length > 0
    : showInitialInHistory;
  const activeAcctObj = showAccountTabs ? allAccounts.find((a) => a.acctIndex === activeAcctIdx) : null;

  const activeAcctStatus = showAccountTabs
    ? (allAccounts.find((a) => a.acctIndex === activeAcctIdx)?.status ?? customer.status)
    : customer.status;
  const isDormant = activeAcctStatus === "dormant";

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
  const totalDocs = docsForSection.length;
  const sCfg     = statusStyle[customer.status] ?? "bg-slate-100 text-slate-500";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {viewer && (
        <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} isDormant={isDormant} />
      )}

      <div className="flex flex-col h-full">
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{customer.full_name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase flex-shrink-0 ${sCfg}`}>
              {customer.status}
            </span>
            {isDormant && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300 flex-shrink-0">
                Dormant
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 ml-3">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Profile card ─────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-4 mb-4">
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
                <h3 className="text-lg font-bold text-white truncate">{customer.full_name}</h3>
                {(isJoint || isCorporate) && holders.length > 0 && (
                  <p className="text-xs text-white/50 mt-0.5 truncate">
                    + {holders.map((h) => `${h.lastname} ${h.firstname}`).join(", ")}
                  </p>
                )}
                <p className="text-[10px] text-white/40 mt-0.5">{customerId(customer.id)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <HiOutlineCreditCard className="w-3.5 h-3.5" />
                    {customer.account_type}{isJoint ? ` · ${allHolders.length} holders` : ""}{isCorporate ? ` · ${allHolders.length} signatories` : ""}
                  </span>
                  {!isJoint && !isCorporate && customer.risk_level && (
                    <span className="flex items-center gap-1">
                      <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                      {customer.risk_level}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <HiOutlineOfficeBuilding className="w-3.5 h-3.5" />
                    {customer.branch?.branch_name ?? "—"}
                  </span>
                  {customer.account_no && (
                    <span className="flex items-center gap-1">
                      <HiOutlineDocumentText className="w-3.5 h-3.5" />
                      {customer.account_no}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Joint holders */}
            {isJoint && allHolders.length > 1 && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Account Holders</p>
                {allHolders.map((h) => (
                  <div key={h.person_index} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 ${h.person_index === 1 ? "bg-blue-600" : "bg-purple-600"}`}>
                      {h.person_index}
                    </div>
                    <p className="text-xs text-white/80 font-medium flex-1 min-w-0 truncate">
                      {h.firstname}{h.middlename ? ` ${h.middlename}` : ""} {h.lastname}{h.suffix ? ` ${h.suffix}` : ""}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${riskStyle[h.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
                      {h.risk_level}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Customer Details card ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <HiOutlineInformationCircle className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Customer Details</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { icon: HiOutlineUser,           label: "Full Name",    value: customer.full_name },
                { icon: HiOutlineCreditCard,      label: "Account Type", value: customer.account_type },
                ...(isJoint ? [{ icon: HiOutlineTag, label: "Joint Sub Type", value: customer.joint_sub_type ?? "—" }] : []),
                { icon: HiOutlineDocumentText,    label: "Account No.",  value: customer.account_no ?? "—" },
                ...(!isJoint && !isCorporate ? [{ icon: HiOutlineShieldCheck, label: "Risk Level", value: customer.risk_level ?? "—" }] : []),
                { icon: HiOutlineCalendar,        label: "Date Opened",  value: customer.date_opened ? formatDate(customer.date_opened) : "—" },
                { icon: HiOutlineOfficeBuilding,  label: "Branch",       value: customer.branch?.branch_name ?? "—" },
                { icon: HiOutlineCalendar,        label: "Date Added",   value: formatDate(customer.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-slate-800 truncate">{value}</p>
                  </div>
                </div>
              ))}

              {/* Status field — multi-account shows per-account badges */}
              <div className="flex items-start gap-2">
                <HiOutlineShieldCheck className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  {showAccountTabs ? (
                    <div className="space-y-1">
                      {allAccounts.map((acct) => (
                        <div key={acct.acctIndex} className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">{acct.acctIndex}</span>
                          <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{acct.account_no ?? "—"}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${statusStyle[acct.status] ?? "bg-slate-100 text-slate-500"}`}>{acct.status}</span>
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

              {/* Total docs */}
              <div className="flex items-start gap-2">
                <HiOutlineDocumentText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Documents</p>
                  <p className="text-xs font-semibold text-slate-800">{totalDocs} file{totalDocs !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Account tabs — shown when customer has 2+ accounts (non-Joint) */}
          {showAccountTabs && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Account</p>
              </div>
              <div className="flex gap-2 overflow-x-auto px-4 py-3 pb-3.5">
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
                        isActive ? "bg-white/20 text-white" : (statusStyle[acct.status] ?? "bg-slate-100 text-slate-500")
                      }`}>
                        {acct.status ?? "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Documents section ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
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
                  Dormant — blurred
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400">{totalDocs} file{totalDocs !== 1 ? "s" : ""}</span>
            </div>

            <div className="px-5 py-5 space-y-6">
              {DOC_SECTIONS.map((sec) => {
                const secDocs = docsForSection.filter((d) => d.document_type === sec.front || d.document_type === sec.back);
                return (
                  <div key={sec.key}>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{sec.label}</p>
                    {secDocs.length === 0 ? (
                      <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <HiOutlinePhotograph className="w-4 h-4 text-slate-300" />
                        <p className="text-sm text-slate-400">No documents uploaded</p>
                      </div>
                    ) : (
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

              {/* Other docs */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Other Documents</p>
                {otherDocs.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {otherDocs.map((doc, i) => (
                      <button key={doc.id}
                        onClick={() => {
                          const { images } = buildImages();
                          const otherStart = images.findIndex((img) => img.src === storageUrl(doc.file_path));
                          setViewer({ images, index: Math.max(otherStart, 0) });
                        }}
                        className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm"
                      >
                        <img src={storageUrl(doc.file_path)} alt={`Other ${i + 1}`} className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/90 rounded-full p-1.5 shadow">
                            <HiOutlineEye className="w-4 h-4 text-slate-700" />
                          </div>
                        </div>
                      </button>
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

          {/* ── Status Change History ─────────────────────────────────────── */}
          {(historyLogsForAcct.length > 0 || historyLegacyGroupsForAcct.length > 0 || showInitialForAcct) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
                <HiOutlineCalendar className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Status Change History</h2>
                {showAccountTabs && activeAcctObj && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    <HiOutlineCreditCard className="w-3 h-3" />
                    {activeAcctObj.account_no ?? `Account ${activeAcctIdx}`}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {historyLogsForAcct.length + historyLegacyGroupsForAcct.length + (showInitialForAcct ? 1 : 0)} change{
                    (historyLogsForAcct.length + historyLegacyGroupsForAcct.length + (showInitialForAcct ? 1 : 0)) !== 1 ? "s" : ""
                  }
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {historyLogsForAcct.map((log) => {
                  const logKey     = `log-${log.id}`;
                  const isExpanded = historyExpanded[logKey] ?? false;
                  const logDocs    = log.documents ?? [];
                  const changer    = log.changed_by
                    ? (log.changed_by.full_name || `${log.changed_by.lastname ?? ""} ${log.changed_by.firstname ?? ""}`.trim() || log.changed_by.username)
                    : null;
                  return (
                    <div key={log.id}>
                      <button
                        onClick={() => setHistoryExpanded((prev) => ({ ...prev, [logKey]: !isExpanded }))}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${statusStyle[log.status] ?? "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          {log.status}
                        </span>
                        <div className="flex-1 min-w-0">
                          {log.previous_status && (
                            <p className="text-[10px] text-slate-400 mb-0.5">
                              <span className="font-semibold">{log.previous_status}</span> → <span className="font-semibold text-slate-700">{log.status}</span>
                            </p>
                          )}
                          <p className="text-xs text-slate-500 truncate">
                            {formatDate(log.created_at)}
                            {changer && <span className="text-slate-400"> · {changer}</span>}
                            {logDocs.length > 0 && <span className="ml-1.5 text-blue-500 font-semibold">· {logDocs.length} doc{logDocs.length !== 1 ? "s" : ""}</span>}
                            {logDocs.length === 0 && <span className="ml-1.5 text-slate-300">· no documents</span>}
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
                                const fDocs = logDocs.filter((d) => d.document_type === sec.front);
                                const bDocs = logDocs.filter((d) => d.document_type === sec.back);
                                if (!fDocs.length && !bDocs.length) return null;
                                const personsInLog = [...new Set([...fDocs, ...bDocs].map((d) => d.person_index))].sort();
                                return (
                                  <div key={sec.key} className="mb-5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.label}</p>
                                    {personsInLog.map((pi) => {
                                      const fDoc = fDocs.find((d) => d.person_index === pi);
                                      const bDoc = bDocs.find((d) => d.person_index === pi);
                                      return (
                                        <div key={pi} className="mb-3">
                                          {personsInLog.length > 1 && <p className="text-[10px] text-slate-400 mb-1">{holderName(pi)}</p>}
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
                              {logDocs.filter((d) => d.document_type === "other").length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Other Documents</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {logDocs.filter((d) => d.document_type === "other").map((doc) => (
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
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

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
                                  {[{ docs: fDocs, side: "Front" }, { docs: bDocs, side: "Back" }].map(({ docs: sd, side }) => (
                                    <div key={side}>
                                      <p className="text-[10px] text-slate-400 mb-1">{side}</p>
                                      {sd.length > 0 ? sd.map((doc) => (
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
                        </div>
                      )}
                    </div>
                  );
                })}

                {showInitialForAcct && (() => {
                  const initKey    = "initial-upload";
                  const isExpanded = historyExpanded[initKey] ?? false;
                  const initDate   = initialDocsForHistory.reduce((latest, d) => (!latest || d.created_at > latest ? d.created_at : latest), null);
                  return (
                    <div key={initKey}>
                      <button
                        onClick={() => setHistoryExpanded((prev) => ({ ...prev, [initKey]: !isExpanded }))}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${statusStyle[initialStatus] ?? "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                          {initialStatus ?? "active"}
                        </span>
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
                            const fDocs = initialDocsForHistory.filter((d) => d.document_type === sec.front);
                            const bDocs = initialDocsForHistory.filter((d) => d.document_type === sec.back);
                            if (!fDocs.length && !bDocs.length) return null;
                            const piList = [...new Set([...fDocs, ...bDocs].map((d) => d.person_index))].sort();
                            return (
                              <div key={sec.key} className="mb-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.label}</p>
                                {piList.map((pi) => {
                                  const fDoc = fDocs.find((d) => d.person_index === pi);
                                  const bDoc = bDocs.find((d) => d.person_index === pi);
                                  return (
                                    <div key={pi} className="mb-3">
                                      {piList.length > 1 && <p className="text-[10px] text-slate-400 mb-1">{holderName(pi)}</p>}
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
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

// ── Skeleton row ────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 rounded-full bg-slate-200" style={{ width: `${60 + (i % 3) * 20}%` }} />
      </td>
    ))}
  </tr>
);

// ── Shared modal save helper ─────────────────────────────────────────────────
const useModalSave = (customerId, onSaved, onClose) => {
  const [saving, setSaving] = useState(false);

  const save = async (payload) => {
    setSaving(true);
    try {
      await api.put(`/customers/${customerId}`, payload);
      await Swal.fire({
        icon: "success",
        title: "Customer Updated",
        text: "Changes have been saved.",
        confirmButtonColor: "#2563eb",
        timer: 2000,
        timerProgressBar: true,
      });
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Something went wrong.";
      Swal.fire({ icon: "error", title: "Update Failed", text: msg, confirmButtonColor: "#dc2626" });
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
};

// ── Overlay wrapper ───────────────────────────────────────────────────────────
const ModalOverlay = ({ onClose, children }) => {
  const overlayRef = useRef(null);
  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ── Edit Info Modals (CustomerProfiles) ───────────────────────────────────────
const RISK_LEVELS_EDIT = ["Low Risk", "Medium Risk", "High Risk"];

const emptyHolder = () => ({ firstname: "", middlename: "", lastname: "", suffix: "", risk_level: "Low Risk" });

const editInputCls = "w-full px-3 py-2.5 text-sm text-gray-900 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

const ProfileModalShell = ({ title, subtitle, onClose, onBack, children, onSave, saving }) => (
  <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-white/70">{subtitle}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <HiOutlineX className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">{children}</div>
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
        {onBack
          ? <button onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <HiOutlineChevronLeft className="w-4 h-4" /> Back
            </button>
          : <span />
        }
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          {onSave && (
            <button onClick={onSave} disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow hover:opacity-90 disabled:opacity-60 transition-all">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  </ModalOverlay>
);

// Choice modal — ask what to edit
const EditChoiceModal = ({ customer, onClose, onPick }) => (
  <ProfileModalShell
    title="Edit Info"
    subtitle={`${customerId(customer.id)} • ${customer.full_name}`}
    onClose={onClose}
  >
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
          <p className="text-[11px] text-slate-400 mt-0.5">Name, account type, holders</p>
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
          <p className="text-[11px] text-slate-400 mt-0.5">Risk level, account no., dates</p>
        </div>
      </button>
    </div>
  </ProfileModalShell>
);

// Edit customer personal info — name, account type, holders
const EditCustomerInfoModal = ({ customer, onClose, onSaved, onBack }) => {
  const [form, setForm] = useState({
    firstname:    customer.firstname    ?? "",
    middlename:   customer.middlename   ?? "",
    lastname:     customer.lastname     ?? "",
    suffix:       customer.suffix       ?? "",
    account_type: customer.account_type ?? "Regular",
  });
  const [holders, setHolders] = useState(
    (customer.holders ?? []).map((h) => ({
      firstname:  h.firstname,
      middlename: h.middlename ?? "",
      lastname:   h.lastname,
      suffix:     h.suffix ?? "",
      risk_level: h.risk_level,
    }))
  );
  const { saving, save } = useModalSave(customer.id, onSaved, onClose);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setHolder = (i, field, val) =>
    setHolders((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: val } : h)));
  const isJoint = form.account_type === "Joint";

  const handleSave = () => {
    const payload = { ...form };
    if (isJoint) {
      payload.additionalPersons = holders.map((h) => ({
        firstname: h.firstname, middlename: h.middlename,
        lastname: h.lastname, suffix: h.suffix, risk_level: h.risk_level,
      }));
    }
    save(payload);
  };

  return (
    <ProfileModalShell
      title="Edit Customer Info"
      subtitle={`${customerId(customer.id)} • ${customer.full_name}`}
      onClose={onClose}
      onBack={onBack}
      onSave={handleSave}
      saving={saving}
    >
      {/* Account Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Account Type</label>
        <select value={form.account_type} onChange={set("account_type")} className={editInputCls}>
          <option>Regular</option>
          <option>Joint</option>
          <option>Corporate</option>
        </select>
      </div>

      {/* Primary holder */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">1</div>
          <p className="text-xs font-bold text-slate-700">{isJoint ? "Person 1 — Primary Account Holder" : "Account Holder"}</p>
        </div>
        <div className="pl-3 border-l-2 border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
              <input value={form.firstname} onChange={set("firstname")} className={editInputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
              <input value={form.lastname} onChange={set("lastname")} className={editInputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Middle Name</label>
              <input value={form.middlename} onChange={set("middlename")} className={editInputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Suffix</label>
              <input value={form.suffix} onChange={set("suffix")} placeholder="Jr., Sr., III…" className={editInputCls} />
            </div>
          </div>
        </div>
      </div>

      {/* Additional holders for Joint */}
      {isJoint && (
        <div className="space-y-4">
          {holders.map((h, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">{i + 2}</div>
                <p className="text-xs font-bold text-slate-700">Person {i + 2} — Secondary Account Holder</p>
                {holders.length > 1 && (
                  <button type="button" onClick={() => setHolders((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-auto text-[11px] font-medium text-red-500 hover:text-red-700">Remove</button>
                )}
              </div>
              <div className="pl-3 border-l-2 border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
                    <input value={h.firstname} onChange={(e) => setHolder(i, "firstname", e.target.value)} className={editInputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
                    <input value={h.lastname} onChange={(e) => setHolder(i, "lastname", e.target.value)} className={editInputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Middle Name</label>
                    <input value={h.middlename} onChange={(e) => setHolder(i, "middlename", e.target.value)} className={editInputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Suffix</label>
                    <input value={h.suffix} onChange={(e) => setHolder(i, "suffix", e.target.value)} placeholder="Jr., Sr., III…" className={editInputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Level</label>
                  <select value={h.risk_level} onChange={(e) => setHolder(i, "risk_level", e.target.value)} className={editInputCls}>
                    {RISK_LEVELS_EDIT.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button type="button"
            onClick={() => setHolders((prev) => [...prev, emptyHolder()])}
            className="flex items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-800 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl px-4 py-2.5 w-full justify-center transition-all">
            <HiOutlineUsers className="w-4 h-4" />
            Add Another Holder
          </button>
        </div>
      )}
    </ProfileModalShell>
  );
};

// Edit account details — risk level, account no., dates (no status)
const EditAccountInfoModal = ({ customer, onClose, onSaved, onBack }) => {
  // Build all accounts list
  const allAccounts = [
    { id: null, type: "primary", label: "Primary Account", account_no: customer.account_no, risk_level: customer.risk_level, date_opened: customer.date_opened, date_updated: customer.date_updated, status: customer.status },
    ...(customer.accounts ?? []).map((a, i) => ({
      id: a.id, type: "additional", label: `Account ${i + 2}`,
      account_no: a.account_no, risk_level: a.risk_level,
      date_opened: a.date_opened, date_updated: a.date_updated, status: a.status,
    })),
  ];

  const isMulti = allAccounts.length > 1;

  const [step, setStep] = useState(isMulti ? "select" : "edit");
  const [selectedAcct, setSelectedAcct] = useState(isMulti ? null : allAccounts[0]);
  const [saving, setSaving] = useState(false);

  const initForm = (acct) => ({
    risk_level:   acct.risk_level   ?? "Low Risk",
    account_no:   acct.account_no   ?? "",
    date_opened:  acct.date_opened  ? acct.date_opened.substring(0, 10)  : "",
    date_updated: acct.date_updated ? acct.date_updated.substring(0, 10) : "",
  });

  const [form, setForm] = useState(isMulti ? null : initForm(allAccounts[0]));

  const handleSelectAcct = (acct) => {
    setSelectedAcct(acct);
    setForm(initForm(acct));
    setStep("edit");
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedAcct.type === "primary") {
        await api.put(`/customers/${customer.id}`, form);
      } else {
        await api.put(`/customers/${customer.id}/accounts/${selectedAcct.id}`, form);
      }
      await Swal.fire({
        icon: "success", title: "Account Updated", text: "Changes have been saved.",
        confirmButtonColor: "#2563eb", timer: 2000, timerProgressBar: true,
      });
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Something went wrong.";
      Swal.fire({ icon: "error", title: "Update Failed", text: msg, confirmButtonColor: "#dc2626" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalShell
      title={step === "select" ? "Select Account" : "Edit Account Info"}
      subtitle={`${customerId(customer.id)} • ${customer.full_name}`}
      onClose={onClose}
      onBack={step === "select" ? onBack : (isMulti ? () => setStep("select") : onBack)}
      onSave={step === "edit" ? handleSave : null}
      saving={saving}
    >
      {/* Step: account picker */}
      {step === "select" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium">Which account would you like to edit?</p>
          {allAccounts.map((acct, i) => (
            <button
              key={acct.id ?? "primary"}
              onClick={() => handleSelectAcct(acct)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
            >
              <span className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800">{acct.label}</span>
                  {acct.type === "primary" && (
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Primary</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{acct.account_no ?? "No account no."}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle[acct.status] ?? "bg-slate-100 text-slate-500"}`}>{acct.status ?? "—"}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">{acct.risk_level ?? "—"}</p>
              </div>
              <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Step: edit form */}
      {step === "edit" && form && (
        <>
          {isMulti && (
            <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-[11px] text-slate-500">Editing: <span className="font-bold text-slate-800">{selectedAcct.label}</span>
                {selectedAcct.account_no && <span className="font-mono ml-1">({selectedAcct.account_no})</span>}
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Level</label>
            <select value={form.risk_level} onChange={set("risk_level")} className={editInputCls}>
              {RISK_LEVELS_EDIT.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Account No.</label>
              <input value={form.account_no} onChange={set("account_no")} placeholder="e.g. 1234-5678-9012" maxLength={100} className={editInputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date Opened</label>
              <input type="date" value={form.date_opened} onChange={set("date_opened")} className={editInputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date Updated <span className="font-normal text-slate-400">(Optional)</span></label>
            <input type="date" value={form.date_updated} onChange={set("date_updated")} className={editInputCls} />
          </div>
        </>
      )}
    </ProfileModalShell>
  );
};

// ── Edit Status Modal ─────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["active", "reactivated", "dormant", "escheat", "closed"];

const STATUS_CONFIG = {
  active:      { label: "Active",      desc: "Account is open and operational.",            icon: "✓", ring: "ring-green-400",  bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  reactivated: { label: "Reactivated", desc: "Previously inactive account restored.",       icon: "↺", ring: "ring-teal-400",   bg: "bg-teal-50",   text: "text-teal-700",   dot: "bg-teal-500"   },
  dormant:     { label: "Dormant",     desc: "No transactions for an extended period.",     icon: "◷", ring: "ring-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  escheat:     { label: "Escheat",     desc: "Funds transferred to the government.",        icon: "⚠", ring: "ring-orange-400", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  closed:      { label: "Closed",      desc: "Account has been permanently closed.",        icon: "✕", ring: "ring-red-400",    bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
};

const EditStatusModal = ({ customer, onClose, onSaved }) => {
  const navigate = useNavigate();

  // Build all accounts: primary first, then additional
  const allAccounts = [
    { id: null, type: "primary", account_no: customer.account_no, status: customer.status, label: "Primary Account" },
    ...(customer.accounts ?? []).map((a, i) => ({
      id: a.id, type: "additional", account_no: a.account_no, status: a.status, label: `Account ${i + 2}`,
    })),
  ];

  const isMulti = allAccounts.length > 1;

  // step: "select" | "pick" | "upload_select"
  const [step, setStep]               = useState(isMulti ? "select" : "pick");
  const [selectedAcct, setSelectedAcct] = useState(isMulti ? null : allAccounts[0]);
  const [status, setStatus]           = useState(isMulti ? null : (customer.status ?? "active"));
  const [saving, setSaving]           = useState(false);
  const [newStatus, setNewStatus]     = useState(null);
  const [statusLogId, setStatusLogId] = useState(null);
  const [uploadTypes, setUploadTypes] = useState({ sigcard: false, nais: false, privacy: false, other: false });

  const handleSelectAcct = (acct) => {
    setSelectedAcct(acct);
    setStatus(acct.status ?? "active");
    setStep("pick");
  };

  const isUnchanged = status === selectedAcct?.status;
  const isEscheat   = selectedAcct?.status === "escheat";
  const selected    = STATUS_CONFIG[status];

  const toggleUploadType = (key) =>
    setUploadTypes((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    if (status === "escheat") {
      const confirm = await Swal.fire({
        icon: "warning",
        title: "Set Account to Escheat?",
        html: `
          <p style="margin-bottom:10px;color:#374151;font-size:14px;">
            You are about to mark this account as <strong style="color:#ea580c;">Escheat</strong>.
          </p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;text-align:left;font-size:13px;color:#92400e;line-height:1.6;">
            <strong>⚠ What happens after this update:</strong>
            <ul style="margin-top:6px;padding-left:18px;">
              <li>The account will be permanently locked.</li>
              <li>The status <strong>cannot be changed</strong> back to any other status.</li>
            </ul>
          </div>
          <p style="margin-top:12px;font-size:12px;color:#6b7280;">This action is irreversible. Make sure this is correct before proceeding.</p>
        `,
        showCancelButton: true,
        confirmButtonText: "Yes, Set as Escheat",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ea580c",
        cancelButtonColor: "#6b7280",
        reverseButtons: true,
      });
      if (!confirm.isConfirmed) return;
    }

    setSaving(true);
    try {
      let res;
      if (selectedAcct.type === "primary") {
        res = await api.put(`/customers/${customer.id}`, { status });
      } else {
        res = await api.put(`/customers/${customer.id}/accounts/${selectedAcct.id}`, { status });
      }
      onSaved();

      if (status === "escheat") {
        await Swal.fire({
          icon: "success",
          title: "Status Updated",
          text: "Account has been marked as Escheat.",
          confirmButtonColor: "#ea580c",
          timer: 2000,
          timerProgressBar: true,
        });
        onClose();
        return;
      }

      setNewStatus(status);
      setStatusLogId(res.data?.status_log_id ?? null);
      setStep("upload_select");
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Something went wrong.";
      Swal.fire({ icon: "error", title: "Update Failed", text: msg, confirmButtonColor: "#dc2626" });
    } finally {
      setSaving(false);
    }
  };

  const handleGoToUpload = () => {
    const chosen = Object.entries(uploadTypes).filter(([, v]) => v).map(([k]) => k);
    onClose();
    if (chosen.length > 0) {
      const params = new URLSearchParams({ upload: chosen.join(","), newStatus });
      if (statusLogId) params.set("statusLogId", statusLogId);
      navigate(`/user/customers/${customer.id}/view?${params.toString()}`);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {step === "select" ? "Select Account" : "Update Account Status"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{customer.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Select which account */}
        {step === "select" && (
          <div className="px-6 py-5 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Which account's status would you like to change?
            </p>
            {allAccounts.map((acct, i) => {
              const acctIsEscheat = acct.status === "escheat";
              return (
                <button
                  key={acct.id ?? "primary"}
                  onClick={acctIsEscheat ? undefined : () => handleSelectAcct(acct)}
                  disabled={acctIsEscheat}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left group
                    ${acctIsEscheat
                      ? "border-orange-200 bg-orange-50 cursor-not-allowed opacity-80"
                      : "border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                    }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${acctIsEscheat ? "bg-orange-400" : "bg-blue-600"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{acct.label}</span>
                      {acct.type === "primary" && (
                        <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Primary</span>
                      )}
                      {acctIsEscheat && (
                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Locked</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{acct.account_no ?? "No account no."}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${statusStyle[acct.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {acct.status ?? "—"}
                  </span>
                  {acctIsEscheat
                    ? <HiOutlineLockClosed className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    : <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  }
                </button>
              );
            })}
          </div>
        )}

        {/* Step: Pick new status */}
        {step === "pick" && (
          <>
            {/* Back button for multi */}
            {isMulti && (
              <div className="px-6 pt-4 pb-0">
                <button
                  onClick={() => setStep("select")}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <HiOutlineChevronLeft className="w-3.5 h-3.5" /> Back to account selection
                </button>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Changing status for: <span className="text-slate-800 font-bold">{selectedAcct.label}</span>
                  {selectedAcct.account_no && <span className="font-mono ml-1">({selectedAcct.account_no})</span>}
                </p>
              </div>
            )}

            {/* Current status indicator */}
            <div className="px-6 pt-4 pb-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Status</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[selectedAcct.status]?.dot ?? "bg-slate-400"}`} />
                <span className="text-sm font-semibold text-slate-700 capitalize">{selectedAcct.status}</span>
              </div>
            </div>

            {/* Status options / escheat lock */}
            <div className="px-6 pt-4 pb-5 space-y-2">
              {isEscheat ? (
                <div className="flex items-start gap-3 px-4 py-4 rounded-2xl bg-orange-50 border-2 border-orange-200">
                  <HiOutlineLockClosed className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-700">Status Locked</p>
                    <p className="text-xs text-orange-500 mt-1">
                      This account has been marked <strong>Escheat</strong>. Escheat accounts are permanently locked and their status cannot be changed.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Select New Status</p>
                  {STATUS_OPTIONS.map((s) => {
                    const cfg       = STATUS_CONFIG[s];
                    const isActive  = status === s;
                    const isCurrent = selectedAcct.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all text-left
                          ${isActive
                            ? `${cfg.bg} ${cfg.ring} ring-2 border-transparent shadow-sm`
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                          ${isActive ? `${cfg.dot} border-transparent` : "border-slate-300 bg-white"}`}>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold capitalize ${isActive ? cfg.text : "text-slate-700"}`}>{cfg.label}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Current</span>
                            )}
                          </div>
                          <p className={`text-[11px] mt-0.5 ${isActive ? cfg.text + "/70" : "text-slate-400"}`}>{cfg.desc}</p>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400">
                {isEscheat
                  ? <span className="flex items-center gap-1 text-orange-500"><HiOutlineLockClosed className="w-3.5 h-3.5" /> Status locked — Escheat</span>
                  : isUnchanged
                    ? "No changes made"
                    : <span>Changing to <strong className={`capitalize ${selected?.text}`}>{status}</strong></span>
                }
              </p>
              <div className="flex items-center gap-2.5">
                <button onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || isUnchanged || isEscheat}
                  className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow transition-all disabled:opacity-50 disabled:shadow-none bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90">
                  {saving ? "Saving…" : "Confirm Update"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step: Upload document type selection */}
        {step === "upload_select" && (
          <>
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusStyle[newStatus] ?? "bg-slate-100 text-slate-600"}`}>
                  {newStatus}
                </span>
                <span className="text-xs text-slate-500">status saved successfully</span>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-2">Upload new documents?</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Select which documents to upload for this status change. They will be added to the customer&apos;s history.
              </p>
            </div>

            <div className="px-6 py-4 space-y-2">
              {[
                { key: "sigcard", label: "Signature Card", desc: "Front & Back" },
                { key: "nais",    label: "NAIS",           desc: "Front & Back" },
                { key: "privacy", label: "Data Privacy",   desc: "Front & Back" },
                { key: "other",   label: "Other Documents",desc: "Any additional files" },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => toggleUploadType(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left
                    ${uploadTypes[key]
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${uploadTypes[key] ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}>
                    {uploadTypes[key] && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${uploadTypes[key] ? "text-blue-700" : "text-slate-700"}`}>{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                Skip for now
              </button>
              <button onClick={handleGoToUpload}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90 transition-all">
                {Object.values(uploadTypes).some(Boolean) ? "Go to Upload" : "Done"}
              </button>
            </div>
          </>
        )}

        {/* Footer for select step */}
        {step === "select" && (
          <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
};



// ── Main component ───────────────────────────────────────────────────────────
const CustomerProfiles = ({ basePath = '/user', defaultTab = 'table', onlyTab = null, branchScoped = false }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('edit-customers');

  const initialTab = onlyTab ?? (searchParams.get("tab") ?? defaultTab);
  const [activeTab, setActiveTab]         = useState(initialTab);

  // Table view
  const [customers, setCustomers]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [tableSearch, setTableSearch]     = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter]     = useState("all");
  const [branchFilter, setBranchFilter]           = useState("all");
  const [sortDir, setSortDir]             = useState("asc");
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [total, setTotal]                 = useState(0);

  // Manager branch list (mother + children) — only populated when manager has child branches
  const [branchOptions, setBranchOptions] = useState([]);

  // Edit modals
  const [editInfoCustomer, setEditInfoCustomer]       = useState(null);
  const [editInfoMode, setEditInfoMode]               = useState(null); // "choice" | "customer" | "account"
  const [editStatusCustomer, setEditStatusCustomer]   = useState(null);

  // Quick search
  const [quickQuery, setQuickQuery]               = useState("");
  const [quickResults, setQuickResults]           = useState([]);
  const [quickLoading, setQuickLoading]           = useState(false);
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [showDropdown, setShowDropdown]           = useState(false);
  const searchContainerRef                        = useRef(null);
  const [showThumbmarkSearch, setShowThumbmarkSearch] = useState(false);

  const showAllBranchesFilter = basePath === "/admin" || basePath === "/compliance";

  // ── Fetch branch + children for branch filter (manager & cashier) ─────────
  useEffect(() => {
    if (!branchScoped || !user?.branch_id) return;
    api.get("/branches").then(({ data }) => {
      const all = data.data ?? [];
      const children = all.filter((b) => b.parent_id === user.branch_id);
      if (children.length === 0) return; // no children → no dropdown
      const mother = all.find((b) => b.id === user.branch_id);
      setBranchOptions([
        { id: mother?.id ?? user.branch_id, branch_name: (mother?.branch_name ?? "My Branch") + " (Mother)" },
        ...children,
      ]);
    }).catch(() => {});
  }, [branchScoped, user?.branch_id]);

  // ── Fetch all branches for branch filter (admin & compliance) — excludes Head Office ───
  useEffect(() => {
    if (!showAllBranchesFilter) return;
    api.get("/branches").then(({ data }) => {
      const all = data.data ?? [];
      setBranchOptions(all.filter((b) => !b.is_head_office && b.brcode !== "00"));
    }).catch(() => {});
  }, [showAllBranchesFilter]);

  // ── Fetch table data ───────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: PAGE_SIZE };
      if (tableSearch)                params.search       = tableSearch;
      if (statusFilter !== "all")     params.status       = statusFilter;
      if (accountTypeFilter !== "all") params.account_type = accountTypeFilter;
      if (riskLevelFilter !== "all")  params.risk_level   = riskLevelFilter;
      if ((branchScoped || showAllBranchesFilter) && branchFilter !== "all") params.branch_id = branchFilter;

      const { data } = await api.get("/customers", { params });

      const items = [...(data.data ?? [])].sort((a, b) => {
        const cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
        return sortDir === "asc" ? cmp : -cmp;
      });

      setCustomers(items);
      setTotalPages(data.last_page ?? 1);
      setTotal(data.total ?? items.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, tableSearch, statusFilter, accountTypeFilter, riskLevelFilter, branchFilter, sortDir, branchScoped, showAllBranchesFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [tableSearch, statusFilter, accountTypeFilter, riskLevelFilter, branchFilter]);

  // ── Quick search (live) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!quickQuery.trim()) { setQuickResults([]); setShowDropdown(false); return; }
    setShowDropdown(true);

    const t = setTimeout(async () => {
      setQuickLoading(true);
      try {
        const { data } = await api.get("/customers", {
          params: { search: quickQuery, per_page: 15 },
        });
        setQuickResults(data.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setQuickLoading(false);
      }
    }, 100);

    return () => clearTimeout(t);
  }, [quickQuery]);

  // ── Click-outside to close dropdown ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 text-slate-900">
      {/* Edit Info Modals — hidden for cashier */}
      {canEdit && (
        <AnimatePresence>
          {editInfoCustomer && editInfoMode === "choice" && (
            <EditChoiceModal
              customer={editInfoCustomer}
              onClose={() => { setEditInfoCustomer(null); setEditInfoMode(null); }}
              onPick={(mode) => setEditInfoMode(mode)}
            />
          )}
          {editInfoCustomer && editInfoMode === "customer" && (
            <EditCustomerInfoModal
              customer={editInfoCustomer}
              onClose={() => { setEditInfoCustomer(null); setEditInfoMode(null); }}
              onSaved={fetchCustomers}
              onBack={() => setEditInfoMode("choice")}
            />
          )}
          {editInfoCustomer && editInfoMode === "account" && (
            <EditAccountInfoModal
              customer={editInfoCustomer}
              onClose={() => { setEditInfoCustomer(null); setEditInfoMode(null); }}
              onSaved={fetchCustomers}
              onBack={() => setEditInfoMode("choice")}
            />
          )}
        </AnimatePresence>
      )}

      {/* Edit Status Modal — hidden for cashier */}
      {canEdit && (
        <AnimatePresence>
          {editStatusCustomer && (
            <EditStatusModal
              customer={editStatusCustomer}
              onClose={() => setEditStatusCustomer(null)}
              onSaved={fetchCustomers}
            />
          )}
        </AnimatePresence>
      )}

      <main className="flex flex-col flex-1 w-full max-w-7xl gap-3 px-4 pt-3 pb-6 mx-auto sm:px-6 lg:px-8">

        {/* Header */}
        {onlyTab !== "quick" && (
          <div>
            <h1 className="text-lg font-bold text-slate-900">Customer Profiles</h1>
            <p className="text-xs text-slate-400">Signature card records for your branch</p>
          </div>
        )}

        {/* Tabs */}
        {!onlyTab && (
          <div className="flex flex-wrap gap-3">
            {[
              { key: "table", label: "Table View" },
              { key: "quick", label: "Quick Search" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setPage(1);
                  setSelectedCustomer(null);
                  setQuickQuery("");
                  setShowDropdown(false);
                }}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  activeTab === key
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── TABLE VIEW ──────────────────────────────────────────────────── */}
        {activeTab === "table" && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <section className="px-4 pt-4 pb-4 space-y-3 sm:px-5">

              {/* Filters */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search by name, account no., or branch…"
                    className="w-full pl-12 pr-4 py-3 text-sm text-gray-900 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div className="flex gap-3 flex-wrap">
                  {/* Status */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="reactivated">Reactivated</option>
                    <option value="dormant">Dormant</option>
                    <option value="escheat">Escheat</option>
                    <option value="closed">Closed</option>
                  </select>

                  {/* Account Type */}
                  <select
                    value={accountTypeFilter}
                    onChange={(e) => setAccountTypeFilter(e.target.value)}
                    className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Account Types</option>
                    <option value="Regular">Regular</option>
                    <option value="Joint">Joint</option>
                    <option value="Corporate">Corporate</option>
                  </select>

                  {/* Risk Level */}
                  <select
                    value={riskLevelFilter}
                    onChange={(e) => setRiskLevelFilter(e.target.value)}
                    className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="Low Risk">Low Risk</option>
                    <option value="Medium Risk">Medium Risk</option>
                    <option value="High Risk">High Risk</option>
                  </select>

                  {/* Branch — manager & cashier (only when they have child branches), and admin/compliance (all branches except Head Office) */}
                  {(branchScoped || showAllBranchesFilter) && branchOptions.length > 0 && (
                    <select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">All Branches</option>
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>{b.branch_name}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
                    className="px-5 py-3 text-sm font-semibold border-2 border-slate-200 rounded-xl text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    {sortDir === "asc" ? "↑ A–Z" : "↓ Z–A"}
                  </button>
                  <button
                    onClick={fetchCustomers}
                    className="px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
                    title="Refresh"
                  >
                    <HiOutlineRefresh className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Count */}
              <p className="text-sm text-slate-500 px-1">
                Showing <span className="font-bold text-slate-800">{customers.length}</span> of{" "}
                <span className="font-bold text-slate-800">{total}</span> customers
              </p>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                      {["Full Name", "Accounts", "Account Type", "Risk Level", "Status", "Date Added", "Action"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading
                      ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                      : customers.length === 0
                      ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-20 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                              <HiOutlineSearch className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="font-medium text-slate-600">No customers found</p>
                            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
                          </td>
                        </tr>
                      )
                      : customers.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          {/* Full Name */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                                {c.photo
                                  ? <img src={storageUrl(c.photo)} alt={c.full_names} className="w-full h-full object-cover" />
                                  : initials(c)
                                }
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-900 block truncate">{c.full_name ?? "—"}</span>
                                {c.account_type === "Joint" && c.holders?.length > 0 && (
                                  <span className="text-[10px] text-slate-400 truncate block">
                                    + {c.holders.map((h) => `${h.lastname} ${h.firstname}`).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Accounts */}
                          <td className="px-4 py-2.5">
                            <AccountsCell c={c} />
                          </td>
                          {/* Account Type */}
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${accountStyle[c.account_type] ?? "bg-slate-100 text-slate-600"}`}>
                              {c.account_type ?? "—"}
                            </span>
                          </td>
                          {/* Risk Level */}
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${riskStyle[c.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
                              {c.risk_level ?? "—"}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-2.5">
                            {(c.accounts?.length ?? 0) > 0 ? (
                              <span className="text-[10px] text-slate-400 font-medium">{c.accounts.length + 1} accounts</span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusStyle[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                                {c.status ?? "—"}
                              </span>
                            )}
                          </td>
                          {/* Date */}
                          <td className="px-4 py-2.5 text-[11px] text-slate-500">
                            {formatDate(c.created_at)}
                          </td>
                          {/* Action */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => navigate(`${basePath}/customers/${c.id}/view`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-400 transition-colors"
                                title="View customer details"
                              >
                                <HiOutlineEye className="w-3.5 h-3.5" />
                                View
                              </button>
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => { setEditInfoCustomer(c); setEditInfoMode("choice"); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors"
                                    title="Edit customer info"
                                  >
                                    <HiOutlinePencilAlt className="w-3.5 h-3.5" />
                                    Info
                                  </button>
                                  <button
                                    onClick={() => setEditStatusCustomer(c)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-400 transition-colors"
                                    title="Update status"
                                  >
                                    <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                                    Status
                                  </button>
                                  <button
                                    onClick={() => navigate(`${basePath}/customers/${c.id}/edit`)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
                                    title="Update documents"
                                  >
                                    <HiOutlineDocumentText className="w-3.5 h-3.5" />
                                    Docs
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-slate-100">
                <p className="text-sm text-slate-500">
                  Page <span className="font-bold text-slate-800">{page}</span> of{" "}
                  <span className="font-bold text-slate-800">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── QUICK SEARCH VIEW ───────────────────────────────────────────── */}
        {activeTab === "quick" && (
          <div className="space-y-4">

            {/* Search card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6">
              <div className="max-w-2xl mx-auto">

                {/* Label */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HiOutlineSearch className="w-4 h-4 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Customer Search</p>
                  </div>
                  <button
                    onClick={() => setShowThumbmarkSearch(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#053161] to-[#1877F2] text-white text-xs font-semibold shadow hover:opacity-90 transition-all"
                  >
                    <MdFingerprint className="w-4 h-4" />
                    Search by Thumbmark
                  </button>
                </div>

                {/* Input + dropdown wrapper */}
                <div className="relative" ref={searchContainerRef}>
                  <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                  {quickLoading && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin z-10" />
                  )}
                  {quickQuery && (
                    <button
                      onClick={() => { setQuickQuery(""); setSelectedCustomer(null); setShowDropdown(false); setQuickResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors z-10"
                    >
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  )}
                  <input
                    value={quickQuery}
                    onChange={(e) => { setQuickQuery(e.target.value); setSelectedCustomer(null); }}
                    onFocus={() => { if (quickResults.length > 0 && quickQuery.trim()) setShowDropdown(true); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && quickResults.length > 0) {
                        setSelectedCustomer(quickResults[0]);
                        setShowDropdown(false);
                        setQuickQuery("");
                      }
                    }}
                    placeholder="Type a customer name — results appear instantly…"
                    autoComplete="off"
                    className="w-full pl-12 pr-10 py-4 text-base text-gray-900 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />

                  {/* Auto-suggest dropdown */}
                  <AnimatePresence>
                    {showDropdown && quickQuery.trim() && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                      >
                        {quickResults.length === 0 && !quickLoading ? (
                          <div className="px-5 py-6 text-center">
                            <p className="text-sm font-semibold text-slate-600">No customers found</p>
                            <p className="text-xs text-slate-400 mt-1">Try a different spelling or partial name</p>
                          </div>
                        ) : (
                          <>
                            {quickResults.length > 0 && (
                              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  {quickResults.length} result{quickResults.length !== 1 ? "s" : ""} found
                                </p>
                              </div>
                            )}
                            <div className="max-h-72 overflow-y-auto">
                              {quickResults.map((c, i) => (
                                <motion.button
                                  key={c.id}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.02 }}
                                  onClick={() => { setSelectedCustomer(c); setShowDropdown(false); setQuickQuery(""); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors group"
                                >
                                  <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    {c.photo
                                      ? <img src={storageUrl(c.photo)} alt={c.full_name} className="w-full h-full object-cover" />
                                      : initials(c)
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700">{c.full_name}</p>
                                    <p className="text-xs text-slate-400 truncate">
                                      {c.account_no ? `Acct: ${c.account_no} · ` : ""}{c.branch?.branch_name ?? "No Branch"} · {c.account_type}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase flex-shrink-0 ${statusStyle[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                                    {c.status}
                                  </span>
                                  <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                                </motion.button>
                              ))}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Empty state (no query, no selection) */}
                {!quickQuery.trim() && !selectedCustomer && (
                  <div className="text-center py-10 mt-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-3">
                      <HiOutlineSearch className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="font-semibold text-slate-700">Search for a Customer</p>
                    <p className="text-sm text-slate-400 mt-1">Results appear instantly as you type — no Enter needed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Inline CustomerDetailView (shown below search when a customer is selected) */}
            <AnimatePresence>
              {selectedCustomer && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                  style={{ minHeight: "60vh" }}
                >
                  <CustomerDetailView customerId={selectedCustomer.id} onClose={() => setSelectedCustomer(null)} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </main>

      <ThumbmarkSearchModal
        isOpen={showThumbmarkSearch}
        onClose={() => setShowThumbmarkSearch(false)}
      />
    </div>
  );
};

export default CustomerProfiles;
