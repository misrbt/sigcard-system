import { useAuth } from '../../hooks/useAuth';
import BranchDashboard from '../shared/BranchDashboard';

const CashierDashboard = () => {
  const { user } = useAuth();
  const title = user ? `Welcome, ${user.firstname} ${user.lastname}` : 'Welcome';

  return <BranchDashboard title={title} apiEndpoint="/cashier/dashboard" basePath="/cashier" />;
};

export default CashierDashboard;
