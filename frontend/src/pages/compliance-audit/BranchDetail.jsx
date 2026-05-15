import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  FaBuilding, FaUsers, FaCheckCircle, FaBed, FaTimesCircle,
  FaExclamationTriangle, FaCalendarAlt, FaChartBar, FaUpload,
  FaMedal, FaArrowLeft, FaSearch, FaIdCard,
} from "react-icons/fa";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { MdRefresh } from "react-icons/md";
import api from "../../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  active:      { label: "Active",      bar: "bg-emerald-500", hex: "#10b981", badge: "bg-emerald-50 text-emerald-700 border-emerald-200"  },
  dormant:     { label: "Dormant",     bar: "bg-amber-400",   hex: "#f59e0b", badge: "bg-amber-50 text-amber-700 border-amber-200"        },
  closed:      { label: "Closed",      bar: "bg-rose-500",    hex: "#f43f5e", badge: "bg-rose-50 text-rose-700 border-rose-200"           },
  escheat:     { label: "Escheated",   bar: "bg-purple-500",  hex: "#8b5cf6", badge: "bg-purple-50 text-purple-700 border-purple-200"     },
  reactivated: { label: "Reactivated", bar: "bg-blue-500",    hex: "#3b82f6", badge: "bg-blue-50 text-blue-700 border-blue-200"           },
};

const STATUS_FILTERS = ["all", "active", "dormant", "closed", "escheat", "reactivated"];

const fmt  = (n) => (n ?? 0).toLocaleString();
const pct  = (p, t) => (t > 0 ? Math.round((p / t) * 100) : 0);
const date = (d) => (d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—");

// ── helpers ───────────────────────────────────────────────────────────────────

const ProgressBar = ({ value, total, color }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct(value, total)}%` }} />
    </div>
    <span className="text-xs text-gray-400 w-8 text-right">{pct(value, total)}%</span>
  </div>
);

const KPICard = ({ icon: Icon, label, value, colorBg, sub }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
    <div className={`w-11 h-11 rounded-xl ${colorBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-none mt-0.5">{fmt(value)}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  </div>
);

// ── main page ─────────────────────────────────────────────────────────────────

const BranchDetail = ({ basePath = "/compliance/reports" }) => {
  const { branchId } = useParams();
  const navigate     = useNavigate();

  // KPI state
  const [kpi, setKpi]           = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Customer list state
  const [customers, setCustomers]   = useState([]);
  const [meta, setMeta]             = useState(null);
  const [custLoading, setCustLoading] = useState(true);
  const [custError, setCustError]   = useState(null);
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Load KPI
  const loadKpi = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await api.get(`/compliance/reports/branch/${branchId}`);
      setKpi(res.data.data);
    } finally {
      setKpiLoading(false);
    }
  }, [branchId]);

  // Load customers
  const loadCustomers = useCallback(async () => {
    setCustLoading(true);
    setCustError(null);
    try {
      const params = { branch_id: branchId, per_page: 15, page };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get("/customers", { params });
      // Laravel paginator puts pagination fields at the top level (not in res.data.meta)
      setCustomers(res.data.data ?? []);
      setMeta(res.data ?? null);
    } catch {
      setCustError("Failed to load customers.");
      setCustomers([]);
    } finally {
      setCustLoading(false);
    }
  }, [branchId, page, statusFilter, search]);

  useEffect(() => { loadKpi(); }, [loadKpi]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);
  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  // ── Chart data ─────────────────────────────────────────────────────────────

  const monthlyBar = kpi ? {
    labels: kpi.monthly_trends.map((m) => m.label),
    datasets: [
      { label: "Opened",         data: kpi.monthly_trends.map((m) => m.opened),      backgroundColor: "#10b981", borderRadius: 4 },
      { label: "Became Dormant", data: kpi.monthly_trends.map((m) => m.dormant),     backgroundColor: "#f59e0b", borderRadius: 4 },
      { label: "Became Closed",  data: kpi.monthly_trends.map((m) => m.closed),      backgroundColor: "#f43f5e", borderRadius: 4 },
      { label: "Escheated",      data: kpi.monthly_trends.map((m) => m.escheat),     backgroundColor: "#8b5cf6", borderRadius: 4 },
    ],
  } : null;

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12 } }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
    },
  };

  const donutChart = kpi ? {
    labels: Object.values(STATUS_META).map((s) => s.label),
    datasets: [{
      data: ["active","dormant","closed","escheat","reactivated"].map((k) => kpi.overall[k] ?? 0),
      backgroundColor: Object.values(STATUS_META).map((s) => s.hex),
      borderWidth: 2, borderColor: "#fff",
    }],
  } : null;

  const donutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } },
      tooltip: { callbacks: { label: (ctx) => {
        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
        return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${total > 0 ? Math.round(ctx.parsed/total*100) : 0}%)`;
      }}},
    },
  };

  const branch = kpi?.branch;
  const o      = kpi?.overall;

  return (
    <div className="space-y-5 pb-10">

      {/* ── Back + Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(basePath)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700 transition-colors"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
          Back to Reports
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-400">Branch Detail</span>
      </div>

      {kpiLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !kpi ? (
        <div className="text-center py-16 text-gray-400">Failed to load branch data.</div>
      ) : (
        <>
          {/* Branch title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <FaBuilding className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{branch.branch_name}</h1>
              <p className="text-sm text-gray-400">Branch Code: {branch.brak} &nbsp;·&nbsp; Branch KPI Report</p>
            </div>
            <button onClick={loadKpi} className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-1.5">
              <MdRefresh /> Refresh
            </button>
          </div>

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <KPICard icon={FaUsers}               label="Total Accounts"    value={o.total}             colorBg="bg-blue-600"    />
            <KPICard icon={FaCheckCircle}          label="Active"            value={o.active}            colorBg="bg-emerald-500" sub={`${o.active_pct}%`} />
            <KPICard icon={FaBed}                  label="Dormant"           value={o.dormant}           colorBg="bg-amber-400"   sub={`${pct(o.dormant,o.total)}%`} />
            <KPICard icon={FaTimesCircle}           label="Closed"            value={o.closed}            colorBg="bg-rose-500"    sub={`${pct(o.closed,o.total)}%`} />
            <KPICard icon={FaExclamationTriangle}  label="Escheated"         value={o.escheat}           colorBg="bg-purple-500"  sub={`${pct(o.escheat,o.total)}%`} />
            <KPICard icon={FaCalendarAlt}           label="Opened This Month" value={o.opened_this_month} colorBg="bg-teal-500"    />
            <KPICard icon={FaIdCard}               label="Reactivated"       value={o.reactivated}       colorBg="bg-slate-500"   sub={`${pct(o.reactivated,o.total)}%`} />
          </div>

          {/* ── Status distribution bars ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Status Distribution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
              {["active","dormant","closed","escheat","reactivated"].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{STATUS_META[s].label}</span>
                  <div className="flex-1"><ProgressBar value={o[s]} total={o.total} color={STATUS_META[s].bar} /></div>
                  <span className="text-xs font-semibold text-gray-700 w-12 text-right">{fmt(o[s])}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly bar */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FaChartBar className="text-blue-500" /> Monthly Activity (last 12 months)
              </h2>
              <div className="h-56">{monthlyBar && <Bar data={monthlyBar} options={barOptions} />}</div>
            </div>
            {/* Doughnut */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Status Split</h2>
              <div className="h-56">{donutChart && <Doughnut data={donutChart} options={donutOptions} />}</div>
            </div>
          </div>

          {/* ── Monthly trends table ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-500 w-3.5 h-3.5" />
              <h2 className="text-sm font-semibold text-gray-700">Monthly Status Count</h2>
              <span className="text-xs text-gray-400 ml-auto">Last 12 months</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Month</th>
                    <th className="px-3 py-2.5 text-center text-emerald-600">Opened</th>
                    <th className="px-3 py-2.5 text-center text-amber-600">Became Dormant</th>
                    <th className="px-3 py-2.5 text-center text-rose-600">Became Closed</th>
                    <th className="px-3 py-2.5 text-center text-purple-600">Escheated</th>
                    <th className="px-3 py-2.5 text-center text-blue-600">Reactivated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kpi.monthly_trends.map((m) => (
                    <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-gray-700">{m.label}</td>
                      <td className="px-3 py-2 text-center">
                        {m.opened > 0 ? <span className="text-emerald-700 font-semibold">+{m.opened}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.dormant > 0 ? <span className="text-amber-600">{m.dormant}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.closed > 0 ? <span className="text-rose-600">{m.closed}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.escheat > 0 ? <span className="text-purple-600">{m.escheat}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.reactivated > 0 ? <span className="text-blue-600">{m.reactivated}</span> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Top uploaders ── */}
          {kpi.top_uploaders?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FaUpload className="text-blue-500" /> Top Uploaders in this Branch
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {kpi.top_uploaders.map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 text-center">
                      {i < 3
                        ? <FaMedal className={`w-4 h-4 mx-auto ${i===0?"text-amber-400":i===1?"text-gray-400":"text-orange-400"}`} />
                        : <span className="text-[11px] text-gray-300 font-bold">{i+1}</span>}
                    </div>
                    <span className="text-xs text-gray-700 flex-1 truncate">{u.name}</span>
                    <div className="w-24">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-blue-400 transition-all"
                          style={{ width: `${pct(u.total, kpi.top_uploaders[0]?.total ?? 1)}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-800 w-6 text-right">{u.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Customer list ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <FaUsers className="text-blue-500 w-3.5 h-3.5" />
            <h2 className="text-sm font-semibold text-gray-700">Customer List</h2>
            {meta && <span className="text-xs text-gray-400">({fmt(meta.total)} total)</span>}
          </div>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 sm:ml-auto">
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search customer…"
                className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
            <button type="submit" className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Search</button>
            {search && (
              <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }}
                className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">Clear</button>
            )}
          </form>
        </div>

        {/* Status filter tabs */}
        <div className="px-4 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? s === "all"
                    ? "bg-blue-600 text-white"
                    : `${STATUS_META[s]?.badge} border`
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s === "all" ? "All" : STATUS_META[s]?.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Name / Account No.</th>
                <th className="px-3 py-2.5 text-center">Type</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-center">Date Opened</th>
                <th className="px-4 py-2.5 text-left">Uploaded By</th>
                <th className="px-3 py-2.5 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {custLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : custError ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-rose-400 text-xs">{custError}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">No customers found.</td>
                </tr>
              ) : (
                customers.map((c) => {
                  const sm = STATUS_META[c.status] ?? STATUS_META.active;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-800 truncate max-w-[180px]">{c.full_name}</div>
                        <div className="text-gray-400 text-[10px]">{c.account_no ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{c.account_type}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sm.badge}`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-500">{date(c.date_opened)}</td>
                      <td className="px-4 py-2.5 text-gray-500 truncate max-w-[140px]">
                        {c.uploader?.full_name ?? c.uploaded_by ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Link
                          to={`/compliance/customers/${c.id}/view`}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="View customer"
                        >
                          <HiOutlineChevronRight className="w-4 h-4 mx-auto" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {meta.current_page} of {meta.last_page} &nbsp;·&nbsp; {fmt(meta.total)} records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <HiOutlineChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                const start = Math.max(1, Math.min(meta.current_page - 2, meta.last_page - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      p === meta.current_page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page === meta.last_page}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <HiOutlineChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchDetail;
