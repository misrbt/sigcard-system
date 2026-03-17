import { Route } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import UserLayout from "../components/layout/UserLayout";
import Home from "../pages/user/Home.jsx";
import UploadSigcard from "../pages/user/UploadSigcard.jsx";
import CustomerProfiles from "../pages/user/CustomerProfiles.jsx";
import EditCustomerDocs from "../pages/user/EditCustomerDocs.jsx";
import CustomerView from "../pages/user/CustomerView.jsx";
import AddAccount from "../pages/user/AddAccount.jsx";
import Profile from "../pages/user/Profile.jsx";

const viewerRoles = ["user", "admin", "cashier"];

const withLayout = (element, roles) => (
  <ProtectedRoute roles={roles}>
    <UserLayout>{element}</UserLayout>
  </ProtectedRoute>
);

const UserRoutes = () => {
  return (
    <>
      <Route path="/user/dashboard"             element={withLayout(<Home />,             ["user", "admin"])} />
      <Route path="/user/upload"                element={withLayout(<UploadSigcard />,    ["user"])} />
      <Route path="/user/customers"             element={withLayout(<CustomerProfiles />, viewerRoles)} />
      <Route path="/user/customers/:id/view"    element={withLayout(<CustomerView />,     viewerRoles)} />
      <Route path="/user/customers/:id/edit"        element={withLayout(<EditCustomerDocs />, ["user"])} />
      <Route path="/user/customers/:id/add-account" element={withLayout(<AddAccount />,        ["user"])} />
      <Route path="/user/profile"               element={withLayout(<Profile />,          ["user"])} />
    </>
  );
};

export default UserRoutes;
