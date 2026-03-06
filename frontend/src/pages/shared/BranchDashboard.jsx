import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import {
  FaUsers, FaCheckCircle, FaMoon, FaExclamationTriangle,
  FaLock, FaIdCard, FaUserTie, FaSync, FaBuilding, FaFileAlt, FaSitemap,
} from 'react-icons/fa';

const STATUS_COLORS = {
  active:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  dormant: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  escheat: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  closed:  { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

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

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FaExclamationTriangle className="text-4xl text-red-500" />
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={fetchDashboard} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-5 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-blue-200">
              Branch: <span className="font-semibold text-white">{data.branch?.branch_name ?? user?.branch?.branch_name ?? '—'}</span>
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors self-start sm:self-auto"
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Customers',  value: s.total_customers, icon: FaUsers,       color: 'text-blue-500',   bg: 'bg-blue-50',   link: `${basePath}/customers` },
          { label: 'Total Documents',  value: s.total_documents, icon: FaFileAlt,     color: 'text-teal-500',   bg: 'bg-teal-50',   link: `${basePath}/customers` },
          { label: "Today's Uploads",  value: s.today_uploads,   icon: FaIdCard,      color: 'text-indigo-500', bg: 'bg-indigo-50', link: `${basePath}/customers` },
          { label: 'Branch Users',     value: s.branch_users,    icon: FaUserTie,     color: 'text-purple-500', bg: 'bg-purple-50', link: null },
          { label: 'Active Customers', value: s.active,          icon: FaCheckCircle, color: 'text-green-500',  bg: 'bg-green-50',  link: `${basePath}/customers` },
        ].map(({ label, value, icon: Icon, color, bg, link }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={link ? { scale: 1.03 } : {}}
            onClick={link ? () => navigate(link) : undefined}
            className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4${link ? ' cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
            <div className={`${bg} p-3 rounded-xl flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString() ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Breakdown */}
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
              onClick={() => navigate(`${basePath}/customers`)}
              className={`${c.bg} rounded-xl p-4 flex flex-col gap-2 cursor-pointer`}
            >
              <div className={`flex items-center gap-2 ${c.text} text-sm font-medium`}>{icon} {label}</div>
              <div className={`text-2xl font-bold ${c.text}`}>{value?.toLocaleString()}</div>
              <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5">
                <div className={`${c.dot} h-full rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs ${c.text} opacity-75`}>{pct}% of total</span>
            </motion.div>
          );
        })}
      </div>

      {/* Account Type & Risk Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Account Types</h2>
          <div className="space-y-3">
            {Object.entries(data.by_account_type).map(([type, count]) => {
              const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>{type}</span>
                    <span>{Number(count).toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Risk Level Distribution</h2>
          <div className="space-y-3">
            {Object.entries(data.by_risk_level).map(([level, count]) => {
              const pct = s.total_customers > 0 ? ((count / s.total_customers) * 100).toFixed(1) : 0;
              const colorMap = {
                'Low Risk':    { bar: 'bg-green-500',  text: 'text-green-700'  },
                'Medium Risk': { bar: 'bg-yellow-500', text: 'text-yellow-700' },
                'High Risk':   { bar: 'bg-red-500',    text: 'text-red-700'    },
              };
              const c = colorMap[level] || { bar: 'bg-gray-400', text: 'text-gray-600' };
              return (
                <div key={level}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className={c.text}>{level}</span>
                    <span className="text-gray-600">{Number(count).toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${c.bar} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Uploads */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Monthly Customer Uploads (Last 6 Months)</h2>
        <div className="flex items-end gap-3 h-32">
          {data.monthly_uploads.map((m) => {
            const max = Math.max(...data.monthly_uploads.map((x) => x.count), 1);
            const pct = (m.count / max) * 100;
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-600">{m.count}</span>
                <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '80px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-[#1877F2] to-blue-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branch Lite Breakdown (only shown when manager has child branches) */}
      {data.branch_breakdown?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FaSitemap className="text-purple-400 text-sm" />
            <h2 className="text-sm font-bold text-gray-900">Branch Summary</h2>
            <span className="ml-auto text-xs text-gray-400">{data.branch_breakdown.length} branches</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left text-white/70">Branch</th>
                  <th className="px-4 py-3 text-center text-white/70">Total</th>
                  <th className="px-4 py-3 text-center text-white/70">Active</th>
                  <th className="px-4 py-3 text-center text-white/70">Dormant</th>
                  <th className="px-4 py-3 text-center text-white/70">Escheat</th>
                  <th className="px-4 py-3 text-center text-white/70">Closed</th>
                  <th className="px-4 py-3 text-center text-white/70">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.branch_breakdown.map((b, idx) => (
                  <tr key={b.branch_id} className={`hover:bg-gray-50 transition-colors ${idx === 0 ? 'font-semibold bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {idx === 0
                          ? <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          : <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />}
                        <div>
                          <p className="text-gray-800">{b.branch_name}</p>
                          <p className="text-xs text-gray-400 font-normal">{b.brak}</p>
                        </div>
                        {idx === 0 && <span className="ml-1 text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Mother</span>}
                        {idx > 0 && <span className="ml-1 text-xs font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">Lite</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{b.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-green-700">{b.active.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-yellow-700">{b.dormant.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-orange-700">{b.escheat.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-red-700">{b.closed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-indigo-700">{b.today_uploads.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FaBuilding className="text-blue-400 text-sm" />
          <h2 className="text-sm font-bold text-gray-900">Recent Customer Uploads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left text-white/70">Customer</th>
                {data.branch_breakdown?.length > 0 && (
                  <th className="px-4 py-3 text-left text-white/70">Branch</th>
                )}
                <th className="px-4 py-3 text-center text-white/70">Type</th>
                <th className="px-4 py-3 text-center text-white/70">Status</th>
                <th className="px-4 py-3 text-left text-white/70">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recent_uploads.length === 0 ? (
                <tr><td colSpan={data.branch_breakdown?.length > 0 ? 5 : 4} className="px-6 py-8 text-center text-gray-400">No customers uploaded yet.</td></tr>
              ) : data.recent_uploads.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.full_name}</td>
                  {data.branch_breakdown?.length > 0 && (
                    <td className="px-4 py-3 text-xs text-gray-500">{c.branch_name ?? '—'}</td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{c.account_type}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${STATUS_COLORS[c.status]?.bg ?? 'bg-gray-100'} ${STATUS_COLORS[c.status]?.text ?? 'text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.uploaded_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default BranchDashboard;
