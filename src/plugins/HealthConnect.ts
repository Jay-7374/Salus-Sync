import { registerPlugin } from '@capacitor/core';

export type HealthConnectAvailability =
  | 'AVAILABLE'
  | 'PROVIDER_UPDATE_REQUIRED'
  | 'UNAVAILABLE';

export interface HealthConnectPlugin {
  /**
   * Checks whether the Health Connect SDK/APK is available on this Android device.
   */
  checkAvailability(): Promise<{
    status: HealthConnectAvailability;
  }>;
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');
