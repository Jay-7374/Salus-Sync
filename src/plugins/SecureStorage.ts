import { registerPlugin } from '@capacitor/core';

export interface SecureStoragePlugin {
  getSession(): Promise<{ value?: string }>;
  setSession(options: { value: string }): Promise<void>;
  clearSession(): Promise<void>;
}

const SecureStorage = registerPlugin<SecureStoragePlugin>('SecureStorage');

export default SecureStorage;
