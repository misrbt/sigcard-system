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
import StatusTracking from "../pages/user/StatusTracking.jsx";

const withLayout = (element, permission = null) => (
  <ProtectedRoute roles={["user"]} permission={permission}>
    <UserLayout>{element}</UserLayout>
  </ProtectedRoute>
);

const UserRoutes = () => {
  return (
    <>
      <Route path="/user/dashboard"                  element={withLayout(<Home />)} />
      <Route path="/user/upload"                     element={withLayout(<UploadSigcard />,                       "create-customers")} />
      <Route path="/user/customers"                  element={withLayout(<CustomerProfiles basePath="/user" />,    "view-customers")} />
      <Route path="/user/customers/:id/view"         element={withLayout(<CustomerView basePath="/user" />,        "view-customers")} />
      <Route path="/user/customers/:id/edit"         element={withLayout(<EditCustomerDocs basePath="/user" />,    "edit-customers")} />
      <Route path="/user/customers/:id/add-account"  element={withLayout(<AddAccount basePath="/user" />,         "create-customers")} />
      <Route path="/user/status-tracking"             element={withLayout(<StatusTracking />,              "view-customers")} />
      <Route path="/user/profile"                    element={withLayout(<Profile />)} />
    </>
  );
};

export default UserRoutes;
