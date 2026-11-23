import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CrisChen from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { AppConfigProvider } from "./context/AppConfigContext";

// After a new version is deployed, the old screen files are removed. A browser tab that
// was opened before the update then fails to open a screen ("Failed to fetch dynamically
// imported module"). Reload once to pick up the new version; the time guard prevents a
// reload loop if the server itself is down.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "digicur_reloaded_for_update_at";
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last < 30_000) return;
  event.preventDefault();
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ }
  window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppConfigProvider>
      <AuthProvider>
        <CrisChen />
      </AuthProvider>
    </AppConfigProvider>
  </StrictMode>
);
