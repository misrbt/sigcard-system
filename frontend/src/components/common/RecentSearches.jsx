import { HiOutlineClock, HiOutlineX } from "react-icons/hi";

/**
 * Drop-down list of a staff member's recent searches, shown under a search box.
 * Uses onMouseDown + preventDefault so picking an item doesn't blur the input first.
 */
const RecentSearches = ({ items, query = "", visible, onPick, onRemove, onClear, compact = false }) => {
  const q = query.trim().toLowerCase();
  const shown = items.filter((t) => !q || (t.toLowerCase().includes(q) && t.toLowerCase() !== q));

  if (!visible || shown.length === 0) return null;

  const text = compact ? "text-xs" : "text-sm";

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[14rem]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent searches</span>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClear(); }}
          className="text-[11px] font-semibold text-blue-600 hover:underline"
        >
          Clear all
        </button>
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {shown.map((term) => (
          <li key={term} className="group flex items-center hover:bg-slate-50">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(term); }}
              className={`flex flex-1 items-center gap-2 px-3 py-2 text-left text-slate-700 truncate ${text}`}
            >
              <HiOutlineClock className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="truncate">{term}</span>
            </button>
            <button
              type="button"
              title="Remove from history"
              onMouseDown={(e) => { e.preventDefault(); onRemove(term); }}
              className="p-2 mr-1 text-slate-300 hover:text-slate-600 rounded-lg"
            >
              <HiOutlineX className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentSearches;
