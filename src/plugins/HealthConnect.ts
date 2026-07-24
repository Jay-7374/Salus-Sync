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

export interface HealthConnectMetricResult {
  available: boolean;
  hasPermission: boolean;
  hasData: boolean;
  value?: number;
  unit?: string;
  startTime?: string;
  endTime?: string;
  source?: string;
  deviceName?: string;
  error?: string;
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

  /**
   * B2.3 Data Reads
   */
  getLatestHeartRate(): Promise<HealthConnectMetricResult>;
  getTodaySteps(): Promise<HealthConnectMetricResult>;
  getLatestSpO2(): Promise<HealthConnectMetricResult>;
  getSleepDuration(): Promise<HealthConnectMetricResult>;
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');
