import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import ReactApexChart from "react-apexcharts";
import {
  HiOutlineUpload, HiOutlineUsers, HiOutlineDocumentText,
  HiOutlineCloudUpload, HiOutlineCheckCircle, HiOutlineMoon,
  HiOutlineExclamation, HiOutlineLockClosed, HiOutlineArrowRight,
  HiOutlineOfficeBuilding, HiOutlineChevronRight, HiOutlineEye,
  HiOutlineCalendar, HiOutlineShieldCheck, HiOutlineTrendingUp,
} from "react-icons/hi";
import { MdFingerprint } from "react-icons/md";

const STATUS_CFG = {
  active:  { label: "Active",  icon: HiOutlineCheckCircle, dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", circle: "bg-emerald-600" },
  dormant: { label: "Dormant", icon: HiOutlineMoon,        dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",   circle: "bg-amber-600"   },
  escheat: { label: "Escheat", icon: HiOutlineExclamation, dot: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50",  circle: "bg-orange-600"  },
  closed:  { label: "Closed",  icon: HiOutlineLockClosed,  dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     circle: "bg-red-600"     },
};

const CardWrap = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>{children}</div>
);
const CardHead = ({ children }) => (
  <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">{children}</div>
);
const CardBody = ({ children, className = "" }) => (
  <div className={`px-6 py-5 ${className}`}>{children}</div>
);

const Skeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-24 bg-gray-200 rounded-2xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}</div>
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-8 space-y-6">
        <div className="h-72 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}</div>
      </div>
      <div className="xl:col-span-4 space-y-6">
        <div className="h-56 bg-gray-200 rounded-2xl" />
        <div className="h-56 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  </div>
);

const Home = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

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

  const canUpload = hasPermission("create-customers");
  const canView   = hasPermission("view-customers");
  const summary   = data?.summary ?? null;
  const uploads   = data?.monthly_uploads ?? [];

  // ── Stat cards config ─────────────────────────────────────────────────────
  const statCards = summary ? [
    { label: "Total Customers",  value: summary.total_customers, iconBg: "bg-cyan-600",    gradient: "from-[#f2fdff] to-[#d4f7ff]", path: canView ? "/user/customers" : null,       icon: HiOutlineUsers       },
    { label: "Total Documents",  value: summary.total_documents, iconBg: "bg-teal-600",    gradient: "from-[#f0fdfa] to-[#ccfbf1]", path: null,                                     icon: HiOutlineDocumentText },
    { label: "Today's Uploads",  value: summary.today_uploads,   iconBg: "bg-orange-500",  gradient: "from-[#fff7ed] to-[#ffefdd]", path: canView ? "/user/customers" : null,       icon: HiOutlineCloudUpload  },
    { label: "Active Customers", value: summary.active,          iconBg: "bg-emerald-600", gradient: "from-[#f0fdf4] to-[#dcfce7]", path: canView ? "/user/status-tracking" : null, icon: HiOutlineCheckCircle  },
  ] : [];

  // ── Quick actions ─────────────────────────────────────────────────────────
  const quickActions = [
    canUpload && {
      label: "Upload Customer Record",
      description: "Add a new customer and attach their signature card documents.",
      icon: HiOutlineUpload,
      gradient: "from-[#487FFF] to-[#8B5CF6]",
      action: () => navigate("/user/upload"),
    },
    canView && {
      label: "Customer Profiles",
      description: "Browse and search all existing customer records in the system.",
      icon: HiOutlineUsers,
      gradient: "from-slate-700 to-slate-900",
      action: () => navigate("/user/customers"),
    },
    canView && {
      label: "Quick Search",
      description: "Search a customer using a thumbmark or fingerprint scan.",
      icon: MdFingerprint,
      gradient: "from-indigo-600 to-violet-700",
      action: () => navigate("/user/customers?tab=quick"),
    },
  ].filter(Boolean);

  // ── Chart configs ─────────────────────────────────────────────────────────
  const barOpts = {
    series: [{ name: "Customers Uploaded", data: uploads.map(m => m.count) }],
    colors: ["#487FFF"],
    chart: { type: "bar", height: 220, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    grid: { show: true, borderColor: "#E5E7EB", strokeDashArray: 4, position: "back" },
    xaxis: { categories: uploads.map(m => m.label) },
    legend: { show: false },
  };

  return (
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6">

      {/* ── Welcome Header ────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #487FFF, #8B5CF6)" }}>
              <HiOutlineShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{todayLabel}</p>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">
                {getGreeting()}, {firstName}!
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Welcome to <span className="font-bold text-[#487FFF]">DIGICUR</span> — digital customer record management portal.
              </p>
            </div>
            {user?.branch?.branch_name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 self-start sm:self-auto flex-shrink-0">
                <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-[#487FFF]" />
                <span className="text-xs font-semibold text-[#487FFF]">{user.branch.branch_name}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ────────────────────────────────────────────────────────── */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, iconBg, gradient, path, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07 }}
              onClick={path ? () => navigate(path) : undefined}
              className={`p-4 rounded-2xl border border-white/80 bg-gradient-to-r ${gradient} shadow-sm ${path ? "cursor-pointer hover:-translate-y-0.5 transition-transform" : ""}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-12 h-12 ${iconBg} flex-shrink-0 text-white flex justify-center items-center rounded-full text-lg`}>
                  <Icon />
                </span>
                <div>
                  <span className="font-medium text-gray-600 text-sm">{label}</span>
                  <h6 className="font-bold text-gray-900 text-xl mt-0.5">{value?.toLocaleString() ?? "—"}</h6>
                </div>
              </div>
              {path && (
                <p className="text-xs text-[#487FFF] font-semibold flex items-center gap-1 mt-1">
                  View Details <HiOutlineChevronRight className="w-3 h-3" />
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Main 8/4 Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left 8 columns ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-8 space-y-6">

          {/* Monthly Uploads Bar Chart */}
          {uploads.length > 0 && (
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Monthly Customer Uploads</h6>
                <span className="text-xs text-gray-400">Last {uploads.length} months</span>
              </CardHead>
              <CardBody>
                <ReactApexChart options={barOpts} series={barOpts.series} type="bar" height={220} />
              </CardBody>
            </CardWrap>
          )}

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
              <div className={`grid gap-4 ${quickActions.length === 1 ? "grid-cols-1" : quickActions.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                {quickActions.map(({ label, description, icon: Icon, gradient, action }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    whileHover={{ y: -3, boxShadow: "0 12px 28px -8px rgba(0,0,0,0.18)" }}
                    className={`group relative overflow-hidden rounded-2xl shadow-sm cursor-pointer bg-gradient-to-br ${gradient}`}
                    onClick={action}
                  >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)" }} />
                    <div className="relative p-5 flex flex-col gap-3">
                      <div className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center border border-white/30">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{label}</h3>
                        <p className="text-xs text-white/75 mt-0.5 leading-relaxed">{description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-white/80 group-hover:text-white group-hover:gap-2 transition-all">
                        Open <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Status Breakdown */}
          {summary && (
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Account Status Breakdown</h6>
                {canView && (
                  <button onClick={() => navigate("/user/customers")} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
                    View All <HiOutlineChevronRight className="w-3 h-3" />
                  </button>
                )}
              </CardHead>
              <CardBody className="space-y-5">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                  const value = summary[key] ?? 0;
                  const pct   = summary.total_customers > 0 ? ((value / summary.total_customers) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div className="flex items-center w-full gap-4 grow">
                        <span className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 ${cfg.bg}`}>
                          <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                        </span>
                        <div className="grow">
                          <h6 className="text-sm font-medium text-gray-800 mb-0">{cfg.label}</h6>
                          <span className="text-xs text-gray-500">{value.toLocaleString()} customers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`${cfg.dot} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-gray-600 text-xs font-semibold w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </CardWrap>
          )}
        </div>

        {/* ── Right 4 columns ──────────────────────────────────────────────────── */}
        <div className="xl:col-span-4 space-y-6">

          {/* Branch Summary */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Your Branch</h6>
            </CardHead>
            <CardBody className="p-0">
              <div className="p-5">
                <div className="relative py-8 text-center px-4 rounded-xl" style={{ background: "linear-gradient(135deg, #487FFF 0%, #8B5CF6 100%)" }}>
                  <h3 className="text-white text-3xl font-bold">{summary?.total_customers?.toLocaleString() ?? "0"}</h3>
                  <span className="text-white/80 text-sm">Total Customers</span>
                </div>
              </div>
              <div className="px-6 bg-gray-50 border-y border-gray-100 py-3">
                <h6 className="font-bold text-base text-gray-800">{user?.branch?.branch_name ?? "Branch Stats"}</h6>
              </div>
              <div className="px-6 py-4 space-y-3">
                {summary && [
                  { icon: <HiOutlineCheckCircle />, label: "Active",         value: summary.active ?? 0,          color: "text-emerald-600" },
                  { icon: <HiOutlineMoon />,        label: "Dormant",        value: summary.dormant ?? 0,         color: "text-amber-600"   },
                  { icon: <HiOutlineDocumentText />,label: "Total Documents", value: summary.total_documents ?? 0, color: "text-teal-600"    },
                  { icon: <HiOutlineCloudUpload />, label: "Today's Uploads", value: summary.today_uploads ?? 0,  color: "text-orange-500"  },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`${color} text-base`}>{icon}</span>
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{Number(value).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </CardWrap>

          {/* System Overview */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">System Overview</h6>
            </CardHead>
            <CardBody className="space-y-3 p-4">
              {[
                { icon: HiOutlineDocumentText, gradient: "from-[#f2fdff] to-[#d4f7ff]", iconBg: "bg-cyan-600",    title: "Customer Records",  body: "Browse and search all customer profiles enrolled in the system.", path: canView ? "/user/customers" : null },
                { icon: HiOutlineShieldCheck,  gradient: "from-[#f0fdf4] to-[#dcfce7]", iconBg: "bg-emerald-600", title: "Status Tracking",   body: "Monitor active, dormant, escheat, and closed account statuses.",  path: canView ? "/user/status-tracking" : null },
              ].map(({ icon: Icon, gradient, iconBg, title, body, path }) => (
                <div
                  key={title}
                  onClick={path ? () => navigate(path) : undefined}
                  className={`p-4 rounded-xl bg-gradient-to-r ${gradient} border border-white/80 ${path ? "cursor-pointer hover:-translate-y-0.5 transition-transform" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-9 h-9 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4 text-white" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-800 mb-0.5">{title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                      {path && (
                        <p className="text-xs font-semibold text-[#487FFF] mt-2 flex items-center gap-1">
                          Go <HiOutlineChevronRight className="w-3 h-3" />
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </CardWrap>

        </div>
      </div>

      {/* ── Recent Customer Records ────────────────────────────────────────────── */}
      {data?.recent_uploads?.length > 0 && canView && (
        <CardWrap>
          <CardHead>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #487FFF, #8B5CF6)" }}>
                <HiOutlineCalendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <h6 className="font-bold text-base text-gray-900">Recent Customer Records</h6>
                <p className="text-[10px] text-gray-400">Latest uploads in the system</p>
              </div>
            </div>
            <Link to="/user/customers" className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
              View All <HiOutlineChevronRight className="w-3 h-3" />
            </Link>
          </CardHead>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left text-gray-500 font-semibold">Customer</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-semibold">Type</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recent_uploads.slice(0, 8).map(c => {
                  const sCfg = STATUS_CFG[c.status];
                  return (
                    <tr key={c.id} onClick={() => navigate(`/user/customers/${c.id}/view`)} className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, #487FFF, #8B5CF6)" }}>
                            {(c.full_name?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 group-hover:text-[#487FFF] transition-colors">{c.full_name}</p>
                            {c.branch_name && <p className="text-[10px] text-gray-400">{c.branch_name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><span className="px-3 py-0.5 rounded-full bg-blue-50 text-[#487FFF] text-xs font-semibold">{c.account_type}</span></td>
                      <td className="px-4 py-3 text-center">
                        {sCfg && <span className={`px-3 py-0.5 rounded-full text-xs font-semibold uppercase ${sCfg.bg} ${sCfg.text}`}>{c.status}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.uploaded_at}</td>
                      <td className="px-4 py-3 text-center"><HiOutlineEye className="w-4 h-4 text-gray-300 group-hover:text-[#487FFF] transition-colors mx-auto" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardWrap>
      )}

    </div>
  );
};

export default Home;
