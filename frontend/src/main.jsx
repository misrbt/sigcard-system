import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CrisChen from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { AppConfigProvider } from "./context/AppConfigContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppConfigProvider>
      <AuthProvider>
        <CrisChen />
      </AuthProvider>
    </AppConfigProvider>
  </StrictMode>
);
