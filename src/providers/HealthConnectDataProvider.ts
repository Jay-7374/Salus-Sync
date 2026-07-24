/**
 * SALUS Sync — HealthConnectDataProvider
 *
 * Implements HealthDataProvider to fetch REAL data from Android Health Connect.
 * Uses Capacitor HealthConnect plugin (Phase B2.4).
 */

import type { HealthDataProvider } from './HealthDataProvider';
import type { HealthRecord, MetricDisplay, MetricType } from '../models/health';
import { HealthConnect } from '../plugins/HealthConnect';
import type { HealthConnectMetricResult } from '../plugins/HealthConnect';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatSleepMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function emptyDisplay(type: MetricType): MetricDisplay {
  const labelMap: Record<MetricType, string> = {
    HEART_RATE: 'Heart Rate',
    STEPS:      'Steps',
    SPO2:       'Blood Oxygen',
    SLEEP:      'Sleep',
  };
  const unitMap: Record<MetricType, string> = {
    HEART_RATE: 'bpm',
    STEPS:      'steps',
    SPO2:       '%',
    SLEEP:      '',
  };
  return {
    type,
    label:          labelMap[type],
    value:          null,
    unit:           unitMap[type],
    displayValue:   '--',
    lastRecordedAt: null,
    source:         '',
    deviceName:     undefined,
    hasData:        false,
  };
}

function mapToRecord(type: MetricType, result: HealthConnectMetricResult): HealthRecord | null {
  if (!result.available || !result.hasPermission || !result.hasData || result.value === undefined) {
    return null;
  }
  return {
    metric_type: type,
    value: result.value,
    unit: result.unit || '',
    start_time: result.startTime || new Date().toISOString(),
    end_time: result.endTime || new Date().toISOString(),
    source: result.source || 'Health Connect',
    device_name: result.deviceName,
  };
}

function recordToDisplay(record: HealthRecord): MetricDisplay {
  let displayValue: string;
  let unit = record.unit;

  switch (record.metric_type) {
    case 'SLEEP':
      displayValue = formatSleepMinutes(record.value);
      unit = '';
      break;
    case 'STEPS':
      displayValue = record.value.toLocaleString();
      break;
    default:
      displayValue = String(record.value);
  }

  const labelMap: Record<MetricType, string> = {
    HEART_RATE: 'Heart Rate',
    STEPS:      'Steps',
    SPO2:       'Blood Oxygen',
    SLEEP:      'Sleep',
  };

  return {
    type:           record.metric_type,
    label:          labelMap[record.metric_type],
    value:          record.value,
    unit:           unit,
    displayValue,
    lastRecordedAt: record.end_time,
    source:         record.source,
    deviceName:     record.device_name,
    hasData:        true,
  };
}

export class HealthConnectDataProvider implements HealthDataProvider {
  private async safeCall<T>(caller: () => Promise<T>): Promise<T | null> {
    try {
      const avail = await HealthConnect.checkAvailability();
      if (avail.status !== 'AVAILABLE') return null;
      return await caller();
    } catch (e) {
      console.error('[HealthConnectDataProvider] Error calling native plugin:', e);
      return null;
    }
  }

  async getHeartRate(): Promise<HealthRecord | null> {
    const res = await this.safeCall(() => HealthConnect.getLatestHeartRate());
    if (!res) return null;
    return mapToRecord('HEART_RATE', res);
  }

  async getSteps(): Promise<HealthRecord | null> {
    const res = await this.safeCall(() => HealthConnect.getTodaySteps());
    if (!res) return null;
    return mapToRecord('STEPS', res);
  }

  /**
   * NOTE (Phase B2.4 Limitation):
   * This returns the latest SleepSessionRecord only. It does not aggregate
   * total sleep over the entire day.
   */
  async getSleep(): Promise<HealthRecord | null> {
    const res = await this.safeCall(() => HealthConnect.getSleepDuration());
    if (!res) return null;
    return mapToRecord('SLEEP', res);
  }

  async getSpO2(): Promise<HealthRecord | null> {
    const res = await this.safeCall(() => HealthConnect.getLatestSpO2());
    if (!res) return null;
    return mapToRecord('SPO2', res);
  }

  async getAllRecords(): Promise<HealthRecord[]> {
    const records = await Promise.all([
      this.getHeartRate(),
      this.getSteps(),
      this.getSpO2(),
      this.getSleep(),
    ]);
    return records.filter((r): r is HealthRecord => r !== null);
  }

  async getMetricDisplays(): Promise<MetricDisplay[]> {
    const types: MetricType[] = ['HEART_RATE', 'STEPS', 'SPO2', 'SLEEP'];
    const results = await Promise.all([
      this.getHeartRate(),
      this.getSteps(),
      this.getSpO2(),
      this.getSleep(),
    ]);

    return types.map((type, i) => {
      const record = results[i];
      if (record) {
        return recordToDisplay(record);
      }
      return emptyDisplay(type);
    });
  }

  async getMetricDisplay(type: MetricType): Promise<MetricDisplay | null> {
    let record: HealthRecord | null = null;
    switch (type) {
      case 'HEART_RATE': record = await this.getHeartRate(); break;
      case 'STEPS': record = await this.getSteps(); break;
      case 'SPO2': record = await this.getSpO2(); break;
      case 'SLEEP': record = await this.getSleep(); break;
    }
    if (!record) return emptyDisplay(type);
    return recordToDisplay(record);
  }
}

export const healthConnectDataProvider: HealthDataProvider = new HealthConnectDataProvider();
