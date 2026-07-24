/**
 * SALUS Sync — useSyncStatus Hook
 * Fetches GET /api/v1/health-sync/status and returns the result.
 */

import { useState, useCallback } from 'react';
import { getSyncStatus } from '../api/healthSyncApi';
import type { SyncStatus } from '../models/health';

type Status = 'idle' | 'loading' | 'connected' | 'error';

interface UseSyncStatusResult {
  status: Status;
  syncStatus: SyncStatus | null;
  errorMessage: string | null;
  check: () => Promise<void>;
}

export function useSyncStatus(backendUrl: string, token: string | null): UseSyncStatusResult {
  const [status, setStatus] = useState<Status>('idle');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Not authenticated.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    const result = await getSyncStatus(backendUrl, token);

    if (result.error) {
      setStatus('error');
      setErrorMessage(result.error.message);
      setSyncStatus(null);
    } else {
      setStatus('connected');
      setSyncStatus(result.data);
    }
  }, [backendUrl, token]);

  return { status, syncStatus, errorMessage, check };
}
