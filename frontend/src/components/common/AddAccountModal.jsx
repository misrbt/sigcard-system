import { useState } from "react";
import Swal from "sweetalert2";
import {
  HiOutlineCheckCircle,
  HiOutlineUpload,
  HiOutlinePhotograph,
  HiOutlinePlus,
  HiOutlineX,
} from "react-icons/hi";
import api from "../../services/api";

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

const steps = [
  { key: "info",    title: "Account Info"      },
  { key: "sigcard", title: "Sigcard"           },
  { key: "nais",    title: "NAIS (Optional)"   },
  { key: "privacy", title: "Data Privacy"      },
  { key: "other",   title: "Other Docs"        },
];

const inputCls = "w-full px-3 py-2.5 text-sm border-2 rounded-xl border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all";

// ── DropZone ──────────────────────────────────────────────────────────────────
const DropZone = ({ label, file, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [orientation, setOrientation] = useState(null);

  const handleFiles = (list) => { if (list?.length) { setOrientation(null); onSelect(list[0]); } };
  const handleLoad  = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target;
    setOrientation(h >= w ? "portrait" : "landscape");
  };

  const sizeClass = file
    ? orientation === "portrait"  ? "aspect-[3/4]"
    : orientation === "landscape" ? "aspect-[4/3]"
    : "min-h-[280px]"
    : "min-h-[280px]";

  return (
    <div className="space-y-2">
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
                <HiOutlinePhotograph className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-bold">Click to change</p>
                <p className="mt-1 text-xs text-white/80">Drag & drop or select new file</p>
              </div>
            </div>
            <div className="absolute p-1.5 rounded-full shadow-lg right-3 top-3 bg-gradient-to-br from-green-500 to-green-600">
              <HiOutlineCheckCircle className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="p-4 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <HiOutlineUpload className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{isDragging ? "Drop image here" : "Drag & drop your file"}</p>
              <p className="mt-1 text-xs text-slate-600">or <span className="font-semibold text-blue-600">click to browse</span></p>
              <p className="mt-1 text-xs text-slate-500">Supports: JPG, PNG (Max 10MB)</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
};

// ── AddAccountModal ───────────────────────────────────────────────────────────
const AddAccountModal = ({ customer, isOpen, onClose, onSuccess }) => {
  const [step,           setStep]           = useState(0);
  const [riskLevel,      setRiskLevel]      = useState("");
  const [accountNo,      setAccountNo]      = useState("");
  const [dateOpened,     setDateOpened]     = useState("");
  const [sigcard,        setSigcard]        = useState({ front: null, back: null });
  const [nais,           setNais]           = useState({ front: null, back: null });
  const [privacy,        setPrivacy]        = useState({ front: null, back: null });
  const [otherDocs,      setOtherDocs]      = useState([]);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitPhase,    setSubmitPhase]    = useState("idle");

  if (!isOpen) return null;

  const resetState = () => {
    setStep(0);
    setRiskLevel("");
    setAccountNo("");
    setDateOpened("");
    setSigcard({ front: null, back: null });
    setNais({ front: null, back: null });
    setPrivacy({ front: null, back: null });
    setOtherDocs([]);
    setIsSubmitting(false);
    setUploadProgress(0);
    setSubmitPhase("idle");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isStepValid = () => {
    const key = steps[step].key;
    if (key === "info")    return !!riskLevel && !!accountNo.trim() && !!dateOpened;
    if (key === "sigcard") return !!sigcard.front && !!sigcard.back;
    if (key === "nais")    return true;
    if (key === "privacy") return !!privacy.front && !!privacy.back;
    if (key === "other")   return true;
    return false;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitPhase("compressing");

    try {
      // Compress all images
      const [sigFront, sigBack] = await Promise.all([
        compressImage(sigcard.front),
        compressImage(sigcard.back),
      ]);

      const naisFront = nais.front ? await compressImage(nais.front) : null;
      const naisBack  = nais.back  ? await compressImage(nais.back)  : null;

      const [privFront, privBack] = await Promise.all([
        compressImage(privacy.front),
        compressImage(privacy.back),
      ]);

      const compressedOthers = await Promise.all(otherDocs.map((f) => compressImage(f)));

      setSubmitPhase("uploading");
      setUploadProgress(0);

      const fd = new FormData();
      fd.append("risk_level",  riskLevel);
      fd.append("account_no",  accountNo.trim());
      fd.append("date_opened", dateOpened);

      fd.append("sigcardPairs[0][front]", sigFront);
      fd.append("sigcardPairs[0][back]",  sigBack);

      if (naisFront) fd.append("naisPairs[0][front]", naisFront);
      if (naisBack)  fd.append("naisPairs[0][back]",  naisBack);

      fd.append("privacyPairs[0][front]", privFront);
      fd.append("privacyPairs[0][back]",  privBack);

      compressedOthers.forEach((f) => fd.append("otherDocs[]", f));

      await api.post(`/customers/${customer.id}/add-account`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      setSubmitPhase("idle");
      await Swal.fire({
        icon: "success",
        title: "Account Added",
        text: `New account successfully added for ${customer.full_name}.`,
        confirmButtonColor: "#2563eb",
      });

      resetState();
      onSuccess();
    } catch (err) {
      setIsSubmitting(false);
      setSubmitPhase("idle");
      setUploadProgress(0);
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? "An error occurred while adding the account.";
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: msg,
        confirmButtonColor: "#2563eb",
      });
    }
  };

  const progressPct = (step / (steps.length - 1)) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiOutlinePlus className="w-5 h-5 text-blue-400" />
                  Add New Account
                </h2>
                <p className="text-sm text-white/50 mt-0.5">{customer?.full_name}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Step pills */}
            <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
              {steps.map((s, i) => {
                const isDone    = i < step;
                const isCurrent = i === step;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                      isCurrent ? "bg-blue-600 text-white"
                      : isDone   ? "bg-green-500/80 text-white"
                      : "bg-white/10 text-white/50"
                    }`}
                  >
                    {isDone && <HiOutlineCheckCircle className="w-3.5 h-3.5" />}
                    {s.title}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Step: Account Info */}
            {steps[step].key === "info" && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Risk Level <span className="text-red-500">*</span></p>
                  <div className="grid grid-cols-3 gap-2">
                    {RISK_LEVELS.map((risk) => (
                      <button
                        key={risk}
                        type="button"
                        onClick={() => setRiskLevel(risk)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          riskLevel === risk
                            ? RISK_STYLE[risk]
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Account No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    placeholder="e.g. 1234-5678-9012"
                    maxLength={100}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Date Opened <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateOpened}
                    onChange={(e) => setDateOpened(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Step: Sigcard */}
            {steps[step].key === "sigcard" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Upload front and back images of the signature card.</p>
                <div className="grid grid-cols-2 gap-4">
                  <DropZone label="Sigcard Front" file={sigcard.front} onSelect={(f) => setSigcard((p) => ({ ...p, front: f }))} />
                  <DropZone label="Sigcard Back"  file={sigcard.back}  onSelect={(f) => setSigcard((p) => ({ ...p, back:  f }))} />
                </div>
              </div>
            )}

            {/* Step: NAIS (Optional) */}
            {steps[step].key === "nais" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Upload NAIS document images — optional, you may skip this step.</p>
                <div className="grid grid-cols-2 gap-4">
                  <DropZone label="NAIS Front (Optional)" file={nais.front} onSelect={(f) => setNais((p) => ({ ...p, front: f }))} />
                  <DropZone label="NAIS Back (Optional)"  file={nais.back}  onSelect={(f) => setNais((p) => ({ ...p, back:  f }))} />
                </div>
              </div>
            )}

            {/* Step: Data Privacy */}
            {steps[step].key === "privacy" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Upload the signed data privacy consent form (both sides required).</p>
                <div className="grid grid-cols-2 gap-4">
                  <DropZone label="Data Privacy Front" file={privacy.front} onSelect={(f) => setPrivacy((p) => ({ ...p, front: f }))} />
                  <DropZone label="Data Privacy Back"  file={privacy.back}  onSelect={(f) => setPrivacy((p) => ({ ...p, back:  f }))} />
                </div>
              </div>
            )}

            {/* Step: Other Docs (Optional) */}
            {steps[step].key === "other" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Upload any additional supporting documents — optional.</p>

                {/* Multi-file dropzone */}
                <label
                  className="group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg transition-all duration-300 min-h-[140px]"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        setOtherDocs((prev) => [...prev, ...Array.from(e.target.files)]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center gap-3 p-5 text-center">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <HiOutlineUpload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Click to add documents</p>
                      <p className="mt-1 text-xs text-slate-500">Multiple files allowed — JPG, PNG (Max 10MB each)</p>
                    </div>
                  </div>
                </label>

                {otherDocs.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {otherDocs.map((file, i) => (
                      <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                          <p className="text-[10px] text-white font-semibold text-center line-clamp-2">{file.name}</p>
                          <button
                            type="button"
                            onClick={() => setOtherDocs((prev) => prev.filter((_, idx) => idx !== i))}
                            className="mt-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white text-[10px] font-bold">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0 || isSubmitting}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {isSubmitting && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  {submitPhase === "compressing"
                    ? "Compressing…"
                    : `Uploading… ${uploadProgress}%`}
                </div>
              )}

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!isStepValid() || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isStepValid() || isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddAccountModal;
