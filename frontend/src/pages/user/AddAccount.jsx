import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import api from "../../services/api";
import {
  HiOutlineCheckCircle,
  HiOutlineUpload,
  HiOutlinePhotograph,
  HiOutlineArrowLeft,
} from "react-icons/hi";

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_LEVELS = ["Low Risk", "Medium Risk", "High Risk"];

const RISK_STYLE = {
  "Low Risk":    "bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-400/20",
  "Medium Risk": "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20",
  "High Risk":   "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20",
};

const STATUS_OPTIONS = [
  { value: "active",      label: "Active",      cls: "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400/20" },
  { value: "dormant",     label: "Dormant",     cls: "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20" },
  { value: "reactivated", label: "Reactivated", cls: "bg-teal-50 border-teal-400 text-teal-700 ring-2 ring-teal-400/20" },
  { value: "escheat",     label: "Escheat",     cls: "bg-orange-50 border-orange-400 text-orange-700 ring-2 ring-orange-400/20" },
  { value: "closed",      label: "Closed",      cls: "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20" },
];

const steps = [
  { key: "accountInfo", title: "Account Info"         },
  { key: "sigcard",     title: "Sigcard Upload"        },
  { key: "nais",        title: "NAIS (Optional)"       },
  { key: "privacy",     title: "Data Privacy"          },
  { key: "otherDocs",   title: "Other Docs (Optional)" },
];

const jointSteps = [
  { key: "holderInfo", title: "Holder Info"           },
  { key: "sigcard",    title: "Sigcard Upload"         },
  { key: "nais",       title: "NAIS (Optional)"        },
  { key: "privacy",    title: "Data Privacy"           },
  { key: "otherDocs",  title: "Other Docs (Optional)"  },
];

const stepDescriptions = {
  accountInfo: "Enter the account number, risk level, and date opened for the new account.",
  holderInfo:  "Enter the name and risk level for the new joint account holder.",
  sigcard:     "Upload front and back images of the signature card.",
  nais:        "Upload NAIS document images — optional, you may skip.",
  privacy:     "Upload the signed data privacy consent form.",
  otherDocs:   "Upload any additional supporting documents — optional.",
};

const emptyPair = () => ({ front: null, back: null });
const inputCls  = "w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all";

// ── Sub-components ────────────────────────────────────────────────────────────
const RiskLevelPicker = ({ value, onChange }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600">
      Risk Level <span className="text-red-500">*</span>
    </label>
    <div className="grid grid-cols-3 gap-2">
      {RISK_LEVELS.map((risk) => (
        <button key={risk} type="button" onClick={() => onChange(risk)}
          className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${value === risk ? RISK_STYLE[risk] : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
          {risk}
        </button>
      ))}
    </div>
  </div>
);

const StatusPicker = ({ value, onChange }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600">
      Account Status <span className="text-red-500">*</span>
    </label>
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map(({ value: v, label, cls }) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${value === v ? cls : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
          {label}
        </button>
      ))}
    </div>
  </div>
);

const DropZone = ({ label, file, onSelect }) => {
  const [isDragging, setIsDragging]   = useState(false);
  const [orientation, setOrientation] = useState(null);

  const handleFiles = (list) => { if (list?.length) { setOrientation(null); onSelect(list); } };
  const handleLoad  = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target;
    setOrientation(h >= w ? "portrait" : "landscape");
  };

  const sizeClass = file
    ? orientation === "portrait" ? "aspect-[3/4]" : orientation === "landscape" ? "aspect-[4/3]" : "min-h-[420px]"
    : "min-h-[420px]";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-700">{label}</h3>
      <label
        className={`group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${sizeClass} ${
          isDragging ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.02] shadow-lg"
          : file      ? "border-green-400 bg-slate-100 shadow-md"
          : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {file ? (
          <>
            <img src={URL.createObjectURL(file)} alt={label} onLoad={handleLoad} className="object-contain w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 bg-gradient-to-br from-black/70 to-black/50 group-hover:opacity-100">
              <div className="text-center text-white">
                <HiOutlinePhotograph className="w-10 h-10 mx-auto mb-3" />
                <p className="text-base font-bold">Click to change</p>
                <p className="mt-1 text-sm text-white/80">Drag & drop or select new file</p>
              </div>
            </div>
            <div className="absolute p-2 rounded-full shadow-lg right-4 top-4 bg-gradient-to-br from-green-500 to-green-600">
              <HiOutlineCheckCircle className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="p-5 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <HiOutlineUpload className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">{isDragging ? "Drop image here" : "Drag & drop your file"}</p>
              <p className="mt-2 text-sm text-slate-600">or <span className="font-semibold text-blue-600">click to browse</span></p>
              <p className="mt-2 text-xs text-slate-500">Supports: JPG, PNG (Max 10MB)</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
};

const DocThumb = ({ file, index, onRemove }) => {
  const [orientation, setOrientation] = useState(null);
  const aspectClass = orientation === "portrait" ? "aspect-[3/4]" : orientation === "landscape" ? "aspect-[4/3]" : "aspect-square";
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition-all duration-300 ${aspectClass}`}>
      <img src={URL.createObjectURL(file)} alt={file.name}
        onLoad={(e) => { const {naturalWidth:w,naturalHeight:h}=e.target; setOrientation(h>=w?"portrait":"landscape"); }}
        className="w-full h-full object-contain" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3">
        <p className="text-xs text-white font-semibold text-center line-clamp-2">{file.name}</p>
        <button type="button" onClick={() => onRemove(index)}
          className="mt-1 px-3 py-1 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">Remove</button>
      </div>
      <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white text-xs font-bold">{index + 1}</div>
    </div>
  );
};

const OtherDocsDropZone = ({ onAdd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const handleFiles = (list) => { if (list?.length) onAdd(list); };
  return (
    <div
      className={`group flex flex-col items-center justify-center gap-4 px-6 py-12 cursor-pointer border-2 border-dashed rounded-2xl transition-all ${
        isDragging ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.01] shadow-lg"
        : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <div className="p-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg pointer-events-none">
        <HiOutlineUpload className="w-8 h-8 text-white" />
      </div>
      <div className="text-center pointer-events-none">
        <p className="text-base font-bold text-slate-800">{isDragging ? "Drop files here" : "Drag & drop your files"}</p>
        <p className="mt-1 text-sm text-slate-600">or <span className="font-semibold text-blue-600">click to browse</span></p>
        <p className="mt-2 text-xs text-slate-500">Supports: JPG, PNG — multiple files allowed</p>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AddAccount = ({ basePath = "/user" }) => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [customer,       setCustomer]       = useState(null);
  const [step,           setStep]           = useState(0);
  const [accountInfo,    setAccountInfo]    = useState({ accountNo: "", riskLevel: "", dateOpened: "", dateUpdated: "", status: "active" });
  const [holderInfo,     setHolderInfo]     = useState({ firstname: "", middlename: "", lastname: "", suffix: "", riskLevel: "", accountNo: "", dateOpened: "", status: "active" });
  const [sigcardPair,    setSigcardPair]    = useState(emptyPair());
  const [naisPair,       setNaisPair]       = useState(emptyPair());
  const [privacyPair,    setPrivacyPair]    = useState(emptyPair());
  const [otherDocs,      setOtherDocs]      = useState([]);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitPhase,    setSubmitPhase]    = useState("idle");

  const isJoint = customer?.account_type === "Joint";
  const activeSteps = isJoint ? jointSteps : steps;

  const backUrl = useMemo(() => `${basePath}/customers/${id}/view`, [basePath, id]);

  useEffect(() => {
    api.get(`/customers/${id}`).then((res) => setCustomer(res.data)).catch(() => {});
  }, [id]);

  const isStepValid = useMemo(() => {
    const key = activeSteps[step]?.key;
    switch (key) {
      case "accountInfo": return !!accountInfo.riskLevel && !!accountInfo.status;
      case "holderInfo":  return !!holderInfo.firstname.trim() && !!holderInfo.lastname.trim() && !!holderInfo.riskLevel;
      case "sigcard":     return !!(sigcardPair.front && sigcardPair.back);
      case "nais":        return true;
      case "privacy":     return !!(privacyPair.front && privacyPair.back);
      case "otherDocs":   return true;
      default:            return false;
    }
  }, [step, activeSteps, accountInfo, holderInfo, sigcardPair, naisPair, privacyPair]);

  const handleNext = () => { if (isStepValid) setStep((s) => Math.min(s + 1, activeSteps.length - 1)); };
  const handlePrev = () => {
    if (step === 0) navigate(backUrl);
    else setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitPhase("uploading");
    try {
      const fd = new FormData();
      if (isJoint) {
        fd.append("firstname",  holderInfo.firstname.trim());
        fd.append("middlename", holderInfo.middlename.trim());
        fd.append("lastname",   holderInfo.lastname.trim());
        fd.append("suffix",     holderInfo.suffix.trim());
        fd.append("risk_level", holderInfo.riskLevel);
        fd.append("status",     holderInfo.status || "active");
        fd.append("account_no", holderInfo.accountNo);
        fd.append("date_opened", holderInfo.dateOpened);
      } else {
        fd.append("risk_level",  accountInfo.riskLevel);
        fd.append("status",      accountInfo.status || "active");
        fd.append("account_no",  accountInfo.accountNo);
        fd.append("date_opened", accountInfo.dateOpened);
        if (accountInfo.dateUpdated) fd.append("date_updated", accountInfo.dateUpdated);
      }

      if (sigcardPair.front)  fd.append("sigcardPairs[0][front]", sigcardPair.front);
      if (sigcardPair.back)   fd.append("sigcardPairs[0][back]",  sigcardPair.back);
      if (naisPair.front)     fd.append("naisPairs[0][front]",    naisPair.front);
      if (naisPair.back)      fd.append("naisPairs[0][back]",     naisPair.back);
      if (privacyPair.front)  fd.append("privacyPairs[0][front]", privacyPair.front);
      if (privacyPair.back)   fd.append("privacyPairs[0][back]",  privacyPair.back);
      otherDocs.forEach((f) => fd.append("otherDocs[]", f));
      await api.post(`/customers/${id}/add-account`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)); },
      });

      await Swal.fire({
        icon: "success", title: "Account Added!",
        text: "The new account and all documents have been successfully saved.",
        confirmButtonText: "Done", confirmButtonColor: "#2563eb", timer: 6000, timerProgressBar: true,
      });
      navigate(backUrl);
    } catch (err) {
      const data = err?.response?.data;
      const msg  = data?.errors ? Object.values(data.errors).flat().join("\n") : data?.message || "Something went wrong. Please try again.";
      Swal.fire({ icon: "error", title: "Submission Failed", text: msg, confirmButtonText: "OK", confirmButtonColor: "#2563eb" });
    } finally {
      setIsSubmitting(false);
      setSubmitPhase("idle");
      setUploadProgress(0);
    }
  };

  // ── Step content ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    const key = activeSteps[step]?.key;
    switch (key) {

      case "holderInfo":
        return (
          <div className="space-y-6">
            {customer?.joint_sub_type && (
              <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium">
                Joint Sub-type: <span className="font-bold">{customer.joint_sub_type}</span>
                {customer.joint_sub_type === "ITF"
                  ? " — All documents are shared across all holders."
                  : " — Sigcard and NAIS are per-holder; Data Privacy is shared."}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={holderInfo.firstname}
                  onChange={(e) => setHolderInfo((p) => ({ ...p, firstname: e.target.value }))}
                  placeholder="First name" maxLength={100} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Middle Name</label>
                <input type="text" value={holderInfo.middlename}
                  onChange={(e) => setHolderInfo((p) => ({ ...p, middlename: e.target.value }))}
                  placeholder="Middle name" maxLength={100} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={holderInfo.lastname}
                  onChange={(e) => setHolderInfo((p) => ({ ...p, lastname: e.target.value }))}
                  placeholder="Last name" maxLength={100} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Suffix</label>
                <input type="text" value={holderInfo.suffix}
                  onChange={(e) => setHolderInfo((p) => ({ ...p, suffix: e.target.value }))}
                  placeholder="e.g. Jr., Sr." maxLength={20} className={inputCls} />
              </div>
            </div>
            <RiskLevelPicker value={holderInfo.riskLevel} onChange={(v) => setHolderInfo((p) => ({ ...p, riskLevel: v }))} />
            <StatusPicker value={holderInfo.status} onChange={(v) => setHolderInfo((p) => ({ ...p, status: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Account No.</label>
                <input type="text" value={holderInfo.accountNo}
                  onChange={(e) => setHolderInfo((p) => ({ ...p, accountNo: e.target.value }))}
                  placeholder="e.g. 1234-5678-9012" maxLength={100} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Date Opened</label>
                <input type="date" value={holderInfo.dateOpened}
                  onChange={(e) => setHolderInfo((p) => ({ ...p, dateOpened: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
          </div>
        );

      case "accountInfo":
        return (
          <div className="space-y-6">
            <RiskLevelPicker value={accountInfo.riskLevel} onChange={(v) => setAccountInfo((p) => ({ ...p, riskLevel: v }))} />
            <StatusPicker value={accountInfo.status} onChange={(v) => setAccountInfo((p) => ({ ...p, status: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Account No.</label>
                <input type="text" value={accountInfo.accountNo}
                  onChange={(e) => setAccountInfo((p) => ({ ...p, accountNo: e.target.value }))}
                  placeholder="e.g. 1234-5678-9012" maxLength={100} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Date Opened</label>
                <input type="date" value={accountInfo.dateOpened}
                  onChange={(e) => setAccountInfo((p) => ({ ...p, dateOpened: e.target.value }))}
                  className={inputCls} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Date Updated <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input type="date" value={accountInfo.dateUpdated}
                  onChange={(e) => setAccountInfo((p) => ({ ...p, dateUpdated: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
          </div>
        );

      case "sigcard":
        return (
          <div className="grid gap-8 md:grid-cols-2">
            <DropZone label="Sigcard Front" file={sigcardPair.front}
              onSelect={(f) => setSigcardPair((p) => ({ ...p, front: f[0] }))} />
            <DropZone label="Sigcard Back"  file={sigcardPair.back}
              onSelect={(f) => setSigcardPair((p) => ({ ...p, back: f[0] }))} />
          </div>
        );

      case "nais":
        return (
          <div className="grid gap-8 md:grid-cols-2">
            <DropZone label="NAIS Front"           file={naisPair.front}
              onSelect={(f) => setNaisPair((p) => ({ ...p, front: f[0] }))} />
            <DropZone label="NAIS Back (Optional)" file={naisPair.back}
              onSelect={(f) => setNaisPair((p) => ({ ...p, back: f[0] }))} />
          </div>
        );

      case "privacy":
        return (
          <div className="grid gap-8 md:grid-cols-2">
            <DropZone label="Data Privacy Front" file={privacyPair.front}
              onSelect={(f) => setPrivacyPair((p) => ({ ...p, front: f[0] }))} />
            <DropZone label="Data Privacy Back"  file={privacyPair.back}
              onSelect={(f) => setPrivacyPair((p) => ({ ...p, back: f[0] }))} />
          </div>
        );

      case "otherDocs": {
        return (
          <div className="space-y-5">
            <OtherDocsDropZone onAdd={(list) => setOtherDocs((p) => [...p, ...list])} />
            {otherDocs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {otherDocs.length} file{otherDocs.length !== 1 ? "s" : ""} added
                  </p>
                  <button type="button" onClick={() => setOtherDocs([])}
                    className="text-xs font-medium text-red-500 hover:text-red-600">Remove all</button>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-start">
                  {otherDocs.map((file, idx) => (
                    <DocThumb key={`${file.name}-${idx}`} file={file} index={idx}
                      onRemove={(i) => setOtherDocs((p) => p.filter((_, x) => x !== i))} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      default: return null;
    }
  };

  const progress = Math.round(((step + 1) / activeSteps.length) * 100);

  const customerName = customer
    ? customer.account_type === "Corporate"
      ? customer.company_name
      : [customer.firstname, customer.lastname].filter(Boolean).join(" ")
    : "…";

  return (
    <div className="bg-gray-50 text-slate-900">
      <main className="flex flex-1 w-full max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8 lg:py-10">
        <div className="w-full space-y-5">

          {/* Back link + customer name */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(backUrl)}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
              <HiOutlineArrowLeft className="w-4 h-4" />
              Back to Customer
            </button>
            <div className="flex-1 h-px bg-slate-200" />
            {customer && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {customerName} — {customer.account_type}
              </span>
            )}
          </div>

          {/* Step pills */}
          <div className="flex flex-wrap items-center gap-2">
            {activeSteps.map((s, i) => {
              const isDone    = i < step;
              const isCurrent = i === step;
              return (
                <div key={s.key} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${isCurrent ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : isDone   ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-400"}`}>
                    {isDone ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < activeSteps.length - 1 && <div className={`w-4 h-px flex-shrink-0 ${i < step ? "bg-green-300" : "bg-slate-200"}`} />}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${progress}%` }} />
          </div>

          {/* Form card */}
          <div className="overflow-hidden bg-white border shadow-xl rounded-3xl border-slate-200">

            {/* Card header */}
            <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-purple-50 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step + 1}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{activeSteps[step].title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{stepDescriptions[activeSteps[step].key]}</p>
                </div>
                <div className="ml-auto text-xs text-slate-400 font-medium">Step {step + 1} of {activeSteps.length}</div>
              </div>
            </div>

            {/* Card body */}
            <div className="p-6 sm:p-8">{renderStep()}</div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-5 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <button onClick={handlePrev}
                className="flex items-center gap-2 px-6 py-3 font-semibold transition-all bg-white border-2 shadow-sm rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {step === 0 ? "Cancel" : "Previous"}
              </button>

              {step === activeSteps.length - 1 ? (
                <div className="flex flex-col items-end gap-2">
                  {isSubmitting && (
                    <div className="w-56">
                      <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                        <span>{`Uploading… ${uploadProgress}%`}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                  <button onClick={handleSubmit} disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-xl disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed">
                    {isSubmitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Uploading…
                      </>
                    ) : (
                      <>
                        Submit
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button onClick={handleNext} disabled={!isStepValid}
                  className="flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-md">
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddAccount;
