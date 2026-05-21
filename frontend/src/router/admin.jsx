import { lazy } from "react";
import { Route } from "react-router-dom";
import AppLayout from "@layouts/AppLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";

const AdminDashboard      = lazy(() => import("../pages/admin/dashboard"));
const UserManagement      = lazy(() => import("../pages/admin/UserManagement"));
const RolePermissionMatrix = lazy(() => import("../pages/admin/RolePermissionMatrix"));
const AuditLogs           = lazy(() => import("../pages/admin/AuditLogs"));
const SystemSettings      = lazy(() => import("../pages/admin/SystemSettings"));
const DataManagement      = lazy(() => import("../pages/admin/DataManagement"));
const BranchManagement    = lazy(() => import("../pages/admin/BranchManagement"));
const CustomerProfiles    = lazy(() => import("../pages/user/CustomerProfiles"));
const CustomerView        = lazy(() => import("../pages/user/CustomerView"));
const Profile             = lazy(() => import("../pages/user/Profile"));
const UploadSigcard       = lazy(() => import("../pages/user/UploadSigcard"));
const EditCustomerDocs    = lazy(() => import("../pages/user/EditCustomerDocs"));
const AddAccount          = lazy(() => import("../pages/user/AddAccount"));
const StatusTracking      = lazy(() => import("../pages/user/StatusTracking"));
const ComplianceReports   = lazy(() => import("../pages/compliance-audit/Reports"));
const ReportPreview       = lazy(() => import("../pages/compliance-audit/ReportPreview"));
const BranchDetail        = lazy(() => import("../pages/compliance-audit/BranchDetail"));
const BranchDocuments     = lazy(() => import("../pages/shared/BranchDocuments"));

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
        path="/admin/status-tracking"
        element={
          <ProtectedRoute roles={["admin"]} permission="view-customers">
            <AppLayout userRole="admin">
              <StatusTracking />
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
