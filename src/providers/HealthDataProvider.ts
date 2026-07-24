/**
 * SALUS Sync — HealthDataProvider Interface
 *
 * Abstract contract for reading health data.
 *
 * Phase A: MockHealthDataProvider implements this interface.
 * Phase B (Native Android): HealthConnectDataProvider will implement this interface,
 *   reading real data from Android Health Connect SDK.
 *
 * UI components should depend only on this interface, never on the concrete implementation.
 */

import type { HealthRecord, MetricDisplay, MetricType } from '../models/health';

export interface HealthDataProvider {
  /** Returns the most recent heart rate record, or null if none available */
  getHeartRate(): Promise<HealthRecord | null>;

  /** Returns the most recent steps record (today), or null if none available */
  getSteps(): Promise<HealthRecord | null>;

  /** Returns the most recent sleep record, or null if none available */
  getSleep(): Promise<HealthRecord | null>;

  /** Returns the most recent SpO2 record, or null if none available */
  getSpO2(): Promise<HealthRecord | null>;

  /**
   * Returns all health records suitable for uploading to the backend.
   * Includes the latest reading per metric type.
   */
  getAllRecords(): Promise<HealthRecord[]>;

  /**
   * Returns enriched display models for all supported metrics.
   * Handles formatting, empty states, and display logic.
   */
  getMetricDisplays(): Promise<MetricDisplay[]>;

  /** Returns a single metric display by type */
  getMetricDisplay(type: MetricType): Promise<MetricDisplay | null>;

  /** Checks if the provider is ready for data synchronization */
  checkSyncReadiness(): Promise<{ ready: boolean; message?: string }>;
}
