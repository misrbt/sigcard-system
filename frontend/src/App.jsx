import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthRoutes from "./router/auth.jsx";
import AdminRoutes from "./router/admin.jsx";
import UserRoutes from "./router/user.jsx";
import ComplianceRoutes from "./router/compliance.jsx";
import ManagerRoutes from "./router/manager.jsx";
import CashierRoutes from "./router/cashier.jsx";
import NotFound from "./NotFound.jsx";
import Unauthorized from "./pages/shared/Unauthorized.jsx";

function CrisChen() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Legacy / bare-role redirects → canonical dashboard paths */}
        <Route path="/admin"      element={<Navigate to="/admin/dashboard"      replace />} />
        <Route path="/cashier"    element={<Navigate to="/cashier/dashboard"    replace />} />
        <Route path="/compliance" element={<Navigate to="/compliance/dashboard" replace />} />
        <Route path="/user"       element={<Navigate to="/user/dashboard"       replace />} />
        <Route path="/users/home"       element={<Navigate to="/user/dashboard"            replace />} />
        <Route path="/users/customers"  element={<Navigate to="/user/customers"            replace />} />
        <Route path="/users/upload"     element={<Navigate to="/user/upload"               replace />} />

        {/* Auth Routes */}
        {AuthRoutes()}

        {/* Admin Routes */}
        {AdminRoutes()}

        {/* User Routes */}
        {UserRoutes()}

        {/* Compliance Routes */}
        {ComplianceRoutes()}

        {/* Manager Routes */}
        {ManagerRoutes()}

        {/* Cashier Routes */}
        {CashierRoutes()}

        {/* Unauthorized */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default CrisChen;
