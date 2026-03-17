import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCloudUpload,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineMoon,
  HiOutlineExclamation,
  HiOutlineLockClosed,
  HiOutlineRefresh,
  HiOutlineChevronRight,
  HiOutlineOfficeBuilding,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineTrendingUp,
  HiOutlineCalendar,
  HiOutlineEye,
} from 'react-icons/hi';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:  { label: 'Active',  icon: HiOutlineCheckCircle,  gradient: 'from-emerald-500 to-green-600',  bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500'  },
  dormant: { label: 'Dormant', icon: HiOutlineMoon,         gradient: 'from-amber-500 to-yellow-600',   bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-500'    },
  escheat: { label: 'Escheat', icon: HiOutlineExclamation,  gradient: 'from-orange-500 to-amber-600',   bg: 'bg-orange-50',   text: 'text-orange-700',  ring: 'ring-orange-200',  dot: 'bg-orange-500'   },
  closed:  { label: 'Closed',  icon: HiOutlineLockClosed,   gradient: 'from-red-500 to-rose-600',       bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500'      },
};

const RISK_COLORS = {
  'Low Risk':    { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Medium Risk': { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  'High Risk':   { bar: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50'     },
};

const ACCT_COLORS = {
  Regular:   { bar: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  Joint:     { bar: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  Corporate: { bar: 'bg-slate-500',  text: 'text-slate-700',  bg: 'bg-slate-100' },
};

// ── Card wrapper ───────────────────────────────────────────────────────────────
const ClickableCard = ({ onClick, children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.06, duration: 0.35 }}
    whileHover={{ y: -3, boxShadow: '0 12px 28px -8px rgba(0,0,0,0.12)' }}
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-200 shadow-sm transition-all ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

// ── Skeleton ───────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-28 bg-slate-200 rounded-2xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-2 gap-5">
      <div className="h-48 bg-slate-200 rounded-2xl" />
      <div className="h-48 bg-slate-200 rounded-2xl" />
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
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
        <button onClick={fetchDashboard} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold">
          <HiOutlineRefresh className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const s = data.summary;
  const goCustomers = () => navigate(`${basePath}/customers`);
  const goDocuments = () => navigate(`${basePath}/documents`);

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #1877F2 0%, transparent 50%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-blue-300" />
              <p className="text-sm text-blue-200">
                {data.branch?.branch_name ?? user?.branch?.branch_name ?? '—'}
              </p>
              {data.branch_breakdown?.length > 0 && (
                <span className="text-xs text-blue-300/60 ml-1">+ {data.branch_breakdown.length - 1} lite branches</span>
              )}
            </div>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all self-start sm:self-auto backdrop-blur-sm"
          >
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Primary Stat Cards (clickable) ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers',  value: s.total_customers, icon: HiOutlineUsers,       gradient: 'from-blue-500 to-indigo-600',  onClick: goCustomers },
          { label: 'Total Documents',  value: s.total_documents, icon: HiOutlineDocumentText, gradient: 'from-teal-500 to-cyan-600',    onClick: goDocuments },
          { label: "Today's Uploads",  value: s.today_uploads,   icon: HiOutlineCloudUpload,  gradient: 'from-violet-500 to-purple-600', onClick: goCustomers },
          { label: 'Branch Users',     value: s.branch_users,    icon: HiOutlineUserGroup,    gradient: 'from-slate-500 to-slate-600',   onClick: null },
        ].map(({ label, value, icon: Icon, gradient, onClick }, i) => (
          <ClickableCard key={label} onClick={onClick} delay={i}>
            <div className="p-5 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{value?.toLocaleString() ?? '—'}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            {onClick && (
              <div className="px-5 py-2.5 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                View Details <HiOutlineChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
          </ClickableCard>
        ))}
      </div>

      {/* ── Status Breakdown Cards (clickable) ───────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Customer Status Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['active', 'dormant', 'escheat', 'closed'].map((key, i) => {
            const cfg = STATUS_CFG[key];
            const Icon = cfg.icon;
            const value = s[key] ?? 0;
            const pct = s.total_customers > 0 ? ((value / s.total_customers) * 100).toFixed(1) : '0.0';

            return (
              <ClickableCard key={key} onClick={goCustomers} delay={i + 4} className={`ring-1 ${cfg.ring}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{pct}%</span>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{value.toLocaleString()}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{cfg.label}</p>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                    <div className={`${cfg.dot} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </ClickableCard>
            );
          })}
        </div>
      </div>

      {/* ── Account Types & Risk Level (side by side, clickable) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Account Types */}
        <ClickableCard onClick={goCustomers} delay={8}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <HiOutlineCreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Account Types</h2>
              <HiOutlineChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
            </div>
            <div className="space-y-4">
              {Object.entries(data.by_account_type).map(([type, count]) => {
                const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : '0.0';
                const c = ACCT_COLORS[type] || { bar: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' };
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${c.bar}`} />
                        <span className="text-sm font-semibold text-slate-700">{type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{Number(count).toLocaleString()}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${c.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ClickableCard>

        {/* Risk Levels */}
        <ClickableCard onClick={goCustomers} delay={9}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <HiOutlineShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Risk Distribution</h2>
              <HiOutlineChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
            </div>
            <div className="space-y-4">
              {Object.entries(data.by_risk_level).map(([level, count]) => {
                const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : '0.0';
                const c = RISK_COLORS[level] || { bar: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' };
                return (
                  <div key={level}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${c.bar}`} />
                        <span className={`text-sm font-semibold ${c.text}`}>{level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{Number(count).toLocaleString()}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${c.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ClickableCard>
      </div>

      {/* ── Monthly Uploads ─────────────────────────────────────────────────── */}
      {(() => {
        const uploads = data.monthly_uploads ?? [];
        const totalUploads = uploads.reduce((sum, m) => sum + m.count, 0);
        const max = Math.max(...uploads.map((x) => x.count), 1);
        const avg = uploads.length > 0 ? Math.round(totalUploads / uploads.length) : 0;
        const curr = uploads.length >= 1 ? uploads[uploads.length - 1] : null;
        const prev = uploads.length >= 2 ? uploads[uploads.length - 2] : null;
        const change = prev && prev.count > 0 ? (((curr?.count ?? 0) - prev.count) / prev.count * 100).toFixed(0) : null;
        const bestIdx = uploads.reduce((bi, m, i, arr) => m.count > arr[bi].count ? i : bi, 0);

        return (
          <ClickableCard delay={10}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <HiOutlineTrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-800">Monthly Uploads</h2>
                <p className="text-[10px] text-slate-400">Last 6 months</p>
              </div>
            </div>

            {/* Highlight strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-extrabold text-slate-900">{totalUploads.toLocaleString()}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Total</p>
              </div>
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-extrabold text-slate-900">{avg.toLocaleString()}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Monthly Avg</p>
              </div>
              <div className="px-5 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xl font-extrabold text-slate-900">{curr?.count?.toLocaleString() ?? '0'}</p>
                  {change !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${Number(change) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {Number(change) >= 0 ? '↑' : '↓'}{Math.abs(Number(change))}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">This Month</p>
              </div>
            </div>

            {/* Horizontal bar rows */}
            <div className="px-5 py-4 space-y-3">
              {uploads.map((m, i) => {
                const pct = (m.count / max) * 100;
                const isCurrent = i === uploads.length - 1;
                const isBest = i === bestIdx && m.count > 0;

                return (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isCurrent ? 'bg-blue-50/70 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                  >
                    {/* Month */}
                    <div className="w-16 flex-shrink-0">
                      <p className={`text-xs font-bold ${isCurrent ? 'text-blue-700' : 'text-slate-700'}`}>{m.label.split(' ')[0]}</p>
                      <p className="text-[10px] text-slate-400">{m.label.split(' ')[1]}</p>
                    </div>

                    {/* Bar */}
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, m.count > 0 ? 4 : 0)}%` }}
                        transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isCurrent
                            ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                            : isBest
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                            : 'bg-gradient-to-r from-slate-400 to-slate-300'
                        }`}
                      />
                    </div>

                    {/* Count */}
                    <span className={`text-sm font-bold w-10 text-right flex-shrink-0 ${isCurrent ? 'text-blue-700' : 'text-slate-800'}`}>
                      {m.count}
                    </span>

                    {/* Badge */}
                    <div className="w-12 flex-shrink-0 text-right">
                      {isCurrent && <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">NOW</span>}
                      {isBest && !isCurrent && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">TOP</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ClickableCard>
        );
      })()}

      {/* ── Branch Breakdown (only for multi-branch managers) ──────────────────── */}
      {data.branch_breakdown?.length > 0 && (
        <ClickableCard delay={11}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Branch Summary</h2>
              <p className="text-[10px] text-slate-400">{data.branch_breakdown.length} branches under your scope</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wider">Dormant</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-orange-600 uppercase tracking-wider">Escheat</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-red-600 uppercase tracking-wider">Closed</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.branch_breakdown.map((b, idx) => (
                  <tr key={b.branch_id} className={`hover:bg-blue-50/50 transition-colors ${idx === 0 ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-blue-500' : 'bg-purple-400'}`} />
                        <div>
                          <p className={`font-semibold text-slate-800 ${idx === 0 ? 'text-blue-900' : ''}`}>{b.branch_name}</p>
                          <p className="text-[10px] text-slate-400">{b.brak}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${idx === 0 ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {idx === 0 ? 'Mother' : 'Lite'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{b.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{b.active.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-700">{b.dormant.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-orange-700">{b.escheat.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-700">{b.closed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-700">{b.today_uploads.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClickableCard>
      )}

      {/* ── Recent Uploads ────────────────────────────────────────────────────── */}
      <ClickableCard delay={12}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
              <HiOutlineCalendar className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Recent Customer Uploads</h2>
              <p className="text-[10px] text-slate-400">Latest records across your branch{data.branch_breakdown?.length > 1 ? 'es' : ''}</p>
            </div>
          </div>
          <button onClick={goCustomers} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            View All <HiOutlineChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data.recent_uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <HiOutlineUsers className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">No customers uploaded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recent_uploads.map((c) => {
              const sCfg = STATUS_CFG[c.status];
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`${basePath}/customers/${c.id}/view`)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                    {(c.full_name?.[0] ?? '?').toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{c.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{c.uploaded_at}</span>
                      {data.branch_breakdown?.length > 0 && c.branch_name && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-[10px] text-slate-400">{c.branch_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Badges */}
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex-shrink-0">{c.account_type}</span>
                  {sCfg && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${sCfg.bg} ${sCfg.text}`}>
                      {c.status}
                    </span>
                  )}
                  <HiOutlineEye className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </ClickableCard>

    </div>
  );
};

export default BranchDashboard;
