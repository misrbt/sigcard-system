import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import {
  HiOutlineCheckCircle,
  HiOutlineMoon,
  HiOutlineExclamation,
  HiOutlineLockClosed,
  HiOutlineRefresh,
  HiOutlineUsers,
  HiOutlineChevronRight,
  HiOutlineArrowRight,
  HiOutlineTrendingUp,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineOfficeBuilding,
  HiOutlineCalendar,
  HiOutlineX,
  HiOutlineArrowNarrowUp,
  HiOutlineArrowNarrowDown,
  HiOutlineMinusSm,
  HiOutlineChevronLeft,
} from "react-icons/hi";

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:      { label: "Active",      icon: HiOutlineCheckCircle, color: "#10b981", gradient: "from-emerald-500 to-green-600",  bg: "bg-emerald-50",  text: "text-emerald-700", bar: "bg-emerald-500" },
  dormant:     { label: "Dormant",     icon: HiOutlineMoon,        color: "#f59e0b", gradient: "from-amber-500 to-yellow-600",   bg: "bg-amber-50",    text: "text-amber-700",  bar: "bg-amber-500"  },
  escheat:     { label: "Escheat",     icon: HiOutlineExclamation, color: "#f97316", gradient: "from-orange-500 to-amber-600",   bg: "bg-orange-50",   text: "text-orange-700", bar: "bg-orange-500" },
  closed:      { label: "Closed",      icon: HiOutlineLockClosed,  color: "#ef4444", gradient: "from-red-500 to-rose-600",       bg: "bg-red-50",      text: "text-red-700",    bar: "bg-red-500"    },
  reactivated: { label: "Reactivated", icon: HiOutlineCheckCircle, color: "#6366f1", gradient: "from-indigo-500 to-violet-600",  bg: "bg-indigo-50",   text: "text-indigo-700", bar: "bg-indigo-500" },
};
const STATUSES    = ["active", "dormant", "escheat", "closed", "reactivated"];
const STACK_ORDER = ["active", "reactivated", "dormant", "escheat", "closed"];

const TYPE_CFG = {
  Individual: { color: "#3b82f6", bg: "bg-blue-50",    text: "text-blue-700",   bar: "bg-blue-500"   },
  Joint:      { color: "#8b5cf6", bg: "bg-purple-50",  text: "text-purple-700", bar: "bg-purple-500" },
  Corporate:  { color: "#0ea5e9", bg: "bg-sky-50",     text: "text-sky-700",    bar: "bg-sky-500"    },
};

const RISK_CFG = {
  "Low Risk":    { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  "Medium Risk": { bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500"  },
  "High Risk":   { bg: "bg-red-50",     text: "text-red-700",     bar: "bg-red-500"    },
};

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 200, strokeWidth = 36 }) => {
  const r    = (size - strokeWidth) / 2;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumPct = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      ) : (
        segments.map((seg) => {
          const pct    = seg.value / total;
          const dash   = pct * circ;
          const offset = -(cumPct * circ);
          cumPct += pct;
          return (
            <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset} strokeLinecap="butt"
            />
          );
        })
      )}
    </svg>
  );
};

// ── Stacked Bar Chart — fills full container width via viewBox ────────────────
const StackedBarChart = ({ data, onSelect, selectedKey, getKey, getLabels }) => {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const VW  = 1000;
  const H   = 140;
  const PAD = 8;
  const gap = data.length <= 5 ? 24 : data.length <= 8 ? 18 : data.length <= 12 ? 14 : 10;
  const barW = (VW - PAD * 2 - (data.length - 1) * gap) / Math.max(data.length, 1);

  const computeSegments = (d) => {
    let yPos = H;
    return STACK_ORDER.map((status) => {
      const count = d[status] || 0;
      const segH  = maxVal > 0 ? (count / maxVal) * H : 0;
      yPos -= segH;
      return { status, count, segH, y: yPos };
    });
  };

  return (
    <svg viewBox={`0 -10 ${VW} ${H + 52}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {data.map((d, i) => {
        const key        = getKey(d);
        const [l1, l2]   = getLabels(d);
        const x          = PAD + i * (barW + gap);
        const isSelected = selectedKey === key;
        const totalBarH  = maxVal > 0 ? (d.total / maxVal) * H : 0;
        const segments   = computeSegments(d);
        return (
          <g key={key} onClick={() => onSelect(isSelected ? null : key)} style={{ cursor: "pointer" }}>
            {isSelected && (
              <rect x={x - 6} y={-8} width={barW + 12} height={H + 10}
                rx={10} fill="#3b82f6" fillOpacity={0.07}
                stroke="#3b82f6" strokeWidth={2} strokeOpacity={0.3}
              />
            )}
            <rect x={x} y={0} width={barW} height={H} rx={6} fill="#f1f5f9" />
            {segments.map(({ status, count, segH, y }) =>
              count > 0 ? (
                <rect key={status} x={x} y={y} width={barW} height={segH}
                  fill={STATUS_CFG[status].color} opacity={isSelected ? 1 : 0.82}
                />
              ) : null
            )}
            {d.total > 0 && (() => {
              const top = segments.find((s) => s.count > 0);
              return top ? (
                <rect x={x} y={top.y} width={barW} height={Math.min(top.segH, 8)} rx={4} ry={4}
                  fill={STATUS_CFG[top.status].color} opacity={isSelected ? 1 : 0.82}
                />
              ) : null;
            })()}
            {d.total > 0 && (
              <text x={x + barW / 2} y={Math.max(H - totalBarH - 6, 10)}
                textAnchor="middle" fontSize={13} fontWeight={700}
                fill={isSelected ? "#1d4ed8" : "#475569"}
              >
                {d.total}
              </text>
            )}
            <text x={x + barW / 2} y={H + 20} textAnchor="middle" fontSize={13}
              fill={isSelected ? "#3b82f6" : "#94a3b8"} fontWeight={isSelected ? 700 : 500}
            >
              {l1}
            </text>
            {l2 && (
              <text x={x + barW / 2} y={H + 36} textAnchor="middle" fontSize={11}
                fill={isSelected ? "#93c5fd" : "#cbd5e1"} fontWeight={isSelected ? 600 : 400}
              >
                {l2}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const Skeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-16 bg-slate-200 rounded-2xl" />
    <div className="h-72 bg-slate-200 rounded-2xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="h-80 bg-slate-200 rounded-2xl" />
    <div className="h-48 bg-slate-200 rounded-2xl" />
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const NOW_YEAR = new Date().getFullYear();

const StatusTracking = () => {
  const { hasPermission } = useAuth();
  const navigate          = useNavigate();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Period controls
  const [periodMode,    setPeriodMode]    = useState("monthly");      // "monthly" | "yearly"
  const [selectedYear,  setSelectedYear]  = useState(NOW_YEAR);
  const [monthlyView,   setMonthlyView]   = useState("enrollments");  // "enrollments" | "transitions"
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const canView = hasPermission("view-customers");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectedPeriod(null);
    try {
      const res = await api.get("/user/dashboard");
      setData(res.data?.data ?? res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data (all before early return) ───────────────────────────────
  const summary             = data?.summary             ?? null;
  const accountTypes        = data?.account_types       ?? {};
  const riskLevels          = data?.risk_levels         ?? {};
  const monthlyByStatus     = data?.monthly_by_status   ?? [];
  const monthlyTransitions  = data?.monthly_transitions ?? [];
  const yearlyByStatus      = data?.yearly_by_status    ?? [];
  const yearlyTransitions   = data?.yearly_transitions  ?? [];
  const total               = summary?.total_customers  ?? 0;

  // Available years from monthly data
  const availableYears = useMemo(() => {
    const src = monthlyView === "enrollments" ? monthlyByStatus : monthlyTransitions;
    const years = [...new Set(src.map((d) => parseInt(d.month_key.split("-")[0], 10)))].sort();
    return years.length ? years : [NOW_YEAR];
  }, [monthlyByStatus, monthlyTransitions, monthlyView]);

  const minYear = availableYears[0];
  const maxYear = availableYears[availableYears.length - 1];

  // What to display in the chart
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const displayData = useMemo(() => {
    if (periodMode === "yearly") {
      return monthlyView === "enrollments" ? yearlyByStatus : yearlyTransitions;
    }
    const src = monthlyView === "enrollments" ? monthlyByStatus : monthlyTransitions;
    // Always build all 12 months for the selected year; fill missing ones with zeros
    return MONTH_NAMES.map((name, idx) => {
      const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
      return src.find((d) => d.month_key === monthKey) ?? {
        month: `${name} ${selectedYear}`,
        month_key: monthKey,
        active: 0, dormant: 0, escheat: 0, closed: 0, reactivated: 0, total: 0,
      };
    });
  }, [periodMode, selectedYear, monthlyView, monthlyByStatus, monthlyTransitions, yearlyByStatus, yearlyTransitions]);

  const selectedPeriodData = useMemo(() =>
    displayData.find((d) => (d.month_key ?? d.year_key) === selectedPeriod) ?? null,
    [selectedPeriod, displayData]
  );

  const prevPeriodData = useMemo(() => {
    if (!selectedPeriod) return null;
    const idx = displayData.findIndex((d) => (d.month_key ?? d.year_key) === selectedPeriod);
    return idx > 0 ? displayData[idx - 1] : null;
  }, [selectedPeriod, displayData]);

  const hasMontlyTransitionsData = monthlyTransitions.some((m) => m.total > 0);

  const navigatePeriod = (dir) => {
    if (!selectedPeriod) return;
    const idx  = displayData.findIndex((d) => (d.month_key ?? d.year_key) === selectedPeriod);
    const next = displayData[idx + dir];
    if (next) setSelectedPeriod(next.month_key ?? next.year_key);
  };

  // ── Chart helpers ─────────────────────────────────────────────────────────
  const getKey    = (d) => d.month_key ?? d.year_key;
  const getLabels = (d) => {
    if (d.year_key) return [d.year_key, ""];
    const parts = (d.month ?? "").split(" ");
    return [parts[0] ?? "", parts[1] ?? ""];
  };

  if (loading) return (
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      <Skeleton />
    </div>
  );

  const chartSegments = STATUSES
    .filter((key) => (summary?.[key] ?? 0) > 0)
    .map((key) => ({ key, value: summary[key], color: STATUS_CFG[key].color }));

  const totalAccounts = Object.values(accountTypes).reduce((s, v) => s + v, 0);
  const totalRisk     = Object.values(riskLevels).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Status Tracking</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live breakdown of all enrolled customer account statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
          {canView && (
            <button onClick={() => navigate("/user/customers")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-[#1877F2] text-white hover:bg-blue-600 transition-colors shadow-sm"
            >
              <HiOutlineUsers className="w-4 h-4" /> View All Customers
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Donut Chart + Legend ─────────────────────────────────────────────── */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Status Distribution</h2>
              <p className="text-xs text-slate-400">Proportional share of each status across all enrolled accounts</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-extrabold text-slate-900">{total.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total Customers</p>
            </div>
          </div>
          <div className="p-6 flex flex-col lg:flex-row items-center gap-8">
            <div className="relative flex-shrink-0">
              <DonutChart segments={chartSegments} size={220} strokeWidth={40} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-slate-900">{total.toLocaleString()}</span>
                <span className="text-xs font-semibold text-slate-400 mt-0.5">Enrolled</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-3">
              {STATUSES.map((key, i) => {
                const cfg   = STATUS_CFG[key];
                const Icon  = cfg.icon;
                const value = summary[key] ?? 0;
                const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                return (
                  <motion.div key={key}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.06 }}
                    onClick={canView ? () => navigate("/user/customers") : undefined}
                    className={`flex items-center gap-4 p-3 rounded-xl border border-transparent transition-all ${canView ? "hover:bg-slate-50 hover:border-slate-200 cursor-pointer" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-800">{cfg.label}</span>
                        <span className="text-sm font-bold text-slate-900">{value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <motion.div className={`${cfg.bar} h-full rounded-full`}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${cfg.text} w-10 text-right flex-shrink-0`}>{pct}%</span>
                      </div>
                    </div>
                    {canView && <HiOutlineChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Status Summary Cards ──────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATUSES.map((key, i) => {
            const cfg   = STATUS_CFG[key];
            const Icon  = cfg.icon;
            const value = summary[key] ?? 0;
            const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
            return (
              <motion.div key={key}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                whileHover={canView ? { y: -3, boxShadow: "0 12px 24px -6px rgba(0,0,0,0.12)" } : {}}
                onClick={canView ? () => navigate("/user/customers") : undefined}
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${canView ? "cursor-pointer" : ""}`}
              >
                <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{pct}%</span>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900">{value.toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{cfg.label}</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div className={`${cfg.bar} h-full rounded-full`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.4 + i * 0.07, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Monthly / Yearly Status Tracking ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <HiOutlineCalendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Status Tracking</h2>
              <p className="text-xs text-slate-400">
                {monthlyView === "enrollments" ? "New enrollments by status" : "Status transitions"}
                {periodMode === "monthly" ? ` · ${selectedYear}` : " · All Years"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Enrollments / Status Changes */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              {[
                { key: "enrollments", label: "Enrollments" },
                { key: "transitions", label: "Status Changes", disabled: !hasMontlyTransitionsData },
              ].map(({ key, label, disabled }) => (
                <button key={key}
                  onClick={() => { if (!disabled) { setMonthlyView(key); setSelectedPeriod(null); } }}
                  title={disabled ? "No status-change records yet" : undefined}
                  className={`px-3 py-1.5 transition-colors ${
                    monthlyView === key
                      ? "bg-blue-600 text-white"
                      : disabled
                        ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Monthly / Yearly */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              {["monthly", "yearly"].map((m) => (
                <button key={m}
                  onClick={() => { setPeriodMode(m); setSelectedPeriod(null); }}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    periodMode === m ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Year navigator — only in monthly mode */}
            {periodMode === "monthly" && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
                <button onClick={() => { setSelectedYear((y) => y - 1); setSelectedPeriod(null); }}
                  disabled={selectedYear <= minYear}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <HiOutlineChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 w-10 text-center tabular-nums">{selectedYear}</span>
                <button onClick={() => { setSelectedYear((y) => y + 1); setSelectedPeriod(null); }}
                  disabled={selectedYear >= maxYear}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <HiOutlineChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="px-5 pt-4 pb-2">
          {displayData.length === 0 || displayData.every((d) => d.total === 0) ? (
            <div className="py-10 text-center text-slate-400">
              <HiOutlineTrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No data for this period.</p>
            </div>
          ) : (
            <StackedBarChart
              data={displayData}
              onSelect={setSelectedPeriod}
              selectedKey={selectedPeriod}
              getKey={getKey}
              getLabels={getLabels}
            />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
            {STATUSES.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUS_CFG[key].color }} />
                <span className="text-xs text-slate-500 font-medium">{STATUS_CFG[key].label}</span>
              </div>
            ))}
            <span className="text-xs text-slate-300 ml-2 hidden sm:inline">— click a bar to inspect</span>
          </div>
        </div>

        {/* ── Selected Period Detail ── */}
        <AnimatePresence>
          {selectedPeriodData && (
            <motion.div
              key={selectedPeriod}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="border-t border-blue-100 bg-blue-50/40 overflow-hidden"
            >
              <div className="px-5 pt-4 pb-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigatePeriod(-1)}
                      disabled={displayData.findIndex((d) => getKey(d) === selectedPeriod) === 0}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <HiOutlineChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <span className="text-sm font-extrabold text-slate-800">
                        {selectedPeriodData.month ?? selectedPeriodData.year}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {monthlyView === "enrollments" ? "New enrollments" : "Status transitions"}
                      </span>
                    </div>
                    <button onClick={() => navigatePeriod(1)}
                      disabled={displayData.findIndex((d) => getKey(d) === selectedPeriod) === displayData.length - 1}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <HiOutlineChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-slate-900">{selectedPeriodData.total.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total</p>
                    </div>
                    <button onClick={() => setSelectedPeriod(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                    >
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {STATUSES.map((key) => {
                    const cfg   = STATUS_CFG[key];
                    const Icon  = cfg.icon;
                    const count = selectedPeriodData[key] ?? 0;
                    const pct   = selectedPeriodData.total > 0
                      ? ((count / selectedPeriodData.total) * 100).toFixed(1)
                      : "0.0";
                    const delta = prevPeriodData != null ? count - (prevPeriodData[key] ?? 0) : null;
                    return (
                      <div key={key} className="rounded-xl p-3 bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          {delta !== null && (
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              delta > 0 ? "bg-emerald-50 text-emerald-600" : delta < 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"
                            }`}>
                              {delta > 0 ? <HiOutlineArrowNarrowUp className="w-3 h-3" />
                                : delta < 0 ? <HiOutlineArrowNarrowDown className="w-3 h-3" />
                                : <HiOutlineMinusSm className="w-3 h-3" />}
                              {Math.abs(delta)}
                            </div>
                          )}
                        </div>
                        <p className="text-xl font-extrabold text-slate-900">{count.toLocaleString()}</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{cfg.label}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden mr-2">
                            <div className={`${cfg.bar} h-full rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold ${cfg.text} flex-shrink-0`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {prevPeriodData && (
                  <p className="mt-3 text-[11px] text-slate-400 text-center">
                    Compared to{" "}
                    <span className="font-semibold text-slate-500">
                      {prevPeriodData.month ?? prevPeriodData.year}
                    </span>
                    {selectedPeriodData.total !== prevPeriodData.total && (
                      <span className={`ml-1 font-bold ${selectedPeriodData.total > prevPeriodData.total ? "text-emerald-600" : "text-red-500"}`}>
                        ({selectedPeriodData.total > prevPeriodData.total ? "+" : ""}
                        {selectedPeriodData.total - prevPeriodData.total} total)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Account Type Breakdown ────────────────────────────────────────────── */}
      {Object.keys(accountTypes).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <HiOutlineCreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Account Types</h2>
              <p className="text-xs text-slate-400">Distribution by account category</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {Object.entries(accountTypes).map(([type, count], i) => {
              const cfg = TYPE_CFG[type] ?? { bg: "bg-slate-50", text: "text-slate-700", bar: "bg-slate-500" };
              const pct = totalAccounts > 0 ? ((count / totalAccounts) * 100).toFixed(1) : "0.0";
              return (
                <motion.div key={type}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.07 }}
                  onClick={canView ? () => navigate("/user/customers") : undefined}
                  className={`space-y-1.5 ${canView ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>{type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{count.toLocaleString()}</span>
                      <span className={`text-xs font-semibold ${cfg.text}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <motion.div className={`${cfg.bar} h-full rounded-full`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              );
            })}
            {totalAccounts > 0 && (
              <div className="flex w-full h-3 rounded-full overflow-hidden gap-0.5 mt-2">
                {Object.entries(accountTypes).map(([type, count]) => {
                  const cfg = TYPE_CFG[type] ?? { bar: "bg-slate-500" };
                  const pct = (count / totalAccounts) * 100;
                  return pct > 0 ? (
                    <div key={type} className={`${cfg.bar} h-full`} style={{ width: `${pct}%` }} title={`${type}: ${pct.toFixed(1)}%`} />
                  ) : null;
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Risk Level Distribution ───────────────────────────────────────────── */}
      {Object.keys(riskLevels).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Risk Level Distribution</h2>
              <p className="text-xs text-slate-400">Customer risk classifications per BSP guidelines</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["Low Risk", "Medium Risk", "High Risk"].map((level, i) => {
              const cfg   = RISK_CFG[level] ?? { bg: "bg-slate-50", text: "text-slate-600", bar: "bg-slate-400" };
              const count = riskLevels[level] ?? 0;
              const pct   = totalRisk > 0 ? ((count / totalRisk) * 100).toFixed(1) : "0.0";
              return (
                <motion.div key={level}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.07 }}
                  className={`rounded-xl p-4 border ${cfg.bg} border-transparent`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{level}</span>
                    <span className={`text-xs font-bold ${cfg.text}`}>{pct}%</span>
                  </div>
                  <p className={`text-2xl font-extrabold ${cfg.text} mb-2`}>{count.toLocaleString()}</p>
                  <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                    <motion.div className={`${cfg.bar} h-full rounded-full`}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.6 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Portfolio Overview ────────────────────────────────────────────────── */}
      {summary && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
        >
          <h2 className="text-sm font-bold text-slate-800 mb-1">Portfolio Overview</h2>
          <p className="text-xs text-slate-400 mb-4">Stacked distribution across all account statuses</p>
          <div className="flex w-full h-5 rounded-full overflow-hidden gap-0.5 mb-4">
            {STATUSES.map((key) => {
              const cfg = STATUS_CFG[key];
              const pct = total > 0 ? ((summary[key] ?? 0) / total) * 100 : 0;
              return pct > 0 ? (
                <motion.div key={key} className={`${cfg.bar} h-full`}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.65, duration: 0.9, ease: "easeOut" }}
                  title={`${cfg.label}: ${pct.toFixed(1)}%`}
                />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {STATUSES.map((key) => {
              const cfg   = STATUS_CFG[key];
              const value = summary[key] ?? 0;
              const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.bar}`} />
                  <span className="text-xs text-slate-600 font-medium">{cfg.label}</span>
                  <span className={`text-xs font-bold ${cfg.text}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Recent Uploads ───────────────────────────────────────────────────── */}
      {data?.recent_uploads?.length > 0 && canView && (
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <HiOutlineUsers className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Recent Customer Records</h2>
                <p className="text-xs text-slate-400">Latest enrollments in the system</p>
              </div>
            </div>
            <button onClick={() => navigate("/user/customers")}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_uploads.map((c) => {
              const sCfg = STATUS_CFG[c.status];
              return (
                <div key={c.id}
                  onClick={() => navigate(`/user/customers/${c.id}/view`)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                    {(c.full_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{c.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{c.uploaded_at}</span>
                      {c.branch_name && <><span className="text-slate-300">·</span><span className="text-[10px] text-slate-400">{c.branch_name}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">{c.account_type}</span>
                    {sCfg && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sCfg.bg} ${sCfg.text}`}>{c.status}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {!summary && (
        <div className="text-center py-20 text-slate-400">
          <HiOutlineExclamation className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Status data is currently unavailable.</p>
          <button onClick={fetchData} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">Try again</button>
        </div>
      )}

    </div>
  );
};

export default StatusTracking;
