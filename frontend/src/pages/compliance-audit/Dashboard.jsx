import { FaShieldAlt, FaUsers, FaIdCard, FaFileAlt, FaCalendarDay } from 'react-icons/fa';
import api from '../../services/api';
import BankDashboard from '../../components/dashboard/BankDashboard';
import { useAuth } from '../../hooks/useAuth';

const OVERVIEW_TILES = [
  { title: 'Total Customers',        valueKey: 'total_customers', icon: <FaUsers />,       color: 'blue',   to: '/compliance/customers' },
  { title: 'Signature Card Uploads', valueKey: 'total_sigcards',  icon: <FaIdCard />,      color: 'indigo', to: '/compliance/customers' },
  { title: 'Total Documents',        valueKey: 'total_documents', icon: <FaFileAlt />,     color: 'teal',   to: '/compliance/customers' },
  { title: 'Today Uploads',          valueKey: 'today_uploads',   icon: <FaCalendarDay />, color: 'amber',  to: null                    },
];

const ROLE_TITLES = {
  compliance: 'Compliance Dashboard',
  audit:      'Audit Dashboard',
};

const ComplianceDashboard = () => {
  const { getPrimaryRole } = useAuth();
  const title = ROLE_TITLES[getPrimaryRole()] ?? 'Compliance Dashboard';

  return (
    <BankDashboard
      fetchData={async () => {
        const res = await api.get('/compliance/dashboard');
        return res.data;
      }}
      customersPath="/compliance/customers"
      customerViewPath={(id) => `/compliance/customers/${id}/view`}
      title={title}
      subtitle="RBT Bank Inc. — BSP-compliant oversight, all branches"
      titleIcon={<FaShieldAlt className="text-blue-500" />}
      overviewTiles={OVERVIEW_TILES}
    />
  );
};

export default ComplianceDashboard;
