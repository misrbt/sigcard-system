import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CrisChen from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CrisChen />
    </AuthProvider>
  </StrictMode>
);
