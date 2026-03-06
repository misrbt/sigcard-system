import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  FaUserTie,
  FaSync,
  FaShieldAlt,
} from 'react-icons/fa';
import api from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import Card from '../../components/ui/Card';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';
import PieChart from '../../components/charts/PieChart';

const STATUS_COLORS = {
  active:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  dormant: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  escheat: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  closed:  { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

const ComplianceDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/compliance/dashboard');
      setStats(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Chart data builders ───────────────────────────────────────────────────

  const branchCustomersChart = stats
    ? (() => {
        const branches = stats.by_branch.filter((b) => b.branch_name !== 'Head Office');
        return {
          labels: branches.map((b) => b.branch_name || b.brak),
          datasets: [
            {
              label: 'Active',
              data: branches.map((b) => b.active),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
            },
            {
              label: 'Dormant',
              data: branches.map((b) => b.dormant),
              backgroundColor: 'rgba(251, 191, 36, 0.8)',
            },
            {
              label: 'Escheat',
              data: branches.map((b) => b.escheat),
              backgroundColor: 'rgba(249, 115, 22, 0.8)',
            },
            {
              label: 'Closed',
              data: branches.map((b) => b.closed),
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
            },
          ],
        };
      })()
    : null;

  const sigcardsBranchChart = stats
    ? {
        labels: stats.sigcards_by_branch.map((b) => b.branch_name || b.brak),
        datasets: [
          {
            label: 'SigCard Uploads',
            data: stats.sigcards_by_branch.map((b) => b.count),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
        ],
      }
    : null;

  const statusPieChart = stats
    ? {
        labels: ['Active', 'Dormant', 'Escheat', 'Closed'],
        datasets: [
          {
            data: [
              stats.summary.active,
              stats.summary.dormant,
              stats.summary.escheat,
              stats.summary.closed,
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.85)',
              'rgba(251, 191, 36, 0.85)',
              'rgba(249, 115, 22, 0.85)',
              'rgba(239, 68, 68, 0.85)',
            ],
            borderColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626'],
            borderWidth: 2,
          },
        ],
      }
    : null;

  const monthlyChart = stats
    ? {
        labels: stats.monthly_uploads.map((m) => m.label),
        datasets: [
          {
            label: 'Customers Uploaded',
            data: stats.monthly_uploads.map((m) => m.count),
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      }
    : null;

  const accountTypeChart = stats
    ? {
        labels: Object.keys(stats.by_account_type),
        datasets: [
          {
            label: 'Customers',
            data: Object.values(stats.by_account_type),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)',
              'rgba(20, 184, 166, 0.8)',
            ],
          },
        ],
      }
    : null;

  // ── Skeleton loader ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-72 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FaExclamationTriangle className="text-4xl text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const s = stats.summary;

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FaShieldAlt className="text-blue-500" />
            Compliance & Audit Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            RBT Bank Inc. — BSP-compliant oversight, all branches
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <FaSync className="text-gray-500" />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Row 1: Summary Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          title="Total Customers"
          value={s.total_customers.toLocaleString()}
          icon={<FaUsers />}
          bgColor="bg-blue-500"
          iconColor="text-blue-500"
          subtitle={`${s.active.toLocaleString()} active`}
          to="/compliance/customers"
        />
        <StatCard
          title="SigCard Uploads"
          value={s.total_sigcards.toLocaleString()}
          icon={<FaIdCard />}
          bgColor="bg-indigo-500"
          iconColor="text-indigo-500"
          subtitle="Total signature cards"
          to="/compliance/customers"
        />
        <StatCard
          title="Total Documents"
          value={s.total_documents.toLocaleString()}
          icon={<FaFileAlt />}
          bgColor="bg-teal-500"
          iconColor="text-teal-500"
          subtitle="All uploaded files"
          to="/compliance/customers"
        />
        <StatCard
          title="System Users"
          value={s.total_users.toLocaleString()}
          icon={<FaUserTie />}
          bgColor="bg-purple-500"
          iconColor="text-purple-500"
          subtitle="Staff accounts"
        />
      </div>

      {/* ── Row 2: Customer Status Breakdown ─────────────────────────────── */}
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
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/compliance/customers')}
              className={`${c.bg} rounded-xl p-4 flex flex-col gap-2 cursor-pointer`}
            >
              <div className={`flex items-center gap-2 ${c.text} text-sm font-medium`}>
                {icon}
                {label}
              </div>
              <div className={`text-2xl font-bold ${c.text}`}>
                {value.toLocaleString()}
              </div>
              <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5">
                <div
                  className={`${c.dot} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs ${c.text} opacity-75`}>{pct}% of total</span>
            </motion.div>
          );
        })}
      </div>

      {/* ── Row 3: Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Customers by Branch stacked bar */}
        <Card
          title="Customers by Branch"
          subtitle="All branches — status breakdown"
          className="lg:col-span-2"
        >
          <div className="h-[280px] sm:h-[320px]">
            {branchCustomersChart && (
              <BarChart
                data={branchCustomersChart}
                title=""
                maintainAspectRatio={false}
                plugins={{ legend: { position: 'top' }, title: { display: false } }}
                scales={{ x: { stacked: true }, y: { stacked: true, beginAtZero: true } }}
              />
            )}
          </div>
        </Card>

        {/* Status Pie */}
        <Card title="Status Distribution" subtitle="Overall customer status">
          <div className="h-[280px] sm:h-[320px]">
            {statusPieChart && (
              <PieChart
                data={statusPieChart}
                title=""
                showLabels={true}
                plugins={{ legend: { position: 'bottom' }, title: { display: false } }}
                maintainAspectRatio={false}
              />
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 4: Monthly Trend + SigCards by Branch ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly upload trend */}
        <Card title="Monthly Customer Uploads" subtitle="Last 6 months">
          <div className="h-[150px] sm:h-[170px]">
            {monthlyChart && (
              <LineChart
                data={monthlyChart}
                height={260}
                plugins={{ legend: { display: false }, title: { display: false } }}
                scales={{ y: { beginAtZero: true } }}
                maintainAspectRatio={false}
              />
            )}
          </div>
        </Card>

        {/* SigCard Uploads by Branch */}
        <Card title="SigCard Uploads by Branch" subtitle="Signature cards per branch">
          <div className="h-[100px] sm:h-[120px]">
            {sigcardsBranchChart && (
              <BarChart
                data={sigcardsBranchChart}
                title=""
                maintainAspectRatio={false}
                plugins={{ legend: { display: false }, title: { display: false } }}
                scales={{ y: { beginAtZero: true } }}
                barPercentage={0.2}
                categoryPercentage={0.3}
              />
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 5: Account Type + Risk Level ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Account type chart */}
        <Card title="Account Types" subtitle="Customer account classification">
          <div className="h-[150px]">
            {accountTypeChart && (
              <PieChart
                data={accountTypeChart}
                title=""
                showLabels={true}
                plugins={{ legend: { position: 'right' }, title: { display: false } }}
                maintainAspectRatio={false}
              />
            )}
          </div>
        </Card>

        {/* Risk level breakdown */}
        <Card title="Risk Level Distribution" subtitle="AML risk classification">
          <div className="space-y-3 mt-2">
            {[
              { level: 'Low Risk',    bar: 'bg-green-500',  text: 'text-green-700'  },
              { level: 'Medium Risk', bar: 'bg-yellow-500', text: 'text-yellow-700' },
              { level: 'High Risk',   bar: 'bg-red-500',    text: 'text-red-700'    },
            ].map(({ level, bar, text }) => {
              const count = stats.by_risk_level[level] ?? 0;
              const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : 0;
              return (
                <div key={level}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${text}`}>{level}</span>
                    <span className="text-sm text-gray-600">
                      {Number(count).toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${bar} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Branch summary quick stats */}
        <Card title="Branch Summary" subtitle="Top 5 branches by customers">
          <div className="space-y-2 mt-1">
            {[...stats.by_branch]
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((branch) => (
                <div
                  key={branch.brcode}
                  className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <FaBuilding className="text-blue-400 text-xs flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate max-w-[140px]">
                      {branch.branch_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {branch.total}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                      {branch.active} active
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* ── Row 6: Branch Detail Table ───────────────────────────────────── */}
      <Card
        title="Branch Breakdown"
        subtitle="Detailed customer and SigCard statistics per branch"
        headerActions={
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <FaBuilding /> {stats.by_branch.length} branches
          </span>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 sm:px-6 py-3 text-left">Branch</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">Total</th>
                <th className="px-3 py-3 text-center text-green-700">Active</th>
                <th className="px-3 py-3 text-center text-yellow-700">Dormant</th>
                <th className="px-3 py-3 text-center text-orange-700">Escheat</th>
                <th className="px-3 py-3 text-center text-red-700">Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.by_branch.map((branch) => (
                <tr key={branch.brcode} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <FaBuilding className="text-blue-300 flex-shrink-0" />
                      <span>{branch.branch_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-gray-900">{branch.total}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                      {branch.active}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
                      {branch.dormant}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                      {branch.escheat}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                      {branch.closed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200 text-gray-800">
                <td className="px-4 sm:px-6 py-3">Total</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-center font-bold">{s.total_customers}</td>
                <td className="px-3 py-3 text-center text-green-700">{s.active}</td>
                <td className="px-3 py-3 text-center text-yellow-700">{s.dormant}</td>
                <td className="px-3 py-3 text-center text-orange-700">{s.escheat}</td>
                <td className="px-3 py-3 text-center text-red-700">{s.closed}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* ── Row 7: Recent SigCard Uploads ────────────────────────────────── */}
      <Card
        title="Recent Customer Uploads"
        subtitle="Latest 8 customers added to the system"
        headerActions={
          <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
            <FaUpload className="text-blue-400" /> Latest uploads
          </span>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 sm:px-6 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left">Branch</th>
                <th className="px-3 py-3 text-center">Type</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-left">Uploaded By</th>
                <th className="px-3 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recent_uploads.map((c) => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.active;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-medium text-gray-800">
                      {c.full_name}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{c.branch ?? '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {c.account_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{c.uploader ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {c.uploaded_at}
                    </td>
                  </tr>
                );
              })}
              {stats.recent_uploads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No customers uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ComplianceDashboard;
