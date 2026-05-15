import { Route } from "react-router-dom";
import AppLayout from "@layouts/AppLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminDashboard from "../pages/admin/dashboard";
import UserManagement from "../pages/admin/UserManagement";
import RolePermissionMatrix from "../pages/admin/RolePermissionMatrix";
import AuditLogs from "../pages/admin/AuditLogs";
import SystemSettings from "../pages/admin/SystemSettings";
import DataManagement from "../pages/admin/DataManagement";
import BranchManagement from "../pages/admin/BranchManagement";
import CustomerProfiles from "../pages/user/CustomerProfiles";
import CustomerView from "../pages/user/CustomerView";
import Profile from "../pages/user/Profile.jsx";
import UploadSigcard from "../pages/user/UploadSigcard";
import EditCustomerDocs from "../pages/user/EditCustomerDocs";
import AddAccount from "../pages/user/AddAccount";
import ComplianceReports from "../pages/compliance-audit/Reports";
import ReportPreview from "../pages/compliance-audit/ReportPreview";
import BranchDetail from "../pages/compliance-audit/BranchDetail";
import BranchDocuments from "../pages/shared/BranchDocuments";

const AdminRoutes = () => {
  return (
    <>
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-users">
            <AppLayout userRole="admin">
              <UserManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-roles">
            <AppLayout userRole="admin">
              <RolePermissionMatrix />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-audit-logs">
            <AppLayout userRole="admin">
              <AuditLogs />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-system-settings">
            <AppLayout userRole="admin">
              <SystemSettings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/branches"
        element={
          <ProtectedRoute roles={["admin"]} permission="manage-branch-operations">
            <AppLayout userRole="admin">
              <BranchManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-management"
        element={
          <ProtectedRoute roles={["admin"]} permission="backup-system">
            <AppLayout userRole="admin">
              <DataManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-customers">
            <AppLayout userRole="admin">
              <CustomerProfiles basePath="/admin" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers/:id/view"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-customers">
            <AppLayout userRole="admin">
              <CustomerView basePath="/admin" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/upload"
        element={
          <ProtectedRoute roles={["admin"]} permission="create-customers">
            <AppLayout userRole="admin">
              <UploadSigcard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers/:id/edit"
        element={
          <ProtectedRoute roles={["admin"]} permission="edit-customers">
            <AppLayout userRole="admin">
              <EditCustomerDocs basePath="/admin" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers/:id/add-account"
        element={
          <ProtectedRoute roles={["admin"]} permission="create-customers">
            <AppLayout userRole="admin">
              <AddAccount basePath="/admin" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-compliance-reports">
            <AppLayout userRole="admin">
              <ComplianceReports basePath="/admin/reports" customersPath="/admin/customers" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/preview"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-compliance-reports">
            <AppLayout userRole="admin">
              <ReportPreview basePath="/admin/reports" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/branch/:branchId"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-compliance-reports">
            <AppLayout userRole="admin">
              <BranchDetail basePath="/admin/reports" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/documents"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-customer-documents">
            <AppLayout userRole="admin">
              <BranchDocuments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </>
  );
};

export default AdminRoutes;
