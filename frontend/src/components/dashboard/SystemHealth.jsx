import { motion } from 'framer-motion';
import Card from '../ui/Card';

/**
 * HealthMetric Component - Individual system health metric
 */
const HealthMetric = ({ label, value, maxValue, status, index }) => {
  const percentage = (value / maxValue) * 100;

  const statusColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  const statusTextColors = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-3 sm:mb-4 last:mb-0"
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">{label}</span>
        <span className={`text-xs sm:text-sm font-semibold ${statusTextColors[status]} whitespace-nowrap`}>
          {value}{maxValue && `/${maxValue}`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={`h-full ${statusColors[status]} rounded-full`}
        />
      </div>
    </motion.div>
  );
};

/**
 * StatusBadge Component - Overall system status badge
 */
const StatusBadge = ({ status }) => {
  const statusConfig = {
    operational: {
      label: 'All Systems Operational',
      shortLabel: 'Operational',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: '✓',
    },
    warning: {
      label: 'Minor Issues Detected',
      shortLabel: 'Warning',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: '⚠',
    },
    critical: {
      label: 'Critical Issues',
      shortLabel: 'Critical',
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: '✕',
    },
  };

  const config = statusConfig[status] || statusConfig.operational;

  return (
    <div
      className={`${config.color} border px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg flex items-center space-x-1 sm:space-x-2`}
    >
      <span className="text-base sm:text-lg">{config.icon}</span>
      <span className="text-xs sm:text-sm font-semibold">
        <span className="hidden md:inline">{config.label}</span>
        <span className="md:hidden">{config.shortLabel}</span>
      </span>
    </div>
  );
};

/**
 * SystemHealth Component - Displays system health metrics
 */
const SystemHealth = ({ metrics = [], overallStatus = 'operational' }) => {
  return (
    <Card
      title="System Health"
      subtitle="Monitor system performance and resources"
      headerActions={<StatusBadge status={overallStatus} />}
    >
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <HealthMetric
            key={index}
            label={metric.label}
            value={metric.value}
            maxValue={metric.maxValue}
            status={metric.status}
            index={index}
          />
        ))}
      </div>

      <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">99.9%</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">Uptime</p>
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">45ms</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:inline">Avg Response</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 sm:hidden">Response</p>
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">Errors/hr</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SystemHealth;
