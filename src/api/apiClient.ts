/**
 * SALUS Sync — API Client
 *
 * Centralized fetch wrapper. All API calls go through this module.
 * Backend URL is read from the single config store — never hardcoded per-file.
 *
 * Usage:
 *   import { apiClient } from './apiClient';
 *   const data = await apiClient.get<SyncStatus>('/api/v1/health-sync/status');
 */

/** Shape of a processed API error */
export interface ApiError {
  status: number;
  message: string;
  isNetworkError: boolean;
}

/** Typed API response */
export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

/** Config passed into each request */
interface RequestConfig {
  baseUrl: string;
  token?: string | null;
}

async function request<T>(
  method: string,
  path: string,
  config: RequestConfig,
  body?: unknown,
): Promise<ApiResult<T>> {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const errBody = await response.json();
        message = errBody?.detail || errBody?.message || message;
      } catch {
        // Could not parse error body — use status message
      }
      return {
        data: null,
        error: { status: response.status, message, isNetworkError: false },
      };
    }

    // Handle empty responses (204 No Content etc.)
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204 || !contentType.includes('application/json')) {
      return { data: null, error: null };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (err) {
    console.error(`[API Diagnostic] Request failed for ${method} ${url}`);
    console.error(`[API Diagnostic] Exception:`, err);
    if (err instanceof Error) {
      console.error(`[API Diagnostic] Error Name: ${err.name}, Message: ${err.message}`);
    }
    const message =
      err instanceof TypeError
        ? 'Unable to reach the server. Check your connection and backend URL.'
        : 'An unexpected error occurred.';
    return {
      data: null,
      error: { status: 0, message, isNetworkError: true },
    };
  }
}

/** Create a configured API client bound to a specific base URL and token */
export function createApiClient(baseUrl: string, token?: string | null) {
  const config: RequestConfig = { baseUrl, token };

  return {
    get<T>(path: string) {
      return request<T>('GET', path, config);
    },
    post<T>(path: string, body: unknown) {
      return request<T>('POST', path, config, body);
    },
    put<T>(path: string, body: unknown) {
      return request<T>('PUT', path, config, body);
    },
    delete<T>(path: string) {
      return request<T>('DELETE', path, config);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
