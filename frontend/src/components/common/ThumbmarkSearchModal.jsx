import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdFingerprint,
  MdClose,
  MdCloudUpload,
  MdSearch,
  MdPerson,
  MdBusiness,
  MdArrowForward,
  MdCheckCircle,
  MdErrorOutline,
  MdRefresh,
} from "react-icons/md";
import { HiOutlineShieldCheck } from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

const ROLE_CUSTOMER_BASE = {
  admin:              "/admin/customers",
  manager:            "/manager/customers",
  cashier:            "/cashier/customers",
  user:               "/user/customers",
  compliance: "/compliance/customers",
  audit:      "/compliance/customers",
};

const riskStyle = {
  "Low Risk":    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Medium Risk": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "High Risk":   "bg-red-50 text-red-700 border border-red-200",
};

const accountStyle = {
  Regular:   "bg-blue-50 text-blue-700",
  Joint:     "bg-purple-50 text-purple-700",
  Corporate: "bg-slate-100 text-slate-700",
};

const statusStyle = {
  active:      "bg-green-100 text-green-700",
  dormant:     "bg-yellow-100 text-yellow-700",
  closed:      "bg-red-100 text-red-700",
  reactivated: "bg-teal-100 text-teal-700",
  escheat:     "bg-orange-100 text-orange-700",
};

const ConfidenceBar = ({ score }) => {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-10 text-right">
        {pct}%
      </span>
    </div>
  );
};

const ThumbmarkSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { getPrimaryRole } = useAuth();
  const role = getPrimaryRole();
  const customerBase = ROLE_CUSTOMER_BASE[role] ?? "/admin/customers";

  const [image, setImage] = useState(null);       // { file, preview }
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("idle");   // idle | searching | found | not_found | error
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const reset = () => {
    setImage(null);
    setStatus("idle");
    setResults([]);
    setErrorMsg("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const loadFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const preview = URL.createObjectURL(file);
    setImage({ file, preview });
    setStatus("idle");
    setResults([]);
    setErrorMsg("");
  };

  const onFileChange = (e) => loadFile(e.target.files?.[0]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    loadFile(e.dataTransfer.files?.[0]);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const handleSearch = async () => {
    if (!image) return;
    setStatus("searching");
    setResults([]);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("thumbmark", image.file);

    try {
      const res = await api.post("/search/thumbmark", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const matches = res.data?.matches ?? [];
      if (matches.length > 0) {
        setResults(matches);
        setStatus("found");
      } else {
        setStatus("not_found");
      }
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 503) {
        setStatus("error");
        setErrorMsg("Thumbmark search service is not yet available. Backend integration is in progress.");
      } else if (err?.response?.data?.message) {
        setStatus("error");
        setErrorMsg(err.response.data.message);
      } else {
        setStatus("error");
        setErrorMsg("Unable to connect to the thumbmark search service.");
      }
    }
  };

  const viewProfile = (customerId) => {
    navigate(`${customerBase}/${customerId}`);
    handleClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* Single overlay — clicking the dark area closes the modal */
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Modal card — clicks inside don't bubble up to the overlay */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#010713] via-[#053161] to-[#051637] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10">
                    <MdFingerprint className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">Thumbmark Search</h2>
                    <p className="text-xs text-blue-300">Upload a thumbmark to identify a client</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-5 space-y-4">
                  {/* Upload zone */}
                  {!image ? (
                    <div
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all py-10 px-6
                        ${isDragging
                          ? "border-blue-500 bg-blue-50 scale-[1.01]"
                          : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40"
                        }`}
                    >
                      <div className={`flex items-center justify-center w-14 h-14 rounded-full transition-colors ${isDragging ? "bg-blue-100" : "bg-white shadow"}`}>
                        <MdFingerprint className={`w-8 h-8 transition-colors ${isDragging ? "text-blue-600" : "text-gray-400"}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {isDragging ? "Drop thumbmark here" : "Upload Thumbmark Image"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Drag & drop or click to browse · JPG, PNG, BMP, WSQ
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <MdCloudUpload className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">Choose file</span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.wsq"
                        className="hidden"
                        onChange={onFileChange}
                      />
                    </div>
                  ) : (
                    /* Preview + controls */
                    <div className="flex gap-4 items-start">
                      <div className="relative flex-shrink-0">
                        <img
                          src={image.preview}
                          alt="Thumbmark preview"
                          className="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow"
                        />
                        <button
                          onClick={reset}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                        >
                          <MdClose className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{image.file.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(image.file.size / 1024).toFixed(1)} KB · {image.file.type || "image"}
                        </p>
                        <button
                          onClick={() => { reset(); fileInputRef.current?.click(); }}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <MdRefresh className="w-3.5 h-3.5" /> Change image
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.wsq"
                          className="hidden"
                          onChange={onFileChange}
                        />
                      </div>
                    </div>
                  )}

                  {/* Search button */}
                  <button
                    onClick={handleSearch}
                    disabled={!image || status === "searching"}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all
                      ${image && status !== "searching"
                        ? "bg-gradient-to-r from-[#053161] to-[#1877F2] text-white hover:opacity-90 shadow-md hover:shadow-lg"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    {status === "searching" ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Scanning thumbmark...
                      </>
                    ) : (
                      <>
                        <MdSearch className="w-4 h-4" />
                        Search Thumbmark
                      </>
                    )}
                  </button>

                  {/* ── Results ── */}
                  <AnimatePresence mode="wait">
                    {/* Found */}
                    {status === "found" && (
                      <motion.div
                        key="found"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                          <MdCheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-gray-700">
                            {results.length} match{results.length !== 1 ? "es" : ""} found
                          </span>
                        </div>

                        {results.map((match, i) => (
                          <motion.div
                            key={match.customer_id ?? i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm flex-shrink-0">
                                  {(match.full_name ?? "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm truncate">{match.full_name}</p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {match.account_type && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accountStyle[match.account_type] ?? "bg-gray-100 text-gray-600"}`}>
                                        {match.account_type}
                                      </span>
                                    )}
                                    {match.status && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle[match.status] ?? "bg-gray-100 text-gray-600"}`}>
                                        {match.status}
                                      </span>
                                    )}
                                    {match.risk_level && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${riskStyle[match.risk_level] ?? "bg-gray-100 text-gray-600"}`}>
                                        {match.risk_level}
                                      </span>
                                    )}
                                  </div>
                                  {match.branch_name && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <MdBusiness className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs text-gray-500 truncate">{match.branch_name}</span>
                                    </div>
                                  )}
                                  {typeof match.confidence === "number" && (
                                    <div className="mt-2">
                                      <p className="text-[10px] text-gray-400 mb-1 font-medium uppercase tracking-wide">Match confidence</p>
                                      <ConfidenceBar score={match.confidence} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => viewProfile(match.customer_id)}
                                className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                View <MdArrowForward className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {/* Not found */}
                    {status === "not_found" && (
                      <motion.div
                        key="not_found"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3 py-6 text-center"
                      >
                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                          <MdFingerprint className="w-7 h-7 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">No match found</p>
                          <p className="text-xs text-gray-400 mt-1">
                            This thumbmark does not match any registered client in the system.
                          </p>
                        </div>
                        <button
                          onClick={reset}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                        >
                          <MdRefresh className="w-3.5 h-3.5" /> Try another image
                        </button>
                      </motion.div>
                    )}

                    {/* Error */}
                    {status === "error" && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3 py-6 text-center"
                      >
                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                          <MdErrorOutline className="w-7 h-7 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Service Unavailable</p>
                          <p className="text-xs text-gray-500 mt-1 max-w-xs">{errorMsg}</p>
                        </div>
                        <button
                          onClick={reset}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                        >
                          <MdRefresh className="w-3.5 h-3.5" /> Try again
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer note */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex-shrink-0">
                <HiOutlineShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-[11px] text-gray-500">
                  Biometric data is processed on-premises and not shared externally. BSP-compliant.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ThumbmarkSearchModal;
