/**
 * SALUS Sync — Health Data Models
 * TypeScript interfaces matching the existing FastAPI backend health-sync contract exactly.
 * Do NOT add fields not present in the backend schema.
 * Do NOT send user_id — the backend derives identity from JWT.
 */

/** Allowed metric types as defined by the backend */
export type MetricType = 'HEART_RATE' | 'STEPS' | 'SLEEP' | 'SPO2';

/** A single health data record — matches the backend upload schema */
export interface HealthRecord {
  metric_type: MetricType;
  value: number;
  unit: string;
  /** ISO-8601 datetime string */
  start_time: string;
  /** ISO-8601 datetime string */
  end_time: string;
  /** e.g. "Health Connect" or "Mock Data" in Phase A */
  source: string;
  /** e.g. "HONOR Band" — optional */
  device_name?: string;
}

/** Request body for POST /api/v1/health-sync */
export interface SyncRequest {
  records: HealthRecord[];
}

/** Response from POST /api/v1/health-sync */
export interface SyncResponse {
  success: boolean;
  message?: string;
  synced_count?: number;
  [key: string]: unknown;
}

/** Response from GET /api/v1/health-sync/status */
export interface SyncStatus {
  status?: string;
  last_sync?: string | null;
  connected?: boolean;
  [key: string]: unknown;
}

/** Enriched health metric for UI display (not sent to backend) */
export interface MetricDisplay {
  type: MetricType;
  label: string;
  value: number | null;
  unit: string;
  /** Human-readable formatted value, e.g. "7h 12m" for sleep */
  displayValue: string;
  /** ISO-8601 datetime of last reading */
  lastRecordedAt: string | null;
  source: string;
  deviceName?: string;
  /** Whether data is available */
  hasData: boolean;
}
