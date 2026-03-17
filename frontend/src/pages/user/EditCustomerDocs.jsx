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

      {/* Remove pending file button — below the image, always visible and clickable */}
      {preview && !uploaded && !uploading && (
        <button
          onClick={() => onFileChange(null)}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold transition-colors"
        >
          <HiOutlineX className="w-3.5 h-3.5" />
          Remove
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
        onChange={(e) => { onFileChange(e.target.files[0] ?? null); e.target.value = ""; }} />
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
  const [activePerson, setActivePerson]   = useState(1);
  const [newPairs, setNewPairs]           = useState({}); // { "sigcard": [{front:null,back:null}], ... }
  const otherInputRef = useRef(null);
  const [removingDocId, setRemovingDocId] = useState(null);

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

  // ── Derived helpers ────────────────────────────────────────────────────────
  const getDoc        = (type, pi) => customer?.documents?.find((d) => d.document_type === type && d.person_index === pi) ?? null;
  const getAllDocs     = (type, pi) => (customer?.documents ?? []).filter((d) => d.document_type === type && d.person_index === pi);
  const setPendingFile = (type, pi, file) => {
    const key = `${type}__${pi}`;
    setPending((p) => ({ ...p, [key]: file }));
    setUploaded((p) => { const n = { ...p }; delete n[key]; return n; });
  };
  const getPendingFile = (type, pi) => pending[`${type}__${pi}`] ?? null;
  const isUploaded     = (type, pi) => !!uploaded[`${type}__${pi}`];
  const isUploading    = (type, pi) => uploading === `${type}__${pi}`;

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

  const showPersonTabs = allPersons.length > 1;

  // Ensure activePerson is valid
  useEffect(() => {
    if (customer && !allPersons.some((p) => p.index === activePerson)) {
      setActivePerson(allPersons[0]?.index ?? 1);
    }
  }, [customer]);

  const otherPersonIdx = isCorporate ? 1 : activePerson;
  const otherDocs = (customer?.documents ?? []).filter((d) => d.document_type === "other" && d.person_index === otherPersonIdx);

  const totalNewPairFiles = Object.values(newPairs).reduce((sum, pairs) =>
    sum + pairs.reduce((c, p) => c + (p.front ? 1 : 0) + (p.back ? 1 : 0), 0), 0);
  const totalPending = Object.values(pending).filter(Boolean).length + newOtherFiles.length + totalNewPairFiles;

  const newPairPendingCount = (groupKey) => {
    const pairs = newPairs[groupKey] ?? [];
    return pairs.reduce((c, p) => c + (p.front ? 1 : 0) + (p.back ? 1 : 0), 0);
  };

  const tabPending = (group) => {
    if (group.key === "other") return newOtherFiles.length;
    if (isCorporate && group.key === "sigcard") {
      // Count pending shared fronts + per-signatory backs
      let count = 0;
      const existingFronts = getAllDocs(group.front, 1);
      existingFronts.forEach((doc) => { if (pending[`${group.front}__${doc.id}`]) count++; });
      allPersons.forEach((p) => {
        const backDoc = getDoc(group.back, p.index);
        const backKey = backDoc ? `${group.back}__${backDoc.id}` : `${group.back}__${p.index}`;
        if (pending[backKey]) count++;
      });
      count += newPairPendingCount(group.key);
      return count;
    }
    const pi = isSharedDoc(group.key) ? 1 : (isCorporate ? 1 : activePerson);
    let count = 0;
    if (getPendingFile(group.front, pi)) count++;
    if (getPendingFile(group.back, pi)) count++;
    count += newPairPendingCount(group.key);
    return count;
  };

  const personPendingCount = (personIdx) => {
    let count = 0;
    DOC_GROUPS.forEach((g) => {
      const pi = isSharedDoc(g.key) ? 1 : personIdx;
      if (pending[`${g.front}__${pi}`]) count++;
      if (pending[`${g.back}__${pi}`]) count++;
      if (isSharedDoc(g.key) && personIdx === activePerson) count += newPairPendingCount(g.key);
    });
    if (personIdx === activePerson) count += newOtherFiles.length;
    return count;
  };

  // ── Upload helpers ─────────────────────────────────────────────────────────
  const uploadOne = async (pendingKey, document_type, person_index, file, document_id) => {
    setUploading(pendingKey);
    try {
      const fd = new FormData();
      fd.append("document_type", document_type);
      fd.append("person_index",  String(person_index));
      fd.append("file",          file);
      if (document_id) fd.append("document_id", String(document_id));
      const { data } = await api.post(`/customers/${id}/replace-document`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCustomer(data.customer);
      setUploaded((p) => ({ ...p, [pendingKey]: true }));
      setPending((p) => { const n = { ...p }; delete n[pendingKey]; return n; });
    } finally {
      setUploading(null);
    }
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(pending).filter(([, f]) => f);
    // Collect new pair files
    const pairEntries = [];
    for (const [groupKey, pairs] of Object.entries(newPairs)) {
      const group = DOC_GROUPS.find((g) => g.key === groupKey);
      if (!group) continue;
      // Corporate sigcard new pairs are fronts at person_index=1
      const pi = isSharedDoc(groupKey) ? 1 : (isCorporate && groupKey === "sigcard") ? 1 : activePerson;
      for (const pair of pairs) {
        if (pair.front) pairEntries.push({ type: group.front, pi, file: pair.front });
        if (pair.back)  pairEntries.push({ type: group.back,  pi, file: pair.back });
      }
    }
    const total = entries.length + pairEntries.length + newOtherFiles.length;
    if (total === 0) return;

    setSaving(true);
    let done = 0, failed = 0;
    setSaveProgress({ done: 0, total });

    try {
      // Upload pending replacements
      for (const [key, file] of entries) {
        const parts = key.split("__");
        const document_type = parts[0];
        const secondPart = parts[1];
        // Determine if secondPart is a doc ID (for shared doc replacements) or person_index
        const matchingDoc = (customer?.documents ?? []).find((d) => d.id === parseInt(secondPart));
        const person_index = matchingDoc ? matchingDoc.person_index : parseInt(secondPart);
        const document_id = matchingDoc ? matchingDoc.id : null;
        try { await uploadOne(key, document_type, person_index, file, document_id); }
        catch { failed++; }
        setSaveProgress({ done: ++done, total });
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

        setUploading("newpairs");
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
        setUploading(null);
        setSaveProgress({ done, total });
      }

      if (newOtherFiles.length > 0) {
        setUploading("other__new");
        try {
          const fd = new FormData();
          fd.append("_method", "PUT");
          const otherUploadIdx = isCorporate ? 1 : activePerson;
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
          setUploading(null);
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

          {/* Person / Account tabs */}
          {showPersonTabs && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                {isJoint ? "Account Holders" : isCorporate ? "Signatories" : "Accounts"}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {allPersons.map((person) => {
                  const isActive = activePerson === person.index;
                  const pCount   = personPendingCount(person.index);
                  return (
                    <button
                      key={person.index}
                      onClick={() => setActivePerson(person.index)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 border ${
                        isActive
                          ? "bg-white/15 text-white border-white/30 shadow-lg backdrop-blur-sm"
                          : "text-white/40 border-white/10 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <HiOutlineUser className="w-3.5 h-3.5" />
                      <span>{person.label}</span>
                      {pCount > 0 && (
                        <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {pCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document type tabs */}
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
            key={`${activeTab}__${activePerson}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >

            {/* ── Corporate Sigcard — custom layout ──────────────────────── */}
            {isCorporate && activeTab === "sigcard" && (() => {
              const group = DOC_GROUPS.find((g) => g.key === "sigcard");
              const existingFronts = getAllDocs(group.front, 1);
              const addedPairs = newPairs["sigcard"] ?? [];

              return (
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ACCENT[group.accent].bg}`}>
                          <HiOutlineDocumentText className={`w-4 h-4 ${ACCENT[group.accent].icon}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Signature Card</h3>
                          <p className="text-[10px] text-slate-400">Corporate — Shared fronts + per-signatory backs</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-5 space-y-6">
                      {/* ── Shared Fronts (person_index=1) ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sigcard Front (Shared)</p>
                        {/* Existing front docs */}
                        {Array.from({ length: Math.max(existingFronts.length, 1) }).map((_, pairIdx) => {
                          const frontDoc = existingFronts[pairIdx] ?? null;
                          const frontKey = frontDoc ? `${group.front}__${frontDoc.id}` : `${group.front}__1__p${pairIdx}`;
                          return (
                            <div key={pairIdx} className="space-y-2">
                              {(existingFronts.length + addedPairs.length) > 1 && (
                                <p className="text-xs font-medium text-slate-400">Front {pairIdx + 1}</p>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <ImageCard
                                  doc={frontDoc} side="Front" accent={group.accent}
                                  preview={pending[frontKey] ?? null}
                                  uploaded={!!uploaded[frontKey]}
                                  uploading={uploading === frontKey}
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
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Back — per signatory</p>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      {/* ── Per-signatory Backs ── */}
                      <div className="grid grid-cols-2 gap-4">
                        {allPersons.map((person) => {
                          const backDoc = getDoc(group.back, person.index);
                          const backKey = backDoc ? `${group.back}__${backDoc.id}` : `${group.back}__${person.index}`;
                          return (
                            <div key={person.index} className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${person.index === 1 ? "bg-blue-600" : "bg-slate-600"}`}>
                                  {person.index}
                                </div>
                                <p className="text-xs font-semibold text-slate-600 truncate">{person.name || person.label}</p>
                              </div>
                              <ImageCard
                                doc={backDoc} side="Back" accent={group.accent}
                                preview={pending[backKey] ?? null}
                                uploaded={!!uploaded[backKey]}
                                uploading={uploading === backKey}
                                onFileChange={(f) => {
                                  setPending((p) => ({ ...p, [backKey]: f }));
                                  setUploaded((p) => { const n = { ...p }; delete n[backKey]; return n; });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <HiOutlinePhotograph className="w-3.5 h-3.5" />
                        Click an image to replace · JPEG, PNG · max 10 MB
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Active doc group for active person ─────────────────────── */}
            {!(isCorporate && activeTab === "sigcard") && <div className="flex-1 min-w-0">
              {DOC_GROUPS.filter((g) => g.key === activeTab).map((group) => {
                const shared    = isSharedDoc(group.key);
                // Corporate: nais/privacy are per-account (person_index=1), not per-signatory
                const personIdx = shared ? 1 : (isCorporate && group.key !== "sigcard") ? 1 : activePerson;
                const activePersonInfo = allPersons.find((p) => p.index === activePerson);

                // Build existing doc pairs for shared types
                const existingFronts = getAllDocs(group.front, personIdx);
                const existingBacks  = getAllDocs(group.back,  personIdx);
                const existingPairCount = Math.max(existingFronts.length, existingBacks.length, 1);
                const addedPairs = newPairs[group.key] ?? [];

                const hasFront = existingFronts.length > 0 || !!getPendingFile(group.front, personIdx) || isUploaded(group.front, personIdx);
                const hasBack  = existingBacks.length > 0  || !!getPendingFile(group.back,  personIdx) || isUploaded(group.back,  personIdx);

                return (
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
                            {shared
                              ? "Shared — Front & Back"
                              : showPersonTabs
                                ? `${activePersonInfo?.name || activePersonInfo?.label} — Front & Back`
                                : "Front & Back required"}
                          </p>
                        </div>
                      </div>
                      {/* Completion indicator */}
                      <div className="flex items-center gap-2">
                        {shared ? (
                          <span className="text-[10px] font-semibold text-purple-500">Shared</span>
                        ) : showPersonTabs ? (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {activePersonInfo?.label}
                          </span>
                        ) : null}
                        <div
                          title={hasFront && hasBack ? "Complete" : hasFront || hasBack ? "Partial" : "Empty"}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${hasFront && hasBack ? "bg-emerald-400" : hasFront || hasBack ? "bg-amber-400" : "bg-slate-200"}`}
                        />
                      </div>
                    </div>

                    {/* Document cards */}
                    <div className="px-5 py-5 space-y-6">
                      {/* Existing pairs — for shared types, show all existing docs grouped */}
                      {shared ? (
                        <>
                          {Array.from({ length: existingPairCount }).map((_, pairIdx) => {
                            const frontDoc = existingFronts[pairIdx] ?? null;
                            const backDoc  = existingBacks[pairIdx] ?? null;
                            // Use doc ID in key for replacements
                            const frontKey = frontDoc ? `${group.front}__${frontDoc.id}` : `${group.front}__${personIdx}__p${pairIdx}`;
                            const backKey  = backDoc  ? `${group.back}__${backDoc.id}`   : `${group.back}__${personIdx}__p${pairIdx}`;
                            return (
                              <div key={pairIdx} className="space-y-2">
                                {existingPairCount + addedPairs.length > 1 && (
                                  <p className="text-xs font-medium text-slate-400">{group.label} {pairIdx + 1}</p>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                  <ImageCard
                                    doc={frontDoc} side="Front" accent={group.accent}
                                    preview={pending[frontKey] ?? null}
                                    uploaded={!!uploaded[frontKey]}
                                    uploading={uploading === frontKey}
                                    onFileChange={(f) => {
                                      setPending((p) => ({ ...p, [frontKey]: f }));
                                      setUploaded((p) => { const n = { ...p }; delete n[frontKey]; return n; });
                                    }}
                                  />
                                  <ImageCard
                                    doc={backDoc} side="Back" accent={group.accent}
                                    preview={pending[backKey] ?? null}
                                    uploaded={!!uploaded[backKey]}
                                    uploading={uploading === backKey}
                                    onFileChange={(f) => {
                                      setPending((p) => ({ ...p, [backKey]: f }));
                                      setUploaded((p) => { const n = { ...p }; delete n[backKey]; return n; });
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* New pairs added via "Add Another" */}
                          {addedPairs.map((pair, pairIdx) => (
                            <div key={`new-${pairIdx}`} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-slate-400">{group.label} {existingPairCount + pairIdx + 1}</p>
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
                      ) : (
                        /* Non-shared: single front/back pair per person */
                        <div className="grid grid-cols-2 gap-4">
                          <ImageCard
                            doc={getDoc(group.front, personIdx)} side="Front" accent={group.accent}
                            preview={getPendingFile(group.front, personIdx)} uploaded={isUploaded(group.front, personIdx)} uploading={isUploading(group.front, personIdx)}
                            onFileChange={(f) => setPendingFile(group.front, personIdx, f)}
                          />
                          <ImageCard
                            doc={getDoc(group.back, personIdx)} side="Back" accent={group.accent}
                            preview={getPendingFile(group.back, personIdx)} uploaded={isUploaded(group.back, personIdx)} uploading={isUploading(group.back, personIdx)}
                            onFileChange={(f) => setPendingFile(group.back, personIdx, f)}
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <HiOutlinePhotograph className="w-3.5 h-3.5" />
                        Click an image to replace · JPEG, PNG · max 10 MB
                      </p>
                    </div>
                  </div>
                );
              })}

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
                              {/* Remove button */}
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
            </div>}


          </motion.div>
        </AnimatePresence>
      </div>


    </div>
  );
};

export default EditCustomerDocs;
