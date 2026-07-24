/**
 * SALUS Sync — Auth Context
 *
 * Manages authentication state: user info + JWT token.
 *
 * Persistence: SessionStorage (Native Android Keystore or Browser localStorage).
 *
 * Security note: On Android, the JWT is encrypted in Keystore. On the web prototype,
 * it falls back to localStorage.
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
import { SessionStorage } from '../services/SessionStorage';

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
  setSession: (token: string, user: UserInfo) => Promise<void>;
  /** Clear the session (logout) */
  clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Rehydrate session from storage on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const session = await SessionStorage.getSession();
        if (session) {
          setSessionState(session);
        }
      } catch {
        // Ignore initialization errors
      } finally {
        setIsReady(true);
      }
    }
    loadSession();
  }, []);

  const setSession = useCallback(async (token: string, user: UserInfo) => {
    const newSession: AuthSession = {
      token,
      user,
      createdAt: new Date().toISOString(),
    };
    await SessionStorage.setSession(newSession);
    // Only update in-memory state if secure write succeeds
    setSessionState(newSession);
  }, []);

  const clearSession = useCallback(async () => {
    try {
      await SessionStorage.clearSession();
    } catch (err) {
      // Re-throw so the caller can alert the user about the storage error
      setSessionState(null);
      throw err;
    }
    setSessionState(null);
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
