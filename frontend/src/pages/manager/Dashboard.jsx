import { useAuth } from '../../hooks/useAuth';
import BranchDashboard from '../shared/BranchDashboard';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const title = user ? `Welcome, ${user.firstname} ${user.lastname}` : 'Welcome';

  return <BranchDashboard title={title} apiEndpoint="/manager/dashboard" basePath="/manager" />;
};

export default ManagerDashboard;
