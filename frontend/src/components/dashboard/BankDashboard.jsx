import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ReactApexChart from 'react-apexcharts';
import {
  FaUsers, FaIdCard, FaFileAlt, FaCheckCircle, FaMoon, FaLock,
  FaExclamationTriangle, FaBuilding, FaSync, FaArrowLeft,
  FaChevronRight, FaUser, FaUserFriends, FaBriefcase, FaCalendarDay,
  FaUserTie,
} from 'react-icons/fa';
import { MdTrendingUp } from 'react-icons/md';

const STATUS_COLORS = {
  active:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200', circle: 'bg-emerald-600', card: 'from-emerald-50 to-white', bar: '#10B981' },
  dormant:     { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200',   circle: 'bg-amber-600',   card: 'from-amber-50 to-white',   bar: '#F59E0B' },
  escheat:     { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  border: 'border-orange-200',  circle: 'bg-orange-600',  card: 'from-orange-50 to-white',  bar: '#F97316' },
  closed:      { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-red-200',     circle: 'bg-red-600',     card: 'from-red-50 to-white',     bar: '#EF4444' },
  reactivated: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200',    circle: 'bg-blue-600',    card: 'from-blue-50 to-white',    bar: '#3B82F6' },
};

const RISK_COLORS = {
  'Low Risk':    { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', circle: 'bg-emerald-600', hex: '#10B981' },
  'Medium Risk': { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   circle: 'bg-amber-600',   hex: '#F59E0B' },
  'High Risk':   { bg: 'bg-red-50',     text: 'text-red-700',     bar: 'bg-red-500',     circle: 'bg-red-600',     hex: '#EF4444' },
};

const TILE_ICONS    = { blue: 'bg-cyan-600', indigo: 'bg-[#487FFF]', teal: 'bg-teal-600', purple: 'bg-violet-600', cyan: 'bg-cyan-600', amber: 'bg-orange-500' };
const TILE_GRADIENT = { blue: 'from-[#f2fdff] to-[#d4f7ff]', indigo: 'from-[#eef2ff] to-[#e0e7ff]', teal: 'from-[#f0fdfa] to-[#ccfbf1]', purple: 'from-[#faf5ff] to-[#e9e0ff]', cyan: 'from-[#ecfeff] to-[#cffafe]', amber: 'from-[#fff7ed] to-[#ffefdd]' };
const TILE_ACCENT   = { blue: 'bg-cyan-500/20', indigo: 'bg-[#487FFF]/20', teal: 'bg-teal-500/20', purple: 'bg-violet-500/20', cyan: 'bg-cyan-500/20', amber: 'bg-orange-500/20' };

const CardWrap = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>{children}</div>
);
const CardHead = ({ children }) => (
  <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">{children}</div>
);
const CardBody = ({ children, className = '' }) => (
  <div className={`px-6 py-5 ${className}`}>{children}</div>
);

// ── Branch Detail Panel ───────────────────────────────────────────────────────
const BranchDetailPanel = ({ branch, stats, onClose }) => {
  const s = stats.summary;
  const statusItems = [
    { key: 'active',      label: 'Active',      icon: <FaCheckCircle />,         value: branch.active      ?? 0 },
    { key: 'dormant',     label: 'Dormant',     icon: <FaMoon />,                value: branch.dormant     ?? 0 },
    { key: 'escheat',     label: 'Escheat',     icon: <FaExclamationTriangle />, value: branch.escheat     ?? 0 },
    { key: 'closed',      label: 'Closed',      icon: <FaLock />,                value: branch.closed      ?? 0 },
    { key: 'reactivated', label: 'Reactivated', icon: <MdTrendingUp />,          value: branch.reactivated ?? 0 },
  ];
  const accountTypes = [
    { label: 'Individual', value: branch.individual ?? 0, icon: <FaUser />,        color: 'blue'   },
    { label: 'Joint',      value: branch.joint      ?? 0, icon: <FaUserFriends />, color: 'purple' },
    { label: 'Corporate',  value: branch.corporate  ?? 0, icon: <FaBriefcase />,   color: 'teal'   },
  ];
  const riskLevels = [
    { label: 'Low Risk',    value: branch.low_risk    ?? 0, color: RISK_COLORS['Low Risk']    },
    { label: 'Medium Risk', value: branch.medium_risk ?? 0, color: RISK_COLORS['Medium Risk'] },
    { label: 'High Risk',   value: branch.high_risk   ?? 0, color: RISK_COLORS['High Risk']   },
  ];
  const branchPct = s.total_customers > 0 ? ((branch.total / s.total_customers) * 100).toFixed(1) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-5">
      <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors font-medium text-gray-700">
        <FaArrowLeft className="text-gray-400 text-xs" /> Back to Overview
      </button>

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
            <FaBuilding className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{branch.branch_name}</h2>
            <p className="text-slate-300 text-sm">Branch Code: {branch.brak} ({branch.brcode})</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Total Customers', value: (branch.total ?? 0).toLocaleString() },
            { label: 'Bank Share',      value: `${branchPct}%` },
            { label: 'Signature Cards', value: (branch.sigcards ?? 0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl px-4 py-2">
              <span className="text-xl font-bold">{value}</span>
              <span className="text-slate-300 text-xs ml-2">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statusItems.map(({ key, label, icon, value }) => {
          const c = STATUS_COLORS[key];
          const pct = branch.total > 0 ? ((value / branch.total) * 100).toFixed(1) : 0;
          return (
            <div key={key} className={`bg-gradient-to-r ${c.card} border border-gray-200 rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 ${c.circle} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs">{icon}</span>
                </div>
                <span className={`text-xs font-semibold ${c.text}`}>{label}</span>
              </div>
              <div className={`text-xl font-bold ${c.text}`}>{value.toLocaleString()}</div>
              <div className="w-full bg-white/70 rounded-full h-1.5 mt-2">
                <div className={`${c.dot} h-full rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs ${c.text} opacity-70`}>{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CardWrap>
          <CardHead><h6 className="font-bold text-lg">Account Types</h6></CardHead>
          <CardBody className="space-y-4">
            {accountTypes.map(({ label, value, color }) => {
              const pct = branch.total > 0 ? ((value / branch.total) * 100).toFixed(1) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <span className="text-sm font-bold text-gray-900">{value.toLocaleString()} <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`bg-${color}-500 h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </CardWrap>

        <CardWrap>
          <CardHead><h6 className="font-bold text-lg">Risk Distribution</h6></CardHead>
          <CardBody className="space-y-4">
            {riskLevels.map(({ label, value, color }) => {
              const pct = branch.total > 0 ? ((value / branch.total) * 100).toFixed(1) : 0;
              return (
                <div key={label} className={`${color.bg} rounded-xl p-4`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${color.text}`}>{label}</span>
                    <span className={`text-sm font-bold ${color.text}`}>{value.toLocaleString()} <span className="font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-2">
                    <div className={`${color.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </CardWrap>
      </div>
    </motion.div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const BankDashboard = ({ fetchData, customersPath, customerViewPath, title, subtitle, titleIcon, overviewTiles }) => {
  const navigate = useNavigate();
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchData();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between"><div className="h-8 w-48 bg-gray-200 rounded-lg" /><div className="h-9 w-24 bg-gray-200 rounded-lg" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-200 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <div className="h-72 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-2 gap-6"><div className="h-56 bg-gray-200 rounded-2xl" /><div className="h-56 bg-gray-200 rounded-2xl" /></div>
          </div>
          <div className="xl:col-span-4 space-y-6">
            <div className="h-56 bg-gray-200 rounded-2xl" />
            <div className="h-56 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <FaExclamationTriangle className="text-2xl text-red-500" />
        </div>
        <p className="text-red-600 font-semibold">{error}</p>
        <button onClick={load} className="px-5 py-2.5 bg-[#487FFF] text-white rounded-lg hover:bg-[#486CEA] transition-colors text-sm font-semibold">Try Again</button>
      </div>
    );
  }

  const s = stats.summary;
  const branchesExHO = stats.by_branch.filter(b => !b.is_head_office);

  if (selectedBranch) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Detail</h1>
          <p className="text-sm text-gray-500 mt-0.5">RBT Bank Inc. — {selectedBranch.branch_name}</p>
        </div>
        <AnimatePresence mode="wait">
          <BranchDetailPanel key={selectedBranch.brak} branch={selectedBranch} stats={stats} onClose={() => setSelectedBranch(null)} />
        </AnimatePresence>
      </div>
    );
  }

  // ── Chart configs ─────────────────────────────────────────────────────────
  const barChartOpts = {
    series: [
      { name: 'Customers Uploaded', data: stats.monthly_uploads.map(m => m.count) },
    ],
    colors: ['#487FFF'],
    chart: { type: 'bar', height: 250, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    grid: { show: true, borderColor: '#E5E7EB', strokeDashArray: 4, position: 'back' },
    xaxis: { categories: stats.monthly_uploads.map(m => m.label) },
    yaxis: { labels: { formatter: v => Number(v).toLocaleString() } },
    legend: { show: false },
  };

  const accountTypeKeys  = Object.keys(stats.by_account_type);
  const accountTypeVals  = Object.values(stats.by_account_type);
  const acctTypePieOpts  = {
    series: accountTypeVals,
    chart: { type: 'pie', height: 240 },
    labels: accountTypeKeys,
    colors: ['#487FFF', '#A855F7', '#14B8A6', '#F97316'],
    legend: { show: true, position: 'bottom' },
    responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: 'bottom' } } }],
  };

  const statusPieOpts = {
    series: [s.active, s.dormant, s.escheat, s.closed, s.reactivated ?? 0],
    chart: { type: 'pie', height: 220 },
    labels: ['Active', 'Dormant', 'Escheat', 'Closed', 'Reactivated'],
    colors: ['#10B981', '#F59E0B', '#F97316', '#EF4444', '#3B82F6'],
    legend: { show: true, position: 'bottom' },
  };

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{titleIcon}{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors font-medium text-gray-700">
            <FaSync className="text-gray-400 text-xs" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {overviewTiles.map(({ title: tileTitle, valueKey, icon, color, to }, i) => (
          <motion.div
            key={tileTitle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => to && navigate(to)}
            className={`relative p-5 rounded-2xl border border-gray-100 bg-gradient-to-br ${TILE_GRADIENT[color] ?? 'from-gray-50 to-white'} shadow-sm overflow-hidden ${to ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-200' : ''}`}
          >
            {/* subtle decorative circle */}
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${TILE_ACCENT[color] ?? 'bg-gray-500/10'}`} />

            <div className={`w-11 h-11 ${TILE_ICONS[color] ?? 'bg-gray-500'} text-white flex items-center justify-center rounded-xl text-lg mb-4 relative z-10`}>
              {icon}
            </div>
            <h6 className="font-extrabold text-gray-900 text-3xl leading-none mb-1 relative z-10">
              {Number(s[valueKey] ?? 0).toLocaleString()}
            </h6>
            <span className="text-sm font-medium text-gray-500 relative z-10">{tileTitle}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Main 8/4 Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left 8 columns ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-8 space-y-6">

          {/* Monthly Uploads Bar Chart */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Monthly Customer Uploads</h6>
              <span className="text-xs text-gray-400">Last {stats.monthly_uploads.length} months</span>
            </CardHead>
            <CardBody>
              <ReactApexChart options={barChartOpts} series={barChartOpts.series} type="bar" height={250} />
            </CardBody>
          </CardWrap>

          {/* Status Breakdown + Account Type Pie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Customer Status Progress */}
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Customer Status</h6>
                <button onClick={() => navigate(customersPath)} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
                  View All <FaChevronRight className="text-xs" />
                </button>
              </CardHead>
              <CardBody className="space-y-5">
                {[
                  { key: 'active',      label: 'Active',      value: s.active },
                  { key: 'dormant',     label: 'Dormant',     value: s.dormant },
                  { key: 'escheat',     label: 'Escheat',     value: s.escheat },
                  { key: 'closed',      label: 'Closed',      value: s.closed },
                  { key: 'reactivated', label: 'Reactivated', value: s.reactivated ?? 0 },
                ].map(({ key, label, value }) => {
                  const c   = STATUS_COLORS[key];
                  const pct = s.total_customers > 0 ? ((value / s.total_customers) * 100).toFixed(1) : 0;
                  return (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div className="flex items-center w-full gap-4 grow">
                        <span className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 ${c.bg}`}>
                          <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                        </span>
                        <div className="grow">
                          <h6 className="text-sm font-medium text-gray-800 mb-0">{label}</h6>
                          <span className="text-xs text-gray-500">{value.toLocaleString()} customers</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`${c.dot} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-gray-600 text-xs font-semibold w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </CardWrap>

            {/* Account Type Pie */}
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Account Types</h6>
              </CardHead>
              <CardBody>
                <ReactApexChart options={acctTypePieOpts} series={acctTypePieOpts.series} type="pie" height={240} />
              </CardBody>
            </CardWrap>
          </div>

          {/* Recent Records + Risk Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Recent Customer Uploads list */}
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Recent Records</h6>
                <button onClick={() => navigate(customersPath)} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
                  View All <FaChevronRight className="text-xs" />
                </button>
              </CardHead>
              <CardBody className="space-y-0 p-0">
                {stats.recent_uploads.slice(0, 5).map(c => {
                  const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.active;
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(customerViewPath(c.id))}
                      className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div>
                        <h6 className="text-sm font-medium text-gray-800 mb-0">{c.full_name}</h6>
                        <span className="text-xs text-gray-500">{c.uploaded_at}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-600 mb-1 block">{c.account_type}</span>
                        <span className={`text-xs py-0.5 font-medium rounded-full px-3 ${sc.bg} ${sc.text}`}>{c.status}</span>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </CardWrap>

            {/* Risk Distribution */}
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Risk Distribution</h6>
              </CardHead>
              <div>
                {Object.entries(RISK_COLORS).map(([level, color]) => {
                  const count = stats.by_risk_level[level] ?? 0;
                  const pct   = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : 0;
                  return (
                    <div key={level} className="flex items-center justify-between px-6 py-3.5 bg-gray-50 odd:bg-white border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2 ${color.bar} rounded-full`} />
                        <span className="text-gray-600 text-sm">{level}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-sm">{count.toLocaleString()}</span>
                        <span className="text-gray-700 font-semibold text-sm w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardWrap>
          </div>
        </div>

        {/* ── Right 4 columns ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-4 space-y-6">

          {/* Bank Overview Summary */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Bank Overview</h6>
            </CardHead>
            <CardBody className="p-0">
              <div className="p-5">
                <div className="relative py-8 text-center px-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #487FFF 0%, #8B5CF6 100%)' }}>
                  <h3 className="text-white text-3xl font-bold">{s.total_customers.toLocaleString()}</h3>
                  <span className="text-white/80 text-sm">Total Customers</span>
                </div>
              </div>
              <div className="px-6 bg-gray-50 border-y border-gray-100 py-4">
                <div className="flex items-center justify-between">
                  <h6 className="font-bold text-base text-gray-800 mb-0">Key Metrics</h6>
                </div>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  { icon: <FaIdCard />,       label: 'Signature Cards',  value: s.total_sigcards  ?? 0, color: 'text-[#487FFF]' },
                  { icon: <FaFileAlt />,      label: 'Total Documents',  value: s.total_documents ?? 0, color: 'text-teal-600'  },
                  { icon: <FaCalendarDay />,  label: "Today's Uploads",  value: s.today_uploads   ?? 0, color: 'text-orange-500' },
                  { icon: <FaBuilding />,     label: 'Active Branches',  value: branchesExHO.length,    color: 'text-violet-600' },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`${color} text-base`}>{icon}</span>
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{Number(value).toLocaleString()}</span>
                  </div>
                ))}
                {s.total_users !== undefined && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5">
                      <FaUserTie className="text-slate-500 text-base" />
                      <span className="text-sm text-gray-600">System Users</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{Number(s.total_users ?? 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </CardWrap>

          {/* Status Distribution Pie */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Status Distribution</h6>
            </CardHead>
            <CardBody>
              <p className="text-center text-gray-500 text-sm flex items-center justify-center gap-2 mb-2">
                Total: <span className="font-bold text-gray-900">{s.total_customers.toLocaleString()}</span>
              </p>
              <ReactApexChart options={statusPieOpts} series={statusPieOpts.series} type="pie" height={220} />
            </CardBody>
          </CardWrap>

        </div>
      </div>

      {/* ── Full-width Recent Uploads Table ───────────────────────────────────── */}
      <CardWrap>
        <CardHead>
          <h6 className="font-bold text-lg text-gray-900">Recent Customer Uploads</h6>
          <button onClick={() => navigate(customersPath)} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
            View All <FaChevronRight className="text-xs" />
          </button>
        </CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left text-gray-500 font-semibold">Customer</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold">Branch</th>
                <th className="px-4 py-3 text-center text-gray-500 font-semibold">Type</th>
                <th className="px-4 py-3 text-center text-gray-500 font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold">Uploaded By</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recent_uploads.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No customers uploaded yet.</td></tr>
              ) : stats.recent_uploads.map(c => {
                const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.active;
                return (
                  <tr key={c.id} onClick={() => navigate(customerViewPath(c.id))} className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#487FFF] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {(c.full_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 group-hover:text-[#487FFF] transition-colors">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.branch ?? '—'}</td>
                    <td className="px-4 py-3 text-center"><span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{c.account_type}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.uploader ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.uploaded_at}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardWrap>

      {/* ── Branch Summary Cards ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FaBuilding className="text-gray-400" />
          <h2 className="text-base font-bold text-gray-900">Branch Summary</h2>
          <span className="text-xs text-gray-400 ml-auto">{branchesExHO.length} branches · click to view details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {branchesExHO.map((branch, i) => {
            const activePct = branch.total > 0 ? ((branch.active / branch.total) * 100).toFixed(0) : 0;
            return (
              <motion.div
                key={branch.brcode}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.12)' }}
                onClick={() => setSelectedBranch(branch)}
                className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-[#487FFF]/30 transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaBuilding className="text-[#487FFF] text-xs" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{branch.branch_name}</h3>
                      <p className="text-[10px] text-gray-400">{branch.brak}</p>
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-300 group-hover:text-[#487FFF] transition-colors flex-shrink-0 text-xs" />
                </div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{branch.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">customers</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">{activePct}%</div>
                    <div className="text-xs text-gray-400">active</div>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 flex overflow-hidden mb-2">
                  {branch.total > 0 && (
                    <>
                      <div className="bg-emerald-500 h-full" style={{ width: `${(branch.active / branch.total) * 100}%` }} />
                      <div className="bg-amber-500 h-full"   style={{ width: `${(branch.dormant / branch.total) * 100}%` }} />
                      <div className="bg-orange-500 h-full"  style={{ width: `${(branch.escheat / branch.total) * 100}%` }} />
                      <div className="bg-red-500 h-full"     style={{ width: `${(branch.closed / branch.total) * 100}%` }} />
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Branch Breakdown Table ────────────────────────────────────────────── */}
      <CardWrap>
        <CardHead>
          <h6 className="font-bold text-lg text-gray-900">Branch Breakdown</h6>
          <span className="text-xs text-gray-400"><FaBuilding className="inline mr-1 text-gray-400" />{branchesExHO.length} branches</span>
        </CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left text-gray-500 font-semibold">Branch</th>
                <th className="px-4 py-3 text-center text-gray-500 font-semibold">Total</th>
                <th className="px-4 py-3 text-center text-emerald-600 font-semibold">Active</th>
                <th className="px-4 py-3 text-center text-amber-600 font-semibold">Dormant</th>
                <th className="px-4 py-3 text-center text-orange-600 font-semibold">Escheat</th>
                <th className="px-4 py-3 text-center text-red-600 font-semibold">Closed</th>
                <th className="px-4 py-3 text-center text-blue-600 font-semibold">Reactivated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branchesExHO.map(branch => (
                <tr key={branch.brcode} onClick={() => setSelectedBranch(branch)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <FaBuilding className="text-[#487FFF] text-[10px]" />
                      </div>
                      {branch.branch_name} <span className="text-xs text-gray-400">({branch.brak})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{branch.total}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">{branch.active}</span></td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">{branch.dormant}</span></td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">{branch.escheat}</span></td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">{branch.closed}</span></td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{branch.reactivated ?? 0}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200 text-gray-700 text-sm">
                <td className="px-6 py-3 font-bold text-gray-900">All Branches Total</td>
                <td className="px-4 py-3 text-center font-bold text-gray-900">{s.total_customers}</td>
                <td className="px-4 py-3 text-center text-emerald-700 font-bold">{s.active}</td>
                <td className="px-4 py-3 text-center text-amber-700 font-bold">{s.dormant}</td>
                <td className="px-4 py-3 text-center text-orange-700 font-bold">{s.escheat}</td>
                <td className="px-4 py-3 text-center text-red-700 font-bold">{s.closed}</td>
                <td className="px-4 py-3 text-center text-blue-700 font-bold">{s.reactivated ?? 0}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardWrap>

    </div>
  );
};

export default BankDashboard;
