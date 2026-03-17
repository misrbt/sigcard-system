import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import {
  HiOutlineCheckCircle,
  HiOutlineUpload,
  HiOutlinePhotograph,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineCreditCard,
  HiOutlinePlus,
  HiOutlineX,
} from "react-icons/hi";

// ── Image compression ─────────────────────────────────────────────────────────
const compressImage = (file, maxWidth = 1200, maxHeight = 1600, quality = 0.82) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })),
        "image/jpeg", quality
      );
    };
    img.src = url;
  });

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_LEVELS = ["Low Risk", "Medium Risk", "High Risk"];

const STATUS_OPTIONS = [
  { value: "active",      label: "Active",      color: "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400/20"   },
  { value: "dormant",     label: "Dormant",     color: "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20" },
  { value: "reactivated", label: "Reactivated", color: "bg-teal-50 border-teal-400 text-teal-700 ring-2 ring-teal-400/20"       },
  { value: "escheat",     label: "Escheat",     color: "bg-orange-50 border-orange-400 text-orange-700 ring-2 ring-orange-400/20" },
  { value: "closed",      label: "Closed",      color: "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20"           },
];

const RISK_STYLE = {
  "Low Risk":    "bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-400/20",
  "Medium Risk": "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20",
  "High Risk":   "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20",
};

const ACCOUNT_TYPE_CONFIG = [
  { value: "Regular",   label: "Regular",   description: "Standard individual savings or checking account.", icon: HiOutlineUser,          color: "blue",   ring: "ring-blue-500",   bg: "bg-blue-50",   border: "border-blue-500",   iconBg: "bg-blue-500"   },
  { value: "Joint",     label: "Joint",     description: "Two or more people sharing one account.",          icon: HiOutlineUsers,         color: "purple", ring: "ring-purple-500", bg: "bg-purple-50", border: "border-purple-500", iconBg: "bg-purple-500" },
  { value: "Corporate", label: "Corporate", description: "Business or organization account.",                icon: HiOutlineOfficeBuilding, color: "slate",  ring: "ring-slate-500",  bg: "bg-slate-50",  border: "border-slate-500",  iconBg: "bg-slate-600"  },
];

const JOINT_SUB_TYPE_CONFIG = [
  { value: "ITF",     label: "ITF (In Trust For)",  description: "Two or more persons sharing one account. Each person uploads their own documents.", icon: HiOutlineUsers,      color: "purple", ring: "ring-purple-500", bg: "bg-purple-50", border: "border-purple-500", iconBg: "bg-purple-500" },
  { value: "Non-ITF", label: "Non-ITF",             description: "One customer with one or more accounts. Each account has its own documents.", icon: HiOutlineCreditCard, color: "indigo", ring: "ring-indigo-500", bg: "bg-indigo-50", border: "border-indigo-500", iconBg: "bg-indigo-500" },
];

const PERSON_COLORS = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500", "bg-rose-500"];

const BASE_STEPS = [
  { key: "accountType",  title: "Account Type"        },
  { key: "customerInfo", title: "Customer Info"        },
  { key: "holders",      title: "Account Holder"       },
  { key: "sigcard",      title: "Sigcard Upload"       },
  { key: "nais",         title: "NAIS (Optional)"      },
  { key: "privacy",      title: "Data Privacy"         },
  { key: "otherDocs",    title: "Other Docs (Optional)"},
];

const stepDescriptions = {
  accountType:  "Choose the account classification for this customer.",
  jointSubType: "Choose the joint account classification.",
  customerInfo: "Enter the customer's personal or company information and account holders.",
  holders:      "Set the risk level and account details. You may also add additional accounts.",
  sigcard:      "Upload front and back images of the signature card.",
  nais:         "Upload NAIS document images — optional, you may skip.",
  privacy:      "Upload the signed data privacy consent form.",
  otherDocs:    "Upload any additional supporting documents — optional.",
};

const emptyPair    = ()  => ({ front: null, back: null });
const emptyPerson  = ()  => ({ firstName: "", middleName: "", lastName: "", suffix: "" });
const emptyAccount = ()  => ({ accountNo: "", riskLevel: "", dateOpened: "", dateUpdated: "", status: "active" });

const initialFiles = {
  sigcardPairs: [emptyPair()],
  naisPairs:    [emptyPair()],
  privacyPairs: [emptyPair()],
  otherDocs:    [[]], // one sub-array per account/person
};

const initialItfFiles = () => ({
  sigcard:  [emptyPair()],    // shared — one front/back pair by default
  nais:     [emptyPair()],
  privacy:  [emptyPair()],
  otherDocs: [[]],
});

const toTitleCase = (str) =>
  str.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const inputCls = "w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all";

// ── Shared sub-components ─────────────────────────────────────────────────────

const RiskLevelPicker = ({ value, onChange, label = "Risk Level" }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600">
      {label} <span className="text-red-500">*</span>
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
      {STATUS_OPTIONS.map(({ value: v, label, color }) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${value === v ? color : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
          {label}
        </button>
      ))}
    </div>
  </div>
);

const NameGrid = ({ values, onChange }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    {[
      { key: "firstName",  label: "First Name",  req: true,  placeholder: "Enter first name" },
      { key: "middleName", label: "Middle Name", req: false, placeholder: "Enter middle name" },
      { key: "lastName",   label: "Last Name",   req: true,  placeholder: "Enter last name" },
      { key: "suffix",     label: "Suffix",      req: false, placeholder: "Jr., Sr., III…" },
    ].map(({ key, label, req, placeholder }) => (
      <div key={key} className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600">
          {label}{" "}
          {req
            ? <span className="text-red-500">*</span>
            : <span className="font-normal text-slate-400">(Optional)</span>}
        </label>
        <input value={values[key]} onChange={(e) => onChange(key, toTitleCase(e.target.value))}
          placeholder={placeholder} className={inputCls} />
      </div>
    ))}
  </div>
);

const AccountInfoRow = ({ accountNo, dateOpened, dateUpdated, onAccountNo, onDateOpened, onDateUpdated }) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">
        Account No. <span className="text-red-500">*</span>
      </label>
      <input type="text" value={accountNo} onChange={onAccountNo}
        placeholder="e.g. 1234-5678-9012" maxLength={100} className={inputCls} />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">
        Date Opened
      </label>
      <input type="date" value={dateOpened} onChange={onDateOpened} className={inputCls} />
    </div>
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">
        Date Updated <span className="font-normal text-slate-400">(Optional)</span>
      </label>
      <input type="date" value={dateUpdated ?? ""} onChange={onDateUpdated} className={inputCls} />
    </div>
  </div>
);

const AccountTypePill = ({ type, onReset }) => {
  const cfg = ACCOUNT_TYPE_CONFIG.find((c) => c.value === type);
  if (!cfg || !type) return null;
  const colorMap = { blue: "bg-blue-50 border-blue-200 text-blue-700", purple: "bg-purple-50 border-purple-200 text-purple-700", slate: "bg-slate-100 border-slate-200 text-slate-700" };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${colorMap[cfg.color]}`}>
      <cfg.icon className="w-3.5 h-3.5" />
      {type}
      <button type="button" onClick={onReset} className="ml-1 underline font-normal opacity-70 hover:opacity-100">Change</button>
    </div>
  );
};

// ── Document upload sub-components ────────────────────────────────────────────
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

const PersonDocSection = ({ isMultiHolder, personIndex, totalPersons, minHolders, frontLabel, backLabel, frontFile, backFile, onFront, onBack, onRemove, sectionLabel }) => {
  const canRemove = isMultiHolder && totalPersons > minHolders && personIndex >= minHolders;
  return (
    <div className="space-y-4">
      {isMultiHolder && (
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PERSON_COLORS[personIndex] ?? "bg-slate-400"}`} />
          <p className="text-sm font-semibold text-slate-700">
            {sectionLabel ?? (personIndex === 0 ? "Person 1 — Primary" : personIndex === 1 ? "Person 2 — Secondary" : `Person ${personIndex + 1}`)}
          </p>
          <div className="flex-1 h-px bg-slate-200" />
          {canRemove && (
            <button type="button" onClick={onRemove} className="text-xs font-medium text-red-500 hover:text-red-600 flex-shrink-0">Remove</button>
          )}
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <DropZone label={frontLabel} file={frontFile} onSelect={onFront} />
        <DropZone label={backLabel}  file={backFile}  onSelect={onBack}  />
      </div>
    </div>
  );
};

const JointDocStep = ({ isMultiHolder, minHolders, pairs, frontLabel, backLabel, onSetFile, onRemovePerson, sectionLabels }) => (
  <div className="space-y-8">
    {pairs.map((pair, i) => (
      <PersonDocSection key={i} isMultiHolder={isMultiHolder} personIndex={i} totalPersons={pairs.length}
        minHolders={minHolders} frontLabel={frontLabel} backLabel={backLabel}
        frontFile={pair.front} backFile={pair.back}
        onFront={(f) => onSetFile(i, "front", f)} onBack={(f) => onSetFile(i, "back", f)}
        onRemove={() => onRemovePerson?.(i)}
        sectionLabel={sectionLabels?.[i]} />
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const UploadSigcard = () => {
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    accountType: "", jointSubType: "", firstName: "", middleName: "", lastName: "",
    suffix: "", companyName: "", riskLevel: "", accountNo: "", dateOpened: "",
    dateUpdated: "", status: "active",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [files,              setFiles]              = useState(initialFiles);
  const [itfFiles,           setItfFiles]           = useState(initialItfFiles);
  const [additionalPersons,  setAdditionalPersons]  = useState([]);
  const [additionalAccounts, setAdditionalAccounts] = useState([]);
  const [corpSigFronts,      setCorpSigFronts]      = useState([null]);
  const [corpSigBacks,       setCorpSigBacks]        = useState([null, null]);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [uploadProgress,     setUploadProgress]     = useState(0);
  const [submitPhase,        setSubmitPhase]        = useState("idle");

  const isJoint     = formData.accountType === "Joint";
  const isRegular   = formData.accountType === "Regular";
  const isCorporate = formData.accountType === "Corporate";
  const isITF       = isJoint && formData.jointSubType === "ITF";
  const isNonITF    = isJoint && formData.jointSubType === "Non-ITF";

  // Dynamic steps: insert jointSubType step after accountType when Joint
  const activeSteps = useMemo(() => {
    if (isJoint) {
      return [
        BASE_STEPS[0], // accountType
        { key: "jointSubType", title: "Joint Type" },
        ...BASE_STEPS.slice(1),
      ];
    }
    return BASE_STEPS;
  }, [isJoint]);

  // Guard step index when steps change
  useEffect(() => {
    if (step >= activeSteps.length) setStep(activeSteps.length - 1);
  }, [activeSteps.length]);

  // Reset jointSubType when account type changes away from Joint
  useEffect(() => {
    if (!isJoint) {
      setFormData((prev) => ({ ...prev, jointSubType: "" }));
    }
  }, [isJoint]);

  // Sync persons/accounts when jointSubType changes
  useEffect(() => {
    if (isITF) {
      setAdditionalPersons((prev) => (prev.length >= 1 ? prev : [emptyPerson()]));
      setAdditionalAccounts([]);
      setItfFiles(initialItfFiles());
    } else if (isNonITF) {
      setAdditionalPersons((prev) => (prev.length >= 1 ? prev : [emptyPerson()]));
      setAdditionalAccounts([]);
    }
  }, [formData.jointSubType]);

  // Sync persons/accounts when account type changes
  useEffect(() => {
    if (!isJoint && !isCorporate) {
      setAdditionalPersons([]);
    }
    if (isCorporate) {
      setAdditionalPersons((prev) => (prev.length >= 1 ? prev : [emptyPerson()]));
    }
    setAdditionalAccounts([]);
    setFiles((prev) => ({
      ...prev,
      sigcardPairs: [prev.sigcardPairs[0] ?? emptyPair()],
      naisPairs:    [prev.naisPairs[0]    ?? emptyPair()],
      privacyPairs: [prev.privacyPairs[0] ?? emptyPair()],
      otherDocs:    [prev.otherDocs?.[0]  ?? []],
    }));
  }, [formData.accountType]);

  // Sync doc pair count for non-ITF flows:
  //   Non-ITF Joint: sigcardPairs → per-person (back only), nais/privacy/otherDocs → per-account
  //   Regular/Corporate: all per-account
  useEffect(() => {
    if (isITF) return; // ITF uses itfFiles, not files
    const personCount = isNonITF ? additionalPersons.length + 1 : 1;
    const sigcardCount = isNonITF ? personCount : additionalAccounts.length + 1;
    const acctCount    = additionalAccounts.length + 1;
    setFiles((prev) => {
      const sync = (pairs, target) => {
        if (pairs.length === target) return pairs;
        if (pairs.length < target)
          return [...pairs, ...Array.from({ length: target - pairs.length }, emptyPair)];
        return pairs.slice(0, target);
      };
      const syncOther = (others, target) => {
        if (others.length === target) return others;
        if (others.length < target)
          return [...others, ...Array.from({ length: target - others.length }, () => [])];
        return others.slice(0, target);
      };
      return {
        ...prev,
        sigcardPairs: isCorporate ? prev.sigcardPairs : sync(prev.sigcardPairs, sigcardCount),
        naisPairs:    sync(prev.naisPairs,    acctCount),
        privacyPairs: isNonITF ? prev.privacyPairs : sync(prev.privacyPairs, acctCount),
        otherDocs:    syncOther(prev.otherDocs, acctCount),
      };
    });
  }, [isITF, isNonITF, isCorporate, additionalPersons.length, additionalAccounts.length]);

  // Sync corporate sigcard arrays to person count
  useEffect(() => {
    if (!isCorporate) return;
    const totalPersons = additionalPersons.length + 1;
    setCorpSigBacks((prev) => {
      if (prev.length === totalPersons) return prev;
      if (prev.length < totalPersons) return [...prev, ...Array(totalPersons - prev.length).fill(null)];
      return prev.slice(0, totalPersons);
    });
    if (totalPersons === 2) setCorpSigFronts((prev) => [prev[0] ?? null]);
  }, [isCorporate, additionalPersons.length]);

  const setField  = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));
  const handleInp = (e) => setField(e.target.name, e.target.value);

  const setPairFile = (docKey, pairIndex, side, fileList) => {
    setFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[pairIndex] = { ...updated[pairIndex], [side]: fileList[0] };
      return { ...prev, [docKey]: updated };
    });
  };

  // ITF file helpers (shared front/back pairs)
  const setItfPairSide = (docKey, pairIdx, side, fileList) => {
    setItfFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[pairIdx] = { ...updated[pairIdx], [side]: fileList[0] };
      return { ...prev, [docKey]: updated };
    });
  };

  const addItfPair = (docKey) => {
    setItfFiles((prev) => ({ ...prev, [docKey]: [...prev[docKey], emptyPair()] }));
  };

  const removeItfPairAt = (docKey, pairIdx) => {
    setItfFiles((prev) => ({ ...prev, [docKey]: prev[docKey].filter((_, i) => i !== pairIdx) }));
  };

  const isStepValid = useMemo(() => {
    const currentKey = activeSteps[step]?.key;
    switch (currentKey) {
      case "accountType":  return !!formData.accountType;
      case "jointSubType": return !!formData.jointSubType;
      case "customerInfo":
        if (isCorporate) return !!formData.companyName.trim() && !!formData.firstName.trim() && !!formData.lastName.trim() &&
          additionalPersons.length >= 1 && additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim());
        if (isITF) return !!formData.firstName.trim() && !!formData.lastName.trim() &&
          additionalPersons.length >= 1 && additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim());
        if (isNonITF) return !!formData.firstName.trim() && !!formData.lastName.trim() &&
          additionalPersons.length >= 1 && additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim());
        return !!formData.firstName.trim() && !!formData.lastName.trim();
      case "holders":
        if (!formData.riskLevel || !formData.status) return false;
        if (!formData.accountNo.trim()) return false;
        return additionalAccounts.every((a) => !!a.riskLevel && !!a.accountNo.trim() && !!a.status);
      case "sigcard":
        if (isITF) return itfFiles.sigcard.every((p) => p.front || p.back);
        if (isNonITF) return !!files.sigcardPairs[0]?.front && files.sigcardPairs.every((p) => !!p.back);
        if (isCorporate) return corpSigFronts.every((f) => f !== null) && corpSigBacks.every((f) => f !== null);
        return files.sigcardPairs.every((p) => p.front && p.back);
      case "nais": return true;
      case "privacy":
        if (isITF) return itfFiles.privacy.every((p) => p.front || p.back);
        if (isNonITF) return files.privacyPairs.every((p) => p.front || p.back);
        return files.privacyPairs.every((p) => p.front && p.back);
      case "otherDocs": return true;
      default: return false;
    }
  }, [step, formData, files, itfFiles, additionalPersons, additionalAccounts, activeSteps, corpSigFronts, corpSigBacks]);

  const handleNext = () => { if (isStepValid) setStep((s) => Math.min(s + 1, activeSteps.length - 1)); };
  const handlePrev = () => setStep((s) => Math.max(s - 1, 0));

  const resetAll = () => {
    setStep(0);
    setFormData({ accountType:"", jointSubType:"", firstName:"", middleName:"", lastName:"", suffix:"", companyName:"", riskLevel:"", accountNo:"", dateOpened:"", dateUpdated:"", status:"active" });
    setPhotoFile(null);
    setFiles(initialFiles);
    setItfFiles(initialItfFiles());
    setAdditionalPersons([]);
    setAdditionalAccounts([]);
    setCorpSigFronts([null]);
    setCorpSigBacks([null, null]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitPhase("compressing");
    try {
      // Compress files based on flow type
      let compressedPairs = {};
      let compressedOtherSections = [];
      let compressedItf = null;
      let compressedCorpFronts = [];
      let compressedCorpBacks = [];

      if (isITF) {
        // Compress ITF files (shared front/back pairs for all doc types)
        const itfCompressed = {};
        for (const docKey of ["sigcard", "nais", "privacy"]) {
          itfCompressed[docKey] = await Promise.all(
            itfFiles[docKey].map(async (pair) => ({
              front: pair.front ? await compressImage(pair.front) : null,
              back:  pair.back  ? await compressImage(pair.back)  : null,
            }))
          );
        }
        // Compress ITF other docs (single shared section)
        const otherSection = itfFiles.otherDocs[0] ?? [];
        compressedItf = {
          ...itfCompressed,
          otherDocs: [await Promise.all(otherSection.map((f) => compressImage(f)))],
        };
      } else {
        // Compress non-ITF files (Regular, Non-ITF, Corporate)
        if (isCorporate) {
          compressedCorpFronts = await Promise.all(corpSigFronts.map((f) => f ? compressImage(f) : null));
          compressedCorpBacks = await Promise.all(corpSigBacks.map((f) => f ? compressImage(f) : null));
        }
        const pairKeys = ["sigcardPairs", "naisPairs", "privacyPairs"];
        await Promise.all(pairKeys.map(async (key) => {
          compressedPairs[key] = await Promise.all(
            files[key].map(async (pair) => ({
              front: pair.front ? await compressImage(pair.front) : null,
              back:  pair.back  ? await compressImage(pair.back)  : null,
            }))
          );
        }));
        compressedOtherSections = await Promise.all(
          files.otherDocs.map((section) => Promise.all((section ?? []).map((f) => compressImage(f))))
        );
      }

      const fd = new FormData();
      if (isCorporate) {
        fd.append("company_name", formData.companyName);
      }
      fd.append("firstname",  formData.firstName);
      fd.append("middlename", formData.middleName);
      fd.append("lastname",   formData.lastName);
      fd.append("suffix",     formData.suffix);
      fd.append("account_type",  formData.accountType);
      fd.append("risk_level",    formData.riskLevel);
      fd.append("account_no",    formData.accountNo);
      if (formData.dateOpened) fd.append("date_opened", formData.dateOpened);
      fd.append("status",        formData.status || "active");
      if (formData.dateUpdated) fd.append("date_updated", formData.dateUpdated);
      if (photoFile)            fd.append("photo", photoFile);
      if (user?.branch?.id)     fd.append("branch_id", user.branch.id);

      if (isJoint) {
        fd.append("joint_sub_type", formData.jointSubType);
      }

      if (isITF) {
        // ITF: send additional person
        additionalPersons.forEach((p, i) => {
          fd.append(`additionalPersons[${i}][firstname]`,  p.firstName);
          fd.append(`additionalPersons[${i}][middlename]`, p.middleName);
          fd.append(`additionalPersons[${i}][lastname]`,   p.lastName);
          fd.append(`additionalPersons[${i}][suffix]`,     p.suffix);
        });

        // ITF: shared front/back pairs for all doc types
        for (const [docKey, fdKey] of [["sigcard", "sigcardPairs"], ["nais", "naisPairs"], ["privacy", "privacyPairs"]]) {
          compressedItf[docKey].forEach((pair, i) => {
            if (!pair.front && !pair.back) return;
            if (pair.front) fd.append(`${fdKey}[${i}][front]`, pair.front);
            if (pair.back)  fd.append(`${fdKey}[${i}][back]`, pair.back);
            fd.append(`${fdKey}[${i}][person_index]`, 1);
          });
        }

        // ITF other docs: single shared section → otherDocs[1][]
        compressedItf.otherDocs[0].forEach((f) => fd.append(`otherDocs[1][]`, f));
      } else {
        // Non-ITF / Regular / Corporate
        if (isNonITF || isCorporate) {
          // Non-ITF / Corporate has additional persons
          additionalPersons.forEach((p, i) => {
            fd.append(`additionalPersons[${i}][firstname]`,  p.firstName);
            fd.append(`additionalPersons[${i}][middlename]`, p.middleName);
            fd.append(`additionalPersons[${i}][lastname]`,   p.lastName);
            fd.append(`additionalPersons[${i}][suffix]`,     p.suffix);
          });
        }

        additionalAccounts.forEach((a, i) => {
          fd.append(`additionalAccounts[${i}][account_no]`,  a.accountNo);
          fd.append(`additionalAccounts[${i}][risk_level]`,  a.riskLevel);
          if (a.dateOpened) fd.append(`additionalAccounts[${i}][date_opened]`, a.dateOpened);
          fd.append(`additionalAccounts[${i}][status]`,      a.status || "active");
          if (a.dateUpdated) fd.append(`additionalAccounts[${i}][date_updated]`, a.dateUpdated);
        });

        if (isCorporate) {
          // Corporate sigcard: fronts (all person_index=1) + backs (person_index per person)
          let pairIdx = 0;
          compressedCorpFronts.forEach((f) => {
            if (f) {
              fd.append(`sigcardPairs[${pairIdx}][front]`, f);
              fd.append(`sigcardPairs[${pairIdx}][person_index]`, 1);
              pairIdx++;
            }
          });
          compressedCorpBacks.forEach((f, i) => {
            if (f) {
              fd.append(`sigcardPairs[${pairIdx}][back]`, f);
              fd.append(`sigcardPairs[${pairIdx}][person_index]`, i + 1);
              pairIdx++;
            }
          });
          // NAIS + Privacy still per-account
          for (const key of ["naisPairs", "privacyPairs"]) {
            compressedPairs[key].forEach((pair, i) => {
              if (pair.front) fd.append(`${key}[${i}][front]`, pair.front);
              if (pair.back)  fd.append(`${key}[${i}][back]`, pair.back);
            });
          }
          compressedOtherSections.forEach((section, i) => {
            section.forEach((f) => fd.append(`otherDocs[${i + 1}][]`, f));
          });
        } else {
          const pairKeys = ["sigcardPairs", "naisPairs", "privacyPairs"];
          for (const key of pairKeys) {
            compressedPairs[key].forEach((pair, i) => {
              if (pair.front) fd.append(`${key}[${i}][front]`, pair.front);
              if (pair.back)  fd.append(`${key}[${i}][back]`,  pair.back);
            });
          }
          compressedOtherSections.forEach((section, i) => {
            section.forEach((f) => fd.append(`otherDocs[${i + 1}][]`, f));
          });
        }
      }

      setSubmitPhase("uploading");
      await api.post("/customers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)); },
      });

      await Swal.fire({
        icon: "success", title: "Customer Saved!",
        text: "The customer record and all documents have been successfully submitted.",
        confirmButtonText: "Done", confirmButtonColor: "#2563eb", timer: 6000, timerProgressBar: true,
      });
      resetAll();
    } catch (err) {
      const data = err?.response?.data;
      const msg  = data?.errors ? Object.values(data.errors).flat().join("\n") : data?.error || data?.message || "Something went wrong. Please try again.";
      Swal.fire({ icon: "error", title: "Submission Failed", text: msg, confirmButtonText: "OK", confirmButtonColor: "#2563eb" });
    } finally {
      setIsSubmitting(false);
      setSubmitPhase("idle");
      setUploadProgress(0);
    }
  };

  // ── Step content renderer ────────────────────────────────────────────────────
  const renderStep = () => {
    const currentKey = activeSteps[step]?.key;
    switch (currentKey) {

      // ── STEP 1: Account Type ───────────────────────────────────────────────
      case "accountType":
        return (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">Select the account type. This determines the required document sets and holder structure.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {ACCOUNT_TYPE_CONFIG.map(({ value, label, description, icon: Icon, bg, border, ring, iconBg }) => {
                const isSelected = formData.accountType === value;
                return (
                  <motion.button key={value} type="button" whileTap={{ scale: 0.97 }}
                    onClick={() => setField("accountType", value)}
                    className={`relative flex flex-col items-center gap-4 p-7 rounded-2xl border-2 text-center transition-all outline-none
                      ${isSelected ? `${bg} ${border} ring-4 ${ring}/20 shadow-lg` : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}
                  >
                    {isSelected && <div className="absolute top-3 right-3"><HiOutlineCheckCircle className="w-5 h-5 text-green-500" /></div>}
                    <div className={`p-4 rounded-2xl ${isSelected ? iconBg : "bg-slate-100"} transition-colors`}>
                      <Icon className={`w-8 h-8 ${isSelected ? "text-white" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <p className={`text-base font-bold mb-1 ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{label}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-center text-slate-400">Select an account type, then click Next to continue</p>
          </div>
        );

      // ── STEP: Joint Sub-Type ───────────────────────────────────────────────
      case "jointSubType":
        return (
          <div className="space-y-6">
            <AccountTypePill type={formData.accountType} onReset={() => setStep(0)} />
            <p className="text-sm text-slate-500">Select the joint account classification.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {JOINT_SUB_TYPE_CONFIG.map(({ value, label, description, icon: Icon, bg, border, ring, iconBg }) => {
                const isSelected = formData.jointSubType === value;
                return (
                  <motion.button key={value} type="button" whileTap={{ scale: 0.97 }}
                    onClick={() => setField("jointSubType", value)}
                    className={`relative flex flex-col items-center gap-4 p-7 rounded-2xl border-2 text-center transition-all outline-none
                      ${isSelected ? `${bg} ${border} ring-4 ${ring}/20 shadow-lg` : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}
                  >
                    {isSelected && <div className="absolute top-3 right-3"><HiOutlineCheckCircle className="w-5 h-5 text-green-500" /></div>}
                    <div className={`p-4 rounded-2xl ${isSelected ? iconBg : "bg-slate-100"} transition-colors`}>
                      <Icon className={`w-8 h-8 ${isSelected ? "text-white" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <p className={`text-base font-bold mb-1 ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{label}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-center text-slate-400">Choose the joint type, then click Next to continue</p>
          </div>
        );

      // ── STEP: Customer Info ──────────────────────────────────────────────
      case "customerInfo":
        return (
          <div className="space-y-6">
            <AccountTypePill type={formData.accountType} onReset={() => setStep(0)} />

            {isCorporate ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center text-white flex-shrink-0">
                    <HiOutlineOfficeBuilding className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Corporate Account</p>
                    <p className="text-xs text-slate-400">Business or organization — minimum 2 signatories</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Company Name <span className="text-red-500">*</span></label>
                  <input value={formData.companyName} onChange={(e) => setField("companyName", toTitleCase(e.target.value))}
                    placeholder="Enter company or organization name" className={inputCls} />
                </div>

                {/* Person 1 — Primary signatory */}
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/30 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[0]}`}>1</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Signatory 1 — Primary</p>
                      <p className="text-xs text-slate-400">Primary authorized signatory</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200" />
                  <NameGrid
                    values={{ firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName, suffix: formData.suffix }}
                    onChange={(key, val) => setField(key, val)}
                  />
                </div>

                {/* Additional signatories */}
                {additionalPersons.map((p, i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-200 bg-slate-50/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[(i + 1) % PERSON_COLORS.length]}`}>{i + 2}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Signatory {i + 2}</p>
                          <p className="text-xs text-slate-400">Authorized signatory</p>
                        </div>
                      </div>
                      {additionalPersons.length > 1 && (
                        <button type="button"
                          onClick={() => setAdditionalPersons((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-xs font-medium text-red-500 hover:text-red-600">Remove</button>
                      )}
                    </div>
                    <div className="border-t border-slate-200" />
                    <NameGrid
                      values={p}
                      onChange={(key, val) => setAdditionalPersons((prev) => prev.map((x, idx) => idx === i ? { ...x, [key]: val } : x))}
                    />
                  </div>
                ))}
                <button type="button"
                  onClick={() => setAdditionalPersons((prev) => [...prev, emptyPerson()])}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-slate-600 border-2 border-dashed border-slate-300 rounded-2xl hover:border-slate-500 hover:bg-slate-50 transition-all">
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Another Signatory
                </button>
                {/* Photo — optional */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Customer Photo <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {photoFile ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 flex-shrink-0">
                        <img src={URL.createObjectURL(photoFile)} alt="Photo" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotoFile(null)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">✕</button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 flex-shrink-0">
                        <HiOutlinePhotograph className="w-8 h-8" />
                      </div>
                    )}
                    <label className="cursor-pointer flex-1">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); e.target.value = ""; }} />
                      <div className="px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-center">
                        {photoFile ? "Change Photo" : "Upload Photo"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : isITF ? (
              <div className="space-y-5">
                {/* Person 1 — Primary (always shown) */}
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/20 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[0]}`}>1</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Person 1 — Primary</p>
                      <p className="text-xs text-slate-400">Primary account holder</p>
                    </div>
                  </div>
                  <div className="border-t border-blue-100" />
                  <NameGrid
                    values={{ firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName, suffix: formData.suffix }}
                    onChange={(key, val) => setField(key, val)}
                  />
                </div>
                {/* Person 2+ */}
                {additionalPersons.map((p, i) => (
                  <div key={i} className="rounded-2xl border-2 border-purple-100 bg-purple-50/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[i + 1] ?? "bg-slate-500"}`}>{i + 2}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Person {i + 2}{i === 0 ? " — Secondary" : ""}</p>
                          <p className="text-xs text-slate-400">Additional account holder</p>
                        </div>
                      </div>
                      {additionalPersons.length > 1 && (
                        <button type="button"
                          onClick={() => setAdditionalPersons((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-xs font-medium text-red-500 hover:text-red-600">Remove</button>
                      )}
                    </div>
                    <div className="border-t border-purple-100" />
                    <NameGrid
                      values={p}
                      onChange={(key, val) => setAdditionalPersons((prev) => prev.map((x, idx) => idx === i ? { ...x, [key]: val } : x))}
                    />
                  </div>
                ))}
                <button type="button"
                  onClick={() => setAdditionalPersons((prev) => [...prev, emptyPerson()])}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Another Person
                </button>
                {/* Photo — optional */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Customer Photo <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {photoFile ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 flex-shrink-0">
                        <img src={URL.createObjectURL(photoFile)} alt="Photo" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotoFile(null)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">✕</button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 flex-shrink-0">
                        <HiOutlinePhotograph className="w-8 h-8" />
                      </div>
                    )}
                    <label className="cursor-pointer flex-1">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); e.target.value = ""; }} />
                      <div className="px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-center">
                        {photoFile ? "Change Photo" : "Upload Photo"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : isNonITF ? (
              <div className="space-y-5">
                {/* Person 1 — always shown */}
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/20 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[0]}`}>1</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Person 1 — Primary</p>
                      <p className="text-xs text-slate-400">Primary account holder</p>
                    </div>
                  </div>
                  <div className="border-t border-blue-100" />
                  <NameGrid
                    values={{ firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName, suffix: formData.suffix }}
                    onChange={(key, val) => setField(key, val)}
                  />
                </div>
                {/* Person 2+ */}
                {additionalPersons.map((p, i) => (
                  <div key={i} className="rounded-2xl border-2 border-purple-100 bg-purple-50/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[i + 1] ?? "bg-slate-500"}`}>{i + 2}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Person {i + 2}{i === 0 ? " — Secondary" : ""}</p>
                          <p className="text-xs text-slate-400">Additional account holder</p>
                        </div>
                      </div>
                      {additionalPersons.length > 1 && (
                        <button type="button"
                          onClick={() => setAdditionalPersons((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-xs font-medium text-red-500 hover:text-red-600">Remove</button>
                      )}
                    </div>
                    <div className="border-t border-purple-100" />
                    <NameGrid
                      values={p}
                      onChange={(key, val) => setAdditionalPersons((prev) => prev.map((x, idx) => idx === i ? { ...x, [key]: val } : x))}
                    />
                  </div>
                ))}
                <button type="button"
                  onClick={() => setAdditionalPersons((prev) => [...prev, emptyPerson()])}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Another Person
                </button>
                {/* Photo — optional */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Customer Photo <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {photoFile ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 flex-shrink-0">
                        <img src={URL.createObjectURL(photoFile)} alt="Photo" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotoFile(null)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">✕</button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 flex-shrink-0">
                        <HiOutlinePhotograph className="w-8 h-8" />
                      </div>
                    )}
                    <label className="cursor-pointer flex-1">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); e.target.value = ""; }} />
                      <div className="px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-center">
                        {photoFile ? "Change Photo" : "Upload Photo"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${PERSON_COLORS[0]}`}>1</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Account Holder</p>
                    <p className="text-xs text-slate-400">Enter the customer's personal information</p>
                  </div>
                </div>
                <NameGrid
                  values={{ firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName, suffix: formData.suffix }}
                  onChange={(key, val) => setField(key, val)}
                />
                {/* Photo — optional */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Customer Photo <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {photoFile ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 flex-shrink-0">
                        <img src={URL.createObjectURL(photoFile)} alt="Photo" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotoFile(null)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">✕</button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 flex-shrink-0">
                        <HiOutlinePhotograph className="w-8 h-8" />
                      </div>
                    )}
                    <label className="cursor-pointer flex-1">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); e.target.value = ""; }} />
                      <div className="px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-center">
                        {photoFile ? "Change Photo" : "Upload Photo"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      // ── STEP: Account Holder(s) + Accounts ──────────────────────────────
      case "holders":
        return (
          <div className="space-y-6">
            <AccountTypePill type={formData.accountType} onReset={() => setStep(0)} />

            {/* Primary account card */}
            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/20 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[0]}`}>1</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {isCorporate
                      ? formData.companyName || "Corporate Account"
                      : `${formData.firstName} ${formData.lastName}`.trim() || "Account Holder"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isITF ? "Shared ITF account" : isNonITF ? "Primary account" : isCorporate ? "Corporate account" : "Primary account"}
                  </p>
                </div>
              </div>

              <RiskLevelPicker value={formData.riskLevel} onChange={(v) => setField("riskLevel", v)} />

              <div className="border-t border-blue-100" />

              <StatusPicker value={formData.status} onChange={(v) => setField("status", v)} />
              <AccountInfoRow
                accountNo={formData.accountNo} dateOpened={formData.dateOpened} dateUpdated={formData.dateUpdated}
                onAccountNo={(e) => setField("accountNo", e.target.value)}
                onDateOpened={(e) => setField("dateOpened", e.target.value)}
                onDateUpdated={(e) => setField("dateUpdated", e.target.value)}
              />
            </div>

            {/* Additional accounts — only for Non-ITF, Regular, Corporate (NOT ITF) */}
            {!isITF && (
              <>
                {additionalAccounts.map((a, i) => (
                  <div key={i} className="rounded-2xl border-2 border-slate-100 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${PERSON_COLORS[(i + 1) % PERSON_COLORS.length]}`}>{i + 2}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Account {i + 2}</p>
                          <p className="text-xs text-slate-400">Additional account</p>
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => setAdditionalAccounts((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-xs font-medium text-red-500 hover:text-red-600 flex-shrink-0">Remove</button>
                    </div>

                    <div className="border-t border-slate-100" />

                    <RiskLevelPicker
                      value={a.riskLevel}
                      onChange={(v) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, riskLevel: v } : x))}
                    />

                    <div className="border-t border-slate-100" />

                    <StatusPicker
                      value={a.status}
                      onChange={(v) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, status: v } : x))}
                    />
                    <AccountInfoRow
                      accountNo={a.accountNo} dateOpened={a.dateOpened} dateUpdated={a.dateUpdated}
                      onAccountNo={(e) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, accountNo: e.target.value } : x))}
                      onDateOpened={(e) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, dateOpened: e.target.value } : x))}
                      onDateUpdated={(e) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, dateUpdated: e.target.value } : x))}
                    />
                  </div>
                ))}

                <button type="button"
                  onClick={() => setAdditionalAccounts((prev) => [...prev, emptyAccount()])}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-blue-600 border-2 border-dashed border-blue-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Account
                </button>
              </>
            )}
          </div>
        );

      // ── Document uploads ─────────────────────────────────────────────────
      case "sigcard": {
        if (isITF) {
          return (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">Upload the shared sigcard for this joint account.</p>
              {itfFiles.sigcard.map((pair, pairIdx) => (
                <div key={pairIdx} className="space-y-2">
                  {itfFiles.sigcard.length > 1 && pairIdx >= 1 && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeItfPairAt("sigcard", pairIdx)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                        <HiOutlineX className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  )}
                  {itfFiles.sigcard.length > 1 && (
                    <p className="text-xs font-medium text-slate-400">Sigcard {pairIdx + 1}</p>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <DropZone label="Sigcard Front" file={pair.front} onSelect={(f) => setItfPairSide("sigcard", pairIdx, "front", f)} />
                    <DropZone label="Sigcard Back" file={pair.back} onSelect={(f) => setItfPairSide("sigcard", pairIdx, "back", f)} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addItfPair("sigcard")}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                <HiOutlinePlus className="w-3.5 h-3.5" />
                Add Another Sigcard
              </button>
            </div>
          );
        }

        // Non-ITF Joint: 1 shared sigcard front + 1 sigcard back per person
        if (isNonITF) {
          const personLabels = [
            "Person 1 — Primary",
            ...additionalPersons.map((_, i) => i === 0 ? "Person 2 — Secondary" : `Person ${i + 2}`),
          ];
          return (
            <div className="space-y-8">
              {/* Sigcard Front — single shared, full-width */}
              <DropZone
                label="Sigcard Front (Shared)"
                file={files.sigcardPairs[0]?.front}
                onSelect={(f) => setPairFile("sigcardPairs", 0, "front", f)}
              />

              {/* Sigcard Back — one per person in 2-col grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sigcard Back — per person</p>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {files.sigcardPairs.map((pair, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${PERSON_COLORS[i] ?? "bg-slate-400"}`}>
                          {i + 1}
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{personLabels[i]}</p>
                      </div>
                      <DropZone
                        label="Sigcard Back"
                        file={pair.back}
                        onSelect={(f) => setPairFile("sigcardPairs", i, "back", f)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // Corporate: custom sigcard fronts + per-person backs
        if (isCorporate) {
          const totalPersons = additionalPersons.length + 1;
          const personLabels = [
            `Signatory 1 — ${formData.firstName} ${formData.lastName}`.trim(),
            ...additionalPersons.map((p, i) => `Signatory ${i + 2} — ${p.firstName} ${p.lastName}`.trim()),
          ];
          return (
            <div className="space-y-8">
              {/* Section A — Sigcard Front */}
              <div className="space-y-4">
                <p className="text-xs text-slate-400">Upload the sigcard front(s) for this corporate account.</p>
                {corpSigFronts.map((file, idx) => (
                  <div key={idx} className="space-y-2">
                    {corpSigFronts.length > 1 && idx >= 1 && (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => setCorpSigFronts((prev) => prev.filter((_, i) => i !== idx))}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                          <HiOutlineX className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                    {corpSigFronts.length > 1 && (
                      <p className="text-xs font-medium text-slate-400">Sigcard Front {idx + 1}</p>
                    )}
                    <DropZone
                      label={corpSigFronts.length === 1 ? "Sigcard Front" : `Sigcard Front ${idx + 1}`}
                      file={file}
                      onSelect={(f) => setCorpSigFronts((prev) => prev.map((x, i) => i === idx ? f[0] : x))}
                    />
                  </div>
                ))}
                {totalPersons >= 3 && (
                  <button type="button" onClick={() => setCorpSigFronts((prev) => [...prev, null])}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-slate-600 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50 transition-all">
                    <HiOutlinePlus className="w-3.5 h-3.5" />
                    Add Another Sigcard Front
                  </button>
                )}
              </div>

              {/* Section B — Sigcard Back per signatory */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sigcard Back — per signatory</p>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {corpSigBacks.map((file, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${PERSON_COLORS[i % PERSON_COLORS.length]}`}>
                          {i + 1}
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{personLabels[i]}</p>
                      </div>
                      <DropZone
                        label="Sigcard Back"
                        file={file}
                        onSelect={(f) => setCorpSigBacks((prev) => prev.map((x, idx) => idx === i ? f[0] : x))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // Regular: per-account front+back
        const isMultiHolder = additionalAccounts.length > 0;
        const sectionLabels = additionalAccounts.length > 0
          ? [
              `Account 1 — Primary${formData.accountNo ? ` (${formData.accountNo})` : ""}`,
              ...additionalAccounts.map((a, i) => `Account ${i + 2}${a.accountNo ? ` (${a.accountNo})` : ""}`),
            ]
          : undefined;
        return <JointDocStep isMultiHolder={isMultiHolder} minHolders={1} pairs={files.sigcardPairs}
          frontLabel="Sigcard Front" backLabel="Sigcard Back"
          onSetFile={(i, s, f) => setPairFile("sigcardPairs", i, s, f)}
          sectionLabels={sectionLabels} />;
      }

      case "nais": {
        if (isITF) {
          return (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">Upload the shared NAIS for this joint account (optional).</p>
              {itfFiles.nais.map((pair, pairIdx) => (
                <div key={pairIdx} className="space-y-2">
                  {itfFiles.nais.length > 1 && pairIdx >= 1 && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeItfPairAt("nais", pairIdx)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                        <HiOutlineX className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  )}
                  {itfFiles.nais.length > 1 && (
                    <p className="text-xs font-medium text-slate-400">NAIS {pairIdx + 1}</p>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <DropZone label="NAIS Front" file={pair.front} onSelect={(f) => setItfPairSide("nais", pairIdx, "front", f)} />
                    <DropZone label="NAIS Back" file={pair.back} onSelect={(f) => setItfPairSide("nais", pairIdx, "back", f)} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addItfPair("nais")}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                <HiOutlinePlus className="w-3.5 h-3.5" />
                Add Another NAIS
              </button>
            </div>
          );
        }

        const isMultiHolder = additionalAccounts.length > 0;
        const sectionLabels = additionalAccounts.length > 0
          ? [
              `Account 1 — Primary${formData.accountNo ? ` (${formData.accountNo})` : ""}`,
              ...additionalAccounts.map((a, i) => `Account ${i + 2}${a.accountNo ? ` (${a.accountNo})` : ""}`),
            ]
          : undefined;
        return <JointDocStep isMultiHolder={isMultiHolder} minHolders={1} pairs={files.naisPairs}
          frontLabel="NAIS Front" backLabel="NAIS Back (Optional)"
          onSetFile={(i, s, f) => setPairFile("naisPairs", i, s, f)}
          sectionLabels={sectionLabels} />;
      }

      case "privacy": {
        if (isITF) {
          return (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">Upload the shared data privacy consent form for this joint account.</p>
              {itfFiles.privacy.map((pair, pairIdx) => (
                <div key={pairIdx} className="space-y-2">
                  {itfFiles.privacy.length > 1 && pairIdx >= 1 && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeItfPairAt("privacy", pairIdx)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                        <HiOutlineX className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  )}
                  {itfFiles.privacy.length > 1 && (
                    <p className="text-xs font-medium text-slate-400">Data Privacy {pairIdx + 1}</p>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <DropZone label="Data Privacy Front" file={pair.front} onSelect={(f) => setItfPairSide("privacy", pairIdx, "front", f)} />
                    <DropZone label="Data Privacy Back" file={pair.back} onSelect={(f) => setItfPairSide("privacy", pairIdx, "back", f)} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addItfPair("privacy")}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                <HiOutlinePlus className="w-3.5 h-3.5" />
                Add Another Data Privacy
              </button>
            </div>
          );
        }

        if (isNonITF) {
          // Non-ITF Joint: shared data privacy — front/back pairs, not per-account
          return (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">Upload the shared data privacy consent form for this joint account.</p>
              {files.privacyPairs.map((pair, pairIdx) => (
                <div key={pairIdx} className="space-y-2">
                  {files.privacyPairs.length > 1 && pairIdx >= 1 && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setFiles((prev) => ({
                        ...prev, privacyPairs: prev.privacyPairs.filter((_, i) => i !== pairIdx),
                      }))}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                        <HiOutlineX className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  )}
                  {files.privacyPairs.length > 1 && (
                    <p className="text-xs font-medium text-slate-400">Data Privacy {pairIdx + 1}</p>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <DropZone label="Data Privacy Front" file={pair.front} onSelect={(f) => setPairFile("privacyPairs", pairIdx, "front", f)} />
                    <DropZone label="Data Privacy Back" file={pair.back} onSelect={(f) => setPairFile("privacyPairs", pairIdx, "back", f)} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setFiles((prev) => ({ ...prev, privacyPairs: [...prev.privacyPairs, emptyPair()] }))}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                <HiOutlinePlus className="w-3.5 h-3.5" />
                Add Another Data Privacy
              </button>
            </div>
          );
        }

        // Regular / Corporate: per-account privacy front+back
        const isMultiHolder = additionalAccounts.length > 0;
        const sectionLabels = additionalAccounts.length > 0
          ? [
              `Account 1 — Primary${formData.accountNo ? ` (${formData.accountNo})` : ""}`,
              ...additionalAccounts.map((a, i) => `Account ${i + 2}${a.accountNo ? ` (${a.accountNo})` : ""}`),
            ]
          : undefined;
        return <JointDocStep isMultiHolder={isMultiHolder} minHolders={1} pairs={files.privacyPairs}
          frontLabel="Data Privacy Front" backLabel="Data Privacy Back"
          onSetFile={(i, s, f) => setPairFile("privacyPairs", i, s, f)}
          sectionLabels={sectionLabels} />;
      }

      // ── Other Documents ───────────────────────────────────────────────
      case "otherDocs": {
        if (isITF) {
          // ITF: single shared other docs section
          const flatDocs = itfFiles.otherDocs[0] ?? [];
          return (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">Upload any additional supporting documents for this joint ITF account.</p>
              <OtherDocsDropZone onAdd={(list) => setItfFiles((prev) => {
                const updated = [...prev.otherDocs];
                updated[0] = [...(updated[0] ?? []), ...list];
                return { ...prev, otherDocs: updated };
              })} />
              {flatDocs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {flatDocs.length} file{flatDocs.length !== 1 ? "s" : ""} added
                    </p>
                    <button type="button" onClick={() => setItfFiles((prev) => {
                      const updated = [...prev.otherDocs]; updated[0] = [];
                      return { ...prev, otherDocs: updated };
                    })} className="text-xs font-medium text-red-500 hover:text-red-600">Remove all</button>
                  </div>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-start">
                    {flatDocs.map((file, idx) => (
                      <DocThumb key={`${file.name}-${idx}`} file={file} index={idx}
                        onRemove={(i) => setItfFiles((prev) => {
                          const updated = [...prev.otherDocs];
                          updated[0] = updated[0].filter((_, x) => x !== i);
                          return { ...prev, otherDocs: updated };
                        })} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // Non-ITF / Regular / Corporate
        const showSections  = additionalAccounts.length > 0;
        const sectionLabels = showSections
          ? [
              `Account 1 — Primary${formData.accountNo ? ` (${formData.accountNo})` : ""}`,
              ...additionalAccounts.map((a, i) =>
                `Account ${i + 2}${a.accountNo ? ` (${a.accountNo})` : ""}`
              ),
            ]
          : null;

        if (showSections) {
          return (
            <div className="space-y-8">
              {files.otherDocs.map((sectionDocs, si) => (
                <div key={si} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PERSON_COLORS[si] ?? "bg-slate-400"}`} />
                    <p className="text-sm font-semibold text-slate-700">{sectionLabels[si]}</p>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <OtherDocsDropZone onAdd={(list) => setFiles((prev) => {
                    const updated = [...prev.otherDocs];
                    updated[si] = [...(updated[si] ?? []), ...list];
                    return { ...prev, otherDocs: updated };
                  })} />
                  {sectionDocs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-700">
                          {sectionDocs.length} file{sectionDocs.length !== 1 ? "s" : ""} added
                        </p>
                        <button type="button" onClick={() => setFiles((prev) => {
                          const updated = [...prev.otherDocs];
                          updated[si] = [];
                          return { ...prev, otherDocs: updated };
                        })} className="text-xs font-medium text-red-500 hover:text-red-600">Remove all</button>
                      </div>
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-start">
                        {sectionDocs.map((file, idx) => (
                          <DocThumb key={`${file.name}-${idx}`} file={file} index={idx}
                            onRemove={(i) => setFiles((prev) => {
                              const updated = [...prev.otherDocs];
                              updated[si] = updated[si].filter((_, x) => x !== i);
                              return { ...prev, otherDocs: updated };
                            })} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }

        // Single account — flat view (otherDocs[0])
        const flatDocs = files.otherDocs[0] ?? [];
        return (
          <div className="space-y-5">
            <OtherDocsDropZone onAdd={(list) => setFiles((prev) => {
              const updated = [...prev.otherDocs];
              updated[0] = [...(updated[0] ?? []), ...list];
              return { ...prev, otherDocs: updated };
            })} />
            {flatDocs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {flatDocs.length} file{flatDocs.length !== 1 ? "s" : ""} added
                  </p>
                  <button type="button" onClick={() => setFiles((prev) => {
                    const updated = [...prev.otherDocs]; updated[0] = [];
                    return { ...prev, otherDocs: updated };
                  })} className="text-xs font-medium text-red-500 hover:text-red-600">Remove all</button>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-start">
                  {flatDocs.map((file, idx) => (
                    <DocThumb key={`${file.name}-${idx}`} file={file} index={idx}
                      onRemove={(i) => setFiles((prev) => {
                        const updated = [...prev.otherDocs];
                        updated[0] = updated[0].filter((_, x) => x !== i);
                        return { ...prev, otherDocs: updated };
                      })} />
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

  return (
    <div className="bg-gray-50 text-slate-900">
      <main className="flex flex-1 w-full max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8 lg:py-10">
        <div className="w-full space-y-5">

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
              <button onClick={handlePrev} disabled={step === 0}
                className="flex items-center gap-2 px-6 py-3 font-semibold transition-all bg-white border-2 shadow-sm rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {step === activeSteps.length - 1 ? (
                <div className="flex flex-col items-end gap-2">
                  {isSubmitting && (
                    <div className="w-56">
                      <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                        <span>{submitPhase === "compressing" ? "Compressing images…" : `Uploading… ${uploadProgress}%`}</span>
                        {submitPhase === "uploading" && <span>{uploadProgress}%</span>}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                          style={{ width: submitPhase === "compressing" ? "15%" : `${uploadProgress}%` }} />
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
                        {submitPhase === "compressing" ? "Compressing…" : "Uploading…"}
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

export default UploadSigcard;
