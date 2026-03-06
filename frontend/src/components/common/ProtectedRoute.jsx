import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, hasRole, sessionExpired } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass session_expired flag so Login page can show a message
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          sessionExpired: sessionExpired || false,
        }}
      />
    );
  }

  if (roles.length > 0 && !hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
