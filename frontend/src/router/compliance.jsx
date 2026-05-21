import { lazy } from "react";
import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";

const ComplianceAuditDashboard = lazy(() => import("../pages/compliance-audit/Dashboard.jsx"));
const ComplianceReports        = lazy(() => import("../pages/compliance-audit/Reports.jsx"));
const ReportPreview            = lazy(() => import("../pages/compliance-audit/ReportPreview.jsx"));
const BranchDetail             = lazy(() => import("../pages/compliance-audit/BranchDetail.jsx"));
const AuditLogs                = lazy(() => import("../pages/admin/AuditLogs.jsx"));
const CustomerProfiles         = lazy(() => import("../pages/user/CustomerProfiles.jsx"));
const CustomerView             = lazy(() => import("../pages/user/CustomerView.jsx"));
const BranchDocuments          = lazy(() => import("../pages/shared/BranchDocuments.jsx"));
const Profile                  = lazy(() => import("../pages/user/Profile.jsx"));

const ALLOWED_ROLES = ["compliance", "audit", "admin"];
const COMPLIANCE_LAYOUT_ROLES = ["compliance", "audit"];

const WithComplianceLayout = ({ children, permission = null }) => {
  const { getPrimaryRole } = useAuth();
  const primaryRole = getPrimaryRole();
  const layoutRole = COMPLIANCE_LAYOUT_ROLES.includes(primaryRole)
    ? primaryRole
    : "compliance";
  return (
    <ProtectedRoute roles={ALLOWED_ROLES} permission={permission}>
      <TopNavLayout userRole={layoutRole}>{children}</TopNavLayout>
    </ProtectedRoute>
  );
};

const ComplianceRoutes = () => {
  return (
    <>
      <Route path="/compliance/dashboard"                   element={<WithComplianceLayout permission="view-compliance-reports"><ComplianceAuditDashboard /></WithComplianceLayout>} />
      <Route path="/compliance/audit-logs"                  element={<WithComplianceLayout permission="view-audit-logs"><AuditLogs apiEndpoint="/compliance/audit-logs" /></WithComplianceLayout>} />
      <Route path="/compliance/reports"                     element={<WithComplianceLayout permission="view-compliance-reports"><ComplianceReports /></WithComplianceLayout>} />
      <Route path="/compliance/reports/preview"             element={<WithComplianceLayout permission="view-compliance-reports"><ReportPreview /></WithComplianceLayout>} />
      <Route path="/compliance/reports/branch/:branchId"   element={<WithComplianceLayout permission="view-compliance-reports"><BranchDetail /></WithComplianceLayout>} />
      <Route path="/compliance/customers"          element={<WithComplianceLayout permission="view-customers"><CustomerProfiles basePath="/compliance" onlyTab="table" /></WithComplianceLayout>} />
      <Route path="/compliance/customers/:id/view" element={<WithComplianceLayout permission="view-customers"><CustomerView basePath="/compliance" /></WithComplianceLayout>} />
      <Route path="/compliance/documents"          element={<WithComplianceLayout permission="view-customer-documents"><BranchDocuments /></WithComplianceLayout>} />
      <Route path="/compliance/profile"                          element={<WithComplianceLayout><Profile /></WithComplianceLayout>} />
    </>
  );
};

export default ComplianceRoutes;
