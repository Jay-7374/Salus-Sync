import { registerPlugin } from '@capacitor/core';

export type HealthConnectAvailability =
  | 'AVAILABLE'
  | 'PROVIDER_UPDATE_REQUIRED'
  | 'UNAVAILABLE';

export interface HealthConnectPermissionResult {
  granted: boolean;
  permissions: {
    heartRate: boolean;
    steps: boolean;
    spo2: boolean;
    sleep: boolean;
  };
}

export interface HealthConnectPlugin {
  /**
   * Checks whether the Health Connect SDK/APK is available on this Android device.
   */
  checkAvailability(): Promise<{
    status: HealthConnectAvailability;
  }>;

  /**
   * Checks current permission status without prompting.
   */
  checkPermissions(): Promise<HealthConnectPermissionResult>;

  /**
   * Requests required permissions from the user.
   */
  requestPermissions(): Promise<HealthConnectPermissionResult>;
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');
