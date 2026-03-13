import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSearch,
  HiOutlineOfficeBuilding,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineUsers,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineCalendar,
  HiOutlinePhotograph,
} from "react-icons/hi";
import api from "../../services/api";

const PAGE_SIZE = 15;

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
  sigcard_front: "Sigcard Front",
  sigcard_back:  "Sigcard Back",
  nais_front:    "NAIS Front",
  nais_back:     "NAIS Back",
  privacy_front: "Data Privacy Front",
  privacy_back:  "Data Privacy Back",
  other:         "Other Document",
};

const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

const DOC_SECTIONS = [
  { key: "sigcard", label: "Signature Card", front: "sigcard_front", back: "sigcard_back" },
  { key: "nais",    label: "NAIS",           front: "nais_front",    back: "nais_back"    },
  { key: "privacy", label: "Data Privacy",   front: "privacy_front", back: "privacy_back" },
];

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const customerId = (id) => `C-${String(id).padStart(4, "0")}`;

const initials = (c) => ((c?.firstname?.[0] ?? "") + (c?.lastname?.[0] ?? "")).toUpperCase() || "?";

// ── Image Viewer ──────────────────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex = 0, onClose, isDormant = false }) => {
  const [idx, setIdx]   = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
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
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><HiOutlineZoomOut className="w-5 h-5" /></button>
          <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 5))} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><HiOutlineZoomIn className="w-5 h-5" /></button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors">Reset</button>
          <button onClick={onClose} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-2"><HiOutlineX className="w-5 h-5" /></button>
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden flex items-center justify-center relative"
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        {idx > 0 && (
          <button onClick={() => setIdx((i) => i - 1)} className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors border border-white/10">
            <HiOutlineChevronLeft className="w-6 h-6" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button onClick={() => setIdx((i) => i + 1)} className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors border border-white/10">
            <HiOutlineChevronRight className="w-6 h-6" />
          </button>
        )}
        <img
          src={cur.src} alt={cur.label} draggable={false}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.15s ease",
            maxWidth: "90vw", maxHeight: "75vh", objectFit: "contain",
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

// ── Customer Detail View (view-only) ─────────────────────────────────────────
const CustomerDetailView = ({ customerId: cid, onClose }) => {
  const [customer, setCustomer]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [viewer, setViewer]       = useState(null);
  const [activeAcctIdx, setActiveAcctIdx] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/customers/${cid}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [cid]);

  const buildImages = (startType = null, startPerson = null) => {
    if (!customer?.documents) return { images: [], index: 0 };
    const imgs = [];
    let startIdx = 0;

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
        <div className="w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
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

  const sCfg      = statusStyle[customer.status] ?? "bg-slate-100 text-slate-500";
  const docs      = customer.documents ?? [];
  const holders   = customer.holders   ?? [];
  const isJoint   = customer.account_type === "Joint";
  const isDormant = customer.status === "dormant";

  // Multi-account tabs (non-Joint only)
  const allAccounts = !isJoint ? [
    { account_no: customer.account_no, risk_level: customer.risk_level, date_opened: customer.date_opened, status: customer.status, acctIndex: 1 },
    ...(customer.accounts ?? []).map((a, i) => ({
      account_no: a.account_no, risk_level: a.risk_level, date_opened: a.date_opened, status: a.status, acctIndex: i + 2,
    })),
  ] : [];
  const showAccountTabs = allAccounts.length >= 2;
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

  return (
    <>
      {viewer && <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} isDormant={isDormant} />}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Customer Details</h2>
            {isDormant && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">Dormant</span>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Profile card */}
          <div className="bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                {initials(customer)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{customer.full_name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${sCfg}`}>{customer.status}</span>
                </div>
                {isJoint && holders.length > 0 && (
                  <p className="text-xs text-white/40 mt-0.5 truncate">+ {holders.map((h) => `${h.firstname} ${h.lastname}`).join(", ")}</p>
                )}
                <p className="text-xs text-white/50 mt-0.5">{customerId(customer.id)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: HiOutlineCreditCard,     label: "Account Type", value: `${customer.account_type}${isJoint ? ` · ${allHolders.length} holders` : ""}` },
                { icon: HiOutlineCreditCard,     label: "Account No.",  value: customer.account_no ?? "—" },
                ...(!isJoint ? [{ icon: HiOutlineShieldCheck, label: "Risk Level", value: customer.risk_level }] : []),
                { icon: HiOutlineOfficeBuilding, label: "Branch",       value: customer.branch?.branch_name ?? "—" },
                { icon: HiOutlineCalendar,       label: "Date Opened",  value: customer.date_opened ? formatDate(customer.date_opened) : "—" },
                { icon: HiOutlineCalendar,       label: "Date Added",   value: formatDate(customer.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
                    <p className="text-white/80 font-medium text-xs">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {isJoint && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Account Holders</p>
                {allHolders.map((h) => (
                  <div key={h.person_index} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 ${h.person_index === 1 ? "bg-[#1877F2]" : "bg-purple-600"}`}>
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

          {/* Account tabs — shown when customer has 2+ accounts (non-Joint) */}
          {showAccountTabs && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Account</p>
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {allAccounts.map((acct) => (
                  <button
                    key={acct.acctIndex}
                    onClick={() => setActiveAcctIdx(acct.acctIndex)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border-2 flex-shrink-0 ${
                      activeAcctIdx === acct.acctIndex
                        ? "bg-[#1877F2] text-white border-[#1877F2] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#1877F2]/50 hover:bg-blue-50"
                    }`}
                  >
                    <HiOutlineCreditCard className="w-3.5 h-3.5" />
                    <span>{acct.account_no ?? `Account ${acct.acctIndex}`}</span>
                    {acct.acctIndex === 1 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeAcctIdx === 1 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                        Primary
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document sections */}
          {DOC_SECTIONS.map((sec) => {
            const secDocs = docsForSection.filter((d) => d.document_type === sec.front || d.document_type === sec.back);
            if (secDocs.length === 0) return (
              <div key={sec.key}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{sec.label}</p>
                <div className="flex items-center gap-2 py-4 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                  <HiOutlinePhotograph className="w-5 h-5 text-slate-300" />
                  <p className="text-sm text-slate-400">No documents uploaded</p>
                </div>
              </div>
            );
            return (
              <div key={sec.key}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{sec.label}</p>
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
              </div>
            );
          })}

          {/* Other documents */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Other Documents</p>
            {otherDocs.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {otherDocs.map((doc, i) => (
                  <button key={doc.id}
                    onClick={() => {
                      const { images } = buildImages();
                      const otherStart = images.findIndex((img) => img.src === storageUrl(doc.file_path));
                      setViewer({ images, index: Math.max(otherStart, 0) });
                    }}
                    className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-[#1877F2] transition-all bg-slate-50 shadow-sm"
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
              <div className="flex items-center gap-2 py-4 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <HiOutlinePhotograph className="w-5 h-5 text-slate-300" />
                <p className="text-sm text-slate-400">No other documents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 rounded-full bg-slate-200" style={{ width: `${55 + (i % 4) * 15}%` }} />
      </td>
    ))}
  </tr>
);

// ── Detail panel overlay ──────────────────────────────────────────────────────
const ModalOverlay = ({ onClose, children }) => {
  const ref = useRef(null);
  return (
    <div ref={ref} onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}>
        {children}
      </motion.div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminCustomerProfiles = ({ basePath = '/admin' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState("table");

  // Table state
  const [customers, setCustomers]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [tableSearch, setTableSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [sortDir, setSortDir]           = useState("asc");
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [branches, setBranches]         = useState([]);

  // Quick search
  const [quickQuery, setQuickQuery]     = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickSelected, setQuickSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef              = useRef(null);

  // Load branch list once
  useEffect(() => {
    api.get("/branches").then(({ data }) => setBranches(data.data ?? [])).catch(() => {});
  }, []);

  // Fetch table data
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: PAGE_SIZE };
      if (tableSearch)            params.search    = tableSearch;
      if (statusFilter !== "all") params.status    = statusFilter;
      if (branchFilter)           params.branch_id = branchFilter;

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
  }, [page, tableSearch, statusFilter, branchFilter, sortDir]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [tableSearch, statusFilter, branchFilter]);

  // Quick search live
  useEffect(() => {
    if (!quickQuery.trim()) { setQuickResults([]); setShowDropdown(false); return; }
    setShowDropdown(true);

    const t = setTimeout(async () => {
      setQuickLoading(true);
      try {
        const { data } = await api.get("/customers", { params: { search: quickQuery, per_page: 15 } });
        setQuickResults(data.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setQuickLoading(false);
      }
    }, 100);

    return () => clearTimeout(t);
  }, [quickQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const TABLE_HEADERS = ["Full Name", "Account No.", "Account Type", "Risk Level", "Branch", "Status", "Date Added", "Action"];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)" }} />
        <div className="relative">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Customer Profiles</h1>
          <p className="mt-1.5 text-base text-blue-200">View all customer signature card records across all branches</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: "table", label: "Table View" },
          { key: "quick", label: "Quick Search" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setPage(1); setQuickSelected(null); setQuickQuery(""); setShowDropdown(false); }}
            className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === key
                ? "bg-gradient-to-r from-[#1877F2] to-[#0D4EA8] text-white shadow-lg"
                : "bg-white border-2 border-slate-200 text-slate-700 hover:border-[#1877F2]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TABLE VIEW ─────────────────────────────────────────────────────── */}
      {activeTab === "table" && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <section className="px-4 pt-4 pb-4 space-y-3 sm:px-5">

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search by name, account no.…"
                  className="w-full pl-12 pr-4 py-3 text-sm text-gray-900 border-2 border-slate-200 rounded-xl focus:border-[#1877F2] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white text-gray-900 focus:border-[#1877F2] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="reactivated">Reactivated</option>
                <option value="dormant">Dormant</option>
                <option value="escheat">Escheat</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white text-gray-900 focus:border-[#1877F2] focus:outline-none"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
              <button
                onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
                className="px-5 py-3 text-sm font-semibold border-2 border-slate-200 rounded-xl text-slate-700 hover:border-[#1877F2] hover:bg-blue-50 transition-all"
              >
                {sortDir === "asc" ? "↑ A–Z" : "↓ Z–A"}
              </button>
              <button
                onClick={fetchCustomers}
                className="px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-600 hover:border-[#1877F2] hover:bg-blue-50 transition-all"
                title="Refresh"
              >
                <HiOutlineRefresh className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-500 px-1">
              Showing <span className="font-bold text-slate-800">{customers.length}</span> of{" "}
              <span className="font-bold text-slate-800">{total}</span> customers
            </p>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d]">
                    {TABLE_HEADERS.map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/70">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading
                    ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                    : customers.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center">
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
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        {/* Full Name */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1877F2] to-purple-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                              {initials(c)}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 block truncate">{c.full_name ?? "—"}</span>
                              {c.account_type === "Joint" && c.holders?.length > 0 && (
                                <span className="text-[10px] text-slate-400 truncate block">
                                  + {c.holders.map((h) => `${h.firstname} ${h.lastname}`).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Account No. */}
                        <td className="px-4 py-2.5 text-[11px] text-slate-600 font-mono">
                          {c.account_no ?? "—"}
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
                        {/* Branch */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600 font-medium truncate max-w-[120px]">
                              {c.branch?.branch_name ?? "—"}
                            </span>
                          </div>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusStyle[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                            {c.status ?? "—"}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="px-4 py-2.5 text-[11px] text-slate-500">{formatDate(c.created_at)}</td>
                        {/* Action */}
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => navigate(`${basePath}/customers/${c.id}/view`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-[#1877F2] transition-colors"
                          >
                            <HiOutlineEye className="w-3.5 h-3.5" />
                            View
                          </button>
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
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border-2 border-slate-200 hover:border-[#1877F2] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border-2 border-slate-200 hover:border-[#1877F2] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

      {/* ── QUICK SEARCH VIEW ──────────────────────────────────────────────── */}
      {activeTab === "quick" && (
        <>
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <HiOutlineSearch className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Customer Search — All Branches</p>
            </div>

            <div className="relative" ref={searchContainerRef}>
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
              {quickLoading && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin z-10" />
              )}
              {quickQuery && (
                <button
                  onClick={() => { setQuickQuery(""); setQuickSelected(null); setShowDropdown(false); setQuickResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors z-10"
                >
                  <HiOutlineX className="w-4 h-4" />
                </button>
              )}
              <input
                value={quickQuery}
                onChange={(e) => { setQuickQuery(e.target.value); setQuickSelected(null); }}
                onFocus={() => { if (quickResults.length > 0 && quickQuery.trim()) setShowDropdown(true); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickResults.length > 0) {
                    setQuickSelected(quickResults[0]);
                    setShowDropdown(false);
                    setQuickQuery("");
                  }
                }}
                placeholder="Type a customer name — results appear instantly…"
                autoComplete="off"
                className="w-full pl-12 pr-10 py-4 text-base text-gray-900 border-2 border-slate-200 rounded-2xl focus:border-[#1877F2] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />

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
                        <p className="text-xs text-slate-400 mt-1">Try a different name</p>
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
                              onClick={() => { setQuickSelected(c); setShowDropdown(false); setQuickQuery(""); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors group"
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1877F2] to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {initials(c)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#1877F2]">{c.full_name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {c.account_no ? `Acct: ${c.account_no} · ` : ""}{c.branch?.branch_name ?? "No Branch"} · {c.account_type}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase flex-shrink-0 ${statusStyle[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                                {c.status}
                              </span>
                              <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1877F2] flex-shrink-0 transition-colors" />
                            </motion.button>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!quickQuery.trim() && !quickSelected && (
              <div className="text-center py-10 mt-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-3">
                  <HiOutlineSearch className="w-8 h-8 text-[#1877F2]" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Search across all branches</p>
                <p className="text-xs text-slate-400 mt-1">Results appear as you type</p>
              </div>
            )}
          </div>
        </div>

        {/* Inline detail view — shown below search, no modal */}
        <AnimatePresence>
          {quickSelected && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden"
              style={{ minHeight: "60vh" }}
            >
              <CustomerDetailView customerId={quickSelected.id} onClose={() => setQuickSelected(null)} />
            </motion.div>
          )}
        </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default AdminCustomerProfiles;
