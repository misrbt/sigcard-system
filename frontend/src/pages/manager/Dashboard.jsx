import BranchDashboard from '../shared/BranchDashboard';

const ManagerDashboard = () => (
  <BranchDashboard title="Dashboard" apiEndpoint="/manager/dashboard" basePath="/manager" />
);

export default ManagerDashboard;
