import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import CashierDashboard from "../pages/cashier/Dashboard";
import CustomerProfiles from "../pages/user/CustomerProfiles.jsx";
import CustomerView from "../pages/user/CustomerView.jsx";
import BranchDocuments from "../pages/shared/BranchDocuments.jsx";
import Profile from "../pages/user/Profile.jsx";

const withLayout = (element, permission = null) => (
  <ProtectedRoute roles={["cashier"]} permission={permission}>
    <TopNavLayout userRole="cashier">{element}</TopNavLayout>
  </ProtectedRoute>
);

const CashierRoutes = () => {
  return (
    <>
      <Route path="/cashier/dashboard"          element={withLayout(<CashierDashboard />)} />
      <Route path="/cashier/customers"          element={withLayout(<CustomerProfiles basePath="/cashier" branchScoped />, "view-customers")} />
      <Route path="/cashier/customers/:id/view" element={withLayout(<CustomerView basePath="/cashier" />, "view-customers")} />
      <Route path="/cashier/documents"          element={withLayout(<BranchDocuments />, "view-customer-documents")} />
      <Route path="/cashier/profile"            element={withLayout(<Profile />)} />
    </>
  );
};

export default CashierRoutes;
