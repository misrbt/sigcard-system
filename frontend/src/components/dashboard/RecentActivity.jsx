import { motion } from 'framer-motion';
import Card from '../ui/Card';

/**
 * ActivityItem Component - Single activity entry
 */
const ActivityItem = ({ activity, index }) => {
  const typeColors = {
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
    default: 'bg-gray-100 text-gray-600',
  };

  const iconBg = typeColors[activity.type] || typeColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start space-x-2 sm:space-x-3 md:space-x-4 py-3 sm:py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 px-2 rounded-lg transition-colors duration-150"
    >
      <div className={`${iconBg} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
        <div className="text-base sm:text-lg">{activity.icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-900 break-words">{activity.title}</p>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words line-clamp-2">{activity.description}</p>
        <div className="flex flex-wrap items-center mt-1 sm:mt-2 gap-x-2 sm:gap-x-4 gap-y-1">
          <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
          {activity.user && (
            <span className="text-xs text-gray-400 truncate">by {activity.user}</span>
          )}
        </div>
      </div>
      {activity.badge && (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600 flex-shrink-0 hidden sm:inline-block">
          {activity.badge}
        </span>
      )}
    </motion.div>
  );
};

/**
 * RecentActivity Component - Displays recent system activities
 */
const RecentActivity = ({ activities = [], maxItems = 5 }) => {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card
      title="Recent Activity"
      subtitle="Latest system activities and events"
      footer={
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activities →
        </button>
      }
    >
      {displayActivities.length > 0 ? (
        <div className="space-y-2">
          {displayActivities.map((activity, index) => (
            <ActivityItem key={index} activity={activity} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No recent activities</p>
        </div>
      )}
    </Card>
  );
};

export default RecentActivity;
