import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  FaUsers, FaBed, FaTimesCircle, FaExclamationTriangle, FaCheckCircle,
  FaSync, FaBuilding,
  FaCalendarAlt, FaChartBar, FaCalendar, FaUpload,
  FaMedal, FaTimes, FaEye,
} from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";
import { HiOutlineChevronRight } from "react-icons/hi";
import api from "../../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  active:      { label: "Active",      bar: "bg-emerald-500", hex: "#10b981", text: "text-emerald-700", light: "bg-emerald-50"  },
  dormant:     { label: "Dormant",     bar: "bg-amber-400",   hex: "#f59e0b", text: "text-amber-700",   light: "bg-amber-50"    },
  closed:      { label: "Closed",      bar: "bg-rose-500",    hex: "#f43f5e", text: "text-rose-700",    light: "bg-rose-50"     },
  escheat:     { label: "Escheat",   bar: "bg-purple-500",  hex: "#8b5cf6", text: "text-purple-700",  light: "bg-purple-50"   },
  reactivated: { label: "Reactivated", bar: "bg-blue-500",    hex: "#3b82f6", text: "text-blue-700",    light: "bg-blue-50"     },
};

const BAR_DATASETS = (trends) => [
  { label: "Opened",        data: trends.map((m) => m.opened),      backgroundColor: "#10b981", borderRadius: 4 },
  { label: "Became Dormant",data: trends.map((m) => m.dormant),     backgroundColor: "#f59e0b", borderRadius: 4 },
  { label: "Became Closed", data: trends.map((m) => m.closed),      backgroundColor: "#f43f5e", borderRadius: 4 },
  { label: "Reactivated",   data: trends.map((m) => m.reactivated), backgroundColor: "#3b82f6", borderRadius: 4 },
  { label: "Escheated",     data: trends.map((m) => m.escheat),     backgroundColor: "#8b5cf6", borderRadius: 4 },
];

const BAR_OPTIONS = (bold = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12 } },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: bold ? 13 : 11, weight: bold ? "bold" : "normal" } } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
  },
});

const DONUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          const p = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
          return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${p}%)`;
        },
      },
    },
  },
};

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt   = (n) => (n ?? 0).toLocaleString();
const pct   = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const donutData = (overall) => ({
  labels: Object.values(STATUS_META).map((s) => s.label),
  datasets: [{
    data: ["active","dormant","closed","escheat","reactivated"].map((k) => overall[k] ?? 0),
    backgroundColor: Object.values(STATUS_META).map((s) => s.hex),
    borderWidth: 2,
    borderColor: "#fff",
  }],
});

const barData = (trends) => ({
  labels: trends.map((t) => t.label),
  datasets: BAR_DATASETS(trends),
});

// ── ProgressBar ───────────────────────────────────────────────────────────────

const ProgressBar = ({ value, total, color, thin = false }) => (
  <div className="flex items-center gap-2">
    <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${thin ? "h-1.5" : "h-2"}`}>
      <div
        className={`${thin ? "h-1.5" : "h-2"} rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct(value, total)}%` }}
      />
    </div>
    <span className="text-[10px] text-gray-400 w-7 text-right">{pct(value, total)}%</span>
  </div>
);

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = (props) => {
  const {
    icon,
    label,
    value,
    sub,
    colorBg,
    onClick,
  } = props;

  const Icon = icon;

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left w-full transition-all
      ${
        onClick
          ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          : "cursor-default"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl ${colorBg} flex items-center justify-center flex-shrink-0`}
      >
        {Icon && <Icon className="w-5 h-5 text-white" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium truncate">
          {label}
        </p>

        <p className="text-xl font-bold text-gray-900 leading-none mt-0.5">
          {fmt(value)}
        </p>

        {sub && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {sub}
          </p>
        )}
      </div>

      {onClick && (
        <HiOutlineChevronRight className="text-gray-300 flex-shrink-0" />
      )}
    </button>
  );
};

// ── BranchCard ────────────────────────────────────────────────────────────────

const BranchCard = ({ branch, onClick }) => {
  const statuses = ["active","dormant","closed","reactivated","escheat"];
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all w-full cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors leading-tight">
            {branch.branch_name}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">{branch.brak}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xl font-bold text-gray-900">{fmt(branch.total)}</span>
          <span className="text-[10px] text-gray-400">accounts</span>
        </div>
      </div>

      {/* Status mini-bars */}
      <div className="space-y-1.5 mb-3">
        {statuses.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-14 shrink-0">{STATUS_META[s].label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${STATUS_META[s].bar}`}
                style={{ width: `${pct(branch[s], branch.total)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-600 w-6 text-right font-medium">{branch[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-[11px] text-gray-500">
          Active: <span className="font-semibold text-emerald-600">{branch.active_pct}%</span>
        </span>
        {branch.opened_this_month > 0 ? (
          <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
            +{branch.opened_this_month} this month
          </span>
        ) : (
          <span className="text-[11px] text-gray-300">No new this month</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1 text-[11px] text-blue-500 group-hover:text-blue-700 transition-colors">
        <FaChartBar className="w-3 h-3" />
        <span>View KPI details</span>
        <FaArrowRight className="w-2.5 h-2.5 ml-0.5" />
      </div>
    </button>
  );
};

// ── GenerateReportDialog ──────────────────────────────────────────────────────

const GenerateReportDialog = ({ branches, onClose, basePath }) => {
  const navigate     = useNavigate();
  const today        = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const [dateFrom, setDateFrom]       = useState(firstOfMonth);
  const [dateTo, setDateTo]           = useState(today);
  const [branchScope, setBranchScope] = useState("all");
  const [branchId, setBranchId]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) { setError("Please select both dates."); return; }
    if (branchScope === "specific" && !branchId) { setError("Please select a branch."); return; }
    setLoading(true); setError(null);
    try {
      const payload = { date_from: dateFrom, date_to: dateTo };
      if (branchScope === "specific") payload.branch_id = branchId;
      const res = await api.post("/compliance/reports/generate", payload);
      navigate(`${basePath}/preview`, { state: { report: res.data.data } });
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FaChartBar className="text-blue-600" /> Generate Report
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Inclusive Date Range</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">From</label>
                <input type="date" value={dateFrom} max={dateTo || today}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">To</label>
                <input type="date" value={dateTo} min={dateFrom} max={today}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Branch scope */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Branch Scope</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="branchScope" value="all" checked={branchScope === "all"}
                  onChange={() => setBranchScope("all")} className="accent-blue-600" />
                <span className="text-sm text-gray-700">
                  All Branches <span className="text-gray-400 text-xs">(excluding Head Office)</span>
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="branchScope" value="specific" checked={branchScope === "specific"}
                  onChange={() => setBranchScope("specific")} className="accent-blue-600" />
                <span className="text-sm text-gray-700">Specific Branch</span>
              </label>
            </div>
            {branchScope === "specific" && (
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="mt-2.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-400">— Select a branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-gray-800">{b.branch_name} ({b.brak})</option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleGenerate} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {loading
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
              : <><FaEye /> Preview Report</>}
          </button>
        </div>
      </div>
    </div>
  );
};





// ── Main component ────────────────────────────────────────────────────────────









// ── Main component ────────────────────────────────────────────────────────────

const ComplianceReports = ({ basePath = "/compliance/reports", customersPath = "/compliance/customers" }) => {
  const navigate = useNavigate();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showGenDialog, setShowGenDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/compliance/reports/summary");
      setData(res.data.data);
    } catch {
      setError("Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const goToCustomers = (status = null) =>
    navigate(status ? `${customersPath}?status=${status}` : customersPath);


  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading report data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <FaTimesCircle className="text-rose-400 text-4xl mx-auto mb-3" />
        <p className="text-gray-600 font-medium mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  const { overall, this_month, monthly_trends, yearly_trends, branches, top_uploaders, generated_at, period_label } = data;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FaChartBar className="text-blue-600" /> Account Monitoring Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Period: {period_label} · Generated: {generated_at}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGenDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <FaEye /> Generate Report
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* ── Overall stat cards (clickable → filter customers) ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Status Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={FaUsers}               label="Total Accounts" value={overall.total}       colorBg="bg-blue-600"    onClick={() => goToCustomers()} />
          <StatCard icon={FaCheckCircle}         label="Active"         value={overall.active}      colorBg="bg-emerald-500" onClick={() => goToCustomers("active")}      sub={`${pct(overall.active,overall.total)}% of total`} />
          <StatCard icon={FaBed}                 label="Dormant"        value={overall.dormant}     colorBg="bg-amber-400"   onClick={() => goToCustomers("dormant")}     sub={`${pct(overall.dormant,overall.total)}% of total`} />
          <StatCard icon={FaTimesCircle}         label="Closed"         value={overall.closed}      colorBg="bg-rose-500"    onClick={() => goToCustomers("closed")}      sub={`${pct(overall.closed,overall.total)}% of total`} />
          <StatCard icon={FaExclamationTriangle} label="Escheated"      value={overall.escheat}     colorBg="bg-purple-500"  onClick={() => goToCustomers("escheat")}     sub={`${pct(overall.escheat,overall.total)}% of total`} />
          <StatCard icon={MdTrendingUp}          label="Reactivated"    value={overall.reactivated} colorBg="bg-blue-500"    onClick={() => goToCustomers("reactivated")} sub={`${pct(overall.reactivated,overall.total)}% of total`} />
        </div>
      </div>

      {/* ── This Month banner ── */}
      <div className="bg-gradient-to-r from-blue-900 via-[#053161] to-blue-900 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <FaCalendarAlt className="text-blue-300" />
          <h2 className="text-sm font-semibold text-blue-100">This Month — {this_month.label}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label:"Accounts Opened",  value:this_month.opened,         color:"text-emerald-300" },
            { label:"Became Dormant",   value:this_month.became_dormant,  color:"text-amber-300"   },
            { label:"Became Closed",    value:this_month.became_closed,   color:"text-rose-300"    },
            { label:"Became Escheated", value:this_month.became_escheat,  color:"text-purple-300"  },
            { label:"Reactivated",      value:this_month.reactivated,     color:"text-blue-300"    },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
              <p className="text-xs text-blue-200 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row: Monthly bar + Doughnut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FaChartBar className="text-blue-500" /> Monthly Activity (last 12 months)
          </h2>
          <div className="h-60">
            <Bar data={barData(monthly_trends)} options={BAR_OPTIONS()} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FaUsers className="text-blue-500" /> Status Distribution
          </h2>
          <div className="h-60">
            <Doughnut data={donutData(overall)} options={DONUT_OPTIONS} />
          </div>
        </div>
      </div>

      {/* ── Yearly chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaCalendar className="text-blue-500" /> Yearly Activity (last 5 years)
        </h2>
        <div className="h-60">
          <Bar data={barData(yearly_trends)} options={BAR_OPTIONS(true)} />
        </div>
      </div>

      {/* ── Top uploaders + Overall progress bars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top uploaders */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FaUpload className="text-blue-500" /> Top Uploaders
            <span className="text-xs text-gray-400 font-normal ml-auto">by customers uploaded</span>
          </h2>
          <div className="space-y-2.5">
            {(top_uploaders ?? []).slice(0, 10).map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6">
                  {i < 3
                    ? <FaMedal className={`w-4 h-4 ${i===0?"text-amber-400":i===1?"text-gray-400":"text-orange-400"}`} />
                    : <span className="text-[11px] text-gray-300 font-bold">{i+1}</span>}
                </div>
                <span className="text-xs text-gray-700 flex-1 truncate font-medium">{u.name}</span>
                <div className="flex gap-2 text-[11px]">
                  <span className="text-emerald-600 font-medium">{u.active}A</span>
                  <span className="text-amber-600">{u.dormant}D</span>
                  <span className="text-rose-600">{u.closed}C</span>
                </div>
                <div className="w-20">
                  <ProgressBar value={u.total} total={top_uploaders[0]?.total ?? 1} color="bg-blue-400" thin />
                </div>
                <span className="text-xs font-bold text-gray-800 w-8 text-right">{fmt(u.total)}</span>
              </div>
            ))}
            {(!top_uploaders || top_uploaders.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-4">No upload data available.</p>
            )}
          </div>
        </div>

        {/* Overall progress bars */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Status Breakdown</h2>
          <div className="space-y-3">
            {["active","dormant","closed","escheat","reactivated"].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 shrink-0">{STATUS_META[s].label}</span>
                <div className="flex-1">
                  <ProgressBar value={overall[s]} total={overall.total} color={STATUS_META[s].bar} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-16 text-right">{fmt(overall[s])}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Total accounts</span>
            <span className="font-bold text-gray-800">{fmt(overall.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Branch cards (clickable) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FaBuilding className="text-blue-500" /> Branch Overview
          </h2>
          <span className="text-xs text-gray-400">Excluding Head Office · click a card for branch KPI</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.brak}
              branch={branch}
              onClick={() => navigate(`${basePath}/branch/${branch.id}`)}
            />
          ))}
        </div>
      </div>

      {/* ── Generate report dialog ── */}
      {showGenDialog && (
        <GenerateReportDialog
          branches={branches ?? []}
          onClose={() => setShowGenDialog(false)}
          basePath={basePath}
        />
      )}

    </div>
  );
};

export default ComplianceReports;
