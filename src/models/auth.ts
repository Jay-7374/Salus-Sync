/**
 * SALUS Sync — Auth Models
 * TypeScript interfaces matching the existing FastAPI backend contract exactly.
 * Do NOT add fields not present in the backend response.
 */

/** Request body for POST /api/auth/login */
export interface LoginRequest {
  username: string;
  password: string;
}

/** User object returned inside LoginResponse */
export interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
}

/** Response from POST /api/auth/login */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

/** Persisted auth session (what we store in localStorage) */
export interface AuthSession {
  token: string;
  user: UserInfo;
  /** ISO-8601 string of when the session was established */
  createdAt: string;
}
