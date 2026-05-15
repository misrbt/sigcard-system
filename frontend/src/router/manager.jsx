import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import ManagerDashboard from "../pages/manager/Dashboard.jsx";
import CustomerProfiles from "../pages/user/CustomerProfiles.jsx";
import CustomerView from "../pages/user/CustomerView.jsx";
import EditCustomerDocs from "../pages/user/EditCustomerDocs.jsx";
import AddAccount from "../pages/user/AddAccount.jsx";
import UploadSigcard from "../pages/user/UploadSigcard.jsx";
import BranchDocuments from "../pages/shared/BranchDocuments.jsx";
import Profile from "../pages/user/Profile.jsx";

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
      <Route path="/manager/documents"                  element={withLayout(<BranchDocuments />, "view-customer-documents")} />
      <Route path="/manager/profile"                    element={withLayout(<Profile />)} />
    </>
  );
};

export default ManagerRoutes;
