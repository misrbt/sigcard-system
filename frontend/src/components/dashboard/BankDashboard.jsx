/**
 * BankDashboard — shared dashboard used by Admin and Compliance-Audit roles.
 *
 * Props
 * ──────────────────────────────────────────────────────────────────────────
 * fetchData          async () => stats object (must match the shape below)
 * customersPath      string   – base path for the customers list page
 * customerViewPath   (id) => string – path to a single customer view
 * title              string
 * subtitle           string
 * titleIcon          ReactNode (optional)
 * overviewTiles      Array<{ title, valueKey, icon, color, to? }>
 *                    valueKey is a key of stats.summary
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUsers,
  FaIdCard,
  FaFileAlt,
  FaCheckCircle,
  FaMoon,
  FaLock,
  FaExclamationTriangle,
  FaBuilding,
  FaUpload,
  FaSync,
  FaArrowLeft,
  FaChevronRight,
  FaChartBar,
  FaUserFriends,
  FaBriefcase,
  FaUser,
} from 'react-icons/fa';
import Card from '../ui/Card';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import PieChart from '../charts/PieChart';

const STATUS_COLORS = {
  active:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  dormant: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
  escheat: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
  closed:  { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    border: 'border-red-200' },
};

const RISK_COLORS = {
  'Low Risk':    { bg: 'bg-green-50',  text: 'text-green-700',  bar: 'bg-green-500'  },
  'Medium Risk': { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  'High Risk':   { bg: 'bg-red-50',    text: 'text-red-700',    bar: 'bg-red-500'    },
};

// ── Branch Detail Panel ───────────────────────────────────────────────────
const BranchDetailPanel = ({ branch, stats, onClose }) => {
  const s = stats.summary;

  const statusItems = [
    { key: 'active',  label: 'Active',  icon: <FaCheckCircle />,         value: branch.active  ?? 0 },
    { key: 'dormant', label: 'Dormant', icon: <FaMoon />,                value: branch.dormant ?? 0 },
    { key: 'escheat', label: 'Escheat', icon: <FaExclamationTriangle />, value: branch.escheat ?? 0 },
    { key: 'closed',  label: 'Closed',  icon: <FaLock />,                value: branch.closed  ?? 0 },
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

  const branchPct = s.total_customers > 0
    ? ((branch.total / s.total_customers) * 100).toFixed(1)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-5"
    >
      <div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
        >
          <FaArrowLeft className="text-gray-500" /> Back to Overview
        </button>
      </div>

      {/* Branch hero */}
      <div className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FaBuilding className="text-blue-300 text-2xl" />
          <div>
            <h2 className="text-xl font-bold">{branch.branch_name}</h2>
            <p className="text-blue-200 text-sm">Branch Code: {branch.brak} ({branch.brcode})</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold">{(branch.total ?? 0).toLocaleString()}</span>
            <span className="text-blue-200 text-sm ml-2">Total Customers</span>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold">{branchPct}%</span>
            <span className="text-blue-200 text-sm ml-2">of Bank Total</span>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold">{(branch.sigcards ?? 0).toLocaleString()}</span>
            <span className="text-blue-200 text-sm ml-2">SigCards</span>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statusItems.map(({ key, label, icon, value }) => {
          const c = STATUS_COLORS[key];
          const pct = branch.total > 0 ? ((value / branch.total) * 100).toFixed(1) : 0;
          return (
            <div key={key} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
              <div className={`flex items-center gap-2 ${c.text} text-sm font-medium mb-1`}>{icon} {label}</div>
              <div className={`text-2xl font-bold ${c.text}`}>{value.toLocaleString()}</div>
              <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
                <div className={`${c.dot} h-full rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs ${c.text} opacity-75`}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Account Types + Risk Level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Account Types" subtitle={`${branch.branch_name} classification`}>
          <div className="space-y-3">
            {accountTypes.map(({ label, value, icon, color }) => {
              const pct = branch.total > 0 ? ((value / branch.total) * 100).toFixed(1) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={`bg-${color}-100 text-${color}-600 p-2 rounded-lg`}>{icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {value.toLocaleString()} <span className="text-xs text-gray-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`bg-${color}-500 h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Risk Level" subtitle="AML risk classification">
          <div className="space-y-3">
            {riskLevels.map(({ label, value, color }) => {
              const pct = branch.total > 0 ? ((value / branch.total) * 100).toFixed(1) : 0;
              return (
                <div key={label} className={`${color.bg} rounded-xl p-4`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${color.text}`}>{label}</span>
                    <span className={`text-sm font-bold ${color.text}`}>
                      {value.toLocaleString()} <span className="font-normal text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-2">
                    <div className={`${color.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Documents info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <FaFileAlt className="text-blue-500 text-xl mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-700">{(branch.documents ?? 0).toLocaleString()}</div>
          <div className="text-xs text-blue-600">Total Documents</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
          <FaIdCard className="text-indigo-500 text-xl mx-auto mb-2" />
          <div className="text-2xl font-bold text-indigo-700">{(branch.sigcards ?? 0).toLocaleString()}</div>
          <div className="text-xs text-indigo-600">Signature Cards</div>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
          <FaUsers className="text-teal-500 text-xl mx-auto mb-2" />
          <div className="text-2xl font-bold text-teal-700">{(branch.total ?? 0).toLocaleString()}</div>
          <div className="text-xs text-teal-600">Customers</div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main shared dashboard ─────────────────────────────────────────────────
const BankDashboard = ({
  fetchData,
  customersPath,
  customerViewPath,
  title,
  subtitle,
  titleIcon,
  overviewTiles,
}) => {
  const navigate = useNavigate();
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);
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

  // ── Chart builders ────────────────────────────────────────────────────
  const branchChart = stats
    ? (() => {
        const branches = stats.by_branch.filter((b) => b.branch_name !== 'Head Office');
        return {
          labels: branches.map((b) => b.brak ?? b.branch_name),
          datasets: [
            { label: 'Active',  data: branches.map((b) => b.active),  backgroundColor: 'rgba(34,197,94,0.8)'  },
            { label: 'Dormant', data: branches.map((b) => b.dormant), backgroundColor: 'rgba(251,191,36,0.8)' },
            { label: 'Escheat', data: branches.map((b) => b.escheat), backgroundColor: 'rgba(249,115,22,0.8)' },
            { label: 'Closed',  data: branches.map((b) => b.closed),  backgroundColor: 'rgba(239,68,68,0.8)'  },
          ],
        };
      })()
    : null;

  const statusPie = stats
    ? {
        labels: ['Active', 'Dormant', 'Escheat', 'Closed'],
        datasets: [{
          data: [stats.summary.active, stats.summary.dormant, stats.summary.escheat, stats.summary.closed],
          backgroundColor: ['rgba(34,197,94,0.85)', 'rgba(251,191,36,0.85)', 'rgba(249,115,22,0.85)', 'rgba(239,68,68,0.85)'],
          borderColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626'],
          borderWidth: 2,
        }],
      }
    : null;

  const monthlyChart = stats
    ? {
        labels: stats.monthly_uploads.map((m) => m.label),
        datasets: [{
          label: 'Customers Uploaded',
          data: stats.monthly_uploads.map((m) => m.count),
          borderColor: 'rgb(99,102,241)',
          backgroundColor: 'rgba(99,102,241,0.1)',
          tension: 0.4,
          fill: true,
        }],
      }
    : null;

  const accountTypeChart = stats
    ? {
        labels: Object.keys(stats.by_account_type),
        datasets: [{
          data: Object.values(stats.by_account_type),
          backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(168,85,247,0.8)', 'rgba(20,184,166,0.8)'],
        }],
      }
    : null;

  // ── Skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="h-72 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FaExclamationTriangle className="text-4xl text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const s = stats.summary;
  const branchesExHO = stats.by_branch.filter((b) => b.branch_name !== 'Head Office');

  // ── Branch detail view ────────────────────────────────────────────────
  if (selectedBranch) {
    return (
      <div className="space-y-5 md:space-y-6">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Branch Detail</h1>
            <p className="text-sm text-gray-500 mt-1">RBT Bank Inc. — {selectedBranch.branch_name}</p>
          </div>
        </motion.div>
        <AnimatePresence mode="wait">
          <BranchDetailPanel
            key={selectedBranch.brak}
            branch={selectedBranch}
            stats={stats}
            onClose={() => setSelectedBranch(null)}
          />
        </AnimatePresence>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 md:space-y-6">

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            {titleIcon}
            {title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</span>
          )}
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <FaSync className="text-gray-500" /> Refresh
          </button>
        </div>
      </motion.div>

      {/* Bank-Wide Overview */}
      <div className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaChartBar className="text-blue-300" />
          <h2 className="text-white font-semibold text-lg">Bank-Wide Overview</h2>
        </div>
        <div className={`grid grid-cols-2 gap-3 ${overviewTiles.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-6'}`}>
          {overviewTiles.map(({ title: tileTitle, valueKey, icon, color, to }) => (
            <motion.div key={tileTitle} whileHover={{ y: -3, scale: 1.02 }}
              onClick={() => to && navigate(to)}
              className={`bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 ${to ? 'cursor-pointer hover:bg-white/15' : ''} transition-all`}
            >
              <div className={`text-${color}-300 text-lg mb-2`}>{icon}</div>
              <div className="text-2xl font-bold text-white">{Number(s[valueKey] ?? 0).toLocaleString()}</div>
              <div className="text-xs text-blue-200/70 mt-1">{tileTitle}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'active',  label: 'Active',  icon: <FaCheckCircle />,         value: s.active  },
          { key: 'dormant', label: 'Dormant', icon: <FaMoon />,                value: s.dormant },
          { key: 'escheat', label: 'Escheat', icon: <FaExclamationTriangle />, value: s.escheat },
          { key: 'closed',  label: 'Closed',  icon: <FaLock />,                value: s.closed  },
        ].map(({ key, label, icon, value }) => {
          const c = STATUS_COLORS[key];
          const pct = s.total_customers > 0 ? ((value / s.total_customers) * 100).toFixed(1) : 0;
          return (
            <motion.div key={key}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(customersPath)}
              className={`${c.bg} border ${c.border} rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-shadow hover:shadow-md`}
            >
              <div className={`flex items-center gap-2 ${c.text} text-sm font-medium`}>{icon} {label}</div>
              <div className={`text-2xl font-bold ${c.text}`}>{value.toLocaleString()}</div>
              <div className="w-full bg-white/50 rounded-full h-1.5">
                <div className={`${c.dot} h-full rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs ${c.text} opacity-75`}>{pct}% of total</span>
            </motion.div>
          );
        })}
      </div>

      {/* Charts: Branch Status + Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Customers by Branch" subtitle="Status breakdown per branch (excl. Head Office)" className="lg:col-span-2">
          <div className="h-[300px]">
            {branchChart && (
              <BarChart data={branchChart} title="" maintainAspectRatio={false}
                plugins={{ legend: { position: 'top' }, title: { display: false } }}
                scales={{ x: { stacked: true }, y: { stacked: true, beginAtZero: true } }}
              />
            )}
          </div>
        </Card>
        <Card title="Status Distribution" subtitle="Overall customer status">
          <div className="h-[300px]">
            {statusPie && (
              <PieChart data={statusPie} title="" showLabels={true} maintainAspectRatio={false}
                plugins={{ legend: { position: 'bottom' }, title: { display: false } }}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Charts: Monthly Trend + Account Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Monthly Customer Uploads" subtitle="Last 6 months trend" className="lg:col-span-2">
          <div className="h-[200px]">
            {monthlyChart && (
              <LineChart data={monthlyChart}
                plugins={{ legend: { display: false }, title: { display: false } }}
                scales={{ y: { beginAtZero: true } }}
                maintainAspectRatio={false}
              />
            )}
          </div>
        </Card>
        <Card title="Account Types" subtitle="Customer classification">
          <div className="h-[200px]">
            {accountTypeChart && (
              <PieChart data={accountTypeChart} title="" showLabels={true} maintainAspectRatio={false}
                plugins={{ legend: { position: 'bottom' }, title: { display: false } }}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Risk Level Distribution */}
      <Card title="Risk Level Distribution" subtitle="AML risk classification (Bank-Wide)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {Object.entries(RISK_COLORS).map(([level, color]) => {
            const count = stats.by_risk_level[level] ?? 0;
            const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : 0;
            return (
              <div key={level} className={`${color.bg} rounded-xl p-4`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-semibold ${color.text}`}>{level}</span>
                  <span className={`text-sm font-bold ${color.text}`}>
                    {Number(count).toLocaleString()} <span className="font-normal text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-2">
                  <div className={`${color.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Branch Summary Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FaBuilding className="text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900">Branch Summary</h2>
          <span className="text-xs text-gray-400 ml-auto">
            {branchesExHO.length} branches (excluding Head Office) — Click a branch to view details
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {branchesExHO.map((branch) => {
            const activePct = branch.total > 0
              ? ((branch.active / branch.total) * 100).toFixed(0)
              : 0;
            return (
              <motion.div key={branch.brcode}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setSelectedBranch(branch)}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg flex-shrink-0">
                      <FaBuilding className="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{branch.branch_name}</h3>
                      <p className="text-xs text-gray-400">{branch.brak}</p>
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 text-xs" />
                </div>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{branch.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">customers</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">{activePct}%</div>
                    <div className="text-xs text-gray-400">active</div>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-gray-100 flex overflow-hidden mb-3">
                  {branch.total > 0 && (
                    <>
                      <div className="bg-green-500 h-full"  style={{ width: `${(branch.active  / branch.total) * 100}%` }} />
                      <div className="bg-yellow-500 h-full" style={{ width: `${(branch.dormant / branch.total) * 100}%` }} />
                      <div className="bg-orange-500 h-full" style={{ width: `${(branch.escheat / branch.total) * 100}%` }} />
                      <div className="bg-red-500 h-full"    style={{ width: `${(branch.closed  / branch.total) * 100}%` }} />
                    </>
                  )}
                </div>

                <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                  <span title="Signature Cards"><FaIdCard className="inline text-indigo-400 mr-1" />{branch.sigcards}</span>
                  <span title="Documents"><FaFileAlt className="inline text-teal-400 mr-1" />{branch.documents}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Branch Breakdown Table */}
      <Card
        title="Branch Breakdown"
        subtitle="Customer statistics per branch"
        headerActions={
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <FaBuilding /> {branchesExHO.length} branches
          </span>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] text-xs uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-3 text-left text-white/70">Branch</th>
                <th className="px-3 py-3 text-center text-white/70">Total</th>
                <th className="px-3 py-3 text-center text-green-300">Active</th>
                <th className="px-3 py-3 text-center text-yellow-300">Dormant</th>
                <th className="px-3 py-3 text-center text-orange-300">Escheat</th>
                <th className="px-3 py-3 text-center text-red-300">Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branchesExHO.map((branch) => (
                <tr key={branch.brcode}
                  onClick={() => setSelectedBranch(branch)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 sm:px-6 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <FaBuilding className="text-blue-300 flex-shrink-0" />
                      <span>{branch.branch_name}</span>
                      <span className="text-xs text-gray-400">({branch.brak})</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-gray-900">{branch.total}</td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">{branch.active}</span></td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">{branch.dormant}</span></td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">{branch.escheat}</span></td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">{branch.closed}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200 text-gray-700 text-sm">
                <td className="px-4 sm:px-6 py-3">All Branches</td>
                <td className="px-3 py-3 text-center font-bold text-gray-900">{s.total_customers}</td>
                <td className="px-3 py-3 text-center text-green-700">{s.active}</td>
                <td className="px-3 py-3 text-center text-yellow-700">{s.dormant}</td>
                <td className="px-3 py-3 text-center text-orange-700">{s.escheat}</td>
                <td className="px-3 py-3 text-center text-red-700">{s.closed}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Recent Customer Uploads */}
      <Card
        title="Recent Customer Uploads"
        subtitle="Latest customers added to the system"
        headerActions={
          <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
            <FaUpload className="text-blue-400" /> Latest uploads
          </span>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] text-xs uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-3 text-left text-white/70">Customer</th>
                <th className="px-3 py-3 text-left text-white/70">Branch</th>
                <th className="px-3 py-3 text-center text-white/70">Type</th>
                <th className="px-3 py-3 text-center text-white/70">Status</th>
                <th className="px-3 py-3 text-left text-white/70">Uploaded By</th>
                <th className="px-3 py-3 text-left text-white/70">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recent_uploads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No customers uploaded yet.</td>
                </tr>
              ) : stats.recent_uploads.map((c) => {
                const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.active;
                return (
                  <tr key={c.id}
                    onClick={() => navigate(customerViewPath(c.id))}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 sm:px-6 py-3 font-medium text-gray-800">{c.full_name}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{c.branch ?? '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{c.account_type}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{c.status}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{c.uploader ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{c.uploaded_at}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};

export default BankDashboard;
