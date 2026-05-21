import { lazy } from "react";
import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";

const CashierDashboard = lazy(() => import("../pages/cashier/Dashboard"));
const CustomerProfiles = lazy(() => import("../pages/user/CustomerProfiles.jsx"));
const CustomerView     = lazy(() => import("../pages/user/CustomerView.jsx"));
const BranchDocuments  = lazy(() => import("../pages/shared/BranchDocuments.jsx"));
const Profile          = lazy(() => import("../pages/user/Profile.jsx"));

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
