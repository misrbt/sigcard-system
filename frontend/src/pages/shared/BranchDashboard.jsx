import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import ReactApexChart from 'react-apexcharts';
import {
  HiOutlineUsers, HiOutlineDocumentText, HiOutlineCloudUpload, HiOutlineUserGroup,
  HiOutlineCheckCircle, HiOutlineMoon, HiOutlineExclamation, HiOutlineLockClosed,
  HiOutlineRefresh, HiOutlineChevronRight, HiOutlineOfficeBuilding,
  HiOutlineShieldCheck, HiOutlineCreditCard, HiOutlineTrendingUp, HiOutlineEye,
} from 'react-icons/hi';

const STATUS_CFG = {
  active:  { label: 'Active',  icon: HiOutlineCheckCircle, dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', circle: 'bg-emerald-600', bar: '#10B981' },
  dormant: { label: 'Dormant', icon: HiOutlineMoon,        dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   circle: 'bg-amber-600',   bar: '#F59E0B' },
  escheat: { label: 'Escheat', icon: HiOutlineExclamation, dot: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50',  circle: 'bg-orange-600',  bar: '#F97316' },
  closed:  { label: 'Closed',  icon: HiOutlineLockClosed,  dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     circle: 'bg-red-600',     bar: '#EF4444' },
};

const RISK_COLORS = {
  'Low Risk':    { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Medium Risk': { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  'High Risk':   { bar: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50'     },
};

const ACCT_COLORS = {
  Individual: { bar: 'bg-[#487FFF]', hex: '#487FFF' },
  Regular:    { bar: 'bg-[#487FFF]', hex: '#487FFF' },
  Joint:      { bar: 'bg-violet-500', hex: '#8B5CF6' },
  Corporate:  { bar: 'bg-teal-500',   hex: '#14B8A6' },
};

const STAT_CARDS = [
  { key: 'total_customers', label: 'Total Customers', iconBg: 'bg-cyan-600',    gradient: 'from-[#f2fdff] to-[#d4f7ff]', navKey: 'customers' },
  { key: 'total_documents', label: 'Total Documents', iconBg: 'bg-teal-600',    gradient: 'from-[#f0fdfa] to-[#ccfbf1]', navKey: 'documents'  },
  { key: 'today_uploads',   label: "Today's Uploads", iconBg: 'bg-orange-500',  gradient: 'from-[#fff7ed] to-[#ffefdd]', navKey: 'customers'  },
  { key: 'branch_users',    label: 'Branch Users',    iconBg: 'bg-violet-600',  gradient: 'from-[#faf5ff] to-[#e9e0ff]', navKey: null         },
];

const STAT_ICONS = {
  total_customers: HiOutlineUsers,
  total_documents: HiOutlineDocumentText,
  today_uploads:   HiOutlineCloudUpload,
  branch_users:    HiOutlineUserGroup,
};

const CardWrap = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>{children}</div>
);
const CardHead = ({ children }) => (
  <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">{children}</div>
);
const CardBody = ({ children, className = '' }) => (
  <div className={`px-6 py-5 ${className}`}>{children}</div>
);

const Skeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-24 bg-gray-200 rounded-2xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}</div>
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

const BranchDashboard = ({ title, apiEndpoint, basePath = '/manager' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(apiEndpoint);
      setData(res.data.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <HiOutlineExclamation className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 font-semibold">{error}</p>
        <button onClick={fetchDashboard} className="flex items-center gap-2 px-5 py-2.5 bg-[#487FFF] text-white rounded-lg hover:bg-[#486CEA] transition-colors text-sm font-semibold">
          <HiOutlineRefresh className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const s = data.summary;
  const uploads = data.monthly_uploads ?? [];
  const goCustomers = () => navigate(`${basePath}/customers`);

  // ── Chart configs ───────────────────────────────────────────────────────────
  const barOpts = {
    series: [{ name: 'Customers Uploaded', data: uploads.map(m => m.count) }],
    colors: ['#487FFF'],
    chart: { type: 'bar', height: 250, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    grid: { show: true, borderColor: '#E5E7EB', strokeDashArray: 4, position: 'back' },
    xaxis: { categories: uploads.map(m => m.label) },
    yaxis: { labels: { formatter: v => Number(v).toLocaleString() } },
    legend: { show: false },
  };

  const acctKeys = Object.keys(data.by_account_type ?? {});
  const acctVals = Object.values(data.by_account_type ?? {});
  const acctPieOpts = {
    series: acctVals,
    chart: { type: 'pie', height: 220 },
    labels: acctKeys,
    colors: acctKeys.map(k => ACCT_COLORS[k]?.hex ?? '#6B7280'),
    legend: { show: true, position: 'bottom' },
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #487FFF, #8B5CF6)' }}>
              <HiOutlineOfficeBuilding className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">
                {data.branch?.branch_name ?? user?.branch?.branch_name ?? '—'}
                {data.branch_breakdown?.length > 0 && (
                  <span className="text-gray-400 ml-1">+ {data.branch_breakdown.length - 1} lite branches</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={fetchDashboard} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto">
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, iconBg, gradient, navKey }, i) => {
          const Icon  = STAT_ICONS[key];
          const value = s[key];
          const to    = navKey ? `${basePath}/${navKey}` : null;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={to ? () => navigate(to) : undefined}
              className={`p-4 rounded-2xl border border-white/80 bg-gradient-to-r ${gradient} shadow-sm ${to ? 'cursor-pointer hover:-translate-y-0.5 transition-transform' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-12 h-12 ${iconBg} flex-shrink-0 text-white flex justify-center items-center rounded-full text-lg`}>
                  <Icon />
                </span>
                <div>
                  <span className="font-medium text-gray-600 text-sm">{label}</span>
                  <h6 className="font-bold text-gray-900 text-xl mt-0.5">{value?.toLocaleString() ?? '—'}</h6>
                </div>
              </div>
              {to && (
                <p className="text-xs text-[#487FFF] font-semibold flex items-center gap-1 mt-1">
                  View Details <HiOutlineChevronRight className="w-3 h-3" />
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Main 8/4 Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Left 8 columns ─────────────────────────────────────────────────── */}
        <div className="xl:col-span-8 space-y-6">

          {/* Monthly Bar Chart */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Monthly Customer Uploads</h6>
              <span className="text-xs text-gray-400">Last {uploads.length} months</span>
            </CardHead>
            <CardBody>
              {uploads.length > 0
                ? <ReactApexChart options={barOpts} series={barOpts.series} type="bar" height={250} />
                : <p className="text-center text-gray-400 py-12">No upload data yet</p>
              }
            </CardBody>
          </CardWrap>

          {/* Status Breakdown + Account Type Pie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Customer Status Progress */}
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Customer Status</h6>
                <button onClick={goCustomers} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
                  View All <HiOutlineChevronRight className="w-3 h-3" />
                </button>
              </CardHead>
              <CardBody className="space-y-5">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                  const value = s[key] ?? 0;
                  const pct   = s.total_customers > 0 ? ((value / s.total_customers) * 100).toFixed(1) : '0.0';
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
                        <div className="w-16">
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

            {/* Account Type Pie */}
            <CardWrap>
              <CardHead>
                <h6 className="font-bold text-lg text-gray-900">Account Types</h6>
                <button onClick={goCustomers} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
                  View All <HiOutlineChevronRight className="w-3 h-3" />
                </button>
              </CardHead>
              <CardBody>
                {acctVals.length > 0
                  ? <ReactApexChart options={acctPieOpts} series={acctPieOpts.series} type="pie" height={220} />
                  : <p className="text-center text-gray-400 py-10">No data</p>
                }
              </CardBody>
            </CardWrap>
          </div>

          {/* Risk Distribution */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Risk Distribution</h6>
              <div className="flex items-center gap-1 text-gray-400 text-xs"><HiOutlineShieldCheck /> AML Risk Classification</div>
            </CardHead>
            <div>
              {Object.entries(data.by_risk_level ?? {}).map(([level, count], idx) => {
                const c   = RISK_COLORS[level] ?? { bar: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' };
                const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : '0.0';
                return (
                  <div key={level} className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                    <div className="flex items-center gap-4 grow">
                      <span className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 ${c.bg}`}>
                        <span className={`w-3 h-3 rounded-full ${c.bar}`} />
                      </span>
                      <div className="grow">
                        <h6 className={`text-sm font-medium ${c.text}`}>{level}</h6>
                        <span className="text-xs text-gray-500">{Number(count).toLocaleString()} customers</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`${c.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${c.text} w-10 text-right`}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardWrap>

          {/* Branch Breakdown Table (for multi-branch managers) */}
          {data.branch_breakdown?.length > 0 && (
            <CardWrap>
              <CardHead>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #487FFF, #8B5CF6)' }}>
                    <HiOutlineOfficeBuilding className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h6 className="font-bold text-base text-gray-900">Branch Summary</h6>
                    <p className="text-[10px] text-gray-400">{data.branch_breakdown.length} branches under your scope</p>
                  </div>
                </div>
              </CardHead>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 text-left text-gray-500 font-semibold">Branch</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-semibold">Total</th>
                      <th className="px-4 py-3 text-center text-emerald-600 font-semibold">Active</th>
                      <th className="px-4 py-3 text-center text-amber-600 font-semibold">Dormant</th>
                      <th className="px-4 py-3 text-center text-orange-600 font-semibold">Escheat</th>
                      <th className="px-4 py-3 text-center text-red-600 font-semibold">Closed</th>
                      <th className="px-4 py-3 text-center text-[#487FFF] font-semibold">Today</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.branch_breakdown.map((b, idx) => (
                      <tr key={b.branch_id} className={`hover:bg-blue-50/40 transition-colors ${idx === 0 ? 'bg-blue-50/20' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-blue-100' : 'bg-violet-100'}`}>
                              <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[#487FFF]' : 'bg-violet-400'}`} />
                            </div>
                            <div>
                              <p className={`font-semibold text-gray-800 ${idx === 0 ? 'text-blue-900' : ''}`}>{b.branch_name}</p>
                              <p className="text-[10px] text-gray-400">{b.brak}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${idx === 0 ? 'bg-blue-100 text-[#487FFF]' : 'bg-violet-100 text-violet-600'}`}>
                              {idx === 0 ? 'Mother' : 'Lite'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{b.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-700">{b.active.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-700">{b.dormant.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center font-semibold text-orange-700">{b.escheat.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center font-semibold text-red-700">{b.closed.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[#487FFF]">{b.today_uploads.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardWrap>
          )}
        </div>

        {/* ── Right 4 columns ──────────────────────────────────────────────────── */}
        <div className="xl:col-span-4 space-y-6">

          {/* Branch Overview */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Branch Overview</h6>
            </CardHead>
            <CardBody className="p-0">
              <div className="p-5">
                <div className="relative py-8 text-center px-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #487FFF 0%, #8B5CF6 100%)' }}>
                  <h3 className="text-white text-3xl font-bold">{s.total_customers?.toLocaleString() ?? '0'}</h3>
                  <span className="text-white/80 text-sm">Total Customers</span>
                </div>
              </div>
              <div className="px-6 bg-gray-50 border-y border-gray-100 py-3">
                <h6 className="font-bold text-base text-gray-800">Key Metrics</h6>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  { icon: <HiOutlineDocumentText />, label: 'Total Documents', value: s.total_documents ?? 0, color: 'text-teal-600' },
                  { icon: <HiOutlineCloudUpload />,  label: "Today's Uploads",  value: s.today_uploads ?? 0, color: 'text-orange-500' },
                  { icon: <HiOutlineUserGroup />,    label: 'Branch Users',     value: s.branch_users ?? 0,  color: 'text-violet-600' },
                  { icon: <HiOutlineCheckCircle />,  label: 'Active Customers', value: s.active ?? 0,        color: 'text-emerald-600' },
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

          {/* Status Distribution Card */}
          <CardWrap>
            <CardHead>
              <h6 className="font-bold text-lg text-gray-900">Status Distribution</h6>
            </CardHead>
            <CardBody>
              <div className="space-y-3">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                  const value = s[key] ?? 0;
                  const pct   = s.total_customers > 0 ? ((value / s.total_customers) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                          <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{value.toLocaleString()}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`${cfg.dot} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </CardWrap>

        </div>
      </div>

      {/* ── Recent Uploads Table ─────────────────────────────────────────────────── */}
      <CardWrap>
        <CardHead>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #487FFF, #8B5CF6)' }}>
              <HiOutlineTrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h6 className="font-bold text-base text-gray-900">Recent Customer Uploads</h6>
              <p className="text-[10px] text-gray-400">Latest records across your branch{data.branch_breakdown?.length > 1 ? 'es' : ''}</p>
            </div>
          </div>
          <button onClick={goCustomers} className="text-[#487FFF] text-sm font-medium hover:underline flex items-center gap-1">
            View All <HiOutlineChevronRight className="w-3 h-3" />
          </button>
        </CardHead>
        {data.recent_uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <HiOutlineUsers className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">No customers uploaded yet</p>
          </div>
        ) : (
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
                {data.recent_uploads.map(c => {
                  const sCfg = STATUS_CFG[c.status];
                  return (
                    <tr key={c.id} onClick={() => navigate(`${basePath}/customers/${c.id}/view`)} className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg, #487FFF, #8B5CF6)' }}>
                            {(c.full_name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 group-hover:text-[#487FFF] transition-colors">{c.full_name}</p>
                            {c.branch_name && data.branch_breakdown?.length > 0 && (
                              <p className="text-[10px] text-gray-400">{c.branch_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><span className="px-3 py-0.5 rounded-full bg-blue-50 text-[#487FFF] text-xs font-semibold">{c.account_type}</span></td>
                      <td className="px-4 py-3 text-center">
                        {sCfg && <span className={`px-3 py-0.5 rounded-full text-xs font-semibold uppercase ${sCfg.bg} ${sCfg.text}`}>{c.status}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.uploaded_at}</td>
                      <td className="px-4 py-3 text-center"><HiOutlineEye className="w-4 h-4 text-gray-300 group-hover:text-[#487FFF] transition-colors mx-auto" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardWrap>

    </div>
  );
};

export default BranchDashboard;
