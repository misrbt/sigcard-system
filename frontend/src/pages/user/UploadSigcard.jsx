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

const PERSON_COLORS = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500", "bg-rose-500"];

const steps = [
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
  customerInfo: "Enter the customer's personal or company information and account holders.",
  holders:      "Set the risk level and account details. You may also add additional accounts.",
  sigcard:      "Upload front and back images of the signature card.",
  nais:         "Upload NAIS document images — optional, you may skip.",
  privacy:      "Upload the signed data privacy consent form.",
  otherDocs:    "Upload any additional supporting documents — optional.",
};

const emptyPair    = ()  => ({ front: null, back: null });
const emptyPerson  = ()  => ({ firstName: "", middleName: "", lastName: "", suffix: "" });
const emptyAccount = ()  => ({ accountNo: "", riskLevel: "", dateOpened: "" });

const initialFiles = {
  sigcardPairs: [emptyPair()],
  naisPairs:    [emptyPair()],
  privacyPairs: [emptyPair()],
  otherDocs:    [[]], // one sub-array per account/person
};

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

const AccountInfoRow = ({ accountNo, dateOpened, onAccountNo, onDateOpened }) => (
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
        Date Opened <span className="text-red-500">*</span>
      </label>
      <input type="date" value={dateOpened} onChange={onDateOpened} className={inputCls} />
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
    accountType: "", firstName: "", middleName: "", lastName: "",
    suffix: "", companyName: "", riskLevel: "", accountNo: "", dateOpened: "",
  });
  const [files,              setFiles]              = useState(initialFiles);
  const [additionalPersons,  setAdditionalPersons]  = useState([]);
  const [additionalAccounts, setAdditionalAccounts] = useState([]);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [uploadProgress,     setUploadProgress]     = useState(0);
  const [submitPhase,        setSubmitPhase]        = useState("idle");

  const isJoint     = formData.accountType === "Joint";
  const isRegular   = formData.accountType === "Regular";
  const isCorporate = formData.accountType === "Corporate";

  // Sync persons/accounts when account type changes
  useEffect(() => {
    if (isJoint) {
      setAdditionalPersons((prev) => (prev.length < 1 ? [emptyPerson()] : prev));
    } else {
      setAdditionalPersons([]);
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

  // Sync doc pair count:
  //   sigcardPairs → per-person for Joint, per-account for others
  //   naisPairs / privacyPairs / otherDocs → per-account for ALL types
  useEffect(() => {
    const sigcardCount = isJoint ? additionalPersons.length + 1 : additionalAccounts.length + 1;
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
        sigcardPairs: sync(prev.sigcardPairs, sigcardCount),
        naisPairs:    sync(prev.naisPairs,    acctCount),
        privacyPairs: sync(prev.privacyPairs, acctCount),
        otherDocs:    syncOther(prev.otherDocs, acctCount),
      };
    });
  }, [isJoint, additionalPersons.length, additionalAccounts.length]);

  const setField  = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));
  const handleInp = (e) => setField(e.target.name, e.target.value);

  const setPairFile = (docKey, pairIndex, side, fileList) => {
    setFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[pairIndex] = { ...updated[pairIndex], [side]: fileList[0] };
      return { ...prev, [docKey]: updated };
    });
  };


  const isStepValid = useMemo(() => {
    switch (steps[step].key) {
      case "accountType":  return !!formData.accountType;
      case "customerInfo":
        if (isCorporate) return !!formData.companyName.trim();
        if (isJoint) return !!formData.firstName.trim() && !!formData.lastName.trim() &&
          additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim());
        return !!formData.firstName.trim() && !!formData.lastName.trim();
      case "holders":
        if (!formData.riskLevel) return false;
        if (!formData.accountNo.trim() || !formData.dateOpened) return false;
        return additionalAccounts.every((a) => !!a.riskLevel && !!a.accountNo.trim() && !!a.dateOpened);
      case "sigcard":
        if (isJoint) return files.sigcardPairs.every((p) => !!p.back);
        return files.sigcardPairs.every((p) => p.front && p.back);
      case "nais":     return true;
      case "privacy":  return files.privacyPairs.every((p) => p.front && p.back);
      case "otherDocs":return true;
      default:         return false;
    }
  }, [step, formData, files, additionalPersons, additionalAccounts]);

  const handleNext = () => { if (isStepValid) setStep((s) => Math.min(s + 1, steps.length - 1)); };
  const handlePrev = () => setStep((s) => Math.max(s - 1, 0));

  const resetAll = () => {
    setStep(0);
    setFormData({ accountType:"", firstName:"", middleName:"", lastName:"", suffix:"", companyName:"", riskLevel:"", accountNo:"", dateOpened:"" });
    setFiles(initialFiles);
    setAdditionalPersons([]);
    setAdditionalAccounts([]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitPhase("compressing");
    try {
      const pairKeys = ["sigcardPairs", "naisPairs", "privacyPairs"];
      const compressedPairs = {};
      await Promise.all(pairKeys.map(async (key) => {
        compressedPairs[key] = await Promise.all(
          files[key].map(async (pair) => ({
            front: pair.front ? await compressImage(pair.front) : null,
            back:  pair.back  ? await compressImage(pair.back)  : null,
          }))
        );
      }));
      const compressedOtherSections = await Promise.all(
        files.otherDocs.map((section) => Promise.all((section ?? []).map((f) => compressImage(f))))
      );

      const fd = new FormData();
      if (isCorporate) {
        fd.append("company_name", formData.companyName);
      } else {
        fd.append("firstname",  formData.firstName);
        fd.append("middlename", formData.middleName);
        fd.append("lastname",   formData.lastName);
        fd.append("suffix",     formData.suffix);
      }
      fd.append("account_type", formData.accountType);
      fd.append("risk_level",   formData.riskLevel);
      fd.append("account_no",   formData.accountNo);
      fd.append("date_opened",  formData.dateOpened);
      if (user?.branch?.id) fd.append("branch_id", user.branch.id);

      if (isJoint) {
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
        fd.append(`additionalAccounts[${i}][date_opened]`, a.dateOpened);
      });

      for (const key of pairKeys) {
        compressedPairs[key].forEach((pair, i) => {
          if (pair.front) fd.append(`${key}[${i}][front]`, pair.front);
          if (pair.back)  fd.append(`${key}[${i}][back]`,  pair.back);
        });
      }
      // Send per-section: otherDocs[1][], otherDocs[2][], … (1-based = person_index)
      compressedOtherSections.forEach((section, i) => {
        section.forEach((f) => fd.append(`otherDocs[${i + 1}][]`, f));
      });

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
      const msg  = data?.errors ? Object.values(data.errors).flat().join("\n") : data?.message || "Something went wrong. Please try again.";
      Swal.fire({ icon: "error", title: "Submission Failed", text: msg, confirmButtonText: "OK", confirmButtonColor: "#2563eb" });
    } finally {
      setIsSubmitting(false);
      setSubmitPhase("idle");
      setUploadProgress(0);
    }
  };

  // ── Step content renderer ────────────────────────────────────────────────────
  const renderStep = () => {
    switch (steps[step].key) {

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

      // ── STEP 2: Customer Info ──────────────────────────────────────────────
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
                    <p className="text-xs text-slate-400">Business or organization</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Company Name <span className="text-red-500">*</span></label>
                  <input value={formData.companyName} onChange={(e) => setField("companyName", toTitleCase(e.target.value))}
                    placeholder="Enter company or organization name" className={inputCls} />
                </div>
              </div>
            ) : isJoint ? (
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
              </div>
            )}
          </div>
        );

      // ── STEP 3: Account Holder(s) + Accounts ──────────────────────────────
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
                      : `${formData.firstName} ${formData.lastName}`.trim() || (isJoint ? "Person 1 — Primary" : "Account Holder")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isJoint ? "Primary account" : isCorporate ? "Corporate account" : "Primary account"}
                  </p>
                </div>
              </div>

              <RiskLevelPicker value={formData.riskLevel} onChange={(v) => setField("riskLevel", v)} />

              <div className="border-t border-blue-100" />

              <AccountInfoRow
                accountNo={formData.accountNo} dateOpened={formData.dateOpened}
                onAccountNo={(e) => setField("accountNo", e.target.value)}
                onDateOpened={(e) => setField("dateOpened", e.target.value)}
              />
            </div>

            {/* Additional accounts — all account types */}
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

                <AccountInfoRow
                  accountNo={a.accountNo} dateOpened={a.dateOpened}
                  onAccountNo={(e) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, accountNo: e.target.value } : x))}
                  onDateOpened={(e) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, dateOpened: e.target.value } : x))}
                />
              </div>
            ))}

            {/* Add Account button — all types */}
            <button type="button"
              onClick={() => setAdditionalAccounts((prev) => [...prev, emptyAccount()])}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-blue-600 border-2 border-dashed border-blue-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all">
              <HiOutlinePlus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        );

      // ── STEP 5–7: Document uploads ─────────────────────────────────────────
      case "sigcard": {
        if (isJoint) {
          const personLabels = [
            "Person 1 — Primary",
            ...additionalPersons.map((_, i) => i === 0 ? "Person 2 — Secondary" : `Person ${i + 2}`),
          ];
          return (
            <div className="space-y-6">
              <p className="text-xs text-slate-400">Upload a sigcard back image for each account holder.</p>
              {files.sigcardPairs.map((pair, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PERSON_COLORS[i] ?? "bg-slate-400"}`} />
                    <p className="text-sm font-semibold text-slate-700">{personLabels[i]}</p>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <DropZone
                    label="Sigcard Back"
                    file={pair.back}
                    onSelect={(f) => setPairFile("sigcardPairs", i, "back", f)}
                  />
                </div>
              ))}
            </div>
          );
        }

        // Non-joint: per-account (existing logic)
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

      // ── STEP 8: Other Documents ───────────────────────────────────────────
      case "otherDocs": {
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

  const progress = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="bg-gray-50 text-slate-900">
      <main className="flex flex-1 w-full max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8 lg:py-10">
        <div className="w-full space-y-5">

          {/* Step pills */}
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((s, i) => {
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
                  {i < steps.length - 1 && <div className={`w-4 h-px flex-shrink-0 ${i < step ? "bg-green-300" : "bg-slate-200"}`} />}
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
                  <h2 className="text-lg font-bold text-slate-800">{steps[step].title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{stepDescriptions[steps[step].key]}</p>
                </div>
                <div className="ml-auto text-xs text-slate-400 font-medium">Step {step + 1} of {steps.length}</div>
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

              {step === steps.length - 1 ? (
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
