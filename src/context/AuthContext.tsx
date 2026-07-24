/**
 * SALUS Sync — Auth Context
 *
 * Manages authentication state: user info + JWT token.
 *
 * Persistence: localStorage (Phase A prototype).
 * Android port: Replace with Android DataStore / EncryptedSharedPreferences.
 *
 * Security note: The token is stored in localStorage for Phase A prototyping only.
 * Never logged, never displayed in the UI.
 *
 * Only users with role === 'patient' are considered valid SALUS Sync users.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { AuthSession, UserInfo } from '../models/auth';

const STORAGE_KEY = 'salus_sync_session';

interface AuthContextValue {
  /** Current authenticated user, or null if not logged in */
  user: UserInfo | null;
  /** JWT access token, or null if not logged in */
  token: string | null;
  /** Whether the auth state has been rehydrated from storage */
  isReady: boolean;
  /** Returns true if user is authenticated */
  isAuthenticated: boolean;
  /** Store the session after successful login */
  setSession: (token: string, user: UserInfo) => void;
  /** Clear the session (logout) */
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Rehydrate session from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AuthSession = JSON.parse(raw);
        if (parsed?.token && parsed?.user) {
          setSessionState(parsed);
        }
      }
    } catch {
      // Corrupted storage — ignore and start fresh
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setSession = useCallback((token: string, user: UserInfo) => {
    const newSession: AuthSession = {
      token,
      user,
      createdAt: new Date().toISOString(),
    };
    setSessionState(newSession);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // localStorage unavailable — session is in-memory only
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value: AuthContextValue = {
    user:            session?.user ?? null,
    token:           session?.token ?? null,
    isReady,
    isAuthenticated: !!session?.token,
    setSession,
    clearSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
