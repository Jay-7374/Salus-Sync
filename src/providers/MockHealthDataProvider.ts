/**
 * SALUS Sync — MockHealthDataProvider
 *
 * ⚠️  PHASE A ONLY — Development mock.
 *     This class will be REPLACED by HealthConnectDataProvider
 *     when porting to native Android with Health Connect SDK.
 *
 * Provides stable, realistic sample health records.
 * Values are FIXED — not randomly generated on each call —
 * so the UI does not flicker during React re-renders.
 *
 * Source label is set to "Mock Data (Phase A)" to make it
 * visually clear in the UI that this is not real Health Connect data.
 */

import type { HealthDataProvider } from './HealthDataProvider';
import type { HealthRecord, MetricDisplay, MetricType } from '../models/health';

// ---------------------------------------------------------------------------
// Fixed reference timestamps (today at various times)
// ---------------------------------------------------------------------------
function todayAt(hour: number, minute: number = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function todayEnd(hour: number, minute: number = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 59, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Fixed mock records — stable across renders
// ---------------------------------------------------------------------------
const MOCK_HEART_RATE: HealthRecord = {
  metric_type: 'HEART_RATE',
  value: 72,
  unit: 'bpm',
  start_time: todayAt(11, 45),
  end_time: todayEnd(11, 45),
  source: 'Mock Data (Phase A)',
  device_name: 'HONOR Band 6',
};

const MOCK_STEPS: HealthRecord = {
  metric_type: 'STEPS',
  value: 3240,
  unit: 'steps',
  start_time: todayAt(0, 0),
  end_time: todayEnd(12, 0),
  source: 'Mock Data (Phase A)',
  device_name: 'HONOR Band 6',
};

const MOCK_SPO2: HealthRecord = {
  metric_type: 'SPO2',
  value: 98,
  unit: '%',
  start_time: todayAt(7, 30),
  end_time: todayEnd(7, 30),
  source: 'Mock Data (Phase A)',
  device_name: 'HONOR Band 6',
};

// Sleep spans previous night → this morning
const MOCK_SLEEP: HealthRecord = {
  metric_type: 'SLEEP',
  value: 432, // minutes → 7h 12m
  unit: 'minutes',
  start_time: (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 15, 0, 0);
    return d.toISOString();
  })(),
  end_time: todayAt(6, 27),
  source: 'Mock Data (Phase A)',
  device_name: 'HONOR Band 6',
};

const ALL_MOCK_RECORDS: HealthRecord[] = [
  MOCK_HEART_RATE,
  MOCK_STEPS,
  MOCK_SPO2,
  MOCK_SLEEP,
];

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

// ---------------------------------------------------------------------------
// MockHealthDataProvider implementation
// ---------------------------------------------------------------------------
export class MockHealthDataProvider implements HealthDataProvider {
  /**
   * Simulates an async read (as Health Connect would be async on Android).
   * Small delay makes the UI loading states visible during development.
   */
  private async delay<T>(value: T, ms = 400): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), ms));
  }

  async getHeartRate(): Promise<HealthRecord | null> {
    return this.delay(MOCK_HEART_RATE);
  }

  async getSteps(): Promise<HealthRecord | null> {
    return this.delay(MOCK_STEPS);
  }

  async getSleep(): Promise<HealthRecord | null> {
    return this.delay(MOCK_SLEEP);
  }

  async getSpO2(): Promise<HealthRecord | null> {
    return this.delay(MOCK_SPO2);
  }

  async getAllRecords(): Promise<HealthRecord[]> {
    return this.delay([...ALL_MOCK_RECORDS]);
  }

  async getMetricDisplays(): Promise<MetricDisplay[]> {
    const records = await this.getAllRecords();
    return records.map(recordToDisplay);
  }

  async getMetricDisplay(type: MetricType): Promise<MetricDisplay | null> {
    const record = ALL_MOCK_RECORDS.find(r => r.metric_type === type);
    if (!record) return emptyDisplay(type);
    return this.delay(recordToDisplay(record));
  }
}

/** Singleton instance — reuse across the app */
export const mockHealthDataProvider: HealthDataProvider = new MockHealthDataProvider();
