import { Route } from "react-router-dom";
import AppLayout from "@layouts/AppLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminDashboard from "../pages/admin/dashboard";
import UserManagement from "../pages/admin/UserManagement";
import RolePermissionMatrix from "../pages/admin/RolePermissionMatrix";
import AuditLogs from "../pages/admin/AuditLogs";
import SystemSettings from "../pages/admin/SystemSettings";
import DataManagement from "../pages/admin/DataManagement";
import AdminCustomerProfiles from "../pages/admin/CustomerProfiles";
import AdminCustomerView from "../pages/admin/CustomerView";
import AddAccount from "../pages/user/AddAccount.jsx";
import Profile from "../pages/user/Profile.jsx";

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
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <UserManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <RolePermissionMatrix />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <AuditLogs />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <SystemSettings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-management"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <DataManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <AdminCustomerProfiles />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers/:id/view"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <AdminCustomerView />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers/:id/add-account"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout userRole="admin">
              <AddAccount />
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
