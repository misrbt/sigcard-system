import { lazy } from "react";
import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";

const ManagerDashboard = lazy(() => import("../pages/manager/Dashboard.jsx"));
const CustomerProfiles = lazy(() => import("../pages/user/CustomerProfiles.jsx"));
const CustomerView     = lazy(() => import("../pages/user/CustomerView.jsx"));
const EditCustomerDocs = lazy(() => import("../pages/user/EditCustomerDocs.jsx"));
const AddAccount       = lazy(() => import("../pages/user/AddAccount.jsx"));
const UploadSigcard    = lazy(() => import("../pages/user/UploadSigcard.jsx"));
const BranchDocuments  = lazy(() => import("../pages/shared/BranchDocuments.jsx"));
const StatusTracking   = lazy(() => import("../pages/user/StatusTracking.jsx"));
const Profile          = lazy(() => import("../pages/user/Profile.jsx"));

const withLayout = (element, permission = null) => (
  <ProtectedRoute roles={["manager"]} permission={permission}>
    <TopNavLayout userRole="manager">{element}</TopNavLayout>
  </ProtectedRoute>
);

const ManagerRoutes = () => {
  return (
    <>
      <Route path="/manager/dashboard"                  element={withLayout(<ManagerDashboard />)} />
      <Route path="/manager/customers"                  element={withLayout(<CustomerProfiles basePath="/manager" branchScoped />, "view-customers")} />
      <Route path="/manager/customers/:id/view"         element={withLayout(<CustomerView basePath="/manager" />, "view-customers")} />
      <Route path="/manager/customers/:id/edit"         element={withLayout(<EditCustomerDocs basePath="/manager" />, "edit-customers")} />
      <Route path="/manager/customers/:id/add-account"  element={withLayout(<AddAccount basePath="/manager" />, "create-customers")} />
      <Route path="/manager/upload"                     element={withLayout(<UploadSigcard />, "create-customers")} />
      <Route path="/manager/status-tracking"             element={withLayout(<StatusTracking />, "view-customers")} />
      <Route path="/manager/documents"                  element={withLayout(<BranchDocuments />, "view-customer-documents")} />
      <Route path="/manager/profile"                    element={withLayout(<Profile />)} />
    </>
  );
};

export default ManagerRoutes;
