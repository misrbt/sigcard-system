import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import ComplianceAuditDashboard from "../pages/compliance-audit/Dashboard.jsx";
import AuditLogs from "../pages/admin/AuditLogs.jsx";
import CustomerProfiles from "../pages/admin/CustomerProfiles.jsx";
import CustomerView from "../pages/admin/CustomerView.jsx";
import Profile from "../pages/user/Profile.jsx";

const roles = ["compliance-audit", "admin"];

const withLayout = (element) => (
  <ProtectedRoute roles={roles}>
    <TopNavLayout userRole="compliance-audit">{element}</TopNavLayout>
  </ProtectedRoute>
);

const ComplianceRoutes = () => {
  return (
    <>
      <Route path="/compliance/dashboard"           element={withLayout(<ComplianceAuditDashboard />)} />
      <Route path="/compliance/audit-logs"          element={withLayout(<AuditLogs apiEndpoint="/compliance/audit-logs" />)} />
      <Route path="/compliance/customers"           element={withLayout(<CustomerProfiles basePath="/compliance" />)} />
      <Route path="/compliance/customers/:id/view"  element={withLayout(<CustomerView basePath="/compliance" />)} />
      <Route path="/compliance/profile"             element={withLayout(<Profile />)} />
    </>
  );
};

export default ComplianceRoutes;
