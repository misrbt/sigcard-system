import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";

const FALLBACK_CONFIG = {
  customer_statuses:   ["active", "dormant", "reactivated", "escheat", "closed"],
  account_types:       ["Regular", "Joint", "Corporate"],
  joint_sub_types:     ["ITF", "Non-ITF"],
  corporate_sub_types: ["Corporate", "Sole Proprietorship"],
  risk_levels:         ["Low Risk", "Medium Risk", "High Risk"],
  document_types:      ["sigcard_front", "sigcard_back", "nais_front", "nais_back", "privacy_front", "privacy_back", "other"],
  user_statuses:       ["active", "inactive", "suspended"],
  app_name:         "DIGITAL CUSTOMER RECORD",
  app_abbreviation: "DIGICUR",
  app_logo_url:     null,
};

const AppConfigContext = createContext({ ...FALLBACK_CONFIG, refreshConfig: () => {} });

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK_CONFIG);

  const refreshConfig = useCallback(() => {
    api.get("/config")
      .then((res) => setConfig(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshConfig(); }, [refreshConfig]);

  return (
    <AppConfigContext.Provider value={{ ...config, refreshConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppConfig() {
  return useContext(AppConfigContext);
}
