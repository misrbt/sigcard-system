import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineChevronRight,
  HiOutlinePhotograph,
  HiOutlineEye,
  HiOutlineCreditCard,
  HiOutlineShieldCheck,
  HiOutlineOfficeBuilding,
  HiOutlineCalendar,
  HiOutlineUsers,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineChevronLeft,
} from "react-icons/hi";
import { MdDescription } from "react-icons/md";
import api from "../../services/api";

const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

const DOC_SECTIONS = [
  { key: "sigcard", label: "Signature Card",  front: "sigcard_front", back: "sigcard_back"  },
  { key: "nais",    label: "NAIS",            front: "nais_front",    back: "nais_back"     },
  { key: "privacy", label: "Data Privacy",    front: "privacy_front", back: "privacy_back"  },
];

const DOC_LABEL = {
  sigcard_front: "Sigcard Front",
  sigcard_back:  "Sigcard Back",
  nais_front:    "NAIS Front",
  nais_back:     "NAIS Back",
  privacy_front: "Data Privacy Front",
  privacy_back:  "Data Privacy Back",
  other:         "Other Document",
};

const STATUS_STYLE = {
  active:  { pill: "bg-green-100 text-green-700 border border-green-300",    dot: "bg-green-500"  },
  dormant: { pill: "bg-yellow-100 text-yellow-700 border border-yellow-300", dot: "bg-yellow-500" },
  escheat: { pill: "bg-orange-100 text-orange-700 border border-orange-300", dot: "bg-orange-500" },
  closed:  { pill: "bg-red-100 text-red-700 border border-red-300",          dot: "bg-red-500"    },
};

const RISK_STYLE = {
  "Low Risk":    "bg-emerald-50 text-emerald-700",
  "Medium Risk": "bg-yellow-50 text-yellow-700",
  "High Risk":   "bg-red-50 text-red-700",
};

const initials = (c) =>
  ((c?.firstname?.[0] ?? "") + (c?.lastname?.[0] ?? "")).toUpperCase() || "?";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

// ── Image Viewer ──────────────────────────────────────────────────────────────
const ImageViewer = ({ images, initialIndex = 0, onClose, isDormant = false }) => {
  const [idx, setIdx]   = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
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

  const onWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + (e.deltaY < 0 ? 0.25 : -0.25), 1), 5));
  };
  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDrag(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e) => {
    if (!drag) return;
    setPan({ x: dragRef.current.px + e.clientX - dragRef.current.sx, y: dragRef.current.py + e.clientY - dragRef.current.sy });
  };
  const onMouseUp = () => setDrag(false);

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
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <HiOutlineZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 5))} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <HiOutlineZoomIn className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="ml-2 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center justify-center"
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ cursor: zoom > 1 ? (drag ? "grabbing" : "grab") : "default" }}>
        <img
          src={cur.src} alt={cur.label} draggable={false}
          className={`max-h-full max-w-full object-contain transition-transform duration-100 select-none${isDormant ? " blur-md" : ""}`}
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
        />
        {idx > 0 && (
          <button onClick={() => setIdx((i) => i - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <HiOutlineChevronLeft className="w-6 h-6" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button onClick={() => setIdx((i) => i + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <HiOutlineChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex-shrink-0 bg-black/70 border-t border-white/10 px-4 py-2 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-12 h-16 rounded overflow-hidden border-2 transition-all ${i === idx ? "border-blue-400" : "border-white/10 opacity-50 hover:opacity-80"}`}>
              <img src={img.src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Customer Document Panel ───────────────────────────────────────────────────
const CustomerDocPanel = ({ customerId, onClose }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [viewer, setViewer]     = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/customers/${customerId}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [customerId]);

  const buildImages = useCallback((startType = null, startPerson = null) => {
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
            imgs.push({ src: storageUrl(doc.file_path), label: DOC_LABEL[type] ?? type, person: persons.length > 1 ? p : null });
          }
        });
      });
    });
    customer.documents.filter((d) => d.document_type === "other").forEach((doc) => {
      imgs.push({ src: storageUrl(doc.file_path), label: "Other Document", person: null });
    });
    return { images: imgs, index: startIdx };
  }, [customer]);

  const openViewer = (docType, personIndex) => {
    const { images, index } = buildImages(docType, personIndex);
    if (images.length) setViewer({ images, index });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading customer…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-slate-500 font-semibold">Customer not found.</p>
        <button onClick={onClose} className="text-sm text-blue-600 hover:underline">← Back to search</button>
      </div>
    );
  }

  const docs      = customer.documents ?? [];
  const holders   = customer.holders   ?? [];
  const isJoint   = customer.account_type === "Joint";
  const isDormant = customer.status === "dormant";
  const sCfg      = STATUS_STYLE[customer.status] ?? { pill: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };

  const allHolders = [
    { person_index: 1, firstname: customer.firstname, middlename: customer.middlename, lastname: customer.lastname, suffix: customer.suffix, risk_level: customer.risk_level },
    ...holders,
  ];

  const holderName = (pi) => {
    const h = allHolders.find((x) => x.person_index === pi);
    if (!h) return `Person ${pi}`;
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
      {viewer && (
        <ImageViewer images={viewer.images} initialIndex={viewer.index} onClose={() => setViewer(null)} isDormant={isDormant} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">

        {/* LEFT — Customer info sidebar */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                {initials(customer)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white leading-snug truncate">{customer.full_name}</h3>
                {isJoint && holders.length > 0 && (
                  <p className="text-[11px] text-white/40 truncate mt-0.5">
                    + {holders.map((h) => `${h.firstname} ${h.lastname}`).join(", ")}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${sCfg.pill}`}>{customer.status}</span>
                  {isDormant && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Blurred</span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: HiOutlineCreditCard,     label: "Account Type", value: `${customer.account_type}${isJoint ? ` · ${allHolders.length} holders` : ""}` },
                ...(!isJoint ? [{ icon: HiOutlineShieldCheck, label: "Risk Level", value: customer.risk_level }] : []),
                { icon: HiOutlineOfficeBuilding, label: "Branch",       value: customer.branch?.branch_name ?? "—" },
                { icon: HiOutlineCalendar,       label: "Added",        value: formatDate(customer.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
                    <p className="text-xs text-white/75 font-medium truncate">{value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <HiOutlinePhotograph className="w-4 h-4 text-white/30 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Documents</p>
                  <p className="text-xs text-white/75 font-medium">{totalDocs} file{totalDocs !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          </div>

          {isJoint && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <HiOutlineUsers className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Holders</p>
                <span className="ml-auto text-xs text-slate-400">{allHolders.length}</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {allHolders.map((h) => (
                  <div key={h.person_index} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0 ${h.person_index === 1 ? "bg-blue-600" : "bg-purple-600"}`}>
                      {h.person_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {h.firstname}{h.middlename ? ` ${h.middlename}` : ""} {h.lastname}{h.suffix ? ` ${h.suffix}` : ""}
                      </p>
                      <p className="text-[10px] text-slate-400">{h.person_index === 1 ? "Primary" : "Secondary"}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${RISK_STYLE[h.risk_level] ?? "bg-slate-100 text-slate-600"}`}>
                      {h.risk_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            ← New Search
          </button>
        </div>

        {/* RIGHT — Documents grid */}
        <div className="space-y-5">
          {DOC_SECTIONS.map((sec) => {
            const secDocs = docs.filter((d) => d.document_type === sec.front || d.document_type === sec.back);
            return (
              <div key={sec.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{sec.label}</h3>
                  <span className="ml-auto text-[11px] text-slate-400">{secDocs.length} file{secDocs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="p-4 space-y-4">
                  {secDocs.length === 0 ? (
                    <div className="flex items-center gap-3 py-5 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                      <HiOutlinePhotograph className="w-5 h-5 text-slate-300 flex-shrink-0" />
                      <p className="text-sm text-slate-400">No documents uploaded for this section</p>
                    </div>
                  ) : (
                    (persons.length ? persons : [1]).map((p) => {
                      const frontDoc = docs.find((d) => d.document_type === sec.front && d.person_index === p);
                      const backDoc  = docs.find((d) => d.document_type === sec.back  && d.person_index === p);
                      if (!frontDoc && !backDoc) return null;
                      return (
                        <div key={p}>
                          {persons.length > 1 && (
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0 ${p === 1 ? "bg-blue-600" : "bg-purple-600"}`}>{p}</div>
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{holderName(p)}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { doc: frontDoc, type: sec.front, lbl: "Front" },
                              { doc: backDoc,  type: sec.back,  lbl: "Back"  },
                            ].map(({ doc, type, lbl }) => (
                              <div key={lbl}>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">{lbl}</p>
                                {doc ? (
                                  <button
                                    onClick={() => openViewer(type, p)}
                                    className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm hover:shadow-md"
                                  >
                                    <img src={storageUrl(doc.file_path)} alt={lbl}
                                      className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="bg-white/90 rounded-full p-2 shadow-lg">
                                        <HiOutlineEye className="w-5 h-5 text-slate-700" />
                                      </div>
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1.5">
                                    <HiOutlinePhotograph className="w-6 h-6 text-slate-200" />
                                    <p className="text-[10px] text-slate-300">Not uploaded</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {otherDocs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Other Documents</h3>
                <span className="ml-auto text-[11px] text-slate-400">{otherDocs.length} file{otherDocs.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  {otherDocs.map((doc, i) => (
                    <button key={doc.id}
                      onClick={() => {
                        const { images } = buildImages();
                        const otherStart = images.findIndex((img) => img.src === storageUrl(doc.file_path));
                        setViewer({ images, index: Math.max(otherStart, 0) });
                      }}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all bg-slate-50 shadow-sm hover:shadow-md"
                    >
                      <img src={storageUrl(doc.file_path)} alt={`Other ${i + 1}`}
                        className={`w-full h-full object-contain transition-all${isDormant ? " blur-md" : ""}`} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/90 rounded-full p-1.5 shadow"><HiOutlineEye className="w-4 h-4 text-slate-700" /></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const BranchDocuments = () => {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected]         = useState(null);
  const searchRef                       = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    setShowDropdown(true);
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get("/customers", { params: { search: query, per_page: 15 } });
        setResults(data.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCustomer = (c) => { setSelected(c); setShowDropdown(false); setQuery(""); setResults([]); };
  const clearSelection  = ()  => { setSelected(null); setQuery(""); setResults([]); };

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-5 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
            <MdDescription className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Document Search</h1>
            <p className="mt-0.5 text-sm text-blue-200">Search any customer to view their signature card documents</p>
          </div>
        </div>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <HiOutlineSearch className="w-3.5 h-3.5" />
            Live Customer Search
          </p>

          <div className="relative" ref={searchRef}>
            <div className="relative">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
              {searching && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin z-10" />
              )}
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors z-10">
                  <HiOutlineX className="w-4 h-4" />
                </button>
              )}
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => { if (results.length > 0 && query.trim()) setShowDropdown(true); }}
                onKeyDown={(e) => { if (e.key === "Enter" && results.length > 0) selectCustomer(results[0]); }}
                placeholder="Type a customer name — results appear instantly…"
                autoComplete="off"
                className="w-full pl-12 pr-12 py-4 text-base text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <AnimatePresence>
              {showDropdown && query.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                >
                  {results.length === 0 && !searching ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-600">No customers found</p>
                      <p className="text-xs text-slate-400 mt-1">Try a different spelling or partial name</p>
                    </div>
                  ) : (
                    <>
                      {results.length > 0 && (
                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {results.length} result{results.length !== 1 ? "s" : ""} found
                          </p>
                        </div>
                      )}
                      <div className="max-h-72 overflow-y-auto">
                        {results.map((c, i) => {
                          const sCfg = STATUS_STYLE[c.status] ?? { pill: "bg-slate-100 text-slate-500" };
                          return (
                            <motion.button key={c.id}
                              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                              onClick={() => selectCustomer(c)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors group"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {initials(c)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700">{c.full_name}</p>
                                <p className="text-xs text-slate-400 truncate">{c.branch?.branch_name ?? "No Branch"} · {c.account_type}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase flex-shrink-0 ${sCfg.pill}`}>{c.status}</span>
                              <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!query.trim() && !selected && (
            <div className="text-center py-10 mt-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
                <MdDescription className="w-8 h-8 text-blue-500" />
              </div>
              <p className="font-semibold text-slate-700">Search for a Customer</p>
              <p className="text-sm text-slate-400 mt-1">Results appear instantly as you type — no Enter needed</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
          >
            <CustomerDocPanel customerId={selected.id} onClose={clearSelection} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BranchDocuments;
