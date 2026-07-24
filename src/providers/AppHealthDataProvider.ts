/**
 * SALUS Sync — AppHealthDataProvider
 *
 * Central router for health data.
 * - Native Android: uses HealthConnectDataProvider
 * - Web/Browser: uses MockHealthDataProvider
 */

import { Capacitor } from '@capacitor/core';
import type { HealthDataProvider } from './HealthDataProvider';
import type { HealthRecord, MetricDisplay, MetricType } from '../models/health';
import { mockHealthDataProvider } from './MockHealthDataProvider';
import { healthConnectDataProvider } from './HealthConnectDataProvider';

export class AppHealthDataProvider implements HealthDataProvider {
  private get provider(): HealthDataProvider {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return healthConnectDataProvider;
    }
    return mockHealthDataProvider;
  }

  getHeartRate(): Promise<HealthRecord | null> {
    return this.provider.getHeartRate();
  }

  getSteps(): Promise<HealthRecord | null> {
    return this.provider.getSteps();
  }

  getSleep(): Promise<HealthRecord | null> {
    return this.provider.getSleep();
  }

  getSpO2(): Promise<HealthRecord | null> {
    return this.provider.getSpO2();
  }

  getAllRecords(): Promise<HealthRecord[]> {
    return this.provider.getAllRecords();
  }

  getMetricDisplays(): Promise<MetricDisplay[]> {
    return this.provider.getMetricDisplays();
  }

  getMetricDisplay(type: MetricType): Promise<MetricDisplay | null> {
    return this.provider.getMetricDisplay(type);
  }

  checkSyncReadiness(): Promise<{ ready: boolean; message?: string }> {
    return this.provider.checkSyncReadiness();
  }
}

export const appHealthDataProvider: HealthDataProvider = new AppHealthDataProvider();
