import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineOfficeBuilding,
  HiOutlinePhotograph,
  HiOutlineShieldCheck,
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
  active:  "bg-green-100 text-green-700 border border-green-300",
  dormant: "bg-yellow-100 text-yellow-700 border border-yellow-300",
  escheat: "bg-orange-100 text-orange-700 border border-orange-300",
  closed:  "bg-red-100 text-red-700 border border-red-300",
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

// ── Main page ──────────────────────────────────────────────────────────────────
const AdminCustomerView = ({ basePath = '/admin' }) => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [viewer, setViewer]     = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/customers/${id}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [id]);

  const buildImages = (startType = null, startPerson = null) => {
    if (!customer?.documents) return { images: [], index: 0 };
    const imgs = [];
    let startIdx = 0;

    const persons = [...new Set(
      customer.documents
        .filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type))
        .map((d) => d.person_index)
    )].sort();

    DOC_SECTIONS.forEach((sec) => {
      (persons.length ? persons : [1]).forEach((p) => {
        ["front", "back"].forEach((side) => {
          const type = sec[side];
          const doc  = customer.documents.find((d) => d.document_type === type && d.person_index === p);
          if (doc) {
            if (startType === type && startPerson === p) startIdx = imgs.length;
            imgs.push({ src: storageUrl(doc.file_path), label: docLabel[type] ?? type, person: persons.length > 1 ? p : null });
          }
        });
      });
    });

    customer.documents.filter((d) => d.document_type === "other").forEach((doc) => {
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
  const isJoint   = customer.account_type === "Joint";
  const isDormant = customer.status === "dormant";

  const allHolders = [
    { person_index: 1, firstname: customer.firstname, middlename: customer.middlename, lastname: customer.lastname, suffix: customer.suffix, risk_level: customer.risk_level },
    ...holders,
  ];

  const holderName = (personIndex) => {
    const h = allHolders.find((x) => x.person_index === personIndex);
    if (!h) return `Person ${personIndex}`;
    return `${h.firstname}${h.middlename ? " " + h.middlename : ""} ${h.lastname}${h.suffix ? " " + h.suffix : ""}`;
  };

  const persons   = [...new Set(
    docs.filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type))
        .map((d) => d.person_index)
  )].sort();
  const otherDocs = docs.filter((d) => d.document_type === "other");
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1877F2] to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                {initials(customer)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-white">{customer.full_name}</h1>
                  {isJoint && holders.length > 0 && (
                    <span className="text-sm text-white/50 font-medium">
                      + {holders.map((h) => `${h.firstname} ${h.lastname}`).join(", ")}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusStyle[customer.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {customer.status}
                  </span>
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

          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Account Type", value: customer.account_type, badge: accountStyle[customer.account_type] },
              isJoint
                ? { label: "Holders",    value: `${allHolders.length} people`, badge: "bg-purple-50 text-purple-700" }
                : { label: "Risk Level", value: customer.risk_level,  badge: riskStyle[customer.risk_level] },
              { label: "Branch",     value: customer.branch?.branch_name ?? "—", badge: null },
              { label: "Documents",  value: `${totalDocs} file${totalDocs !== 1 ? "s" : ""}`, badge: null },
            ].map(({ label, value, badge }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                {badge ? (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>{value}</span>
                ) : (
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                )}
              </div>
            ))}
          </div>

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

            <div className="px-5 py-5 space-y-6">
              {DOC_SECTIONS.map((sec) => {
                const secDocs = docs.filter((d) => d.document_type === sec.front || d.document_type === sec.back);
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
                          const frontDoc = docs.find((d) => d.document_type === sec.front && d.person_index === p);
                          const backDoc  = docs.find((d) => d.document_type === sec.back  && d.person_index === p);
                          if (!frontDoc && !backDoc) return null;
                          return (
                            <div key={p}>
                              {persons.length > 1 && (
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
                                        <img
                                          src={storageUrl(doc.file_path)}
                                          alt={lbl}
                                          className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`}
                                        />
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
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Other Documents</p>
                {otherDocs.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {otherDocs.map((doc, i) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          const { images } = buildImages();
                          const otherStart = images.findIndex((img) => img.src === storageUrl(doc.file_path));
                          setViewer({ images, index: Math.max(otherStart, 0) });
                        }}
                        className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-[#1877F2] transition-all bg-slate-50 shadow-sm"
                      >
                        <img src={storageUrl(doc.file_path)} alt={`Other ${i + 1}`} className={`w-full h-full object-cover transition-all${isDormant ? " blur-md" : ""}`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
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

        </div>
      </div>
    </>
  );
};

export default AdminCustomerView;
