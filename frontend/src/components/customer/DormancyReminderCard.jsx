// Home page reminder: customers whose Active / Reactivated account was not updated for
// 2+ years and may soon become dormant. Shown to cashier, manager and user roles only.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineChevronDown, HiOutlineChevronRight } from "react-icons/hi";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { DORMANCY_REMINDER_YEARS, showsDormancyReminder } from "../../utils/dormancyReminder";

const formatDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";

const yearsSince = (iso) => {
  const from = new Date(`${iso}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y !== 1 ? "s" : ""}`, m && `${m} mo`].filter(Boolean).join(" ") || "—";
};

const PREVIEW = 5;

const DormancyReminderCard = ({ basePath }) => {
  const navigate = useNavigate();
  const { getPrimaryRole } = useAuth();
  const enabled = showsDormancyReminder(getPrimaryRole());
  const [state, setState] = useState({ loading: true, total: 0, data: [] });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api.get("/customers/dormancy-reminders", { params: { limit: 100 } })
      .then(({ data }) => { if (alive) setState({ loading: false, total: data.total ?? 0, data: data.data ?? [] }); })
      .catch(() => { if (alive) setState({ loading: false, total: 0, data: [] }); });
    return () => { alive = false; };
  }, [enabled]);

  if (!enabled || state.loading || state.total === 0) return null;

  const rows = expanded ? state.data : state.data.slice(0, PREVIEW);

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <HiOutlineCalendar className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">
            {state.total} customer{state.total !== 1 ? "s" : ""} need{state.total === 1 ? "s" : ""} updating
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            These accounts have not been updated for {DORMANCY_REMINDER_YEARS} years or more and may soon become dormant.
            Ask the customer to update their records, then upload the new documents.
          </p>
        </div>
      </div>

      <ul className="bg-white border-t border-amber-200 divide-y divide-amber-100">
        {rows.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => navigate(`${basePath}/customers/${c.id}/view`)}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-amber-50/70 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {c.accounts.map((a) => `${a.account_no ?? `Account ${a.account_index}`} · ${a.basis_label} ${formatDate(a.basis_date)}`).join("  |  ")}
                  {c.branch_name ? `  ·  ${c.branch_name}` : ""}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0 whitespace-nowrap">
                {yearsSince(c.oldest_basis_date)}
              </span>
              <HiOutlineChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      {state.data.length > PREVIEW && (
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border-t border-amber-200 transition-colors">
          <HiOutlineChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show fewer" : `Show all ${state.data.length}${state.total > state.data.length ? ` of ${state.total}` : ""}`}
        </button>
      )}
    </div>
  );
};

export default DormancyReminderCard;
