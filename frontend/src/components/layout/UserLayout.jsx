import Navbar from "./Navbar";
import Footer from "../Footer";
import { useAuth } from "../../hooks/useAuth";

const NAV_LINKS = [
  { to: "/user/dashboard", label: "Home",              permission: null },
  { to: "/user/upload",    label: "Upload",            permission: "create-customers" },
  { to: "/user/customers", label: "Customer Profiles", permission: "view-customers" },
];

const UserLayout = ({ children }) => {
  const { hasPermission } = useAuth();
  const navLinks = NAV_LINKS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900">
      <Navbar navLinks={navLinks} />
      <main className="flex flex-1 flex-col w-full">{children}</main>
      <Footer />
    </div>
  );
};

export default UserLayout;
