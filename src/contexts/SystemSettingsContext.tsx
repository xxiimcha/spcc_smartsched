import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

export interface SystemSettings {
  schoolYear: string;
  semester: string;
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => Promise<void>;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SystemSettings = {
  schoolYear: "2024-2025",
  semester: "First Semester",
};

interface SystemSettingsProviderProps { children: ReactNode; }

export const SystemSettingsProvider: React.FC<SystemSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1) Try backend first
      const res = await axios.get("https://spcc-scheduler.site/system_settings.php");
      const apiOk = res?.data?.status === "success" && res?.data?.data;

      if (apiOk) {
        const sy  = res.data.data.current_school_year ?? DEFAULT_SETTINGS.schoolYear;
        const sem = res.data.data.current_semester ?? DEFAULT_SETTINGS.semester;
        const newSettings = { schoolYear: sy, semester: sem };
        setSettings(newSettings);
        localStorage.setItem("systemSettings", JSON.stringify(newSettings));
        return;
      }

      // 2) Fallback to localStorage then defaults
      fallbackToLocalOrDefault();
    } catch (e) {
      console.warn("System settings fetch failed, using fallback.", e);
      setError("Failed to load system settings from server.");
      fallbackToLocalOrDefault();
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackToLocalOrDefault = () => {
    const saved = localStorage.getItem("systemSettings");
    if (saved) setSettings(JSON.parse(saved));
    else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("systemSettings", JSON.stringify(DEFAULT_SETTINGS));
    }
  };

  // If you later build a backend write endpoint, hook it up here.
  const updateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    localStorage.setItem("systemSettings", JSON.stringify(newSettings));
    // await axios.post("https://spcc-scheduler.site/system_settings.php", newSettings);
  };

  const refreshSettings = async () => { await loadSettings(); };

  const value: SystemSettingsContextType = {
    settings,
    updateSettings,
    refreshSettings,
    isLoading,
    error,
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = (): SystemSettingsContextType => {
  const ctx = useContext(SystemSettingsContext);
  if (!ctx) throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  return ctx;
};

export const useCurrentAcademicPeriod = () => {
  const { settings } = useSystemSettings();
  return {
    schoolYear: settings.schoolYear,
    semester: settings.semester,
    academicPeriod: `${settings.schoolYear} - ${settings.semester}`,
  };
};
