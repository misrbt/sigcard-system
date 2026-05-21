import { lazy } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import UserLayout from "../components/layout/UserLayout";

const Home             = lazy(() => import("../pages/user/Home.jsx"));
const UploadSigcard    = lazy(() => import("../pages/user/UploadSigcard.jsx"));
const CustomerProfiles = lazy(() => import("../pages/user/CustomerProfiles.jsx"));
const EditCustomerDocs = lazy(() => import("../pages/user/EditCustomerDocs.jsx"));
const CustomerView     = lazy(() => import("../pages/user/CustomerView.jsx"));
const AddAccount       = lazy(() => import("../pages/user/AddAccount.jsx"));
const Profile          = lazy(() => import("../pages/user/Profile.jsx"));
const StatusTracking   = lazy(() => import("../pages/user/StatusTracking.jsx"));

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
