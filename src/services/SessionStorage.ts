import { Capacitor } from '@capacitor/core';
import SecureStorage from '../plugins/SecureStorage';
import type { AuthSession } from '../models/auth';

const LEGACY_STORAGE_KEY = 'salus_sync_session';

/**
 * Base64URL decodes a JWT payload and extracts the expiration timestamp.
 * Note: This is NOT cryptographic validation. It only checks obvious expiration locally.
 * The backend remains the sole cryptographic authority.
 */
function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true; // Malformed JWT
    }
    
    const payload = parts[1];
    // Pad with '=' to make length a multiple of 4
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4);
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp) {
      // exp is typically in seconds
      return decoded.exp * 1000 < Date.now();
    }
    // If no exp claim, assume valid until backend rejects
    return false;
  } catch (err) {
    // Malformed token, cannot decode payload
    return true;
  }
}

export const SessionStorage = {
  async getSession(): Promise<AuthSession | null> {
    let sessionRaw: string | undefined = undefined;

    if (Capacitor.isNativePlatform()) {
      // Legacy cleanup: wipe any plaintext session lingering in WebView localStorage
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      
      try {
        const result = await SecureStorage.getSession();
        sessionRaw = result.value;
      } catch (err) {
        // Native read failure (should not happen for getSession unless IPC fails)
        return null;
      }
    } else {
      // Browser environment fallback
      sessionRaw = localStorage.getItem(LEGACY_STORAGE_KEY) || undefined;
    }

    if (!sessionRaw || sessionRaw === 'INVALID') {
      return null;
    }

    try {
      const session: AuthSession = JSON.parse(sessionRaw);
      
      // Validate structure
      if (!session.token || !session.user) {
        throw new Error('Malformed session structure');
      }

      // Check JWT expiration locally
      if (isJwtExpired(session.token)) {
        await this.clearSession(); // Safe deletion
        return null;
      }

      return session;
    } catch (err) {
      // Malformed JSON or structure -> treat as logged out
      await this.clearSession();
      return null;
    }
  },

  async setSession(session: AuthSession): Promise<void> {
    const value = JSON.stringify(session);
    if (Capacitor.isNativePlatform()) {
      await SecureStorage.setSession({ value });
    } else {
      localStorage.setItem(LEGACY_STORAGE_KEY, value);
    }
  },

  async clearSession(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await SecureStorage.clearSession();
    } else {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }
};
