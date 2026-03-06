import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendUp = true,
  bgColor = 'bg-blue-500',
  iconColor = 'text-blue-500',
  subtitle,
  to,
}) => {
  const inner = (
    <div className="flex items-start justify-between gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
        <h3 className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 break-words">{value}</h3>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        )}
        {trend && (
          <div className="flex flex-wrap items-center mt-1 sm:mt-2 gap-1">
            <span className={`text-xs sm:text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
            <span className="text-xs text-gray-500 hidden xs:inline">vs last month</span>
          </div>
        )}
      </div>
      <div className={`${bgColor} bg-opacity-10 p-2 sm:p-3 rounded-lg flex-shrink-0`}>
        <div className={`${iconColor} text-xl sm:text-2xl`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all duration-200${to ? ' cursor-pointer' : ''}`}
    >
      {to ? <Link to={to} className="block">{inner}</Link> : inner}
    </motion.div>
  );
};

export default StatCard;
