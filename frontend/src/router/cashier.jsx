import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import CashierDashboard from "../pages/cashier/Dashboard";
import CashierCustomers from "../pages/cashier/Customers";
import CashierDocuments from "../pages/cashier/Documents";
import CustomerView from "../pages/user/CustomerView.jsx";
import Profile from "../pages/user/Profile.jsx";

const roles = ["cashier", "admin"];

const withLayout = (element) => (
  <ProtectedRoute roles={roles}>
    <TopNavLayout userRole="cashier">{element}</TopNavLayout>
  </ProtectedRoute>
);

const CashierRoutes = () => {
  return (
    <>
      <Route path="/cashier/dashboard"          element={withLayout(<CashierDashboard />)} />
      <Route path="/cashier/customers"          element={withLayout(<CashierCustomers />)} />
      <Route path="/cashier/customers/:id/view" element={withLayout(<CustomerView />)} />
      <Route path="/cashier/documents"          element={withLayout(<CashierDocuments />)} />
      <Route path="/cashier/profile"            element={withLayout(<Profile />)} />
    </>
  );
};

export default CashierRoutes;
