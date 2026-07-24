/**
 * SALUS Sync — App Config Context
 *
 * Manages app-wide configuration:
 * - Backend URL (editable in Settings, persisted to localStorage)
 * - Last sync time
 *
 * Android port: Replace localStorage with DataStore.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'salus_sync_config';

const DEFAULT_BACKEND_URL = 'https://medai-ip.onrender.com';

interface AppConfig {
  backendUrl: string;
  lastSyncTime: string | null;
}

interface AppConfigContextValue {
  backendUrl: string;
  lastSyncTime: string | null;
  setBackendUrl: (url: string) => void;
  setLastSyncTime: (time: string) => void;
  resetConfig: () => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return {
        backendUrl:   parsed.backendUrl   || DEFAULT_BACKEND_URL,
        lastSyncTime: parsed.lastSyncTime || null,
      };
    }
  } catch {
    // Ignore corrupted config
  }
  return { backendUrl: DEFAULT_BACKEND_URL, lastSyncTime: null };
}

function saveConfig(config: AppConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable
  }
}

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  // Persist on every change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const setBackendUrl = useCallback((url: string) => {
    setConfig(prev => ({ ...prev, backendUrl: url.trim() || DEFAULT_BACKEND_URL }));
  }, []);

  const setLastSyncTime = useCallback((time: string) => {
    setConfig(prev => ({ ...prev, lastSyncTime: time }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({ backendUrl: DEFAULT_BACKEND_URL, lastSyncTime: null });
  }, []);

  return (
    <AppConfigContext.Provider
      value={{
        backendUrl:   config.backendUrl,
        lastSyncTime: config.lastSyncTime,
        setBackendUrl,
        setLastSyncTime,
        resetConfig,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return ctx;
}

export { DEFAULT_BACKEND_URL };
