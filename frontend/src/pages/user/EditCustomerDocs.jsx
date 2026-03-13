import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineCloudUpload,
  HiOutlineUser,
  HiOutlineOfficeBuilding,
  HiOutlineCreditCard,
  HiOutlineShieldCheck,
  HiOutlinePlus,
} from "react-icons/hi";
import Swal from "sweetalert2";
import api from "../../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const storageUrl = (path) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  return `${base}/storage/${path}`;
};

const customerId = (id) => `C-${String(id).padStart(4, "0")}`;

const STATUS_CFG = {
  active:  { pill: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  dormant: { pill: "bg-yellow-100 text-yellow-700 border border-yellow-200",   dot: "bg-yellow-500"  },
  escheat: { pill: "bg-orange-100 text-orange-700 border border-orange-200",   dot: "bg-orange-500"  },
  closed:  { pill: "bg-red-100 text-red-700 border border-red-200",             dot: "bg-red-500"     },
};

const DOC_GROUPS = [
  { key: "sigcard", label: "Signature Card",   accent: "blue",   front: "sigcard_front", back: "sigcard_back"  },
  { key: "nais",    label: "NAIS Form",        accent: "purple", front: "nais_front",    back: "nais_back"     },
  { key: "privacy", label: "Data Privacy",     accent: "teal",   front: "privacy_front", back: "privacy_back"  },
];

const ACCENT = {
  blue:   { ring: "ring-blue-400",   badge: "bg-blue-600",   title: "text-blue-700",   icon: "text-blue-500",   bg: "bg-blue-50"   },
  purple: { ring: "ring-purple-400", badge: "bg-purple-600", title: "text-purple-700", icon: "text-purple-500", bg: "bg-purple-50" },
  teal:   { ring: "ring-teal-400",   badge: "bg-teal-600",   title: "text-teal-700",   icon: "text-teal-500",   bg: "bg-teal-50"   },
};

// ── Image card ────────────────────────────────────────────────────────────────
const ImageCard = ({ doc, side, accent, preview, uploading, uploaded, onFileChange }) => {
  const inputRef = useRef(null);
  const ac  = ACCENT[accent];
  const src = preview ? URL.createObjectURL(preview) : doc ? storageUrl(doc.file_path) : null;

  let borderCls = "border-slate-200 hover:border-slate-300";
  if (preview && !uploaded) borderCls = `ring-2 ${ac.ring} border-transparent shadow-lg`;
  if (uploaded)             borderCls = "ring-2 ring-emerald-400 border-transparent shadow-lg shadow-emerald-50";

  return (
    <div className="flex flex-col gap-2">
      {/* Card header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{side} Side</span>
        <AnimatePresence mode="wait">
          {uploaded && (
            <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Saved
            </motion.span>
          )}
          {preview && !uploaded && (
            <motion.span key="rdy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[11px] font-semibold text-blue-500">
              Ready
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Image area */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative group w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 bg-slate-50 transition-all duration-200 cursor-pointer ${borderCls} ${uploading ? "cursor-wait" : ""}`}
      >
        {src ? (
          <img src={src} alt={side} className="w-full h-full object-contain" />
        ) : (
          <div className={`flex flex-col items-center justify-center h-full gap-3 select-none ${ac.bg}`}>
            <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <HiOutlinePhotograph className={`w-6 h-6 ${ac.icon}`} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">No image</p>
              <p className="text-[10px] text-slate-400">Click to upload</p>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col items-center justify-end pb-5 gap-1">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1">
              <HiOutlinePhotograph className="w-5 h-5 text-white" />
            </div>
            <p className="text-white text-sm font-bold drop-shadow">{src ? "Replace" : "Upload"}</p>
            <p className="text-white/60 text-[10px]">JPG / PNG · max 10 MB</p>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-blue-600">Uploading…</p>
          </div>
        )}

        {/* Status badge */}
        {preview && !uploaded && (
          <div className={`absolute top-2 left-2 ${ac.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow`}>
            NEW
          </div>
        )}
        {uploaded && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
            <HiOutlineCheckCircle className="w-3 h-3" /> SAVED
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
        onChange={(e) => { onFileChange(e.target.files[0] ?? null); e.target.value = ""; }} />
    </div>
  );
};

// ── Loading skeleton ──────────────────────────────────────────────────────────
const PageSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-48 bg-slate-200" />
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div className="aspect-[3/4] bg-slate-200 rounded-2xl" />
            <div className="aspect-[3/4] bg-slate-200 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const EditCustomerDocs = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [activeTab, setActiveTab]         = useState("sigcard");

  const [pending, setPending]             = useState({});
  const [uploaded, setUploaded]           = useState({});
  const [uploading, setUploading]         = useState(null);
  const [saving, setSaving]               = useState(false);
  const [saveProgress, setSaveProgress]   = useState({ done: 0, total: 0 });

  const [newOtherFiles, setNewOtherFiles] = useState([]);
  const otherInputRef = useRef(null);

  // ── Load customer ──────────────────────────────────────────────────────────
  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/customers/${id}`);
      setCustomer(data);
    } catch {
      setError("Failed to load customer. Please go back and try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);

  // ── Derived helpers ────────────────────────────────────────────────────────
  const getDoc        = (type, pi) => customer?.documents?.find((d) => d.document_type === type && d.person_index === pi) ?? null;
  const setPendingFile = (type, pi, file) => {
    const key = `${type}__${pi}`;
    setPending((p) => ({ ...p, [key]: file }));
    setUploaded((p) => { const n = { ...p }; delete n[key]; return n; });
  };
  const getPendingFile = (type, pi) => pending[`${type}__${pi}`] ?? null;
  const isUploaded     = (type, pi) => !!uploaded[`${type}__${pi}`];
  const isUploading    = (type, pi) => uploading === `${type}__${pi}`;

  const personCount = Math.max(
    1,
    ...(customer?.documents ?? [])
      .filter((d) => DOC_GROUPS.some((g) => g.front === d.document_type || g.back === d.document_type))
      .map((d) => d.person_index)
  );
  const persons   = Array.from({ length: personCount }, (_, i) => i + 1);
  const otherDocs = (customer?.documents ?? []).filter((d) => d.document_type === "other");

  const totalPending = Object.values(pending).filter(Boolean).length + newOtherFiles.length;

  const tabPending = (group) => {
    if (group.key === "other") return newOtherFiles.length;
    return persons.reduce((acc, p) => {
      if (getPendingFile(group.front, p)) acc++;
      if (getPendingFile(group.back,  p)) acc++;
      return acc;
    }, 0);
  };

  // ── Upload helpers ─────────────────────────────────────────────────────────
  const uploadOne = async (document_type, person_index, file) => {
    const key = `${document_type}__${person_index}`;
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("document_type", document_type);
      fd.append("person_index",  String(person_index));
      fd.append("file",          file);
      const { data } = await api.post(`/customers/${id}/replace-document`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCustomer(data.customer);
      setUploaded((p) => ({ ...p, [key]: true }));
      setPending((p) => { const n = { ...p }; delete n[key]; return n; });
    } finally {
      setUploading(null);
    }
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(pending).filter(([, f]) => f);
    const total   = entries.length + newOtherFiles.length;
    if (total === 0) return;

    setSaving(true);
    let done = 0, failed = 0;
    setSaveProgress({ done: 0, total });

    try {
      for (const [key, file] of entries) {
        const [document_type, person_index] = key.split("__");
        try { await uploadOne(document_type, parseInt(person_index), file); }
        catch { failed++; }
        setSaveProgress({ done: ++done, total });
      }

      if (newOtherFiles.length > 0) {
        setUploading("other__new");
        try {
          const fd = new FormData();
          fd.append("_method", "PUT");
          newOtherFiles.forEach((f) => fd.append("otherDocs[1][]", f));
          const { data } = await api.post(`/customers/${id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setCustomer(data.customer);
          done += newOtherFiles.length;
        } catch {
          failed += newOtherFiles.length;
          done   += newOtherFiles.length;
        } finally {
          setUploading(null);
          setSaveProgress({ done, total });
        }
      }

      setNewOtherFiles([]);

      if (failed === 0) {
        await Swal.fire({
          icon: "success", title: "Documents Saved",
          text: `${total} file${total !== 1 ? "s" : ""} uploaded successfully.`,
          confirmButtonColor: "#2563eb", timer: 2500, timerProgressBar: true,
        });
      } else {
        Swal.fire({
          icon: "warning", title: "Partial Upload",
          text: `${total - failed} succeeded, ${failed} failed. Retry the failed files.`,
          confirmButtonColor: "#2563eb",
        });
      }
    } finally {
      setSaving(false);
      setSaveProgress({ done: 0, total: 0 });
    }
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading) return <PageSkeleton />;

  if (error || !customer) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center gap-4 px-4">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <HiOutlineExclamationCircle className="w-10 h-10 text-red-400" />
        </div>
        <p className="text-slate-700 font-semibold text-center">{error ?? "Customer not found."}</p>
        <button onClick={() => navigate("/users/customers")}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow">
          Back to Customers
        </button>
      </div>
    );
  }

  const sCfg = STATUS_CFG[customer.status] ?? STATUS_CFG.active;

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ══ Hero header ═══════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d]">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6 space-y-4">

          {/* Breadcrumb */}
          <button onClick={() => navigate("/users/customers")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors">
            <HiOutlineArrowLeft className="w-4 h-4" />
            Customer Profiles
          </button>

          {/* Customer info row */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-xl shadow-black/30">
              {(customer.firstname?.[0] ?? "") + (customer.lastname?.[0] ?? "")}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-white">{customer.full_name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${sCfg.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                  {customer.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-white/45">
                <span className="flex items-center gap-1"><HiOutlineUser className="w-3 h-3" />{customerId(customer.id)}</span>
                <span className="flex items-center gap-1"><HiOutlineCreditCard className="w-3 h-3" />{customer.account_type}</span>
                <span className="flex items-center gap-1"><HiOutlineShieldCheck className="w-3 h-3" />{customer.risk_level}</span>
                <span className="flex items-center gap-1"><HiOutlineOfficeBuilding className="w-3 h-3" />{customer.branch?.branch_name ?? "No Branch"}</span>
              </div>
            </div>

            <button onClick={loadCustomer} title="Refresh"
              className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
              <HiOutlineRefresh className="w-4 h-4" />
            </button>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {[...DOC_GROUPS, { key: "other", label: "Other Docs", accent: "slate", front: null, back: null }].map((group) => {
              const isActive = activeTab === group.key;
              const pending  = tabPending(group);
              return (
                <button
                  key={group.key}
                  onClick={() => setActiveTab(group.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 border ${
                    isActive
                      ? "bg-white text-slate-900 border-white shadow-lg"
                      : "text-white/55 border-white/10 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {group.label}
                  {pending > 0 && (
                    <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}</div>
        </div>
      </div>

      {/* ══ Action bar ════════════════════════════════════════════════════════ */}
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        {/* Progress bar */}
        {saving && saveProgress.total > 0 && (
          <div className="h-0.5 bg-slate-100">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(saveProgress.done / saveProgress.total) * 100}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
        )}
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Status */}
          <div className="min-w-0">
            {totalPending > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <p className="text-sm font-bold text-slate-800">
                  {totalPending} file{totalPending !== 1 ? "s" : ""} pending
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">All changes saved — or click an image to replace it</p>
            )}
            {saving && (
              <p className="text-xs text-blue-500 font-medium mt-0.5">
                Uploading {saveProgress.done} of {saveProgress.total}…
              </p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button onClick={() => navigate("/users/customers")}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Done
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || totalPending === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <HiOutlineCloudUpload className="w-4 h-4" />
                  Upload{totalPending > 0 ? ` ${totalPending} File${totalPending !== 1 ? "s" : ""}` : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══ Main content ══════════════════════════════════════════════════════ */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >

            {/* ── LEFT: active doc group ──────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {DOC_GROUPS.filter((g) => g.key === activeTab).map((group) => (
                <div key={group.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ACCENT[group.accent].bg}`}>
                        <HiOutlineDocumentText className={`w-4 h-4 ${ACCENT[group.accent].icon}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{group.label}</h3>
                        <p className="text-[10px] text-slate-400">
                          {personCount > 1 ? `${personCount} persons — front & back each` : "Front & Back required"}
                        </p>
                      </div>
                    </div>
                    {/* Completion dots per person */}
                    <div className="flex gap-1.5">
                      {persons.map((p) => {
                        const hasFront = !!getDoc(group.front, p) || !!getPendingFile(group.front, p) || isUploaded(group.front, p);
                        const hasBack  = !!getDoc(group.back,  p) || !!getPendingFile(group.back,  p) || isUploaded(group.back,  p);
                        return (
                          <div key={p} title={`Person ${p}`}
                            className={`w-2 h-2 rounded-full transition-colors ${hasFront && hasBack ? "bg-emerald-400" : hasFront || hasBack ? "bg-amber-400" : "bg-slate-200"}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Person rows */}
                  <div className="px-5 py-5 space-y-6">
                    {persons.map((p) => (
                      <div key={p}>
                        {personCount > 1 && (
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Person {p}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <ImageCard
                            doc={getDoc(group.front, p)} side="Front" accent={group.accent}
                            preview={getPendingFile(group.front, p)} uploaded={isUploaded(group.front, p)} uploading={isUploading(group.front, p)}
                            onFileChange={(f) => setPendingFile(group.front, p, f)}
                          />
                          <ImageCard
                            doc={getDoc(group.back, p)} side="Back" accent={group.accent}
                            preview={getPendingFile(group.back, p)} uploaded={isUploaded(group.back, p)} uploading={isUploading(group.back, p)}
                            onFileChange={(f) => setPendingFile(group.back, p, f)}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <HiOutlinePhotograph className="w-3.5 h-3.5" />
                      Click an image to replace · JPEG, PNG · max 10 MB
                    </p>
                  </div>
                </div>
              ))}

              {/* Other docs tab — full-width when active */}
              {activeTab === "other" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                        <HiOutlineDocumentText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Other Supporting Documents</h3>
                        <p className="text-[10px] text-slate-400">{otherDocs.length} existing · {newOtherFiles.length} queued</p>
                      </div>
                    </div>
                    <button onClick={() => otherInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <HiOutlinePlus className="w-3.5 h-3.5" /> Add Files
                    </button>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Empty state */}
                    {otherDocs.length === 0 && newOtherFiles.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <HiOutlineDocumentText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400">No other documents yet</p>
                        <p className="text-xs text-slate-400">Upload any additional supporting documents</p>
                      </div>
                    )}

                    {/* Existing */}
                    {otherDocs.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Existing Files</p>
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                          {otherDocs.map((doc) => (
                            <div key={doc.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 group">
                              <img src={storageUrl(doc.file_path)} alt={doc.file_name} className="w-full h-full object-contain" />
                              <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[8px] text-white truncate">{doc.file_name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Queued new */}
                    {newOtherFiles.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-3">Queued for Upload</p>
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                          {newOtherFiles.map((file, i) => (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                              className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-300 bg-slate-50">
                              <img src={URL.createObjectURL(file)} alt="New" className="w-full h-full object-contain" />
                              <div className="absolute top-0.5 left-0.5 bg-blue-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-sm">NEW</div>
                              <button onClick={() => setNewOtherFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center hover:bg-red-600 transition-colors">×</button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add zone */}
                    <button onClick={() => otherInputRef.current?.click()}
                      className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/40 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                        <HiOutlinePhotograph className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold">Add Documents</span>
                      <span className="text-xs">JPEG, PNG · max 10 MB each</span>
                    </button>
                  </div>

                  <input ref={otherInputRef} type="file" accept="image/jpeg,image/jpg,image/png"
                    multiple className="hidden"
                    onChange={(e) => { setNewOtherFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
                </div>
              )}
            </div>


          </motion.div>
        </AnimatePresence>
      </div>


    </div>
  );
};

export default EditCustomerDocs;
