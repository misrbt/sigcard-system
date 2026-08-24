import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useAppConfig } from "../../context/AppConfigContext";
import {
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineCreditCard,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlinePhotograph,
} from "react-icons/hi";
import DocImageDropZone from "../../components/common/DocImageDropZone";
import MultiFileDropZone from "../../components/common/MultiFileDropZone";

// ── UI presentation metadata (styles/icons per value) ────────────────────────
// Valid values come from /api/config; this maps each value to its display style.

const RISK_STYLE = {
  "Low Risk":    "bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-400/20",
  "Medium Risk": "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20",
  "High Risk":   "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20",
};

const STATUS_STYLE = {
  active:      "bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400/20",
  dormant:     "bg-yellow-50 border-yellow-400 text-yellow-700 ring-2 ring-yellow-400/20",
  reactivated: "bg-teal-50 border-teal-400 text-teal-700 ring-2 ring-teal-400/20",
  escheat:     "bg-orange-50 border-orange-400 text-orange-700 ring-2 ring-orange-400/20",
  closed:      "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-400/20",
};

const ACCOUNT_TYPE_META = {
  Regular:   { label: "Regular",   description: "Standard individual savings or checking account.", icon: HiOutlineUser,           color: "blue",   ring: "ring-blue-500",   bg: "bg-blue-50",   border: "border-blue-500",   iconBg: "bg-blue-500"   },
  Joint:     { label: "Joint",     description: "Two or more people sharing one account.",          icon: HiOutlineUsers,          color: "purple", ring: "ring-purple-500", bg: "bg-purple-50", border: "border-purple-500", iconBg: "bg-purple-500" },
  Corporate: { label: "Corporate", description: "Business or organization account.",                icon: HiOutlineOfficeBuilding, color: "slate",  ring: "ring-slate-500",  bg: "bg-slate-50",  border: "border-slate-500",  iconBg: "bg-slate-600"  },
};

const JOINT_SUB_TYPE_META = {
  "ITF":     { label: "ITF (In Trust For)", description: "Two or more persons sharing one account. Each person uploads their own documents.", icon: HiOutlineUsers,      color: "purple", ring: "ring-purple-500", bg: "bg-purple-50", border: "border-purple-500", iconBg: "bg-purple-500" },
  "Non-ITF": { label: "Non-ITF",            description: "One customer with one or more accounts. Each account has its own documents.",       icon: HiOutlineCreditCard, color: "indigo", ring: "ring-indigo-500", bg: "bg-indigo-50", border: "border-indigo-500", iconBg: "bg-indigo-500" },
};

const CORPORATE_SUB_TYPE_META = {
  "Corporate":           { label: "Corporate",           description: "Business or organization account with two or more authorized signatories.", icon: HiOutlineOfficeBuilding, color: "slate", ring: "ring-slate-500", bg: "bg-slate-50", border: "border-slate-500", iconBg: "bg-slate-600" },
  "Sole Proprietorship": { label: "Sole Proprietorship", description: "Single-owner business account with only one authorized signatory.",         icon: HiOutlineUser,           color: "amber", ring: "ring-amber-500", bg: "bg-amber-50", border: "border-amber-500", iconBg: "bg-amber-600" },
};

const STATUS_DATE_LABELS = {
  dormant:     "Date of Dormancy",
  reactivated: "Date of Reactivation",
  escheat:     "Date of Escheat",
  closed:      "Date of Closure",
};

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
  accountType:      "Choose the account classification for this customer.",
  jointSubType:     "Choose the joint account classification.",
  corporateSubType: "Choose whether this is a standard corporate or sole proprietorship account.",
  customerInfo:     "Enter the customer's personal or company information and account holders.",
  holders:          "Set the risk level and account details. You may also add additional accounts.",
  sigcard:          "Upload front and back images of the signature card.",
  nais:             "Upload NAIS document images — optional, you may skip.",
  privacy:          "Upload the signed data privacy consent form.",
  otherDocs:        "Upload any additional supporting documents — optional.",
};

const emptyPair    = ()  => ({ front: null, back: null });
const emptyPerson  = ()  => ({ firstName: "", middleName: "", lastName: "", suffix: "" });
const emptyAccount = ()  => ({ accountNo: "", riskLevel: "", dateOpened: "", dateUpdated: "", status: "active", statusDate: "" });

const initialFiles = {
  sigcardPairs: [emptyPair()],
  naisPairs:    [emptyPair()],
  privacyPairs: [emptyPair()],
  otherDocs:    [[]], // one sub-array per account/person
};

const initialItfFiles = () => ({
  sigcardFronts:  [null],     // shared — Signature Card images, independent list
  riskProfilings: [null],     // shared — Risk Profiling images, independent list
  nais:     [emptyPair()],
  privacy:  [emptyPair()],
  otherDocs: [[]],
});

const toTitleCase = (str) =>
  str.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const inputCls = "w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all";

// ── Shared sub-components ─────────────────────────────────────────────────────

const RiskLevelPicker = ({ value, onChange, label = "Risk Level", riskLevels = [] }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600">
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="grid grid-cols-3 gap-2">
      {riskLevels.map((risk) => (
        <button key={risk} type="button" onClick={() => onChange(risk)}
          className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${value === risk ? RISK_STYLE[risk] : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
          {risk}
        </button>
      ))}
    </div>
  </div>
);

const StatusPicker = ({ value, onChange, statuses = [] }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-600">
      Account Status <span className="text-red-500">*</span>
    </label>
    <div className="flex flex-wrap gap-2">
      {statuses.map((v) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${value === v ? STATUS_STYLE[v] : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
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
  const cfg = ACCOUNT_TYPE_META[type];
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
const PersonDocSection = ({ isMultiHolder, personIndex, totalPersons, minHolders, frontLabel, backLabel, frontFile, backFile, onFront, onBack, onRemove, sectionLabel, frontShape = "auto", backShape = "auto" }) => {
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
        <DocImageDropZone label={frontLabel} file={frontFile} onChange={onFront} shape={frontShape} />
        <DocImageDropZone label={backLabel}  file={backFile}  onChange={onBack}  shape={backShape}  />
      </div>
    </div>
  );
};

const JointDocStep = ({ isMultiHolder, minHolders, pairs, frontLabel, backLabel, onSetFile, onRemovePerson, sectionLabels, frontShape = "auto", backShape = "auto" }) => (
  <div className="space-y-8">
    {pairs.map((pair, i) => (
      <PersonDocSection key={i} isMultiHolder={isMultiHolder} personIndex={i} totalPersons={pairs.length}
        minHolders={minHolders} frontLabel={frontLabel} backLabel={backLabel}
        frontFile={pair.front} backFile={pair.back}
        onFront={(f) => onSetFile(i, "front", f)} onBack={(f) => onSetFile(i, "back", f)}
        onRemove={() => onRemovePerson?.(i)}
        sectionLabel={sectionLabels?.[i]}
        frontShape={frontShape} backShape={backShape} />
    ))}
  </div>
);

// ── Status Date Field ─────────────────────────────────────────────────────────
const StatusDateField = ({ status, value, onChange }) => {
  const label = STATUS_DATE_LABELS[status];
  if (!label) return null;
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">
        {label} <span className="text-red-500">*</span>
      </label>
      <input type="date" value={value} onChange={onChange} className={inputCls} />
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const UploadSigcard = () => {
  const { user } = useAuth();
  const appConfig = useAppConfig();

  // Config-driven lists (values come from backend /api/config)
  const accountTypeConfig = useMemo(() =>
    appConfig.account_types.map((v) => ({ value: v, ...ACCOUNT_TYPE_META[v] ?? { label: v } })),
    [appConfig.account_types]
  );
  const jointSubTypeConfig = useMemo(() =>
    appConfig.joint_sub_types.map((v) => ({ value: v, ...JOINT_SUB_TYPE_META[v] ?? { label: v } })),
    [appConfig.joint_sub_types]
  );
  const corporateSubTypeConfig = useMemo(() =>
    appConfig.corporate_sub_types.map((v) => ({ value: v, ...CORPORATE_SUB_TYPE_META[v] ?? { label: v } })),
    [appConfig.corporate_sub_types]
  );

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    accountType: "", jointSubType: "", corporateSubType: "", firstName: "", middleName: "", lastName: "",
    suffix: "", companyName: "", riskLevel: "", accountNo: "", dateOpened: "",
    dateUpdated: "", status: "active", statusDate: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [files,              setFiles]              = useState(initialFiles);
  const [itfFiles,           setItfFiles]           = useState(initialItfFiles);
  const [additionalPersons,  setAdditionalPersons]  = useState([]);
  const [additionalAccounts, setAdditionalAccounts] = useState([]);
  const [corpSigFronts,        setCorpSigFronts]        = useState([null]);
  const [corpSigBacks,         setCorpSigBacks]          = useState([null, null]);
  const [hasSecondJointFront,  setHasSecondJointFront]   = useState(false);
  const [secondJointFront,     setSecondJointFront]      = useState(null);
  const [isSubmitting,         setIsSubmitting]         = useState(false);
  const [uploadProgress,     setUploadProgress]     = useState(0);
  const [submitPhase,        setSubmitPhase]        = useState("idle");
  const [direction,          setDirection]          = useState(1);

  const isJoint              = formData.accountType === "Joint";
  const isCorporate          = formData.accountType === "Corporate";
  const isITF                = isJoint && formData.jointSubType === "ITF";
  const isNonITF             = isJoint && formData.jointSubType === "Non-ITF";
  const isSoleProprietorship = isCorporate && formData.corporateSubType === "Sole Proprietorship";
  const isEscheat            = formData.status === "escheat";
  const escheatYear          = formData.statusDate ? new Date(formData.statusDate).getFullYear() : null;
  const dateOpenedYear       = formData.dateOpened ? new Date(formData.dateOpened).getFullYear() : null;
  const isPreDataPrivacyAct  = dateOpenedYear !== null && dateOpenedYear < 2017;
  const privacyNotRequired   = isPreDataPrivacyAct || (isEscheat && escheatYear !== null && escheatYear <= 2021);

  // Dynamic steps: insert sub-type step after accountType when Joint or Corporate;
  // skip privacy step entirely for accounts opened before 2017 (Data Privacy Act IRR not yet
  // in effect, so there is no signed consent form to upload) and for pre-2022 escheat accounts
  const activeSteps = useMemo(() => {
    let steps;
    if (isJoint) {
      steps = [
        BASE_STEPS[0],
        { key: "jointSubType",     title: "Joint Type" },
        ...BASE_STEPS.slice(1),
      ];
    } else if (isCorporate) {
      steps = [
        BASE_STEPS[0],
        { key: "corporateSubType", title: "Corp. Type" },
        ...BASE_STEPS.slice(1),
      ];
    } else {
      steps = BASE_STEPS;
    }
    if (privacyNotRequired) {
      steps = steps.filter((s) => s.key !== "privacy");
    }
    return steps;
  }, [isJoint, isCorporate, privacyNotRequired]);

  // Guard step index when steps change
  useEffect(() => {
    if (step >= activeSteps.length) setStep(activeSteps.length - 1);
  }, [activeSteps.length, step]);

  // Reset jointSubType when account type changes away from Joint
  useEffect(() => {
    if (!isJoint) setFormData((prev) => ({ ...prev, jointSubType: "" }));
  }, [isJoint]);

  // Reset corporateSubType when account type changes away from Corporate
  useEffect(() => {
    if (!isCorporate) setFormData((prev) => ({ ...prev, corporateSubType: "" }));
  }, [isCorporate]);

  // Sync persons when corporateSubType changes
  useEffect(() => {
    if (!isCorporate) return;
    if (isSoleProprietorship) {
      setAdditionalPersons([]);
    } else if (formData.corporateSubType === "Corporate") {
      setAdditionalPersons((prev) => (prev.length >= 1 ? prev : [emptyPerson()]));
    }
  }, [formData.corporateSubType, isCorporate, isSoleProprietorship]);

  // Sync persons/accounts when jointSubType changes
  useEffect(() => {
    if (isITF) {
      setAdditionalPersons((prev) => (prev.length >= 1 ? prev : [emptyPerson()]));
      setAdditionalAccounts([]);
      setItfFiles(initialItfFiles());
    } else if (isNonITF) {
      setAdditionalPersons([]); // Non-ITF has one customer — no additional holders
      setAdditionalAccounts([]);
    }
    setHasSecondJointFront(false);
    setSecondJointFront(null);
  }, [formData.jointSubType, isITF, isNonITF]);

  // Sync persons/accounts when account type changes
  useEffect(() => {
    if (!isJoint && !isCorporate) {
      setAdditionalPersons([]);
    }
    if (isCorporate && !isSoleProprietorship) {
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
  }, [formData.accountType, isJoint, isCorporate, isSoleProprietorship]);

  // Sync doc pair count for non-ITF flows:
  //   Non-ITF Joint: sigcardPairs → per-account (back only), nais/privacy/otherDocs → per-account
  //   Regular/Corporate: all per-account
  useEffect(() => {
    if (isITF) return; // ITF uses itfFiles, not files
    const acctCount    = additionalAccounts.length + 1;
    const sigcardCount = acctCount; // Non-ITF risk profiling is per account, not per person
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
  }, [isITF, isNonITF, isCorporate, additionalAccounts.length]);

  // Sync corporate sigcard arrays to person count (always N signatories + 1 extra for corporate)
  useEffect(() => {
    if (!isCorporate) return;
    // Sole Proprietorship: 1 front + 1 back (uses normal sigcardPairs, not corp arrays)
    if (isSoleProprietorship) {
      setCorpSigFronts([null]);
      setCorpSigBacks([null]);
      return;
    }
    const totalPersons = additionalPersons.length + 1;
    const targetBacks = totalPersons + 1;
    setCorpSigBacks((prev) => {
      if (prev.length === targetBacks) return prev;
      if (prev.length < targetBacks) return [...prev, ...Array(targetBacks - prev.length).fill(null)];
      return prev.slice(0, targetBacks);
    });
    if (totalPersons === 2) {
      setCorpSigFronts((prev) => [prev[0] ?? null]);
    } else if (totalPersons >= 3) {
      setCorpSigFronts((prev) => prev.length >= 2 ? prev : [...prev, ...Array(2 - prev.length).fill(null)]);
    }
  }, [isCorporate, isSoleProprietorship, additionalPersons.length]);

  const setField  = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const setPairFile = (docKey, pairIndex, side, file) => {
    setFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[pairIndex] = { ...updated[pairIndex], [side]: file };
      return { ...prev, [docKey]: updated };
    });
  };

  // ITF file helpers (shared front/back pairs)
  const setItfPairSide = (docKey, pairIdx, side, file) => {
    setItfFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[pairIdx] = { ...updated[pairIdx], [side]: file };
      return { ...prev, [docKey]: updated };
    });
  };

  const addItfPair = (docKey) => {
    setItfFiles((prev) => ({ ...prev, [docKey]: [...prev[docKey], emptyPair()] }));
  };

  const removeItfPairAt = (docKey, pairIdx) => {
    setItfFiles((prev) => ({ ...prev, [docKey]: prev[docKey].filter((_, i) => i !== pairIdx) }));
  };

  // ITF file helpers (independent single-file lists — Sigcard fronts, Risk Profiling)
  const setItfSingle = (docKey, idx, file) => {
    setItfFiles((prev) => {
      const updated = [...prev[docKey]];
      updated[idx] = file;
      return { ...prev, [docKey]: updated };
    });
  };

  const addItfSingle = (docKey) => {
    setItfFiles((prev) => ({ ...prev, [docKey]: [...prev[docKey], null] }));
  };

  const removeItfSingleAt = (docKey, idx) => {
    setItfFiles((prev) => ({ ...prev, [docKey]: prev[docKey].filter((_, i) => i !== idx) }));
  };

  const isStepValid = useMemo(() => {
    const currentKey = activeSteps[step]?.key;
    switch (currentKey) {
      case "accountType":      return !!formData.accountType;
      case "jointSubType":     return !!formData.jointSubType;
      case "corporateSubType": return !!formData.corporateSubType;
      case "customerInfo":
        if (isSoleProprietorship)
          return !!formData.companyName.trim() && !!formData.firstName.trim() && !!formData.lastName.trim();
        if (isCorporate)
          return !!formData.companyName.trim() && !!formData.firstName.trim() && !!formData.lastName.trim() &&
            additionalPersons.length >= 1 && additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim());
        if (isITF) return !!formData.firstName.trim() && !!formData.lastName.trim() &&
          additionalPersons.length >= 1 && additionalPersons.every((p) => p.firstName.trim() && p.lastName.trim());
        if (isNonITF) return !!formData.firstName.trim() && !!formData.lastName.trim();
        return !!formData.firstName.trim() && !!formData.lastName.trim();
      case "holders":
        if (!formData.riskLevel || !formData.status) return false;
        if (!formData.accountNo.trim()) return false;
        if (formData.status !== "active" && !formData.statusDate) return false;
        return additionalAccounts.every((a) =>
          !!a.riskLevel && !!a.accountNo.trim() && !!a.status &&
          (a.status === "active" || !!a.statusDate)
        );
      case "sigcard":
        if (isITF) return itfFiles.sigcardFronts.every((f) => !!f) && itfFiles.riskProfilings.every((f) => !!f);
        if (isNonITF) return !!files.sigcardPairs[0]?.front && files.sigcardPairs.every((p) => !!p.back);
        if (isSoleProprietorship) return !!files.sigcardPairs[0]?.front && !!files.sigcardPairs[0]?.back;
        if (isCorporate) return corpSigFronts.every((f) => f !== null) && corpSigBacks.every((f) => f !== null);
        return files.sigcardPairs.every((p) => p.front && p.back);
      case "nais": return true;
      case "privacy":
        if (privacyNotRequired) return true;
        if (isITF) return itfFiles.privacy.every((p) => p.front || p.back);
        if (isNonITF) return files.privacyPairs.every((p) => p.front || p.back);
        return files.privacyPairs.every((p) => p.front && p.back);
      case "otherDocs": return true;
      default: return false;
    }
  }, [step, formData, files, itfFiles, additionalPersons, additionalAccounts, activeSteps, corpSigFronts, corpSigBacks, isSoleProprietorship, privacyNotRequired, isCorporate, isITF, isNonITF]);

  const handleNext = () => { if (isStepValid) { setDirection(1);  setStep((s) => Math.min(s + 1, activeSteps.length - 1)); } };
  const handlePrev = () => {                   setDirection(-1); setStep((s) => Math.max(s - 1, 0)); };

  const resetAll = () => {
    setStep(0);
    setFormData({ accountType:"", jointSubType:"", corporateSubType:"", firstName:"", middleName:"", lastName:"", suffix:"", companyName:"", riskLevel:"", accountNo:"", dateOpened:"", dateUpdated:"", status:"active", statusDate:"" });
    setPhotoFile(null);
    setFiles(initialFiles);
    setItfFiles(initialItfFiles());
    setAdditionalPersons([]);
    setAdditionalAccounts([]);
    setCorpSigFronts([null]);
    setCorpSigBacks([null, null]);
    setHasSecondJointFront(false);
    setSecondJointFront(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitPhase("uploading");
    try {
      // Files are sent raw; the backend's Image Intervention handles all resizing and optimisation.
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

      if (isJoint) fd.append("joint_sub_type", formData.jointSubType);
      if (isCorporate && formData.corporateSubType) fd.append("corporate_sub_type", formData.corporateSubType);
      if (formData.statusDate) fd.append("status_date", formData.statusDate);

      if (isITF) {
        additionalPersons.forEach((p, i) => {
          fd.append(`additionalPersons[${i}][firstname]`,  p.firstName);
          fd.append(`additionalPersons[${i}][middlename]`, p.middleName);
          fd.append(`additionalPersons[${i}][lastname]`,   p.lastName);
          fd.append(`additionalPersons[${i}][suffix]`,     p.suffix);
        });

        // Sigcard: Signature Card and Risk Profiling are independent lists, sent as sigcardPairs[i][front]/[back]
        itfFiles.sigcardFronts.forEach((f, i) => {
          if (f) fd.append(`sigcardPairs[${i}][front]`, f);
          fd.append(`sigcardPairs[${i}][person_index]`, 1);
        });
        itfFiles.riskProfilings.forEach((f, i) => {
          if (!f) return;
          const idx = itfFiles.sigcardFronts.length + i;
          fd.append(`sigcardPairs[${idx}][back]`, f);
          fd.append(`sigcardPairs[${idx}][person_index]`, 1);
        });

        for (const [docKey, fdKey] of [["nais", "naisPairs"], ["privacy", "privacyPairs"]]) {
          itfFiles[docKey].forEach((pair, i) => {
            if (!pair.front && !pair.back) return;
            if (pair.front) fd.append(`${fdKey}[${i}][front]`, pair.front);
            if (pair.back)  fd.append(`${fdKey}[${i}][back]`, pair.back);
            fd.append(`${fdKey}[${i}][person_index]`, 1);
          });
        }

        (itfFiles.otherDocs[0] ?? []).forEach((f) => fd.append(`otherDocs[1][]`, f));
      } else {
        if (isNonITF || isCorporate) {
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
          if (a.dateOpened)   fd.append(`additionalAccounts[${i}][date_opened]`,  a.dateOpened);
          fd.append(`additionalAccounts[${i}][status]`,      a.status || "active");
          if (a.dateUpdated)  fd.append(`additionalAccounts[${i}][date_updated]`, a.dateUpdated);
          if (a.statusDate)   fd.append(`additionalAccounts[${i}][status_date]`,  a.statusDate);
        });

        if (isSoleProprietorship) {
          // Sole Prop: standard front+back pair from files.sigcardPairs
          const pair = files.sigcardPairs[0];
          if (pair?.front) { fd.append("sigcardPairs[0][front]", pair.front); fd.append("sigcardPairs[0][person_index]", 1); }
          if (pair?.back)  { fd.append("sigcardPairs[1][back]",  pair.back);  fd.append("sigcardPairs[1][person_index]", 1); }
          for (const key of ["naisPairs", "privacyPairs"]) {
            if (key === "privacyPairs" && privacyNotRequired) continue;
            files[key].forEach((p, i) => {
              if (p.front) fd.append(`${key}[${i}][front]`, p.front);
              if (p.back)  fd.append(`${key}[${i}][back]`,  p.back);
            });
          }
          files.otherDocs.forEach((section, i) => section.forEach((f) => fd.append(`otherDocs[${i + 1}][]`, f)));
        } else if (isCorporate) {
          let pairIdx = 0;
          corpSigFronts.forEach((f, i) => {
            if (f) { fd.append(`sigcardPairs[${pairIdx}][front]`, f); fd.append(`sigcardPairs[${pairIdx}][person_index]`, i + 1); pairIdx++; }
          });
          corpSigBacks.forEach((f, i) => {
            if (f) { fd.append(`sigcardPairs[${pairIdx}][back]`, f); fd.append(`sigcardPairs[${pairIdx}][person_index]`, i + 1); pairIdx++; }
          });
          for (const key of ["naisPairs", "privacyPairs"]) {
            if (key === "privacyPairs" && privacyNotRequired) continue;
            files[key].forEach((pair, i) => {
              if (pair.front) fd.append(`${key}[${i}][front]`, pair.front);
              if (pair.back)  fd.append(`${key}[${i}][back]`, pair.back);
            });
          }
          files.otherDocs.forEach((section, i) => section.forEach((f) => fd.append(`otherDocs[${i + 1}][]`, f)));
        } else {
          for (const key of ["sigcardPairs", "naisPairs", "privacyPairs"]) {
            if (key === "privacyPairs" && privacyNotRequired) continue;
            files[key].forEach((pair, i) => {
              if (pair.front) fd.append(`${key}[${i}][front]`, pair.front);
              if (pair.back)  fd.append(`${key}[${i}][back]`,  pair.back);
            });
          }
          if (isNonITF && hasSecondJointFront && secondJointFront) {
            fd.append(`sigcardPairs[${files.sigcardPairs.length}][front]`, secondJointFront);
          }
          files.otherDocs.forEach((section, i) => section.forEach((f) => fd.append(`otherDocs[${i + 1}][]`, f)));
        }
      }

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
              {accountTypeConfig.map(({ value, label, description, icon: Icon, bg, border, ring, iconBg }) => {
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
              {jointSubTypeConfig.map(({ value, label, description, icon: Icon, bg, border, ring, iconBg }) => {
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

      // ── STEP: Corporate Sub-Type ───────────────────────────────────────────
      case "corporateSubType":
        return (
          <div className="space-y-6">
            <AccountTypePill type={formData.accountType} onReset={() => setStep(0)} />
            <p className="text-sm text-slate-500">Select the corporate account classification.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {corporateSubTypeConfig.map(({ value, label, description, icon: Icon, bg, border, ring, iconBg }) => {
                const isSelected = formData.corporateSubType === value;
                return (
                  <motion.button key={value} type="button" whileTap={{ scale: 0.97 }}
                    onClick={() => setField("corporateSubType", value)}
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
            <p className="text-xs text-center text-slate-400">Choose the corporate type, then click Next to continue</p>
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${isSoleProprietorship ? "bg-amber-600" : "bg-slate-600"}`}>
                    {isSoleProprietorship ? <HiOutlineUser className="w-5 h-5" /> : <HiOutlineOfficeBuilding className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{isSoleProprietorship ? "Sole Proprietorship" : "Corporate Account"}</p>
                    <p className="text-xs text-slate-400">{isSoleProprietorship ? "Single-owner business — one authorized signatory" : "Business or organization — minimum 2 signatories"}</p>
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

                {/* Additional signatories — hidden for Sole Proprietorship */}
                {!isSoleProprietorship && (<>
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
                {/* Add Another Signatory — only for standard Corporate, not Sole Prop */}
                <button type="button"
                  onClick={() => setAdditionalPersons((prev) => [...prev, emptyPerson()])}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-slate-600 border-2 border-dashed border-slate-300 rounded-2xl hover:border-slate-500 hover:bg-slate-50 transition-all">
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Another Signatory
                </button>
                </>)}
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
                {/* Single customer — Non-ITF has one customer with multiple accounts */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${PERSON_COLORS[0]}`}>1</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Account Holder</p>
                    <p className="text-xs text-slate-400">Non-ITF — one customer, one or more accounts</p>
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

              <RiskLevelPicker value={formData.riskLevel} onChange={(v) => setField("riskLevel", v)} riskLevels={appConfig.risk_levels} />

              <div className="border-t border-blue-100" />

              <StatusPicker value={formData.status} onChange={(v) => { setField("status", v); setField("statusDate", ""); }} statuses={appConfig.customer_statuses} />
              <StatusDateField status={formData.status} value={formData.statusDate} onChange={(e) => setField("statusDate", e.target.value)} />
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
                      riskLevels={appConfig.risk_levels}
                    />

                    <div className="border-t border-slate-100" />

                    <StatusPicker
                      value={a.status}
                      onChange={(v) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, status: v, statusDate: "" } : x))}
                      statuses={appConfig.customer_statuses}
                    />
                    <StatusDateField
                      status={a.status}
                      value={a.statusDate ?? ""}
                      onChange={(e) => setAdditionalAccounts((prev) => prev.map((x, idx) => idx === i ? { ...x, statusDate: e.target.value } : x))}
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
            <div className="space-y-8">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-800">Signature Card</p>
                  <p className="text-xs text-slate-400">Add one signature card image per signatory on this joint account.</p>
                </div>
                {itfFiles.sigcardFronts.map((file, idx) => (
                  <div key={idx} className="space-y-2">
                    {itfFiles.sigcardFronts.length > 1 && idx >= 1 && (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeItfSingleAt("sigcardFronts", idx)}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                          <HiOutlineX className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                    {itfFiles.sigcardFronts.length > 1 && (
                      <p className="text-xs font-medium text-slate-400">Sigcard {idx + 1}</p>
                    )}
                    <DocImageDropZone label="SIGCARD" shape="landscape" file={file} onChange={(f) => setItfSingle("sigcardFronts", idx, f)} />
                  </div>
                ))}
                <button type="button" onClick={() => addItfSingle("sigcardFronts")}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-purple-600 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                  <HiOutlinePlus className="w-3.5 h-3.5" />
                  Add Sigcard
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-800">Risk Profiling</p>
                  <p className="text-xs text-slate-400">Add one Risk Profiling image per signatory on this joint account.</p>
                </div>
                {itfFiles.riskProfilings.map((file, idx) => (
                  <div key={idx} className="space-y-2">
                    {itfFiles.riskProfilings.length > 1 && idx >= 1 && (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeItfSingleAt("riskProfilings", idx)}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                          <HiOutlineX className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                    {itfFiles.riskProfilings.length > 1 && (
                      <p className="text-xs font-medium text-slate-400">Risk Profiling {idx + 1}</p>
                    )}
                    <DocImageDropZone label="Risk Profiling" file={file} onChange={(f) => setItfSingle("riskProfilings", idx, f)} />
                  </div>
                ))}
                <button type="button" onClick={() => addItfSingle("riskProfilings")}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-teal-600 border-2 border-dashed border-teal-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all">
                  <HiOutlinePlus className="w-3.5 h-3.5" />
                  Add Risk Profiling
                </button>
              </div>
            </div>
          );
        }

        // Non-ITF Joint: 1 shared sigcard front + 1 risk profiling per account
        if (isNonITF) {
          const acctLabels = [
            "Account 1 — Primary",
            ...additionalAccounts.map((_, i) => `Account ${i + 2}`),
          ];
          return (
            <div className="space-y-8">
              {/* Sigcard Front — single shared, full-width */}
              <DocImageDropZone
                label="SIGCARD (Shared)"
                shape="landscape"
                file={files.sigcardPairs[0]?.front}
                onChange={(f) => setPairFile("sigcardPairs", 0, "front", f)}
              />

              {/* Second sigcard front prompt */}
              {!hasSecondJointFront ? (
                <button type="button"
                  onClick={() => setHasSecondJointFront(true)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-semibold text-indigo-600 border-2 border-dashed border-indigo-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                  <HiOutlinePlus className="w-3.5 h-3.5" />
                  Does this joint account have a second signature card front?
                </button>
              ) : (
                <div className="space-y-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-indigo-700">Second Signature Card Front</p>
                    <button type="button"
                      onClick={() => { setHasSecondJointFront(false); setSecondJointFront(null); }}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                      <HiOutlineX className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                  <DocImageDropZone
                    label="SIGCARD 2"
                    shape="landscape"
                    file={secondJointFront}
                    onChange={(f) => setSecondJointFront(f)}
                  />
                </div>
              )}

              {/* Risk Profiling — one per account */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk Profiling — per account</p>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {files.sigcardPairs.map((pair, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${PERSON_COLORS[i] ?? "bg-slate-400"}`}>
                          {i + 1}
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{acctLabels[i] ?? `Account ${i + 1}`}</p>
                      </div>
                      <DocImageDropZone
                        label="Risk Profiling"
                        file={pair.back}
                        onChange={(f) => setPairFile("sigcardPairs", i, "back", f)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // Sole Proprietorship: simple front + back (same as Regular)
        if (isSoleProprietorship) {
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white flex-shrink-0">
                  <HiOutlineUser className="w-4 h-4" />
                </div>
                <p className="text-xs text-amber-700 font-medium">Sole Proprietorship — upload one sigcard front and one risk profiling back.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <DocImageDropZone label="SIGCARD" shape="landscape" file={files.sigcardPairs[0]?.front}
                  onChange={(f) => setPairFile("sigcardPairs", 0, "front", f)} />
                <DocImageDropZone label="Risk Profiling" file={files.sigcardPairs[0]?.back}
                  onChange={(f) => setPairFile("sigcardPairs", 0, "back", f)} />
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
            "Corporate",
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
                      <p className="text-xs font-medium text-slate-400">SIGCARD {idx + 1}</p>
                    )}
                    <DocImageDropZone
                      label={corpSigFronts.length === 1 ? "SIGCARD" : `SIGCARD ${idx + 1}`}
                      shape="landscape"
                      file={file}
                      onChange={(f) => setCorpSigFronts((prev) => prev.map((x, i) => i === idx ? f : x))}
                    />
                  </div>
                ))}
                {totalPersons >= 3 && (
                  <button type="button" onClick={() => setCorpSigFronts((prev) => [...prev, null])}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-slate-600 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-500 hover:bg-slate-50 transition-all">
                    <HiOutlinePlus className="w-3.5 h-3.5" />
                    Add Another SIGCARD
                  </button>
                )}
              </div>

              {/* Section B — Sigcard Back per signatory */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk Profiling — per signatory</p>
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
                      <DocImageDropZone
                        label="Risk Profiling"
                        file={file}
                        onChange={(f) => setCorpSigBacks((prev) => prev.map((x, idx) => idx === i ? f : x))}
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
          frontLabel="SIGCARD" backLabel="Risk Profiling"
          frontShape="landscape"
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
                    <DocImageDropZone label="NAIS Front" file={pair.front} onChange={(f) => setItfPairSide("nais", pairIdx, "front", f)} />
                    <DocImageDropZone label="NAIS Back (Optional)" file={pair.back}  onChange={(f) => setItfPairSide("nais", pairIdx, "back",  f)} />
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
                    <DocImageDropZone label="Data Privacy Front" file={pair.front} onChange={(f) => setItfPairSide("privacy", pairIdx, "front", f)} />
                    <DocImageDropZone label="Data Privacy Back"  file={pair.back}  onChange={(f) => setItfPairSide("privacy", pairIdx, "back",  f)} />
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
                    <DocImageDropZone label="Data Privacy Front" file={pair.front} onChange={(f) => setPairFile("privacyPairs", pairIdx, "front", f)} />
                    <DocImageDropZone label="Data Privacy Back"  file={pair.back}  onChange={(f) => setPairFile("privacyPairs", pairIdx, "back",  f)} />
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
          return (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">Upload any additional supporting documents for this joint ITF account.</p>
              <MultiFileDropZone
                files={itfFiles.otherDocs[0] ?? []}
                onChange={(newFiles) => setItfFiles((prev) => {
                  const updated = [...prev.otherDocs];
                  updated[0] = newFiles;
                  return { ...prev, otherDocs: updated };
                })}
              />
            </div>
          );
        }

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
                  <MultiFileDropZone
                    files={sectionDocs}
                    onChange={(newFiles) => setFiles((prev) => {
                      const updated = [...prev.otherDocs];
                      updated[si] = newFiles;
                      return { ...prev, otherDocs: updated };
                    })}
                  />
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className="space-y-5">
            <MultiFileDropZone
              files={files.otherDocs[0] ?? []}
              onChange={(newFiles) => setFiles((prev) => {
                const updated = [...prev.otherDocs];
                updated[0] = newFiles;
                return { ...prev, otherDocs: updated };
              })}
            />
          </div>
        );
      }

      default: return null;
    }
  };

  const progress = Math.round(((step + 1) / activeSteps.length) * 100);

  const stepVariants = {
    enter:  (d) => ({ x: d > 0 ? 56 : -56, opacity: 0, rotateY: d > 0 ? 10 : -10, scale: 0.97 }),
    center: {       x: 0,                   opacity: 1, rotateY: 0,                 scale: 1    },
    exit:   (d) => ({ x: d > 0 ? -56 : 56, opacity: 0, rotateY: d > 0 ? -10 : 10, scale: 0.97 }),
  };

  return (
    <motion.div
      className="bg-gray-50 text-slate-900"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
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

            {/* Card body — 3D step transition */}
            <div className="p-6 sm:p-8 overflow-hidden" style={{ perspective: "1200px" }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                  style={{ transformOrigin: direction > 0 ? "left center" : "right center" }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

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
    </motion.div>
  );
};

export default UploadSigcard;
