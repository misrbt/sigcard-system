import { Route } from "react-router-dom";
import TopNavLayout from "../components/layout/TopNavLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import ManagerDashboard from "../pages/manager/Dashboard.jsx";
import ManagerCustomers from "../pages/manager/Customers.jsx";
import ManagerDocuments from "../pages/manager/Documents.jsx";
import CustomerView from "../pages/user/CustomerView.jsx";
import Profile from "../pages/user/Profile.jsx";

const roles = ["manager", "admin"];

const withLayout = (element) => (
  <ProtectedRoute roles={roles}>
    <TopNavLayout userRole="manager">{element}</TopNavLayout>
  </ProtectedRoute>
);

const ManagerRoutes = () => {
  return (
    <>
      <Route path="/manager/dashboard"          element={withLayout(<ManagerDashboard />)} />
      <Route path="/manager/customers"          element={withLayout(<ManagerCustomers />)} />
      <Route path="/manager/customers/:id/view" element={withLayout(<CustomerView />)} />
      <Route path="/manager/documents"          element={withLayout(<ManagerDocuments />)} />
      <Route path="/manager/profile"            element={withLayout(<Profile />)} />
    </>
  );
};

export default ManagerRoutes;
