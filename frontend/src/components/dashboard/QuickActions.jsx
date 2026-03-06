import { motion } from 'framer-motion';
import Card from '../ui/Card';

/**
 * QuickActionButton Component - Individual action button
 */
const QuickActionButton = ({ icon, label, onClick, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    green: 'bg-green-50 hover:bg-green-100 text-green-600',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600',
    red: 'bg-red-50 hover:bg-red-100 text-red-600',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${colorClasses[color]} flex flex-col items-center justify-center p-4 sm:p-5 md:p-6 rounded-lg transition-colors duration-200 w-full group min-h-[100px] sm:min-h-[110px] md:min-h-[120px]`}
    >
      <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>
      <span className="text-xs sm:text-sm font-medium text-center leading-tight">{label}</span>
    </motion.button>
  );
};

/**
 * QuickActions Component - Grid of quick action buttons for admin
 */
const QuickActions = ({ actions = [] }) => {
  return (
    <Card title="Quick Actions" subtitle="Common administrative tasks">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {actions.map((action, index) => (
          <QuickActionButton
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.onClick}
            color={action.color}
          />
        ))}
      </div>
    </Card>
  );
};

export default QuickActions;
