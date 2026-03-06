import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSearch,
  HiOutlineOfficeBuilding,
  HiOutlineDocumentText,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlinePencilAlt,
  HiOutlineUsers,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineCalendar,
  HiOutlinePhotograph,
} from "react-icons/hi";
import Swal from "sweetalert2";
import api from "../../services/api";

const PAGE_SIZE = 10;

const statusStyle = {
  active:   "bg-green-100 text-green-700 border border-green-300",
  dormant:  "bg-yellow-100 text-yellow-700 border border-yellow-300",
  escheat:  "bg-orange-100 text-orange-700 border border-orange-300",
  closed:   "bg-red-100 text-red-700 border border-red-300",
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

// ── Customer Detail View ──────────────────────────────────────────────────────
const CustomerDetailView = ({ customerId: cid, onClose }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [viewer, setViewer]     = useState(null); // { images, index }

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

    // Grouped: sigcard/nais/privacy per person
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

    // Other docs
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

  const sCfg     = statusStyle[customer.status] ?? "bg-slate-100 text-slate-500";
  const docs     = customer.documents ?? [];
  const holders  = customer.holders   ?? [];
  const isJoint  = customer.account_type === "Joint";
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

  const persons  = [...new Set(
    docs.filter((d) => DOC_SECTIONS.some((s) => s.front === d.document_type || s.back === d.document_type))
        .map((d) => d.person_index)
  )].sort();
  const otherDocs  = docs.filter((d) => d.document_type === "other");

  return (
    <>
      {viewer && (
        <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} isDormant={isDormant} />
      )}

      <div className="flex flex-col h-full">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Customer Details</h2>
            {isDormant && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
                Dormant
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Profile card */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                {initials(customer)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{customer.full_name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${sCfg}`}>
                    {customer.status}
                  </span>
                </div>
                {isJoint && holders.length > 0 && (
                  <p className="text-xs text-white/40 mt-0.5 truncate">
                    + {holders.map((h) => `${h.firstname} ${h.lastname}`).join(", ")}
                  </p>
                )}
                <p className="text-xs text-white/50 mt-0.5">{customerId(customer.id)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: HiOutlineCreditCard,     label: "Account Type", value: `${customer.account_type}${isJoint ? ` · ${allHolders.length} holders` : ""}` },
                ...(!isJoint ? [{ icon: HiOutlineShieldCheck, label: "Risk Level", value: customer.risk_level }] : []),
                { icon: HiOutlineOfficeBuilding, label: "Branch",       value: customer.branch?.branch_name ?? "—" },
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

            {/* Joint holders list inside profile card */}
            {isJoint && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Account Holders</p>
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

          {/* Document sections */}
          {DOC_SECTIONS.map((sec) => {
            const secDocs = docs.filter((d) => d.document_type === sec.front || d.document_type === sec.back);
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

// ── Edit Info Modal (name, account type, risk level) ─────────────────────────
const RISK_LEVELS_EDIT = ["Low Risk", "Medium Risk", "High Risk"];

const emptyHolder = () => ({ firstname: "", middlename: "", lastname: "", suffix: "", risk_level: "Low Risk" });

const EditInfoModal = ({ customer, onClose, onSaved }) => {
  const [form, setForm] = useState({
    firstname:    customer.firstname    ?? "",
    middlename:   customer.middlename   ?? "",
    lastname:     customer.lastname     ?? "",
    suffix:       customer.suffix       ?? "",
    account_type: customer.account_type ?? "Regular",
    risk_level:   customer.risk_level   ?? "Low Risk",
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
        firstname:  h.firstname,
        middlename: h.middlename,
        lastname:   h.lastname,
        suffix:     h.suffix,
        risk_level: h.risk_level,
      }));
    }
    save(payload);
  };

  const inputCls = "w-full px-3 py-2.5 text-sm text-gray-900 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Customer Info</h2>
            <p className="text-xs text-white/70">{customerId(customer.id)} • {customer.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Account type + primary risk (or joint notice) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Account Type</label>
              <select value={form.account_type} onChange={set("account_type")} className={inputCls}>
                <option>Regular</option>
                <option>Joint</option>
                <option>Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Risk Level {isJoint && <span className="font-normal text-slate-400">(Person 1)</span>}
              </label>
              <select value={form.risk_level} onChange={set("risk_level")} className={inputCls}>
                {RISK_LEVELS_EDIT.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Primary holder (Person 1) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">1</div>
              <p className="text-xs font-bold text-slate-700">{isJoint ? "Person 1 — Primary Account Holder" : "Account Holder"}</p>
            </div>
            <div className="pl-3 border-l-2 border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
                  <input value={form.firstname} onChange={set("firstname")} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
                  <input value={form.lastname} onChange={set("lastname")} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Middle Name</label>
                  <input value={form.middlename} onChange={set("middlename")} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Suffix</label>
                  <input value={form.suffix} onChange={set("suffix")} placeholder="Jr., Sr., III…" className={inputCls} />
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
                        <input value={h.firstname} onChange={(e) => setHolder(i, "firstname", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
                        <input value={h.lastname} onChange={(e) => setHolder(i, "lastname", e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Middle Name</label>
                        <input value={h.middlename} onChange={(e) => setHolder(i, "middlename", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Suffix</label>
                        <input value={h.suffix} onChange={(e) => setHolder(i, "suffix", e.target.value)} placeholder="Jr., Sr., III…" className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Level</label>
                      <select value={h.risk_level} onChange={(e) => setHolder(i, "risk_level", e.target.value)} className={inputCls}>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow hover:opacity-90 disabled:opacity-60 transition-all">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

// ── Edit Status Modal ─────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["active", "dormant", "escheat", "closed"];

const STATUS_CONFIG = {
  active:  { label: "Active",  desc: "Account is open and operational.",        icon: "✓", ring: "ring-green-400",  bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  dormant: { label: "Dormant", desc: "No transactions for an extended period.", icon: "◷", ring: "ring-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  escheat: { label: "Escheat", desc: "Funds transferred to the government.",    icon: "⚠", ring: "ring-orange-400", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  closed:  { label: "Closed",  desc: "Account has been permanently closed.",    icon: "✕", ring: "ring-red-400",    bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
};

const EditStatusModal = ({ customer, onClose, onSaved }) => {
  const [status, setStatus] = useState(customer.status ?? "active");
  const { saving, save } = useModalSave(customer.id, onSaved, onClose);
  const isUnchanged = status === customer.status;
  const selected = STATUS_CONFIG[status];

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Update Account Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">{customer.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Current status indicator */}
        <div className="px-6 pt-5 pb-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Status</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[customer.status]?.dot ?? "bg-slate-400"}`} />
            <span className="text-sm font-semibold text-slate-700 capitalize">{customer.status}</span>
          </div>
        </div>

        {/* Status options */}
        <div className="px-6 pt-4 pb-5 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Select New Status</p>
          {STATUS_OPTIONS.map((s) => {
            const cfg       = STATUS_CONFIG[s];
            const isActive  = status === s;
            const isCurrent = customer.status === s;
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
                {/* Radio dot */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${isActive ? `${cfg.dot} border-transparent` : "border-slate-300 bg-white"}`}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold capitalize ${isActive ? cfg.text : "text-slate-700"}`}>
                      {cfg.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isActive ? cfg.text + "/70" : "text-slate-400"}`}>
                    {cfg.desc}
                  </p>
                </div>

                {/* Status dot */}
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400">
            {isUnchanged
              ? "No changes made"
              : <span>Changing to <strong className={`capitalize ${selected.text}`}>{status}</strong></span>
            }
          </p>
          <div className="flex items-center gap-2.5">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button onClick={() => save({ status })} disabled={saving || isUnchanged}
              className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow transition-all disabled:opacity-50 disabled:shadow-none
                ${selected ? `bg-gradient-to-r from-${selected.dot.replace("bg-", "")} to-${selected.dot.replace("bg-", "")}` : ""}
                bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90`}>
              {saving ? "Saving…" : "Confirm Update"}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
};



// ── Main component ───────────────────────────────────────────────────────────
const CustomerProfiles = ({ basePath = '/user', defaultTab = 'table', onlyTab = null }) => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isReadOnly = hasRole("cashier") || hasRole("manager");

  const [activeTab, setActiveTab]         = useState(onlyTab ?? defaultTab);

  // Table view
  const [customers, setCustomers]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [tableSearch, setTableSearch]     = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [sortDir, setSortDir]             = useState("asc");
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [total, setTotal]                 = useState(0);

  // Edit modals
  const [editInfoCustomer, setEditInfoCustomer]       = useState(null);
  const [editStatusCustomer, setEditStatusCustomer]   = useState(null);

  // Quick search
  const [quickQuery, setQuickQuery]               = useState("");
  const [quickResults, setQuickResults]           = useState([]);
  const [quickLoading, setQuickLoading]           = useState(false);
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [showDropdown, setShowDropdown]           = useState(false);
  const searchContainerRef                        = useRef(null);

  // ── Fetch table data ───────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: PAGE_SIZE };
      if (tableSearch)           params.search = tableSearch;
      if (statusFilter !== "all") params.status = statusFilter;

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
  }, [page, tableSearch, statusFilter, sortDir]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [tableSearch, statusFilter]);

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
      {/* Edit Info Modal — hidden for cashier */}
      {!isReadOnly && (
        <AnimatePresence>
          {editInfoCustomer && (
            <EditInfoModal
              customer={editInfoCustomer}
              onClose={() => setEditInfoCustomer(null)}
              onSaved={fetchCustomers}
            />
          )}
        </AnimatePresence>
      )}

      {/* Edit Status Modal — hidden for cashier */}
      {!isReadOnly && (
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
                    placeholder="Search by name or branch…"
                    className="w-full pl-12 pr-4 py-3 text-sm text-gray-900 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="dormant">Dormant</option>
                    <option value="escheat">Escheat</option>
                    <option value="closed">Closed</option>
                  </select>
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
                      {["Full Name", "Account Type", "Risk Level", "Status", "Date Added", "Action"].map((h) => (
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
                          <td colSpan={6} className="px-6 py-20 text-center">
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
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusStyle[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                              {c.status ?? "—"}
                            </span>
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
                              {!isReadOnly && (
                                <>
                                  <button
                                    onClick={() => setEditInfoCustomer(c)}
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
                    className="px-5 py-2.5 font-semibold rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-5 py-2.5 font-semibold rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next →
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
                <div className="flex items-center gap-2 mb-3">
                  <HiOutlineSearch className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Customer Search</p>
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
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {initials(c)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700">{c.full_name}</p>
                                    <p className="text-xs text-slate-400 truncate">
                                      {c.branch?.branch_name ?? "No Branch"} · {c.account_type}
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
    </div>
  );
};

export default CustomerProfiles;
