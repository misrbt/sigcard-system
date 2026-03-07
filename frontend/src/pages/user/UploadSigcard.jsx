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
} from "react-icons/hi";

const riskLevels = ["Low Risk", "Medium Risk", "High Risk"];

const ACCOUNT_TYPE_CONFIG = [
  {
    value: "Regular",
    label: "Regular",
    description: "Single individual account holder.",
    icon: HiOutlineUser,
    color: "blue",
    ring: "ring-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-500",
    iconBg: "bg-blue-500",
  },
  {
    value: "Joint",
    label: "Joint",
    description: "Two or more account holders sharing one account.",
    icon: HiOutlineUsers,
    color: "purple",
    ring: "ring-purple-500",
    bg: "bg-purple-50",
    border: "border-purple-500",
    iconBg: "bg-purple-500",
  },
  {
    value: "Corporate",
    label: "Corporate",
    description: "Business or organization account.",
    icon: HiOutlineOfficeBuilding,
    color: "slate",
    ring: "ring-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-500",
    iconBg: "bg-slate-600",
  },
];

const steps = [
  { key: "accountType", title: "Account Type" },
  { key: "profile",     title: "Customer Details" },
  { key: "sigcard",     title: "Sigcard Upload" },
  { key: "nais",        title: "NAIS Upload" },
  { key: "privacy",     title: "Data Privacy Upload" },
  { key: "otherDocs",   title: "Other Documents (Optional)" },
];

const emptyPair = () => ({ front: null, back: null });

const initialFiles = {
  sigcardPairs: [emptyPair()],
  naisPairs:    [emptyPair()],
  privacyPairs: [emptyPair()],
  otherDocs:    [],
};

const DropZone = ({ label, file, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [orientation, setOrientation] = useState(null); // "portrait" | "landscape" | null

  const handleFiles = (list) => {
    if (list?.length) {
      setOrientation(null);
      onSelect(list);
    }
  };

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setOrientation(naturalHeight >= naturalWidth ? "portrait" : "landscape");
  };

  const sizeClass = file
    ? orientation === "portrait"
      ? "aspect-[3/4]"
      : orientation === "landscape"
      ? "aspect-[4/3]"
      : "min-h-[420px]"
    : "min-h-[420px]";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-700">{label}</h3>
      <label
        className={`group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${sizeClass} ${
          isDragging
            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.02] shadow-lg"
            : file
            ? "border-green-400 bg-slate-100 shadow-md"
            : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <>
            <img
              src={URL.createObjectURL(file)}
              alt={label}
              onLoad={handleImageLoad}
              className="object-contain w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 opacity-0 bg-gradient-to-br from-black/70 to-black/50 group-hover:opacity-100">
              <div className="text-center text-white">
                <HiOutlinePhotograph className="w-10 h-10 mx-auto mb-3" />
                <p className="text-base font-bold">Click to change</p>
                <p className="mt-1 text-sm text-white/80">
                  Drag & drop or select new file
                </p>
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
              <p className="text-base font-bold text-slate-800">
                {isDragging ? "Drop image here" : "Drag & drop your file"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                or{" "}
                <span className="font-semibold text-blue-600">
                  click to browse
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Supports: JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
};

const DocThumb = ({ file, index, onRemove }) => {
  const [orientation, setOrientation] = useState(null);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setOrientation(naturalHeight >= naturalWidth ? "portrait" : "landscape");
  };

  const aspectClass =
    orientation === "portrait"
      ? "aspect-[3/4]"
      : orientation === "landscape"
      ? "aspect-[4/3]"
      : "aspect-square";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition-all duration-300 ${aspectClass}`}
    >
      <img
        src={URL.createObjectURL(file)}
        alt={file.name}
        onLoad={handleLoad}
        className="w-full h-full object-contain"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3">
        <p className="text-xs text-white font-semibold text-center leading-snug line-clamp-2">
          {file.name}
        </p>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-1 px-3 py-1 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          Remove
        </button>
      </div>
      {/* Index badge */}
      <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white text-xs font-bold">
        {index + 1}
      </div>
    </div>
  );
};

const OtherDocsDropZone = ({ onAdd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (list) => {
    if (list?.length) onAdd(list);
  };

  return (
    <div
      className={`group flex flex-col items-center justify-center gap-4 px-6 py-12 cursor-pointer border-2 border-dashed rounded-2xl transition-all ${
        isDragging
          ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.01] shadow-lg"
          : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="p-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg pointer-events-none">
        <HiOutlineUpload className="w-8 h-8 text-white" />
      </div>
      <div className="text-center pointer-events-none">
        <p className="text-base font-bold text-slate-800">
          {isDragging ? "Drop files here" : "Drag & drop your files"}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          or <span className="font-semibold text-blue-600">click to browse</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Supports: JPG, PNG — multiple files allowed
        </p>
      </div>
    </div>
  );
};

const JointDocStep = ({ isJoint, pairs, frontLabel, backLabel, onSetFile, onRemovePerson, onAddPerson }) => (
  <div className="space-y-8">
    {pairs.map((pair, i) => (
      <PersonDocSection
        key={i}
        isJoint={isJoint}
        personIndex={i}
        totalPersons={pairs.length}
        frontLabel={frontLabel}
        backLabel={backLabel}
        frontFile={pair.front}
        backFile={pair.back}
        onFront={(f) => onSetFile(i, "front", f)}
        onBack={(f) => onSetFile(i, "back", f)}
        onRemove={() => onRemovePerson(i)}
      />
    ))}
    {isJoint && (
      <button
        type="button"
        onClick={onAddPerson}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-600 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Another Person
      </button>
    )}
  </div>
);

const PersonDocSection = ({
  isJoint,
  personIndex,
  totalPersons,
  frontLabel,
  backLabel,
  frontFile,
  backFile,
  onFront,
  onBack,
  onRemove,
}) => {
  const canRemove = isJoint && totalPersons > 2 && personIndex >= 2;

  return (
    <div className="space-y-4">
      {isJoint && (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
          <p className="text-sm font-semibold text-slate-700">
            Person {personIndex + 1}
            {personIndex === 0 && " — Primary Account Holder"}
            {personIndex === 1 && " — Secondary Account Holder"}
          </p>
          <div className="flex-1 h-px bg-slate-200" />
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-medium text-red-500 hover:text-red-600 flex-shrink-0"
            >
              Remove
            </button>
          )}
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <DropZone label={frontLabel} file={frontFile} onSelect={onFront} />
        <DropZone label={backLabel} file={backFile} onSelect={onBack} />
      </div>
    </div>
  );
};

const RISK_LEVELS = ["Low Risk", "Medium Risk", "High Risk"];

const NameFields = ({ values, onChange, personLabel, isFirst, isJoint }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isFirst ? "bg-blue-600" : "bg-purple-600"}`}>
        {isFirst ? "1" : "2"}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{personLabel}</p>
        {isFirst && isJoint && <p className="text-xs text-slate-400">Primary account holder</p>}
        {!isFirst && <p className="text-xs text-slate-400">Secondary account holder</p>}
      </div>
    </div>

    <div className="pl-2 border-l-2 border-slate-100 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">First Name <span className="text-red-500">*</span></label>
          <input value={values.firstName} onChange={(e) => onChange("firstName", e.target.value)} placeholder="Enter first name"
            className="w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Middle Name <span className="text-xs text-slate-400 font-normal">(Optional)</span></label>
          <input value={values.middleName} onChange={(e) => onChange("middleName", e.target.value)} placeholder="Enter middle name"
            className="w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Last Name <span className="text-red-500">*</span></label>
          <input value={values.lastName} onChange={(e) => onChange("lastName", e.target.value)} placeholder="Enter last name"
            className="w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Suffix <span className="text-xs text-slate-400 font-normal">(Optional)</span></label>
          <input value={values.suffix} onChange={(e) => onChange("suffix", e.target.value)} placeholder="Jr., Sr., III…"
            className="w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600">Risk Level <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-3 gap-2">
          {RISK_LEVELS.map((risk) => {
            const isSelected = values.riskLevel === risk;
            const styles = risk === "Low Risk"
              ? "bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-400/20"
              : risk === "Medium Risk"
              ? "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20"
              : "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20";
            return (
              <button
                key={risk}
                type="button"
                onClick={() => onChange("riskLevel", risk)}
                className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all
                  ${isSelected ? styles : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
              >
                {risk}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

const UploadSigcard = () => {
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    accountType: "",
    riskLevel: "",
  });
  const [files, setFiles] = useState(initialFiles);

  // Additional persons for Joint accounts (Person 2, 3, …)
  const emptyPerson = () => ({ firstName: "", middleName: "", lastName: "", suffix: "", riskLevel: "" });
  const [additionalPersons, setAdditionalPersons] = useState([emptyPerson()]);

  const progress = Math.round(((step + 1) / steps.length) * 100);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Sync additional persons with accountType
  useEffect(() => {
    if (formData.accountType === "Joint") {
      setAdditionalPersons((prev) => prev.length < 1 ? [emptyPerson()] : prev);
    } else {
      setAdditionalPersons([emptyPerson()]);
    }
  }, [formData.accountType]);

  // Keep document pairs in sync whenever accountType changes
  useEffect(() => {
    setFiles((prev) => {
      const syncPairs = (pairs) => {
        if (formData.accountType === "Joint" && pairs.length < 2) {
          return [...pairs, emptyPair()];
        }
        if (formData.accountType !== "Joint" && pairs.length > 1) {
          return [pairs[0]];
        }
        return pairs;
      };
      return {
        ...prev,
        sigcardPairs: syncPairs(prev.sigcardPairs),
        naisPairs:    syncPairs(prev.naisPairs),
        privacyPairs: syncPairs(prev.privacyPairs),
      };
    });
  }, [formData.accountType]);

  const setPairFile = (docKey, pairIndex, side, fileList) => {
    setFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[pairIndex] = { ...updated[pairIndex], [side]: fileList[0] };
      return { ...prev, [docKey]: updated };
    });
  };

  const addPersonAll = () => {
    setFiles((prev) => ({
      ...prev,
      sigcardPairs: [...prev.sigcardPairs, emptyPair()],
      naisPairs:    [...prev.naisPairs,    emptyPair()],
      privacyPairs: [...prev.privacyPairs, emptyPair()],
    }));
  };

  const removePersonAll = (index) => {
    setFiles((prev) => ({
      ...prev,
      sigcardPairs: prev.sigcardPairs.filter((_, i) => i !== index),
      naisPairs:    prev.naisPairs.filter((_, i) => i !== index),
      privacyPairs: prev.privacyPairs.filter((_, i) => i !== index),
    }));
  };

  const handleOtherDocAdd = (fileList) => {
    setFiles((prev) => ({ ...prev, otherDocs: [...prev.otherDocs, ...fileList] }));
  };

  const removeOtherDoc = (index) => {
    setFiles((prev) => ({
      ...prev,
      otherDocs: prev.otherDocs.filter((_, idx) => idx !== index),
    }));
  };

  const isStepValid = useMemo(() => {
    switch (steps[step].key) {
      case "accountType":
        return !!formData.accountType;
      case "profile": {
        const p1Valid = !!(formData.firstName.trim() && formData.lastName.trim() && formData.riskLevel);
        if (formData.accountType === "Joint") {
          return p1Valid && additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim() && p.riskLevel);
        }
        return p1Valid;
      }
      case "sigcard":
        return files.sigcardPairs.every((p) => p.front && p.back);
      case "nais":
        return files.naisPairs.every((p) => p.front && p.back);
      case "privacy":
        return files.privacyPairs.every((p) => p.front && p.back);
      case "otherDocs":
        return true;
      default:
        return false;
    }
  }, [step, formData, files, additionalPersons]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (!isStepValid) return;
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 0));

  const resetAll = () => {
    setStep(0);
    setFormData({ firstName: "", middleName: "", lastName: "", suffix: "", accountType: "", riskLevel: "" });
    setFiles(initialFiles);
    setAdditionalPersons([emptyPerson()]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const fd = new FormData();

      // Customer fields
      fd.append("firstname",    formData.firstName);
      fd.append("middlename",   formData.middleName);
      fd.append("lastname",     formData.lastName);
      fd.append("suffix",       formData.suffix);
      fd.append("account_type", formData.accountType);
      fd.append("risk_level",   formData.riskLevel);
      if (user?.branch?.id) fd.append("branch_id", user.branch.id);

      // Additional holders for Joint accounts (Person 2+)
      if (formData.accountType === "Joint") {
        additionalPersons.forEach((p, i) => {
          fd.append(`additionalPersons[${i}][firstname]`,  p.firstName);
          fd.append(`additionalPersons[${i}][middlename]`, p.middleName);
          fd.append(`additionalPersons[${i}][lastname]`,   p.lastName);
          fd.append(`additionalPersons[${i}][suffix]`,     p.suffix);
          fd.append(`additionalPersons[${i}][risk_level]`, p.riskLevel);
        });
      }

      // Document pairs
      const pairKeys = [
        { state: "sigcardPairs",  key: "sigcardPairs" },
        { state: "naisPairs",     key: "naisPairs"    },
        { state: "privacyPairs",  key: "privacyPairs" },
      ];

      for (const { state: stateKey, key } of pairKeys) {
        files[stateKey].forEach((pair, i) => {
          if (pair.front) fd.append(`${key}[${i}][front]`, pair.front);
          if (pair.back)  fd.append(`${key}[${i}][back]`,  pair.back);
        });
      }

      // Other docs
      files.otherDocs.forEach((file) => fd.append("otherDocs[]", file));

      await api.post("/customers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await Swal.fire({
        icon: "success",
        title: "Customer Saved!",
        text: "The customer record and all documents have been successfully submitted.",
        confirmButtonText: "Done",
        confirmButtonColor: "#2563eb",
        timer: 6000,
        timerProgressBar: true,
      });

      resetAll();
    } catch (error) {
      const data = error?.response?.data;
      const message = data?.errors
        ? Object.values(data.errors).flat().join("\n")
        : data?.message || "Something went wrong. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: message,
        confirmButtonText: "OK",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[step].key) {

      case "accountType":
        return (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">
              Select the type of account. This determines the number of holders required for document uploads.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {ACCOUNT_TYPE_CONFIG.map(({ value, label, description, icon: Icon, bg, border, ring, iconBg }) => {
                const isSelected = formData.accountType === value;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      handleInputChange({ target: { name: "accountType", value } });
                      setTimeout(() => setStep((s) => s + 1), 220);
                    }}
                    className={`relative flex flex-col items-center gap-4 p-7 rounded-2xl border-2 text-center transition-all outline-none
                      ${isSelected
                        ? `${bg} ${border} ring-4 ${ring}/20 shadow-lg`
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <HiOutlineCheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    )}
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
            <p className="text-xs text-center text-slate-400">Click a card to select and continue automatically</p>
          </div>
        );

      case "profile": {
        const isJoint = formData.accountType === "Joint";

        return (
          <div className="space-y-6">
            {/* Account type badge */}
            {formData.accountType && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 w-fit">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Account Type:</span>
                <span className="text-sm font-bold text-blue-800">{formData.accountType}</span>
                <button type="button" onClick={() => setStep(0)}
                  className="ml-2 text-xs text-blue-500 hover:text-blue-700 underline">
                  Change
                </button>
              </div>
            )}

            {/* Person 1 */}
            <NameFields
              values={{ firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName, suffix: formData.suffix, riskLevel: formData.riskLevel }}
              onChange={(field, val) => setFormData((prev) => ({ ...prev, [field]: val }))}
              personLabel={isJoint ? "Person 1" : "Account Holder"}
              isFirst={true}
              isJoint={isJoint}
            />

            {/* Person 2+ for Joint */}
            {isJoint && additionalPersons.map((p, i) => (
              <NameFields
                key={i}
                values={p}
                onChange={(field, val) =>
                  setAdditionalPersons((prev) => prev.map((x, idx) => idx === i ? { ...x, [field]: val } : x))
                }
                personLabel={`Person ${i + 2}`}
                isFirst={false}
                isJoint={isJoint}
              />
            ))}

            {/* Add more persons button for Joint */}
            {isJoint && (
              <button
                type="button"
                onClick={() => {
                  setAdditionalPersons((prev) => [...prev, emptyPerson()]);
                  setFiles((prev) => ({
                    ...prev,
                    sigcardPairs: [...prev.sigcardPairs, emptyPair()],
                    naisPairs:    [...prev.naisPairs,    emptyPair()],
                    privacyPairs: [...prev.privacyPairs, emptyPair()],
                  }));
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Person
              </button>
            )}

            <input type="hidden" name="branch_id" value={user?.branch?.id ?? ""} />
          </div>
        );
      }
      case "sigcard":
        return (
          <JointDocStep
            isJoint={formData.accountType === "Joint"}
            pairs={files.sigcardPairs}
            frontLabel="Sigcard Front"
            backLabel="Sigcard Back"
            onSetFile={(i, side, f) => setPairFile("sigcardPairs", i, side, f)}
            onRemovePerson={removePersonAll}
            onAddPerson={addPersonAll}
          />
        );
      case "nais":
        return (
          <JointDocStep
            isJoint={formData.accountType === "Joint"}
            pairs={files.naisPairs}
            frontLabel="NAIS Front"
            backLabel="NAIS Back"
            onSetFile={(i, side, f) => setPairFile("naisPairs", i, side, f)}
            onRemovePerson={removePersonAll}
            onAddPerson={addPersonAll}
          />
        );
      case "privacy":
        return (
          <JointDocStep
            isJoint={formData.accountType === "Joint"}
            pairs={files.privacyPairs}
            frontLabel="Data Privacy Front"
            backLabel="Data Privacy Back"
            onSetFile={(i, side, f) => setPairFile("privacyPairs", i, side, f)}
            onRemovePerson={removePersonAll}
            onAddPerson={addPersonAll}
          />
        );
      case "otherDocs":
        return (
          <div className="space-y-5">
            {/* Upload Drop Area */}
            <OtherDocsDropZone onAdd={handleOtherDocAdd} />

            {/* Image Preview Grid */}
            {files.otherDocs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {files.otherDocs.length} file{files.otherDocs.length !== 1 ? "s" : ""} uploaded
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => ({ ...prev, otherDocs: [] }))
                    }
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove all
                  </button>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-start">
                  {files.otherDocs.map((file, index) => (
                    <DocThumb
                      key={`${file.name}-${index}`}
                      file={file}
                      index={index}
                      onRemove={removeOtherDoc}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const stepDescriptions = {
    accountType: "Choose the account classification for this customer",
    profile:     "Enter the customer's personal information and risk level",
    sigcard:     "Upload front and back images of the signature card",
    nais:        "Upload NAIS document images",
    privacy:     "Upload data privacy consent form",
    otherDocs:   "Upload any additional supporting documents (optional)",
  };

  return (
    <div className="bg-gray-50 text-slate-900">

      <main className="flex flex-1 w-full max-w-7xl px-4 py-8 mx-auto sm:px-6 lg:px-8 lg:py-10">
        <div className={`w-full space-y-6 ${['accountType', 'profile'].includes(steps[step].key) ? 'max-w-4xl mx-auto' : ''}`}>

          {/* Step indicators */}
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((s, i) => {
              const isDone    = i < step;
              const isCurrent = i === step;
              return (
                <div key={s.key} className="flex items-center gap-2 flex-shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${isCurrent ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : isDone   ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-400"}`}
                  >
                    {isDone
                      ? <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                      : <span>{i + 1}</span>
                    }
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-6 h-px flex-shrink-0 ${i < step ? "bg-green-300" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${Math.round(((step + 1) / steps.length) * 100)}%` }}
            />
          </div>

          {/* Form Card */}
          <div className="overflow-hidden bg-white border shadow-xl rounded-3xl border-slate-200">

            <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-purple-50 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step + 1}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{steps[step].title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{stepDescriptions[steps[step].key]}</p>
                </div>
              </div>
            </div>

            <div className="p-8">{renderStepContent()}</div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 px-8 py-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="flex items-center gap-2 px-6 py-3 font-semibold transition-all bg-white border-2 shadow-sm rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </button>

              {step === steps.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-xl disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting...
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
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid}
                  className="flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-md"
                >
                  Next
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
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
