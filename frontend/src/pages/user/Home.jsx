import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import ReactApexChart from "react-apexcharts";
import {
  HiOutlineUpload, HiOutlineUsers, HiOutlineDocumentText,
  HiOutlineCloudUpload, HiOutlineCheckCircle, HiOutlineMoon,
  HiOutlineExclamation, HiOutlineLockClosed, HiOutlineArrowRight,
  HiOutlineOfficeBuilding, HiOutlineChevronRight, HiOutlineEye,
  HiOutlineCalendar, HiOutlineShieldCheck,
  HiOutlineX, HiOutlineChevronLeft,
} from "react-icons/hi";
import { MdFingerprint } from "react-icons/md";

const RISK_CFG = [
  { key: "Low Risk",    label: "Low Risk",    dot: "bg-emerald-500", bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50"  },
  { key: "Medium Risk", label: "Medium Risk", dot: "bg-amber-400",   bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"    },
  { key: "High Risk",   label: "High Risk",   dot: "bg-red-500",     bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50"      },
];

const STATUS_CFG = {
  active:  { label: "Active",  icon: HiOutlineCheckCircle, dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50",  bar: "bg-emerald-500" },
  dormant: { label: "Dormant", icon: HiOutlineMoon,        dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",    bar: "bg-amber-500"   },
  escheat: { label: "Escheat", icon: HiOutlineExclamation, dot: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50",   bar: "bg-orange-500"  },
  closed:  { label: "Closed",  icon: HiOutlineLockClosed,  dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",      bar: "bg-red-400"     },
};

const STAT_COLORS = {
  cyan:    { icon: "bg-cyan-600",    accent: "bg-cyan-100"    },
  teal:    { icon: "bg-teal-600",    accent: "bg-teal-100"    },
  orange:  { icon: "bg-orange-500",  accent: "bg-orange-100"  },
  emerald: { icon: "bg-emerald-600", accent: "bg-emerald-100" },
};

// ── Detail Drawer (Account Status / Risk Level by month) ─────────────────────
const DetailDrawer = ({ type, monthlyStatus, monthlyRisk, onClose }) => {
  const now     = new Date();
  const curKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows    = type === "status" ? (monthlyStatus ?? []) : (monthlyRisk ?? []);
  const [selKey, setSelKey] = useState(curKey);

  const idx     = rows.findIndex(r => r.month_key === selKey);
  const safeIdx = idx === -1 ? rows.length - 1 : idx;
  const row     = rows[safeIdx] ?? null;

  const goPrev = () => { if (safeIdx > 0) setSelKey(rows[safeIdx - 1].month_key); };
  const goNext = () => { if (safeIdx < rows.length - 1) setSelKey(rows[safeIdx + 1].month_key); };

  const entries = type === "status"
    ? Object.entries(STATUS_CFG).map(([key, cfg]) => ({
        key, label: cfg.label, dot: cfg.dot, bar: cfg.bar, value: row?.[key] ?? 0,
      }))
    : RISK_CFG.map(({ key, label, dot, bar }) => ({
        key, label, dot, bar, value: row?.[key] ?? 0,
      }));

  const total = entries.reduce((s, e) => s + e.value, 0);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <motion.div
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">
              {type === "status" ? "Account Status" : "Customer Risk Level"}
            </h3>
            <p className="text-xs text-blue-300/70 mt-0.5">Monthly breakdown</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={safeIdx === 0}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <HiOutlineChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">{row?.month ?? "—"}</p>
            <p className="text-[10px] text-gray-400">{total.toLocaleString()} total</p>
          </div>
          <button
            onClick={goNext}
            disabled={safeIdx === rows.length - 1}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <HiOutlineChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Month quick-pick pills */}
        <div className="flex gap-1.5 px-6 py-3 overflow-x-auto border-b border-gray-100 flex-shrink-0 scrollbar-none">
          {rows.map((r) => (
            <button
              key={r.month_key}
              onClick={() => setSelKey(r.month_key)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors whitespace-nowrap ${
                r.month_key === selKey
                  ? "bg-[#487FFF] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {r.month}
            </button>
          ))}
        </div>

        {/* Breakdown rows */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {entries.map(({ key, label, dot, bar, value }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{value.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    key={`${key}-${selKey}`}
                    className={`h-full rounded-full ${bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer close button */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const Skeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-24 bg-gray-100 rounded-2xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-8 space-y-6">
        <div className="h-64 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
      <div className="xl:col-span-4 space-y-6">
        <div className="h-72 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  </div>
);

const Home = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [detailDrawer, setDetailDrawer] = useState(null);

  const firstName = user?.firstname ?? user?.full_name?.split(" ")[0] ?? "there";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const todayLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/user/dashboard");
      setData(res.data?.data ?? res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      <Skeleton />
    </div>
  );

  const canUpload        = hasPermission("create-customers");
  const canView          = hasPermission("view-customers");
  const summary          = data?.summary ?? null;
  const uploads          = data?.monthly_uploads ?? [];
  const riskLevels        = data?.risk_levels ?? null;
  const monthlyByStatus   = data?.monthly_by_status ?? [];
  const monthlyRiskLevels = data?.monthly_risk_levels ?? [];

  const statCards = summary ? [
    { label: "Total Customers",  value: summary.total_customers, color: "cyan",    path: canView ? "/user/customers" : null,       icon: HiOutlineUsers        },
    { label: "Total Documents",  value: summary.total_documents, color: "teal",    path: canView ? "/user/customers" : null,       icon: HiOutlineDocumentText },
    { label: "Today's Uploads",  value: summary.today_uploads,   color: "orange",  path: canView ? "/user/customers" : null,       icon: HiOutlineCloudUpload  },
    { label: "Active Customers", value: summary.active,          color: "emerald", path: canView ? "/user/status-tracking" : null, icon: HiOutlineCheckCircle  },
  ] : [];

  const quickActions = [
    canUpload && {
      label: "Upload Customer Record",
      description: "Add a new customer and attach their signature card documents.",
      icon: HiOutlineUpload,
      from: "#487FFF", to: "#8B5CF6",
      action: () => navigate("/user/upload"),
    },
    canView && {
      label: "Customer Profiles",
      description: "Browse and search all existing customer records.",
      icon: HiOutlineUsers,
      from: "#0f172a", to: "#1e3a5f",
      action: () => navigate("/user/customers"),
    },
    canView && {
      label: "Quick Search",
      description: "Search a customer using a thumbmark or fingerprint scan.",
      icon: MdFingerprint,
      from: "#4338ca", to: "#6d28d9",
      action: () => navigate("/user/customers?tab=quick"),
    },
    canView && {
      label: "Status Tracking",
      description: "Monitor and update account statuses — active, dormant, escheat, or closed.",
      icon: HiOutlineCheckCircle,
      from: "#047857", to: "#065f46",
      action: () => navigate("/user/status-tracking"),
    },
  ].filter(Boolean);

  const barOpts = {
    series: [{ name: "Customers Uploaded", data: uploads.map(m => m.count) }],
    colors: ["#487FFF"],
    chart: { type: "bar", height: 200, toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "48%" } },
    dataLabels: { enabled: false },
    grid: { show: true, borderColor: "#F3F4F6", strokeDashArray: 4, position: "back" },
    xaxis: {
      categories: uploads.map(m => m.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#9CA3AF", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { colors: "#9CA3AF", fontSize: "11px" } } },
    legend: { show: false },
    tooltip: { theme: "light" },
  };

  return (
    <>
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6">

      {/* ── Welcome Banner ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-5 shadow-lg">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(ellipse at 80% 50%, #487FFF 0%, transparent 65%)" }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 border border-white/20">
              <HiOutlineShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-300/80 uppercase tracking-widest">{todayLabel}</p>
              <h1 className="text-xl font-bold text-white mt-0.5">
                {getGreeting()}, <span className="text-[#487FFF]">{firstName}</span>!
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Welcome to DIGICUR — digital customer record management portal.
              </p>
            </div>
            {user?.branch?.branch_name && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 self-start sm:self-auto flex-shrink-0">
                <HiOutlineOfficeBuilding className="w-4 h-4 text-blue-300 flex-shrink-0" />
                <span className="text-sm font-semibold text-white">{user.branch.branch_name}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────────── */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, color, path, icon: Icon }, i) => {
            const { icon: iconCls, accent } = STAT_COLORS[color];
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
                onClick={path ? () => navigate(path) : undefined}
                className={`relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-hidden ${path ? "cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-200" : ""}`}
              >
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${accent} opacity-60`} />
                <div className={`w-10 h-10 ${iconCls} text-white flex items-center justify-center rounded-xl text-base mb-3 relative z-10`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-extrabold text-gray-900 text-3xl leading-none mb-1 relative z-10">
                  {value?.toLocaleString() ?? "—"}
                </p>
                <p className="text-sm font-medium text-gray-500 relative z-10">{label}</p>
                {path && (
                  <p className="text-xs text-[#487FFF] font-semibold flex items-center gap-1 mt-2 relative z-10">
                    View <HiOutlineChevronRight className="w-3 h-3" />
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Main Grid: 8 / 4 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left Column ────────────────────────────────────────────────────────── */}
        <div className="xl:col-span-8 space-y-6">

          {/* Monthly Uploads Chart */}
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h6 className="font-bold text-gray-900">Monthly Customer Uploads</h6>
                  <p className="text-xs text-gray-400 mt-0.5">Last {uploads.length} months</p>
                </div>
                <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <HiOutlineCalendar className="w-4 h-4 text-[#487FFF]" />
                </span>
              </div>
              <div className="px-4 py-4">
                <ReactApexChart options={barOpts} series={barOpts.series} type="bar" height={200} />
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
              <div className={`grid gap-4 ${
                quickActions.length === 1 ? "grid-cols-1"
                : quickActions.length === 2 ? "grid-cols-1 sm:grid-cols-2"
                : quickActions.length === 3 ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}>
                {quickActions.map(({ label, description, icon: Icon, from, to, action }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 + i * 0.07 }}
                    whileHover={{ y: -3, boxShadow: "0 14px 30px -8px rgba(0,0,0,0.2)" }}
                    className="group relative overflow-hidden rounded-2xl cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
                    onClick={action}
                  >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, #fff 0%, transparent 55%)" }} />
                    <div className="relative p-5 flex flex-col gap-3 h-full">
                      <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white leading-snug">{label}</h3>
                        <p className="text-xs text-white/65 mt-1 leading-relaxed">{description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white/70 group-hover:text-white group-hover:gap-2.5 transition-all duration-200">
                        Open <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Customer Records */}
          {data?.recent_uploads?.length > 0 && canView && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#487FFF] to-[#8B5CF6]">
                    <HiOutlineCalendar className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h6 className="font-bold text-gray-900">Recent Customer Records</h6>
                    <p className="text-xs text-gray-400">Latest uploads in the system</p>
                  </div>
                </div>
                <Link
                  to="/user/customers"
                  className="text-xs font-semibold text-[#487FFF] hover:underline flex items-center gap-1"
                >
                  View All <HiOutlineChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-3 py-3 w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recent_uploads.slice(0, 6).map(c => {
                      const sCfg = STATUS_CFG[c.status];
                      return (
                        <tr
                          key={c.id}
                          onClick={() => navigate(`/user/customers/${c.id}/view`)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                style={{ background: "linear-gradient(135deg, #487FFF, #8B5CF6)" }}
                              >
                                {(c.full_name?.[0] ?? "?").toUpperCase()}
                              </div>
                              <p className="font-semibold text-gray-800 group-hover:text-[#487FFF] transition-colors text-sm truncate">
                                {c.full_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#487FFF] text-xs font-semibold">
                              {c.account_type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {sCfg && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${sCfg.bg} ${sCfg.text}`}>
                                {c.status}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{c.uploaded_at}</td>
                          <td className="px-3 py-2.5 text-center">
                            <HiOutlineEye className="w-3.5 h-3.5 text-gray-200 group-hover:text-[#487FFF] transition-colors mx-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right Column ───────────────────────────────────────────────────────── */}
        <div className="xl:col-span-4 space-y-6">

          {/* Account Status Breakdown */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => setDetailDrawer("status")}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h6 className="font-bold text-gray-900">Account Status</h6>
                  <p className="text-xs text-gray-400 mt-0.5">Breakdown across all accounts</p>
                </div>
                <span className="text-xs font-semibold text-[#487FFF] flex items-center gap-1">
                  View by month <HiOutlineChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="px-5 py-4 space-y-4">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                  const value = summary[key] ?? 0;
                  const pct   = summary.total_customers > 0
                    ? Math.round((value / summary.total_customers) * 100)
                    : 0;
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{value.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${cfg.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
                {summary.total_customers > 0 && (
                  <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                    {summary.total_customers.toLocaleString()} total accounts on record
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Customer Risk Level */}
          {riskLevels && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => setDetailDrawer("risk")}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h6 className="font-bold text-gray-900">Customer Risk Level</h6>
                  <p className="text-xs text-gray-400 mt-0.5">AML risk classification</p>
                </div>
                <span className="text-xs font-semibold text-[#487FFF] flex items-center gap-1">
                  View by month <HiOutlineChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="px-5 py-4 space-y-4">
                {(() => {
                  const total = Object.values(riskLevels).reduce((s, v) => s + (v ?? 0), 0);
                  return RISK_CFG.map(({ key, label, dot, bar }) => {
                    const value = riskLevels[key] ?? 0;
                    const pct   = total > 0 ? Math.round((value / total) * 100) : 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{value.toLocaleString()}</span>
                            <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
                {summary?.total_customers > 0 && (
                  <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                    Based on {summary.total_customers.toLocaleString()} enrolled customers
                  </p>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </div>

    </div>

    {/* ── Detail Drawer ── */}
    {detailDrawer && (
      <DetailDrawer
        type={detailDrawer}
        monthlyStatus={monthlyByStatus}
        monthlyRisk={monthlyRiskLevels}
        onClose={() => setDetailDrawer(null)}
      />
    )}
    </>
  );
};

export default Home;
