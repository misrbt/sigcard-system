import { FaShieldAlt, FaUsers, FaIdCard, FaFileAlt, FaUserTie, FaBuilding, FaCalendarDay } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import BankDashboard from '../../components/dashboard/BankDashboard';

const OVERVIEW_TILES = [
  { title: 'Total Customers', valueKey: 'total_customers', icon: <FaUsers />,       color: 'blue',   to: '/admin/customers' },
  { title: 'SigCard Uploads', valueKey: 'total_sigcards',  icon: <FaIdCard />,      color: 'indigo', to: '/admin/customers' },
  { title: 'Total Documents', valueKey: 'total_documents', icon: <FaFileAlt />,     color: 'teal',   to: '/admin/customers' },
  { title: 'System Users',    valueKey: 'total_users',     icon: <FaUserTie />,     color: 'purple', to: '/admin/users'     },
  { title: 'Branches',        valueKey: 'total_branches',  icon: <FaBuilding />,    color: 'cyan',   to: null               },
  { title: 'Today Uploads',   valueKey: 'today_uploads',   icon: <FaCalendarDay />, color: 'amber',  to: null               },
];

const AdminDashboard = () => (
  <BankDashboard
    fetchData={async () => {
      const res = await adminService.getDashboardStats();
      return res.data;
    }}
    customersPath="/admin/customers"
    customerViewPath={(id) => `/admin/customers/${id}/view`}
    title="Admin Dashboard"
    subtitle="RBT Bank Inc. — Signature Card Management Overview"
    titleIcon={<FaShieldAlt className="text-blue-500" />}
    overviewTiles={OVERVIEW_TILES}
  />
);

export default AdminDashboard;
