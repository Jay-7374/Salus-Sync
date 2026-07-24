/**
 * SALUS Sync — Health Sync API
 *
 * Wraps the existing FastAPI health-sync endpoints.
 * Do NOT modify the request/response contracts.
 * Do NOT send user_id — backend derives identity from JWT.
 */

import { createApiClient } from './apiClient';
import type { SyncRequest, SyncResponse, SyncStatus } from '../models/health';
import type { ApiResult } from './apiClient';

/**
 * GET /api/v1/health-sync/status
 * Used in Settings "Test Connection" and Sync page status display.
 */
export async function getSyncStatus(
  baseUrl: string,
  token: string,
): Promise<ApiResult<SyncStatus>> {
  const client = createApiClient(baseUrl, token);
  return client.get<SyncStatus>('/api/v1/health-sync/status');
}

/**
 * POST /api/v1/health-sync
 * Uploads an array of health records.
 * Called during "Sync Now" flow.
 */
export async function uploadHealthRecords(
  baseUrl: string,
  token: string,
  request: SyncRequest,
): Promise<ApiResult<SyncResponse>> {
  const client = createApiClient(baseUrl, token);
  return client.post<SyncResponse>('/api/v1/health-sync', request);
}

/**
 * GET /api/v1/health-metrics/latest
 * Fetches the latest health metrics stored on the backend.
 */
export async function getLatestMetrics(
  baseUrl: string,
  token: string,
): Promise<ApiResult<unknown>> {
  const client = createApiClient(baseUrl, token);
  return client.get<unknown>('/api/v1/health-metrics/latest');
}

/**
 * GET /api/v1/health-metrics/history
 * Fetches historical health metrics from the backend.
 */
export async function getMetricsHistory(
  baseUrl: string,
  token: string,
): Promise<ApiResult<unknown>> {
  const client = createApiClient(baseUrl, token);
  return client.get<unknown>('/api/v1/health-metrics/history');
}
