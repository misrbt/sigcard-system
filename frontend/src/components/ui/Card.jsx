import { motion } from 'framer-motion';

const Card = ({
  children,
  title,
  subtitle,
  footer,
  variant = 'default',
  hoverable = false,
  className = '',
  headerActions,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';

  const variants = {
    default: '',
    elevated: 'shadow-lg',
    bordered: 'border-2',
    outline: 'border-2 border-blue-200 bg-blue-50'
  };

  const hoverableClasses = hoverable ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : '';

  return (
    <motion.div
      initial={hoverable ? { scale: 1 } : false}
      whileHover={hoverable ? { scale: 1.02 } : {}}
      className={`${baseClasses} ${variants[variant]} ${hoverableClasses} ${className}`}
      {...props}
    >
      {(title || subtitle || headerActions) && (
        <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4">
        {children}
      </div>

      {footer && (
        <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default Card;