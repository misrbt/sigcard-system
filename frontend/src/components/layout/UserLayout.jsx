import Navbar from "./Navbar";
import Footer from "../Footer";
import { useAuth } from "../../hooks/useAuth";

const NAV_LINKS = {
  default: [
    { to: "/users/home",      label: "Home" },
    { to: "/users/upload",    label: "Upload" },
    { to: "/users/customers", label: "Customer Profiles" },
  ],
  cashier: [
    { to: "/users/customers", label: "Customer Profiles" },
  ],
};

const UserLayout = ({ children }) => {
  const { hasRole } = useAuth();
  const navLinks = hasRole("cashier") ? NAV_LINKS.cashier : NAV_LINKS.default;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900">
      <Navbar navLinks={navLinks} />
      <main className="flex flex-1 flex-col w-full">{children}</main>
      <Footer />
    </div>
  );
};

export default UserLayout;
