import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdAccountTree,
  MdCheck,
  MdClose,
  MdArrowForward,
  MdInfo,
  MdBusiness,
  MdLocationOn,
  MdChevronRight,
} from "react-icons/md";
import Button from "../../components/ui/Button";
import { adminService } from "../../services/adminService";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Branch Lite = name or abbreviation contains "BLU" (Branch Lite Unit) */
const isLiteBranch = (branch) =>
  branch.brak?.toUpperCase().includes("BLU") ||
  branch.branch_name?.toUpperCase().includes("BLU");

// ── main page ──────────────────────────────────────────────────────────────────

const DataManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Step 1 — selected parent branch
  const [selectedParent, setSelectedParent] = useState(null);

  // Step 2 — checked branch lite IDs to assign to the selected parent
  // Initialised from the selected parent's current children when parent is selected
  const [checkedLites, setCheckedLites] = useState(new Set());

  const fetchHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminService.getBranchHierarchy();
      setBranches(res.data.data);
    } catch {
      setError("Failed to load branch data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  // Auto-categorise
  const byBrcode = (a, b) => Number(a.brcode) - Number(b.brcode);

  const parentBranches = branches
    .filter((b) => !isLiteBranch(b) && b.branch_name?.toLowerCase() !== "head office")
    .sort(byBrcode);

  const liteBranches = branches
    .filter((b) => isLiteBranch(b))
    .sort(byBrcode);

  // When the admin selects a parent, pre-fill the checklist with its current children
  const handleSelectParent = (branch) => {
    setSelectedParent(branch);
    setCheckedLites(new Set((branch.children ?? []).map((c) => c.id)));
    setError("");
    setSuccess("");
  };

  const toggleLite = (liteId) => {
    setCheckedLites((prev) => {
      const next = new Set(prev);
      if (next.has(liteId)) {
        next.delete(liteId);
      } else {
        next.add(liteId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedParent) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const currentChildIds = new Set((selectedParent.children ?? []).map((c) => c.id));

      // Branch lites to add (checked but not currently a child of this parent)
      const toAdd = liteBranches.filter(
        (b) => checkedLites.has(b.id) && !currentChildIds.has(b.id)
      );

      // Branch lites to remove (was a child but now unchecked)
      const toRemove = liteBranches.filter(
        (b) => !checkedLites.has(b.id) && currentChildIds.has(b.id)
      );

      const promises = [
        ...toAdd.map((b) => adminService.updateBranchParent(b.id, selectedParent.id)),
        ...toRemove.map((b) => adminService.updateBranchParent(b.id, null)),
      ];

      await Promise.all(promises);

      setSuccess("Branch hierarchy saved successfully.");
      setTimeout(() => setSuccess(""), 3000);

      await fetchHierarchy();
      // re-sync of selectedParent is handled by the useEffect that watches branches
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // After a fetch, keep selectedParent in sync with the freshest data
  useEffect(() => {
    if (!selectedParent || branches.length === 0) {
      return;
    }
    const fresh = branches.find((b) => b.id === selectedParent.id);
    if (fresh) {
      setSelectedParent(fresh);
      setCheckedLites(new Set((fresh.children ?? []).map((c) => c.id)));
    }
  // Only re-run when branches array reference changes (after fetch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#05173a] tracking-tight flex items-center gap-2">
          <MdAccountTree className="w-7 h-7 text-[#1877F2]" />
          Data Management
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure which branch lite units belong to each parent branch.
        </p>
      </div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
        <MdInfo className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-0.5">
          <p>
            <strong>Parent Branch</strong> — a main branch (auto-detected: name has no "BLU").
          </p>
          <p>
            <strong>Branch Lite</strong> — a child unit (auto-detected: name / code contains "BLU").
          </p>
          <p className="pt-0.5">
            A manager of a parent branch can view all customer data — sigcard, NAIS, and documents —
            from their own branch <strong>and</strong> all assigned branch lites.
          </p>
        </div>
      </div>

      {/* ── Toast messages ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <MdClose className="w-4 h-4 flex-shrink-0" />{error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm"
          >
            <MdCheck className="w-4 h-4 flex-shrink-0" />{success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading branch data…</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── STEP 1: Select Parent Branch ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1877F2] text-white text-xs font-bold">1</span>
              <h2 className="text-base font-bold text-gray-800">Select Parent Branch</h2>
            </div>
            <p className="text-xs text-gray-500 pl-8">
              Click a branch to manage its branch lite children.
            </p>

            <div className="space-y-2">
              {parentBranches.length === 0 && (
                <p className="text-sm text-gray-400 italic px-2">No parent branches found.</p>
              )}
              {parentBranches.map((branch) => {
                const isSelected = selectedParent?.id === branch.id;
                const childCount = branch.children?.length ?? 0;

                return (
                  <motion.button
                    key={branch.id}
                    onClick={() => handleSelectParent(branch)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 ${
                      isSelected
                        ? "border-[#1877F2] bg-blue-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? "bg-[#1877F2]/15" : "bg-gray-100"}`}>
                      <MdBusiness className={`w-5 h-5 ${isSelected ? "text-[#1877F2]" : "text-gray-500"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${isSelected ? "text-[#1877F2]" : "text-gray-800"}`}>
                        {branch.branch_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {branch.brak} &middot; Code {branch.brcode}
                        {childCount > 0 && (
                          <span className="ml-2 text-purple-500 font-medium">
                            {childCount} branch lite{childCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>

                    <MdChevronRight className={`w-5 h-5 flex-shrink-0 transition-colors ${isSelected ? "text-[#1877F2]" : "text-gray-300"}`} />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── STEP 2: Assign Branch Lites ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${selectedParent ? "bg-[#1877F2] text-white" : "bg-gray-200 text-gray-400"}`}>2</span>
              <h2 className={`text-base font-bold ${selectedParent ? "text-gray-800" : "text-gray-400"}`}>
                Assign Branch Lites
                {selectedParent && (
                  <span className="ml-1 font-normal text-gray-500 text-sm">
                    → {selectedParent.branch_name}
                  </span>
                )}
              </h2>
            </div>
            <p className={`text-xs pl-8 ${selectedParent ? "text-gray-500" : "text-gray-300"}`}>
              {selectedParent
                ? "Check the branch lites that this parent branch can access."
                : "Select a parent branch first."}
            </p>

            <AnimatePresence mode="wait">
              {!selectedParent ? (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50"
                >
                  <MdArrowForward className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Select a parent branch to continue</p>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedParent.id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-2"
                >
                  {liteBranches.length === 0 && (
                    <p className="text-sm text-gray-400 italic px-2">No branch lites found.</p>
                  )}
                  {liteBranches.map((lite) => {
                    const checked = checkedLites.has(lite.id);
                    // Assigned to a DIFFERENT parent
                    const otherParentId = lite.parent_id && lite.parent_id !== selectedParent.id ? lite.parent_id : null;
                    const otherParent = otherParentId
                      ? parentBranches.find((b) => b.id === otherParentId)
                      : null;

                    return (
                      <label
                        key={lite.id}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                          checked
                            ? "border-purple-400 bg-purple-50"
                            : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLite(lite.id)}
                          className="w-4 h-4 rounded accent-purple-600 flex-shrink-0"
                        />

                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${checked ? "bg-purple-100" : "bg-gray-100"}`}>
                          <MdLocationOn className={`w-4 h-4 ${checked ? "text-purple-600" : "text-gray-400"}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${checked ? "text-purple-700" : "text-gray-700"}`}>
                            {lite.branch_name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {lite.brak} &middot; Code {lite.brcode}
                            {otherParent && (
                              <span className="ml-2 text-amber-500 font-medium">
                                Currently under {otherParent.branch_name}
                              </span>
                            )}
                          </p>
                        </div>

                        {checked && <MdCheck className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                      </label>
                    );
                  })}

                  {/* Summary + Save */}
                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {checkedLites.size} branch lite{checkedLites.size !== 1 ? "s" : ""} selected
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={saving}
                      onClick={handleSave}
                    >
                      Save Assignment
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Current Hierarchy Summary ── */}
      {!loading && branches.some((b) => (b.children?.length ?? 0) > 0) && (
        <div className="space-y-3 pt-2">
          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
              Current Hierarchy
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {parentBranches
                .filter((b) => (b.children?.length ?? 0) > 0)
                .map((mb) => (
                  <div
                    key={mb.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
                      <MdBusiness className="w-4 h-4 text-[#1877F2] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{mb.branch_name}</p>
                        <p className="text-xs text-gray-400">{mb.brak}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Parent Branch
                      </span>
                    </div>
                    <div className="px-4 py-2 space-y-1.5">
                      {mb.children.map((child) => (
                        <div key={child.id} className="flex items-center gap-2">
                          <MdArrowForward className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-100">
                            <MdLocationOn className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            <p className="text-xs font-medium text-gray-700 truncate">{child.branch_name}</p>
                            <span className="ml-auto text-xs font-semibold text-purple-600 whitespace-nowrap">
                              Branch Lite
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
