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
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineCreditCard,
  HiOutlineShieldCheck,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineLockClosed,
  HiOutlineChevronDown,
} from "react-icons/hi";
import Swal from "sweetalert2";
import api from "../../services/api";


// ── Helpers ───────────────────────────────────────────────────────────────────
const storageUrl = (path, version = null) => {
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api$/, "");
  if (!path) return "";
  const ver = version ? `?v=${encodeURIComponent(String(version))}` : "";
  return `${base}/storage/${path}${ver}`;
};

const customerId = (id) => `C-${String(id).padStart(4, "0")}`;

const STATUS_CFG = {
  active:      { pill: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  dormant:     { pill: "bg-yellow-100 text-yellow-700 border border-yellow-200",    dot: "bg-yellow-500"  },
  escheat:     { pill: "bg-orange-100 text-orange-700 border border-orange-200",    dot: "bg-orange-500"  },
  closed:      { pill: "bg-red-100 text-red-700 border border-red-200",              dot: "bg-red-500"     },
  reactivated: { pill: "bg-teal-100 text-teal-700 border border-teal-200",          dot: "bg-teal-500"    },
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
const ImageCard = ({ doc, side, accent, preview, uploading, uploaded, onFileChange, readOnly = false, isDormant = false }) => {
  const inputRef = useRef(null);
  const ac  = ACCENT[accent];
  const src = preview
    ? URL.createObjectURL(preview)
    : doc
      ? storageUrl(doc.file_path, doc.updated_at ?? doc.created_at ?? doc.id)
      : null;

  const blocked = readOnly;

  let borderCls = blocked
    ? "border-slate-200"
    : "border-slate-200 hover:border-slate-300";
  if (!blocked && preview && !uploaded) borderCls = `ring-2 ${ac.ring} border-transparent shadow-lg`;
  if (uploaded)                         borderCls = "ring-2 ring-emerald-400 border-transparent shadow-lg shadow-emerald-50";

  return (
    <div className="flex flex-col gap-2">
      {/* Card header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{side} Side</span>
        <AnimatePresence mode="wait">
          {readOnly && doc && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <HiOutlineLockClosed className="w-3 h-3" /> Historical
            </span>
          )}
          {!readOnly && uploaded && (
            <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Saved
            </motion.span>
          )}
          {!readOnly && preview && !uploaded && (
            <motion.span key="rdy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[11px] font-semibold text-blue-500">
              Ready
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Image area */}
      <div
        onClick={blocked ? undefined : () => !uploading && inputRef.current?.click()}
        className={`relative group w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 bg-slate-50 transition-all duration-200 ${blocked ? "cursor-default" : "cursor-pointer"} ${borderCls} ${uploading ? "cursor-wait" : ""}`}
      >
        {src ? (
          <img src={src} alt={side} className={`w-full h-full object-contain transition-all${readOnly ? " opacity-70" : ""}${isDormant ? " blur-md" : ""}`} />
        ) : (
          <div className={`flex flex-col items-center justify-center h-full gap-3 select-none ${ac.bg}`}>
            <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <HiOutlinePhotograph className={`w-6 h-6 ${ac.icon}`} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">No image</p>
              {!blocked && <p className="text-[10px] text-slate-400">Click to upload</p>}
            </div>
          </div>
        )}

        {/* Dormant blur overlay */}
        {isDormant && src && (
          <div className="absolute inset-0 bg-yellow-900/10 flex items-end justify-center pb-3">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-900/60 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-yellow-100">Dormant</span>
            </div>
          </div>
        )}

        {/* Lock overlay for historical docs */}
        {readOnly && !isDormant && src && (
          <div className="absolute inset-0 bg-slate-900/10 flex items-end justify-center pb-3">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 backdrop-blur-sm">
              <HiOutlineLockClosed className="w-3 h-3 text-white/80" />
              <span className="text-[10px] font-semibold text-white/80">Historical — View Only</span>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        {!blocked && !uploading && (
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
        {!blocked && preview && !uploaded && (
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

      {/* Remove pending file button — below the image, always visible and clickable */}
      {!blocked && preview && !uploaded && !uploading && (
        <button
          onClick={() => onFileChange(null)}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold transition-colors"
        >
          <HiOutlineX className="w-3.5 h-3.5" />
          Remove
        </button>
      )}

      {!blocked && (
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
          onChange={(e) => { onFileChange(e.target.files[0] ?? null); e.target.value = ""; }} />
      )}
    </div>
  );
};

// ── New pair upload card (for "Add Another") ─────────────────────────────────
const NewPairUploadCard = ({ file, side, accent, onFileChange }) => {
  const inputRef = useRef(null);
  const ac = ACCENT[accent];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{side} Side</span>
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative group w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 bg-slate-50 transition-all duration-200 cursor-pointer ${
          file ? `ring-2 ${ac.ring} border-transparent shadow-lg` : `${ac.bg} border-slate-200 hover:border-slate-300`
        }`}
      >
        {file ? (
          <img src={URL.createObjectURL(file)} alt={side} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <HiOutlinePhotograph className={`w-6 h-6 ${ac.icon}`} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">No image</p>
              <p className="text-[10px] text-slate-400">Click to upload</p>
            </div>
          </div>
        )}
        {file && (
          <div className={`absolute top-2 left-2 ${ac.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow`}>NEW</div>
        )}
      </div>
      {file && (
        <button onClick={() => onFileChange(null)}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold transition-colors">
          <HiOutlineX className="w-3.5 h-3.5" /> Remove
        </button>
      )}
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
const EditCustomerDocs = ({ basePath = "/user" }) => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const backPath = `${basePath}/customers/${id}/view`;

  const [customer, setCustomer]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [pending, setPending]             = useState({});
  const [uploaded, setUploaded]           = useState({});
  const [uploading, setUploading]         = useState(new Set());
  const [saving, setSaving]               = useState(false);
  const [saveProgress, setSaveProgress]   = useState({ done: 0, total: 0 });

  const [newOtherFiles, setNewOtherFiles] = useState([]);
  const [activePerson, setActivePerson]   = useState(1);
  const [newPairs, setNewPairs]           = useState({}); // { "sigcard": [{front:null,back:null}], ... }
  const [histExpanded, setHistExpanded]   = useState({}); // { [sectionKey]: bool }
  const otherInputRef = useRef(null);
  const [removingDocId, setRemovingDocId] = useState(null);
  const showHistoryInEdit = false; // Edit page should only show latest/current docs.

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

  // ── Remove existing other doc ──────────────────────────────────────────────
  const handleRemoveOtherDoc = async (doc) => {
    const result = await Swal.fire({
      title: "Remove Document?",
      text: `This will permanently delete "${doc.file_name || "this document"}". This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setRemovingDocId(doc.id);
    try {
      await api.delete(`/customers/${id}/documents/${doc.id}`);
      setCustomer((prev) => ({
        ...prev,
        documents: (prev.documents ?? []).filter((d) => d.id !== doc.id),
      }));
      Swal.fire({ icon: "success", title: "Removed", text: "Document has been deleted.", timer: 1500, showConfirmButton: false });
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to remove document.";
      Swal.fire({ icon: "error", title: "Error", text: msg, confirmButtonColor: "#dc2626" });
    } finally {
      setRemovingDocId(null);
    }
  };

  // ── Latest-status gate ─────────────────────────────────────────────────────
  // Mirror CustomerView's 3-tier priority:
  //   1. Most recent status_log with docs (log-linked, new path)
  //   2. Most recent legacy group (account_status set but no status_log_id, old path)
  //   3. Initial upload (no account_status) — all editable
  const statusLogs = customer?.status_logs ?? [];
  const latestLogWithDocs = statusLogs.find((log) => (log.documents ?? []).length > 0) ?? null;

  // Legacy groups: docs that have account_status but were uploaded before the log feature
  const allStatusDocs = (customer?.documents ?? []).filter((d) => !!d.account_status);
  const legacyGroupMap = allStatusDocs.filter((d) => !d.status_log_id).reduce((acc, doc) => {
    const key = doc.account_status;
    if (!acc[key]) acc[key] = { docs: [], latestDate: null };
    acc[key].docs.push(doc);
    if (!acc[key].latestDate || doc.created_at > acc[key].latestDate) acc[key].latestDate = doc.created_at;
    return acc;
  }, {});
  const legacySorted = Object.values(legacyGroupMap).sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""));
  // Only use legacy group when there are no log-linked docs (same condition as CustomerView)
  const latestLegacyGroup = latestLogWithDocs ? null : (legacySorted[0] ?? null);

  // The "current" doc set — exactly what CustomerView's main Documents section shows
  const latestDocIds = new Set([
    ...(latestLogWithDocs?.documents ?? []).map((d) => d.id),
    ...(latestLegacyGroup?.docs ?? []).map((d) => d.id),
  ]);
  // A doc is editable when it belongs to the current set; if no status docs exist at all, everything is editable.
  // For non-Joint multi-account customers, "latest" is evaluated per person_index (each account independently).
  const isLatestDoc = (doc) => {
    if (!doc?.id) return true;

    const _isMultiAccount = customer?.account_type !== "Joint" && customer?.account_type !== "Corporate" && (customer?.accounts ?? []).length >= 1;
    if (_isMultiAccount) {
      const pi = doc.person_index;
      const logForPi = statusLogs.find(
        (log) => (log.documents ?? []).some((d) => d.person_index === pi)
      ) ?? null;
      if (!logForPi) {
        const piLegacyDocs = allStatusDocs.filter((d) => !d.status_log_id && d.person_index === pi);
        if (piLegacyDocs.length === 0) return doc.is_current !== false;
        const piLegacyGroups = piLegacyDocs.reduce((acc, d) => {
          const k = d.account_status;
          if (!acc[k]) acc[k] = { docs: [], latestDate: null };
          acc[k].docs.push(d);
          if (!acc[k].latestDate || d.created_at > acc[k].latestDate) acc[k].latestDate = d.created_at;
          return acc;
        }, {});
        const latestLegacyStatusForPi = Object.values(piLegacyGroups)
          .sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""))[0]?.docs[0]?.account_status;
        return !doc.status_log_id && doc.account_status === latestLegacyStatusForPi;
      }
      if (doc.status_log_id === logForPi.id) return true;
      const logPiDocIds = new Set((logForPi.documents ?? []).map((d) => d.id));
      return logPiDocIds.has(doc.id);
    }

    // Single account / Joint (original logic)
    if (!latestLogWithDocs && !latestLegacyGroup) return true;
    if (latestDocIds.has(doc.id)) return true;
    if (latestLogWithDocs?.id && doc.status_log_id === latestLogWithDocs.id) return true;
    if (!latestLogWithDocs && latestLegacyGroup?.docs?.length) {
      const legacyStatus = latestLegacyGroup.docs[0]?.account_status;
      if (!doc.status_log_id && legacyStatus && doc.account_status === legacyStatus) return true;
    }
    return false;
  };

  // Returns the account_status + status_log_id that a NEW doc should inherit so it
  // joins the existing status group and is recognized by isLatestDoc / CustomerView.
  const getStatusContext = (personIndex) => {
    const _isMultiAccount = customer?.account_type !== "Joint" && customer?.account_type !== "Corporate" && (customer?.accounts ?? []).length >= 1;
    if (_isMultiAccount) {
      const logForPi = statusLogs.find(
        (log) => (log.documents ?? []).some((d) => d.person_index === personIndex)
      ) ?? null;
      if (logForPi) return { account_status: logForPi.status, status_log_id: logForPi.id };
      const piLegacyDocs = allStatusDocs.filter((d) => !d.status_log_id && d.person_index === personIndex);
      if (piLegacyDocs.length > 0) {
        const piLegacyGroups = piLegacyDocs.reduce((acc, d) => {
          const k = d.account_status;
          if (!acc[k]) acc[k] = { docs: [], latestDate: null };
          acc[k].docs.push(d);
          if (!acc[k].latestDate || d.created_at > acc[k].latestDate) acc[k].latestDate = d.created_at;
          return acc;
        }, {});
        const latestLegacyStatus = Object.values(piLegacyGroups)
          .sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""))[0]?.docs[0]?.account_status ?? null;
        return { account_status: latestLegacyStatus, status_log_id: null };
      }
      return { account_status: null, status_log_id: null };
    }
    if (latestLogWithDocs) return { account_status: latestLogWithDocs.status, status_log_id: latestLogWithDocs.id };
    if (latestLegacyGroup) return { account_status: latestLegacyGroup.docs[0]?.account_status ?? null, status_log_id: null };
    return { account_status: null, status_log_id: null };
  };

  // ── Derived helpers ────────────────────────────────────────────────────────
  // Prefer docs from the current (editable) set; fall back to older docs shown read-only.
  const getDoc = (type, pi) => {
    const all = (customer?.documents ?? []).filter((d) => d.document_type === type && d.person_index === pi);
    const latestFirst = [...all].sort((a, b) => {
      // Absolute first priority: is_current=true always wins over is_current=false
      if (b.is_current !== a.is_current) return b.is_current ? 1 : -1;
      // Then prefer docs from the latest status group
      const rankA = isLatestDoc(a) ? 0 : 1;
      const rankB = isLatestDoc(b) ? 0 : 1;
      if (rankA !== rankB) return rankA - rankB;
      // Final tiebreak: highest id (most recently created)
      return (b.id ?? 0) - (a.id ?? 0);
    });
    return latestFirst[0] ?? null;
  };
  // Sort helper — latest-log docs first so editable cards render above historical ones
  const sortLatestFirst = (docs) =>
    [...docs].sort((a, b) => {
      const rankA = isLatestDoc(a) ? 0 : 1;
      const rankB = isLatestDoc(b) ? 0 : 1;
      if (rankA !== rankB) return rankA - rankB;
      return String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""));
    });
  const getAllDocs       = (type, pi) => sortLatestFirst((customer?.documents ?? []).filter((d) => d.document_type === type && d.person_index === pi));
  const getAllDocsOfType = (type)     => sortLatestFirst((customer?.documents ?? []).filter((d) => d.document_type === type));
  const personKey = (pi) => `pi_${pi}`;

  const setPendingFile = (type, pi, file) => {
    const key = `${type}__${personKey(pi)}`;
    setPending((p) => ({ ...p, [key]: file }));
    setUploaded((p) => { const n = { ...p }; delete n[key]; return n; });
  };
  const getPendingFile = (type, pi) => pending[`${type}__${personKey(pi)}`] ?? null;
  const isUploaded     = (type, pi) => !!uploaded[`${type}__${personKey(pi)}`];
  const isUploading    = (type, pi) => uploading.has(`${type}__${personKey(pi)}`);

  const isJoint     = customer?.account_type === "Joint";
  const isCorporate = customer?.account_type === "Corporate";
  const isITF       = isJoint && customer?.joint_sub_type === "ITF";
  const isNonITF    = isJoint && customer?.joint_sub_type === "Non-ITF";
  const holders     = customer?.holders ?? [];

  // For ITF all docs are shared; for Non-ITF only privacy is shared
  const isSharedDoc = (groupKey) => {
    if (isITF) return true; // all doc types shared for ITF
    if (isNonITF && groupKey === "privacy") return true;
    return false;
  };

  // Build person/account list depending on account type
  // Joint: persons = primary customer (1) + joint holders (2, 3…)
  // Non-Joint with multiple accounts: each account maps to a person_index
  const allPersons = (() => {
    if (!customer) return [{ index: 1, label: "Person 1", name: "" }];

    if (isJoint) {
      const primary = {
        index: 1,
        label: "Person 1",
        name: `${customer.firstname ?? ""} ${customer.lastname ?? ""}`.trim(),
      };
      const jointHolders = holders.map((h) => ({
        index: h.person_index,
        label: `Person ${h.person_index}`,
        name: `${h.firstname ?? ""} ${h.lastname ?? ""}`.trim(),
      }));
      return [primary, ...jointHolders];
    }

    // Corporate: show signatories (like Joint) — person tabs switch signatory for sigcard back
    if (isCorporate) {
      const primary = {
        index: 1,
        label: "Signatory 1",
        name: `${customer.firstname ?? ""} ${customer.lastname ?? ""}`.trim(),
      };
      const corpHolders = holders.map((h) => ({
        index: h.person_index,
        label: `Signatory ${h.person_index}`,
        name: `${h.firstname ?? ""} ${h.lastname ?? ""}`.trim(),
      }));
      return [primary, ...corpHolders];
    }

    // Non-Joint: primary account + additional accounts
    const items = [
      {
        index: 1,
        label: customer.account_no ? `Acct: ${customer.account_no}` : "Account 1",
        name: `${customer.firstname ?? ""} ${customer.lastname ?? ""}`.trim(),
      },
    ];
    (customer.accounts ?? []).forEach((a, i) => {
      items.push({
        index: i + 2,
        label: a.account_no ? `Acct: ${a.account_no}` : `Account ${i + 2}`,
        name: `${customer.firstname ?? ""} ${customer.lastname ?? ""}`.trim(),
      });
    });
    return items;
  })();

  // Account tabs — shown for non-Joint customers with 2+ accounts (mirrors CustomerView)
  const allAccounts = !isJoint && !isCorporate ? [
    { account_no: customer?.account_no, status: customer?.status, acctIndex: 1 },
    ...(customer?.accounts ?? []).map((a, i) => ({
      account_no: a.account_no, status: a.status, acctIndex: i + 2,
    })),
  ] : [];
  const showAccountTabs = allAccounts.length >= 2;

  // Dormant: blur docs and block upload for the active account when status is dormant
  const activeStatus = showAccountTabs
    ? (allAccounts.find((a) => a.acctIndex === activePerson)?.status ?? customer?.status)
    : customer?.status;
  const isDormant = activeStatus === "dormant";

  // Ensure activePerson is valid
  useEffect(() => {
    if (customer && !allPersons.some((p) => p.index === activePerson)) {
      setActivePerson(allPersons[0]?.index ?? 1);
    }
  }, [customer, activePerson, allPersons]);

  // Show all other docs regardless of person — page no longer uses person tabs
  const otherDocs = (customer?.documents ?? []).filter((d) => d.document_type === "other");

  const totalNewPairFiles = Object.values(newPairs).reduce((sum, pairs) =>
    sum + pairs.reduce((c, p) => c + (p.front ? 1 : 0) + (p.back ? 1 : 0), 0), 0);
  const totalPending = Object.values(pending).filter(Boolean).length + newOtherFiles.length + totalNewPairFiles;

  const newPairPendingCount = (groupKey) => {
    const pairs = newPairs[groupKey] ?? [];
    return pairs.reduce((c, p) => c + (p.front ? 1 : 0) + (p.back ? 1 : 0), 0);
  };

  // Count pending files per doc section (for quick-nav badges)
  const sectionPending = (groupKey) => {
    if (groupKey === "other") return newOtherFiles.length;
    const group = DOC_GROUPS.find((g) => g.key === groupKey);
    if (!group) return 0;
    let count = 0;
    Object.entries(pending).forEach(([key, file]) => {
      if (file && (key.startsWith(group.front + "__") || key.startsWith(group.back + "__"))) count++;
    });
    count += newPairPendingCount(groupKey);
    return count;
  };

  // ── Upload helpers ─────────────────────────────────────────────────────────
  // Returns true on success, throws on failure.
  // Does NOT touch `uploaded` or `pending` — handleSaveAll owns those after the
  // full batch (including the customer refresh) completes.
  const uploadOne = async (pendingKey, document_type, person_index, file, document_id, account_status = null, status_log_id = null) => {
    const fd = new FormData();
    fd.append("document_type", document_type);
    fd.append("person_index",  String(person_index));
    fd.append("file",          file);
    if (document_id) fd.append("document_id", String(document_id));
    // New docs (no existing) must carry the current status context so they join the right
    // status group and appear in CustomerView / EditCustomerDocs after the refresh.
    if (!document_id && account_status) fd.append("account_status", account_status);
    if (!document_id && status_log_id)  fd.append("status_log_id",  String(status_log_id));
    await api.post(`/customers/${id}/replace-document`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(pending).filter(([, f]) => f);
    // Collect new pair files
    const pairEntries = [];
    for (const [groupKey, pairs] of Object.entries(newPairs)) {
      const group = DOC_GROUPS.find((g) => g.key === groupKey);
      if (!group) continue;
      if (isCorporate && groupKey === "sigcard") {
        // Corporate sigcard new fronts: each gets next available person_index
        const existingFrontCount = getAllDocsOfType(group.front).length;
        for (let i = 0; i < pairs.length; i++) {
          const pi = existingFrontCount + i + 1;
          if (pairs[i].front) pairEntries.push({ type: group.front, pi, file: pairs[i].front });
          if (pairs[i].back)  pairEntries.push({ type: group.back,  pi, file: pairs[i].back });
        }
      } else {
        const pi = 1; // shared docs always use pi=1; non-shared "Add Another" not shown
        for (const pair of pairs) {
          if (pair.front) pairEntries.push({ type: group.front, pi, file: pair.front });
          if (pair.back)  pairEntries.push({ type: group.back,  pi, file: pair.back });
        }
      }
    }
    const total = entries.length + pairEntries.length + newOtherFiles.length;
    if (total === 0) return;

    setSaving(true);
    let done = 0, failed = 0, lastErrMsg = null;
    setSaveProgress({ done: 0, total });

    try {
      // For corporate sigcard fronts, build a positional person_index map
      const corpFrontPiMap = {};
      if (isCorporate) {
        const allFronts = getAllDocsOfType("sigcard_front");
        allFronts.forEach((doc, idx) => { corpFrontPiMap[doc.id] = idx + 1; });
      }

      // Build all replacement tasks and run in parallel
      const replacementTasks = entries.map(([key, file]) => {
        const parts = key.split("__");
        const document_type = parts[0];
        const secondPart = parts[1] ?? "";
        const isExplicitPersonKey = secondPart.startsWith("pi_");
        const isPairSlotKey = parts.length > 2;
        const isPersonKey = isExplicitPersonKey || isPairSlotKey;

        const parsedPersonIndex = isExplicitPersonKey
          ? parseInt(secondPart.slice(3))
          : parseInt(secondPart);
        const safePersonIndex = Number.isFinite(parsedPersonIndex) && parsedPersonIndex > 0 ? parsedPersonIndex : 1;

        const matchingDoc = !isPersonKey
          ? (customer?.documents ?? []).find((d) => d.id === parseInt(secondPart) && d.document_type === document_type)
          : null;

        let person_index = matchingDoc ? matchingDoc.person_index : safePersonIndex;
        let document_id  = matchingDoc ? matchingDoc.id : null;

        if (!matchingDoc) {
          const existingDoc = getDoc(document_type, person_index);
          if (existingDoc && isLatestDoc(existingDoc)) document_id = existingDoc.id;
        }

        if (isCorporate && document_type === "sigcard_front" && matchingDoc) {
          person_index = corpFrontPiMap[matchingDoc.id] ?? person_index;
        }

        // For new docs (no existing), carry current status context so the upload
        // joins the right status group instead of creating an orphaned initial doc.
        const { account_status, status_log_id } = document_id
          ? { account_status: null, status_log_id: null }
          : getStatusContext(person_index);

        return { key, document_type, person_index, file, document_id, account_status, status_log_id };
      });

      // Mark ALL replacement cards as uploading in ONE state update so every
      // spinner appears in the same render cycle (not one-by-one).
      const taskKeys = replacementTasks.map((t) => t.key);
      if (taskKeys.length > 0) {
        setUploading((prev) => new Set([...prev, ...taskKeys]));
      }

      const results = await Promise.allSettled(
        replacementTasks.map(({ key, document_type, person_index, file, document_id, account_status, status_log_id }) =>
          uploadOne(key, document_type, person_index, file, document_id, account_status, status_log_id)
        )
      );

      // Determine which keys succeeded vs. failed
      const failedKeys = new Set(
        results
          .map((r, i) => (r.status === "rejected" ? replacementTasks[i].key : null))
          .filter(Boolean)
      );
      results.forEach((result) => {
        done++;
        if (result.status === "rejected") {
          failed++;
          lastErrMsg = result.reason?.response?.data?.message ?? lastErrMsg;
        }
        setSaveProgress({ done, total });
      });

      // Remove spinner from all replacement cards now that uploads are done.
      if (taskKeys.length > 0) {
        setUploading((prev) => {
          const s = new Set(prev);
          taskKeys.forEach((k) => s.delete(k));
          return s;
        });
      }

      // Refresh customer, then — in one batch — mark successes as SAVED and clear
      // their previews. Doing it after setCustomer means the new server image is
      // available before the preview blob is dropped, so no broken-image gap.
      if (entries.length > 0) {
        try {
          const { data } = await api.get(`/customers/${id}`);
          // Batch all post-refresh state updates together
          setCustomer(data);
          setUploaded((prev) => {
            const next = { ...prev };
            taskKeys.forEach((k) => { if (!failedKeys.has(k)) next[k] = true; });
            return next;
          });
          setPending((prev) => {
            const next = { ...prev };
            entries.forEach(([key]) => { if (!failedKeys.has(key)) delete next[key]; });
            return next;
          });
        } catch { /* non-fatal — images will update on next full reload */ }
      }

      // Upload new pair files (Add Another) — group by doc key then send via update endpoint
      if (pairEntries.length > 0) {
        // Group pairEntries by their pair group (sigcard, nais, privacy)
        const PAIR_KEY_MAP = { sigcard_front: "sigcardPairs", sigcard_back: "sigcardPairs", nais_front: "naisPairs", nais_back: "naisPairs", privacy_front: "privacyPairs", privacy_back: "privacyPairs" };
        const grouped = {};
        for (const entry of pairEntries) {
          const fdKey = PAIR_KEY_MAP[entry.type];
          if (!grouped[fdKey]) grouped[fdKey] = [];
          grouped[fdKey].push(entry);
        }

        setUploading((prev) => new Set([...prev, "newpairs"]));
        try {
          const fd = new FormData();
          fd.append("_method", "PUT");
          for (const [fdKey, items] of Object.entries(grouped)) {
            // Group front/back into pair indices
            let pairIdx = 0;
            for (let i = 0; i < items.length; i++) {
              const side = items[i].type.endsWith("_front") ? "front" : "back";
              fd.append(`${fdKey}[${pairIdx}][${side}]`, items[i].file);
              fd.append(`${fdKey}[${pairIdx}][person_index]`, String(items[i].pi));
              // If this is a back or the next item is not the matching back, advance pair index
              if (side === "back" || i + 1 >= items.length || !items[i + 1].type.endsWith("_back")) pairIdx++;
            }
          }
          const { data } = await api.post(`/customers/${id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setCustomer(data.customer);
          done += pairEntries.length;
        } catch {
          failed += pairEntries.length;
          done += pairEntries.length;
        }
        setUploading((prev) => { const s = new Set(prev); s.delete("newpairs"); return s; });
        setSaveProgress({ done, total });
      }

      if (newOtherFiles.length > 0) {
        setUploading((prev) => new Set([...prev, "other__new"]));
        try {
          const fd = new FormData();
          fd.append("_method", "PUT");
          const otherUploadIdx = showAccountTabs ? activePerson : 1;
          // Pass current status context so other docs join the right status group.
          const { account_status: otherStatus, status_log_id: otherLogId } = getStatusContext(otherUploadIdx);
          if (otherStatus) fd.append("account_status", otherStatus);
          if (otherLogId)  fd.append("status_log_id",  String(otherLogId));
          newOtherFiles.forEach((f) => fd.append(`otherDocs[${otherUploadIdx}][]`, f));
          const { data } = await api.post(`/customers/${id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setCustomer(data.customer);
          done += newOtherFiles.length;
        } catch {
          failed += newOtherFiles.length;
          done   += newOtherFiles.length;
        } finally {
          setUploading((prev) => { const s = new Set(prev); s.delete("other__new"); return s; });
          setSaveProgress({ done, total });
        }
      }

      setNewOtherFiles([]);
      setNewPairs({});

      if (failed === 0) {
        await Swal.fire({
          icon: "success", title: "Documents Saved",
          text: `${total} file${total !== 1 ? "s" : ""} uploaded successfully.`,
          confirmButtonColor: "#2563eb", timer: 2500, timerProgressBar: true,
        });
      } else {
        Swal.fire({
          icon: "warning", title: "Partial Upload",
          text: lastErrMsg
            ? `${total - failed} succeeded, ${failed} failed. ${lastErrMsg}`
            : `${total - failed} succeeded, ${failed} failed. Please retry the failed files.`,
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
        <button onClick={() => navigate(backPath)}
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
          <button onClick={() => navigate(backPath)}
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
                <span className="flex items-center gap-1"><HiOutlineCreditCard className="w-3 h-3" />{customer.account_type}{isJoint && holders.length > 0 && ` · ${allPersons.length} holders`}</span>
                <span className="flex items-center gap-1"><HiOutlineShieldCheck className="w-3 h-3" />{customer.risk_level}</span>
                <span className="flex items-center gap-1"><HiOutlineOfficeBuilding className="w-3 h-3" />{customer.branch?.branch_name ?? "No Branch"}</span>
              </div>
            </div>

            <button onClick={loadCustomer} title="Refresh"
              className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
              <HiOutlineRefresh className="w-4 h-4" />
            </button>
          </div>

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
            <button onClick={() => navigate(backPath)}
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
        {/* Quick-nav section tabs */}
        <div className="border-t border-slate-100 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex gap-2 overflow-x-auto">
          {[...DOC_GROUPS, { key: "other", label: "Other Docs" }].map((g) => {
            const count = sectionPending(g.key);
            const grp = DOC_GROUPS.find((gr) => gr.key === g.key);
            const hasCurrentDocs = grp
              ? (customer?.documents ?? []).some(
                  (d) =>
                    (d.document_type === grp.front || d.document_type === grp.back) &&
                    isLatestDoc(d) &&
                    (!showAccountTabs || d.person_index === activePerson)
                )
              : otherDocs.filter((d) => !showAccountTabs || d.person_index === activePerson).some((d) => isLatestDoc(d));
            return (
              <button
                key={g.key}
                onClick={() => document.getElementById(`section-${g.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                {g.label}
                {!hasCurrentDocs && (
                  <span className="bg-blue-100 text-blue-600 border border-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">Add New</span>
                )}
                {count > 0 && (
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Main content ══════════════════════════════════════════════════════ */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Account tabs — non-Joint with 2+ accounts */}
        {showAccountTabs && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <HiOutlineCreditCard className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800">Select Account</h3>
              <span className="ml-auto text-xs text-slate-400">{allAccounts.length} accounts</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {allAccounts.map((acct) => {
                  const isActive = activePerson === acct.acctIndex;
                  const sCfg = STATUS_CFG[acct.status] ?? STATUS_CFG.active;
                  return (
                    <button
                      key={acct.acctIndex}
                      onClick={() => setActivePerson(acct.acctIndex)}
                      className={`flex flex-col gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border-2 flex-shrink-0 text-left ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <HiOutlineCreditCard className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white/80" : "text-slate-400"}`} />
                        <span className="font-mono">{acct.account_no ?? `Account ${acct.acctIndex}`}</span>
                        {acct.acctIndex === 1 && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                            Primary
                          </span>
                        )}
                      </div>
                      <span className={`self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        isActive ? "bg-white/20 text-white" : sCfg.pill
                      }`}>
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isActive ? "bg-white/70" : sCfg.dot}`} />
                        {acct.status ?? "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dormant notice banner */}
        {isDormant && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-300 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <HiOutlineLockClosed className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-yellow-800">Dormant Account</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                This account is dormant. Document images are blurred for display.
              </p>
            </div>
          </div>
        )}

        <div className="w-full">

            {DOC_GROUPS.map((group) => {
              const shared = isSharedDoc(group.key);
              const ac = ACCENT[group.accent];

              // ── Corporate Sigcard: shared fronts grid + per-signatory backs ──
              if (isCorporate && group.key === "sigcard") {
              const existingFronts = getAllDocsOfType(group.front);
              const addedPairs = newPairs["sigcard"] ?? [];
              const latestFrontsC  = existingFronts.filter((d) => isLatestDoc(d));
              const histFrontsC    = existingFronts.filter((d) => !isLatestDoc(d));
              const corpHistKey    = "corp-fronts";
              const isCorpHistOpen = histExpanded[corpHistKey] ?? false;
              const editableFronts = latestFrontsC.length > 0 ? latestFrontsC : [null];

              return (
                <div key={group.key} id="section-sigcard" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center px-5 py-3.5 border-b border-slate-100 gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ac.bg}`}>
                      <HiOutlineDocumentText className={`w-4 h-4 ${ac.icon}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Signature Card</h3>
                      <p className="text-[10px] text-slate-400">Corporate — Shared fronts + per-signatory backs</p>
                    </div>
                  </div>

                    <div className="px-5 py-5 space-y-6">
                      {/* ── Shared Fronts (person_index=1) ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sigcard Front (Shared)</p>
                        {editableFronts.map((frontDoc, pairIdx) => {
                          const frontKey = frontDoc ? `${group.front}__${frontDoc.id}` : `${group.front}__1__p${pairIdx}`;
                          return (
                            <div key={pairIdx} className="space-y-2">
                              {(editableFronts.length + addedPairs.length) > 1 && (
                                <p className="text-xs font-medium text-slate-400">Front {pairIdx + 1}</p>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <ImageCard
                                  doc={frontDoc} side="Front" accent={group.accent}
                                  readOnly={false} isDormant={isDormant}
                                  preview={pending[frontKey] ?? null}
                                  uploaded={!!uploaded[frontKey]}
                                  uploading={uploading.has(frontKey)}
                                  onFileChange={(f) => {
                                    setPending((p) => ({ ...p, [frontKey]: f }));
                                    setUploaded((p) => { const n = { ...p }; delete n[frontKey]; return n; });
                                  }}
                                />
                                <div />
                              </div>
                            </div>
                          );
                        })}
                        {/* Historical fronts — collapsible */}
                        {showHistoryInEdit && histFrontsC.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setHistExpanded((p) => ({ ...p, [corpHistKey]: !isCorpHistOpen }))}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <HiOutlineLockClosed className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-semibold text-slate-500">Previous Uploads</span>
                                <span className="text-[10px] text-slate-400">({histFrontsC.length} front{histFrontsC.length !== 1 ? "s" : ""})</span>
                              </div>
                              <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCorpHistOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isCorpHistOpen && (
                              <div className="px-4 py-4 space-y-4 bg-slate-50/50 border-t border-slate-100">
                                {histFrontsC.map((frontDoc, i) => (
                                  <div key={i} className="space-y-2">
                                    {histFrontsC.length > 1 && <p className="text-xs font-medium text-slate-400">Front {i + 1}</p>}
                                    <div className="grid grid-cols-2 gap-4">
                                      <ImageCard doc={frontDoc} side="Front" accent={group.accent} readOnly={true} isDormant={isDormant}
                                        preview={null} uploaded={false} uploading={false} onFileChange={() => {}} />
                                      <div />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* New front pairs added via "Add Another" */}
                        {addedPairs.map((pair, pairIdx) => (
                          <div key={`new-front-${pairIdx}`} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-slate-400">Front {existingFronts.length + pairIdx + 1}</p>
                              <button type="button" onClick={() => setNewPairs((prev) => ({
                                ...prev, sigcard: (prev.sigcard ?? []).filter((_, i) => i !== pairIdx),
                              }))}
                                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                                <HiOutlineX className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <NewPairUploadCard file={pair.front} side="Front" accent={group.accent}
                                onFileChange={(f) => setNewPairs((prev) => {
                                  const pairs = [...(prev.sigcard ?? [])];
                                  pairs[pairIdx] = { ...pairs[pairIdx], front: f };
                                  return { ...prev, sigcard: pairs };
                                })} />
                              <div />
                            </div>
                          </div>
                        ))}

                        {/* Add Another Sigcard Front button — only when 3+ signatories */}
                        {allPersons.length >= 3 && (
                          <button type="button" onClick={() => setNewPairs((prev) => ({
                            ...prev, sigcard: [...(prev.sigcard ?? []), { front: null, back: null }],
                          }))}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-blue-600 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all">
                            <HiOutlinePlus className="w-3.5 h-3.5" />
                            Add Another Sigcard Front
                          </button>
                        )}
                      </div>

                      {/* ── Divider ── */}
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-slate-200" />
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Risk Profiling — per signatory</p>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      {/* ── Per-signatory Backs + Corporate entity back ── */}
                      <div className="grid grid-cols-2 gap-4">
                        {allPersons.map((person) => {
                          const backDoc = getDoc(group.back, person.index);
                          const backKey = backDoc ? `${group.back}__${backDoc.id}` : `${group.back}__${personKey(person.index)}`;
                          return (
                            <div key={person.index} className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${person.index === 1 ? "bg-blue-600" : "bg-slate-600"}`}>{person.index}</div>
                                <p className="text-xs font-semibold text-slate-600 truncate">{person.name || person.label}</p>
                              </div>
                              <ImageCard doc={backDoc} side="Back" accent={group.accent} readOnly={!isLatestDoc(backDoc)} isDormant={isDormant}
                                preview={pending[backKey] ?? null} uploaded={!!uploaded[backKey]} uploading={uploading.has(backKey)}
                                onFileChange={(f) => { setPending((p) => ({ ...p, [backKey]: f })); setUploaded((p) => { const n = { ...p }; delete n[backKey]; return n; }); }} />
                            </div>
                          );
                        })}
                        {/* Corporate entity back — person_index = numSignatories + 1 */}
                        {(() => {
                          const ceIdx = allPersons.length + 1;
                          const ceDoc = getDoc(group.back, ceIdx);
                          if (!ceDoc) return null;
                          const ceKey = `${group.back}__${ceDoc.id}`;
                          return (
                            <div key="corp-entity" className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-blue-700">C</div>
                                <p className="text-xs font-semibold text-slate-600 truncate">Corporate</p>
                              </div>
                              <ImageCard doc={ceDoc} side="Back" accent={group.accent} readOnly={!isLatestDoc(ceDoc)} isDormant={isDormant}
                                preview={pending[ceKey] ?? null} uploaded={!!uploaded[ceKey]} uploading={uploading.has(ceKey)}
                                onFileChange={(f) => { setPending((p) => ({ ...p, [ceKey]: f })); setUploaded((p) => { const n = { ...p }; delete n[ceKey]; return n; }); }} />
                            </div>
                          );
                        })()}
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <HiOutlinePhotograph className="w-3.5 h-3.5" /> Click an image to replace · JPEG, PNG · max 10 MB
                      </p>
                    </div>
                  </div>
                );
              } // end corporate sigcard

              // ── Shared doc or Corporate non-sigcard (always pi=1) ────────────
              if (shared || isCorporate) {
                const personIdx = 1;
                const existingFronts = getAllDocs(group.front, personIdx);
                const existingBacks  = getAllDocs(group.back,  personIdx);
                const addedPairs     = newPairs[group.key] ?? [];

                const hasFront = existingFronts.length > 0;
                const hasBack  = existingBacks.length > 0;
                return (
                  <div key={group.key} id={`section-${group.key}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ac.bg}`}>
                          <HiOutlineDocumentText className={`w-4 h-4 ${ac.icon}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{group.label}</h3>
                          <p className="text-[10px] text-slate-400">{shared ? "Shared — Front & Back" : "Front & Back"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {shared && <span className="text-[10px] font-semibold text-purple-500 border border-purple-200 bg-purple-50 rounded-full px-2 py-0.5">Shared</span>}
                        <div title={hasFront && hasBack ? "Complete" : hasFront || hasBack ? "Partial" : "Empty"}
                          className={`w-2.5 h-2.5 rounded-full ${hasFront && hasBack ? "bg-emerald-400" : hasFront || hasBack ? "bg-amber-400" : "bg-slate-200"}`} />
                      </div>
                    </div>

                    {/* Document cards */}
                    <div className="px-5 py-5 space-y-6">
                      {/* Existing pairs — for shared types, show all existing docs grouped */}
                      {shared ? (
                        (() => {
                          const latestFronts    = existingFronts.filter((d) => isLatestDoc(d));
                          const histFronts      = existingFronts.filter((d) => !isLatestDoc(d));
                          const latestBacks     = existingBacks.filter((d) => isLatestDoc(d));
                          const histBacks       = existingBacks.filter((d) => !isLatestDoc(d));
                          const latestPairCount = Math.max(latestFronts.length, latestBacks.length, 1);
                              const histPairCount   = Math.max(histFronts.length, histBacks.length, 0);
                          const histKey         = `${group.key}__${personIdx}`;
                          const isHistOpen      = histExpanded[histKey] ?? false;
                          return (
                        <>
                          {/* Latest (editable) pairs */}
                          {Array.from({ length: latestPairCount }).map((_, pairIdx) => {
                            const frontDoc = latestFronts[pairIdx] ?? null;
                            const backDoc  = latestBacks[pairIdx]  ?? null;
                            const frontKey = frontDoc ? `${group.front}__${frontDoc.id}` : `${group.front}__${personIdx}__p${pairIdx}`;
                            const backKey  = backDoc  ? `${group.back}__${backDoc.id}`   : `${group.back}__${personIdx}__p${pairIdx}`;
                            return (
                              <div key={pairIdx} className="space-y-2">
                                {latestPairCount + addedPairs.length > 1 && (
                                  <p className="text-xs font-medium text-slate-400">{group.label} {pairIdx + 1}</p>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                  <ImageCard
                                    doc={frontDoc} side="Front" accent={group.accent}
                                    readOnly={false} isDormant={isDormant}
                                    preview={pending[frontKey] ?? null}
                                    uploaded={!!uploaded[frontKey]}
                                    uploading={uploading.has(frontKey)}
                                    onFileChange={(f) => {
                                      setPending((p) => ({ ...p, [frontKey]: f }));
                                      setUploaded((p) => { const n = { ...p }; delete n[frontKey]; return n; });
                                    }}
                                  />
                                  <ImageCard
                                    doc={backDoc} side="Back" accent={group.accent}
                                    readOnly={false} isDormant={isDormant}
                                    preview={pending[backKey] ?? null}
                                    uploaded={!!uploaded[backKey]}
                                    uploading={uploading.has(backKey)}
                                    onFileChange={(f) => {
                                      setPending((p) => ({ ...p, [backKey]: f }));
                                      setUploaded((p) => { const n = { ...p }; delete n[backKey]; return n; });
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {/* Historical pairs — collapsible */}
                          {showHistoryInEdit && histPairCount > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                              <button
                                onClick={() => setHistExpanded((p) => ({ ...p, [histKey]: !isHistOpen }))}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <HiOutlineLockClosed className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-500">Previous Uploads</span>
                                  <span className="text-[10px] text-slate-400">({histPairCount} pair{histPairCount !== 1 ? "s" : ""})</span>
                                </div>
                                <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isHistOpen ? "rotate-180" : ""}`} />
                              </button>
                              {isHistOpen && (
                                <div className="px-4 py-4 space-y-4 bg-slate-50/50 border-t border-slate-100">
                                  {Array.from({ length: histPairCount }).map((_, i) => {
                                    const frontDoc = histFronts[i] ?? null;
                                    const backDoc  = histBacks[i]  ?? null;
                                    return (
                                      <div key={i} className="space-y-2">
                                        {histPairCount > 1 && <p className="text-xs font-medium text-slate-400">{group.label} {i + 1}</p>}
                                        <div className="grid grid-cols-2 gap-4">
                                          <ImageCard doc={frontDoc} side="Front" accent={group.accent} readOnly={true} isDormant={isDormant}
                                            preview={null} uploaded={false} uploading={false} onFileChange={() => {}} />
                                          <ImageCard doc={backDoc} side="Back" accent={group.accent} readOnly={true} isDormant={isDormant}
                                            preview={null} uploaded={false} uploading={false} onFileChange={() => {}} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* New pairs added via "Add Another" */}
                          {addedPairs.map((pair, pairIdx) => (
                            <div key={`new-${pairIdx}`} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-slate-400">{group.label} {latestPairCount + pairIdx + 1}</p>
                                <button type="button" onClick={() => setNewPairs((prev) => ({
                                  ...prev, [group.key]: (prev[group.key] ?? []).filter((_, i) => i !== pairIdx),
                                }))}
                                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                                  <HiOutlineX className="w-3.5 h-3.5" /> Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <NewPairUploadCard file={pair.front} side="Front" accent={group.accent}
                                  onFileChange={(f) => setNewPairs((prev) => {
                                    const pairs = [...(prev[group.key] ?? [])];
                                    pairs[pairIdx] = { ...pairs[pairIdx], front: f };
                                    return { ...prev, [group.key]: pairs };
                                  })} />
                                <NewPairUploadCard file={pair.back} side="Back" accent={group.accent}
                                  onFileChange={(f) => setNewPairs((prev) => {
                                    const pairs = [...(prev[group.key] ?? [])];
                                    pairs[pairIdx] = { ...pairs[pairIdx], back: f };
                                    return { ...prev, [group.key]: pairs };
                                  })} />
                              </div>
                            </div>
                          ))}

                          {/* Add Another button */}
                          <button type="button" onClick={() => setNewPairs((prev) => ({
                            ...prev, [group.key]: [...(prev[group.key] ?? []), { front: null, back: null }],
                          }))}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                            <HiOutlinePlus className="w-3.5 h-3.5" />
                            Add Another {group.label}
                          </button>
                        </>
                          );
                        })()
                      ) : (
                        /* Non-shared: single front/back pair per person */
                        (() => {
                          const allFrontDocs = getAllDocs(group.front, personIdx);
                          const allBackDocs  = getAllDocs(group.back, personIdx);

                          const latestFrontDocs = allFrontDocs.filter((d) => isLatestDoc(d));
                          const latestBackDocs  = allBackDocs.filter((d) => isLatestDoc(d));

                          const frontLatest = latestFrontDocs[0] ?? null;
                          const backLatest  = latestBackDocs[0] ?? null;

                          const histFrontDocs = allFrontDocs.filter((d) => !isLatestDoc(d));
                          const histBackDocs  = allBackDocs.filter((d) => !isLatestDoc(d));
                          const histPairCount = Math.max(histFrontDocs.length, histBackDocs.length);

                          const hasHist = histPairCount > 0;
                          const histKey     = `${group.key}__${personIdx}__ns`;
                          const isHistOpen  = histExpanded[histKey] ?? false;
                          return (
                            <>
                              {/* Editable current slot */}
                              <div className="grid grid-cols-2 gap-4">
                                <ImageCard
                                  doc={frontLatest} side="Front" accent={group.accent}
                                  readOnly={false} isDormant={isDormant}
                                  preview={getPendingFile(group.front, personIdx)} uploaded={isUploaded(group.front, personIdx)} uploading={isUploading(group.front, personIdx)}
                                  onFileChange={(f) => setPendingFile(group.front, personIdx, f)}
                                />
                                <ImageCard
                                  doc={backLatest} side="Back" accent={group.accent}
                                  readOnly={false} isDormant={isDormant}
                                  preview={getPendingFile(group.back, personIdx)} uploaded={isUploaded(group.back, personIdx)} uploading={isUploading(group.back, personIdx)}
                                  onFileChange={(f) => setPendingFile(group.back, personIdx, f)}
                                />
                              </div>
                              {/* Historical pair — collapsible */}
                              {showHistoryInEdit && hasHist && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => setHistExpanded((p) => ({ ...p, [histKey]: !isHistOpen }))}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <HiOutlineLockClosed className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-xs font-semibold text-slate-500">Previous Upload</span>
                                    </div>
                                    <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isHistOpen ? "rotate-180" : ""}`} />
                                  </button>
                                  {isHistOpen && (
                                    <div className="px-4 py-4 bg-slate-50/50 border-t border-slate-100">
                                      <div className="space-y-4">
                                        {Array.from({ length: histPairCount }).map((_, i) => {
                                          const frontHist = histFrontDocs[i] ?? null;
                                          const backHist  = histBackDocs[i] ?? null;
                                          return (
                                            <div key={i} className="space-y-2">
                                              {histPairCount > 1 && (
                                                <p className="text-xs font-medium text-slate-400">
                                                  {group.label} {i + 1}
                                                </p>
                                              )}
                                              <div className="grid grid-cols-2 gap-4">
                                                <ImageCard
                                                  doc={frontHist}
                                                  side="Front"
                                                  accent={group.accent}
                                                  readOnly={true} isDormant={isDormant}
                                                  preview={null}
                                                  uploaded={false}
                                                  uploading={false}
                                                  onFileChange={() => {}}
                                                />
                                                <ImageCard
                                                  doc={backHist}
                                                  side="Back"
                                                  accent={group.accent}
                                                  readOnly={true} isDormant={isDormant}
                                                  preview={null}
                                                  uploaded={false}
                                                  uploading={false}
                                                  onFileChange={() => {}}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()
                      )}
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <HiOutlinePhotograph className="w-3.5 h-3.5" />
                        Click an image to replace · JPEG, PNG · max 10 MB
                      </p>
                    </div>
                  </div>
                );
              }

              // ── Non-shared (Regular / Joint non-shared docs) ───────────────────
              const peopleWithDocs = allPersons.filter((p) => {
                const hasFront = getAllDocs(group.front, p.index).length > 0;
                const hasBack = getAllDocs(group.back, p.index).length > 0;
                return hasFront || hasBack;
              });
              // When account tabs are active, scope to the selected account only
              const sectionPeople = showAccountTabs
                ? [allPersons.find((p) => p.index === activePerson) ?? allPersons[0]]
                : (peopleWithDocs.length > 0 ? peopleWithDocs : [allPersons[0]]);
              const hasAnyFront = sectionPeople.some((p) => getAllDocs(group.front, p.index).length > 0);
              const hasAnyBack = sectionPeople.some((p) => getAllDocs(group.back, p.index).length > 0);

              return (
                <div key={group.key} id={`section-${group.key}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ac.bg}`}>
                        <HiOutlineDocumentText className={`w-4 h-4 ${ac.icon}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{group.label}</h3>
                        <p className="text-[10px] text-slate-400">Front & Back</p>
                      </div>
                    </div>
                    <div title={hasAnyFront && hasAnyBack ? "Complete" : hasAnyFront || hasAnyBack ? "Partial" : "Empty"}
                      className={`w-2.5 h-2.5 rounded-full ${hasAnyFront && hasAnyBack ? "bg-emerald-400" : hasAnyFront || hasAnyBack ? "bg-amber-400" : "bg-slate-200"}`} />
                  </div>

                  <div className="px-5 py-5 space-y-6">
                    {sectionPeople.map((person) => {
                      const allFrontDocs = getAllDocs(group.front, person.index);
                      const allBackDocs = getAllDocs(group.back, person.index);
                      const latestFront = allFrontDocs.find((d) => isLatestDoc(d)) ?? null;
                      const latestBack = allBackDocs.find((d) => isLatestDoc(d)) ?? null;

                      const histFrontDocs = allFrontDocs.filter((d) => !isLatestDoc(d));
                      const histBackDocs = allBackDocs.filter((d) => !isLatestDoc(d));
                      const histPairCount = Math.max(histFrontDocs.length, histBackDocs.length);
                      const histKey = `${group.key}__${person.index}__nonshared`;
                      const isHistOpen = histExpanded[histKey] ?? false;

                      const frontKey = latestFront ? `${group.front}__${latestFront.id}` : `${group.front}__${personKey(person.index)}`;
                      const backKey = latestBack ? `${group.back}__${latestBack.id}` : `${group.back}__${personKey(person.index)}`;

                      return (
                        <div key={person.index} className="space-y-3">
                          {sectionPeople.length > 1 && (
                            <p className="text-xs font-semibold text-slate-500">
                              {person.label} {person.name ? `— ${person.name}` : ""}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <ImageCard
                              doc={latestFront}
                              side="Front"
                              accent={group.accent}
                              readOnly={false} isDormant={isDormant}
                              preview={pending[frontKey] ?? null}
                              uploaded={!!uploaded[frontKey]}
                              uploading={uploading.has(frontKey)}
                              onFileChange={(f) => {
                                setPending((p) => ({ ...p, [frontKey]: f }));
                                setUploaded((p) => { const n = { ...p }; delete n[frontKey]; return n; });
                              }}
                            />
                            <ImageCard
                              doc={latestBack}
                              side="Back"
                              accent={group.accent}
                              readOnly={false} isDormant={isDormant}
                              preview={pending[backKey] ?? null}
                              uploaded={!!uploaded[backKey]}
                              uploading={uploading.has(backKey)}
                              onFileChange={(f) => {
                                setPending((p) => ({ ...p, [backKey]: f }));
                                setUploaded((p) => { const n = { ...p }; delete n[backKey]; return n; });
                              }}
                            />
                          </div>

                          {showHistoryInEdit && histPairCount > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                              <button
                                onClick={() => setHistExpanded((p) => ({ ...p, [histKey]: !isHistOpen }))}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <HiOutlineLockClosed className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-500">Previous Uploads</span>
                                </div>
                                <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isHistOpen ? "rotate-180" : ""}`} />
                              </button>
                              {isHistOpen && (
                                <div className="px-4 py-4 bg-slate-50/50 border-t border-slate-100 space-y-4">
                                  {Array.from({ length: histPairCount }).map((_, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-4">
                                      <ImageCard doc={histFrontDocs[i] ?? null} side="Front" accent={group.accent} readOnly={true} isDormant={isDormant}
                                        preview={null} uploaded={false} uploading={false} onFileChange={() => {}} />
                                      <ImageCard doc={histBackDocs[i] ?? null} side="Back" accent={group.accent} readOnly={true} isDormant={isDormant}
                                        preview={null} uploaded={false} uploading={false} onFileChange={() => {}} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <HiOutlinePhotograph className="w-3.5 h-3.5" />
                      Click an image to replace · JPEG, PNG · max 10 MB
                    </p>
                  </div>
                </div>
              );
            })}

              {/* Other docs section */}
              <div id="section-other" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                        <HiOutlineDocumentText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Other Supporting Documents</h3>
                        <p className="text-[10px] text-slate-400">{otherDocs.filter((d) => isLatestDoc(d)).length} current · {newOtherFiles.length} queued</p>
                      </div>
                    </div>
                    <button onClick={() => otherInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <HiOutlinePlus className="w-3.5 h-3.5" /> Add Files
                    </button>
                  </div>

                  {(() => {
                    const latestOtherDocs = otherDocs.filter((d) => isLatestDoc(d));
                    const histOtherDocs   = otherDocs.filter((d) => !isLatestDoc(d));
                    const otherHistKey    = "other-docs";
                    const isOtherHistOpen = histExpanded[otherHistKey] ?? false;
                    return (
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

                    {/* Latest (editable) docs */}
                    {latestOtherDocs.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Current Files</p>
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                          {latestOtherDocs.map((doc) => (
                            <div key={doc.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 group">
                              <img src={storageUrl(doc.file_path, doc.updated_at ?? doc.created_at ?? doc.id)} alt={doc.file_name} className="w-full h-full object-contain" />
                              <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[8px] text-white truncate">{doc.file_name}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveOtherDoc(doc)}
                                disabled={removingDocId === doc.id}
                                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-60 shadow"
                                title="Remove this document"
                              >
                                {removingDocId === doc.id
                                  ? <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                                  : <HiOutlineX className="w-3 h-3" />
                                }
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Historical (view-only) docs — collapsible */}
                    {showHistoryInEdit && histOtherDocs.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setHistExpanded((p) => ({ ...p, [otherHistKey]: !isOtherHistOpen }))}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <HiOutlineLockClosed className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500">Previous Uploads</span>
                            <span className="text-[10px] text-slate-400">({histOtherDocs.length} file{histOtherDocs.length !== 1 ? "s" : ""})</span>
                          </div>
                          <HiOutlineChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOtherHistOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOtherHistOpen && (
                          <div className="px-4 py-4 bg-slate-50/50 border-t border-slate-100">
                            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                              {histOtherDocs.map((doc) => (
                                <div key={doc.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 group">
                                  <img src={storageUrl(doc.file_path, doc.updated_at ?? doc.created_at ?? doc.id)} alt={doc.file_name} className="w-full h-full object-contain opacity-70" />
                                  <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[8px] text-white truncate">{doc.file_name}</p>
                                  </div>
                                  <div className="absolute inset-0 bg-slate-900/10 flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/60 backdrop-blur-sm">
                                      <HiOutlineLockClosed className="w-2.5 h-2.5 text-white/80" />
                                      <span className="text-[8px] font-semibold text-white/80">View Only</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                    );
                  })()}

                  <input ref={otherInputRef} type="file" accept="image/jpeg,image/jpg,image/png"
                    multiple className="hidden"
                    onChange={(e) => { setNewOtherFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
                </div>
            </div>


      </div>


    </div>
  );
};

export default EditCustomerDocs;
