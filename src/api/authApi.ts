/**
 * SALUS Sync — Auth API
 * Handles POST /api/auth/login against the existing FastAPI backend.
 */

import { createApiClient } from './apiClient';
import type { LoginRequest, LoginResponse } from '../models/auth';
import type { ApiResult } from './apiClient';

export async function login(
  baseUrl: string,
  credentials: LoginRequest,
): Promise<ApiResult<LoginResponse>> {
  const client = createApiClient(baseUrl);
  return client.post<LoginResponse>('/api/auth/login', credentials);
}
