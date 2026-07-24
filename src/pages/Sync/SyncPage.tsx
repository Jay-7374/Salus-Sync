/**
 * SALUS Sync — Sync Page
 *
 * The central sync screen:
 * 1. Shows pipeline status (Health Data → SALUS Sync → SALUS Cloud)
 * 2. Sync Now button
 * 3. On press: reads MockHealthDataProvider → transforms → POST /api/v1/health-sync
 * 4. Shows loading, success, failure states
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { SyncFlowDiagram } from '../../components/sync/SyncFlowDiagram';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { mockHealthDataProvider } from '../../providers/MockHealthDataProvider';
import { uploadHealthRecords, getSyncStatus } from '../../api/healthSyncApi';
import type { SyncRequest } from '../../models/health';

type SyncPageStatus = 'idle' | 'checking' | 'syncing' | 'success' | 'error';

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return isToday ? `Today, ${time}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`;
}

export function SyncPage() {
  const { token } = useAuth();
  const { backendUrl, lastSyncTime, setLastSyncTime } = useAppConfig();

  const [pageStatus, setPageStatus]           = useState<SyncPageStatus>('idle');
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [healthRecordCount, setHealthRecordCount] = useState(0);
  const [syncedCount, setSyncedCount]           = useState<number | null>(null);
  const [errorMessage, setErrorMessage]         = useState('');

  // Load health record count on mount
  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      const records = await mockHealthDataProvider.getAllRecords();
      if (!cancelled) setHealthRecordCount(records.length);
    }
    loadCount();
    return () => { cancelled = true; };
  }, []);

  // Check backend connection on mount
  const checkBackend = useCallback(async () => {
    if (!token) { setBackendConnected(false); return; }
    setPageStatus('checking');
    const result = await getSyncStatus(backendUrl, token);
    setBackendConnected(!result.error);
    setPageStatus('idle');
  }, [backendUrl, token]);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  async function handleSyncNow() {
    if (!token) {
      setErrorMessage('You are not authenticated. Please sign in again.');
      setPageStatus('error');
      return;
    }

    setPageStatus('syncing');
    setErrorMessage('');
    setSyncedCount(null);

    try {
      // 1. Read mock health records
      const records = await mockHealthDataProvider.getAllRecords();

      if (records.length === 0) {
        setPageStatus('error');
        setErrorMessage('No health records available to sync.');
        return;
      }

      // 2. Build sync request (matches backend contract exactly)
      const request: SyncRequest = { records };

      // 3. Upload to backend
      const result = await uploadHealthRecords(backendUrl, token, request);

      if (result.error) {
        setPageStatus('error');
        setBackendConnected(false);
        setErrorMessage(
          result.error.isNetworkError
            ? 'Sync failed. Unable to reach the server. Check your connection and backend URL.'
            : result.error.message || 'Sync failed. Please try again.'
        );
        return;
      }

      // 4. Success
      const count = result.data?.synced_count ?? records.length;
      setSyncedCount(count);
      setLastSyncTime(new Date().toISOString());
      setBackendConnected(true);
      setPageStatus('success');

    } catch {
      setPageStatus('error');
      setErrorMessage('An unexpected error occurred during sync.');
    }
  }

  function handleRetry() {
    setPageStatus('idle');
    setErrorMessage('');
    setSyncedCount(null);
  }

  const isSyncing  = pageStatus === 'syncing';
  const isChecking = pageStatus === 'checking';

  return (
    <div style={{ minHeight: '100%', background: 'var(--color-cream)' }}>
      {/* Header */}
      <header
        style={{
          padding:        'var(--space-6) var(--space-5) var(--space-4)',
          background:     'var(--color-surface-raised)',
          borderBottom:   '1px solid var(--color-border)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p
            style={{
              fontSize:      'var(--font-size-xs)',
              color:         'var(--color-text-tertiary)',
              fontWeight:    'var(--font-weight-medium)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin:        0,
            }}
          >
            Sync
          </p>
          <h1
            style={{
              fontSize:     'var(--font-size-xl)',
              fontWeight:   'var(--font-weight-bold)',
              color:        'var(--color-text-primary)',
              margin:       0,
              marginTop:    2,
              letterSpacing: '-0.01em',
            }}
          >
            Synchronize
          </h1>
        </div>
        <button
          onClick={checkBackend}
          disabled={isSyncing || isChecking}
          aria-label="Refresh connection status"
          style={{
            width:          40,
            height:         40,
            borderRadius:   'var(--radius-md)',
            background:     'var(--color-mint-bg)',
            border:         '1px solid var(--color-mint-border)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          'var(--color-primary)',
            cursor:         (isSyncing || isChecking) ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw
            size={16}
            style={{ animation: isChecking ? 'spin 0.7s linear infinite' : 'none' }}
          />
        </button>
      </header>

      <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* Flow diagram */}
        <SyncFlowDiagram
          healthDataCount={healthRecordCount}
          backendConnected={backendConnected}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
        />

        {/* Result states */}
        {pageStatus === 'success' && (
          <div
            role="status"
            style={{
              padding:      'var(--space-5)',
              background:   'var(--color-success-bg)',
              border:       '1px solid var(--color-mint-border)',
              borderRadius: 'var(--radius-lg)',
              display:      'flex',
              flexDirection:'column',
              alignItems:   'center',
              gap:          'var(--space-3)',
              textAlign:    'center',
              animation:    'slideUp 0.3s ease both',
            }}
          >
            <CheckCircle2 size={40} color="var(--color-success)" strokeWidth={1.5} />
            <div>
              <p
                style={{
                  fontSize:   'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color:      'var(--color-primary)',
                  margin:     0,
                }}
              >
                ✓ Sync Complete
              </p>
              <p
                style={{
                  fontSize:   'var(--font-size-sm)',
                  color:      'var(--color-text-secondary)',
                  margin:     0,
                  marginTop:  'var(--space-1)',
                }}
              >
                {syncedCount !== null ? `${syncedCount} health records synchronized.` : 'Health records synchronized.'}
              </p>
              <p
                style={{
                  fontSize:   'var(--font-size-xs)',
                  color:      'var(--color-text-tertiary)',
                  margin:     0,
                  marginTop:  'var(--space-2)',
                }}
              >
                Last sync: {formatTimestamp(lastSyncTime)}
              </p>
            </div>
          </div>
        )}

        {pageStatus === 'error' && (
          <div
            role="alert"
            style={{
              padding:      'var(--space-5)',
              background:   'var(--color-error-bg)',
              border:       '1px solid var(--color-error-border)',
              borderRadius: 'var(--radius-lg)',
              display:      'flex',
              flexDirection:'column',
              alignItems:   'center',
              gap:          'var(--space-3)',
              textAlign:    'center',
            }}
          >
            <XCircle size={40} color="var(--color-error)" strokeWidth={1.5} />
            <div>
              <p
                style={{
                  fontSize:   'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color:      'var(--color-error)',
                  margin:     0,
                }}
              >
                Sync Failed
              </p>
              <p
                style={{
                  fontSize:  'var(--font-size-sm)',
                  color:     'var(--color-text-secondary)',
                  margin:    0,
                  marginTop: 'var(--space-2)',
                }}
              >
                {errorMessage}
              </p>
            </div>
            <button
              onClick={handleRetry}
              style={{
                padding:      'var(--space-3) var(--space-6)',
                background:   'var(--color-error)',
                color:        'white',
                border:       'none',
                borderRadius: 'var(--radius-md)',
                fontSize:     'var(--font-size-sm)',
                fontWeight:   'var(--font-weight-semibold)',
                cursor:       'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Sync Now button */}
        {(pageStatus === 'idle' || pageStatus === 'checking') && (
          <button
            id="sync-now-button"
            onClick={handleSyncNow}
            disabled={isSyncing || isChecking || !token}
            style={{
              width:          '100%',
              padding:        'var(--space-5)',
              background:     'var(--color-primary)',
              color:          'white',
              border:         'none',
              borderRadius:   'var(--radius-xl)',
              fontSize:       'var(--font-size-lg)',
              fontWeight:     'var(--font-weight-bold)',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            'var(--space-3)',
              boxShadow:      'var(--shadow-lg)',
              transition:     'transform var(--transition-fast), box-shadow var(--transition-fast)',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <RefreshCw size={22} strokeWidth={2.5} />
            Sync Now
          </button>
        )}

        {pageStatus === 'syncing' && (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            'var(--space-4)',
              padding:        'var(--space-6)',
              background:     'var(--color-surface-raised)',
              border:         '1px solid var(--color-border)',
              borderRadius:   'var(--radius-xl)',
              animation:      'fadeIn 0.2s ease both',
            }}
          >
            <LoadingSpinner size={40} />
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize:   'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color:      'var(--color-text-primary)',
                  margin:     0,
                }}
              >
                Syncing…
              </p>
              <p
                style={{
                  fontSize:  'var(--font-size-sm)',
                  color:     'var(--color-text-tertiary)',
                  margin:    0,
                  marginTop: 4,
                }}
              >
                Uploading {healthRecordCount} health records
              </p>
            </div>
          </div>
        )}

        {pageStatus === 'success' && (
          <button
            onClick={handleRetry}
            style={{
              width:        '100%',
              padding:      'var(--space-4)',
              background:   'var(--color-mint-bg)',
              color:        'var(--color-primary)',
              border:       '1.5px solid var(--color-mint-border)',
              borderRadius: 'var(--radius-xl)',
              fontSize:     'var(--font-size-base)',
              fontWeight:   'var(--font-weight-semibold)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          'var(--space-2)',
            }}
          >
            <RefreshCw size={18} />
            Sync Again
          </button>
        )}

        {/* Phase A note */}
        <p
          style={{
            textAlign:  'center',
            fontSize:   'var(--font-size-xs)',
            color:      'var(--color-text-tertiary)',
            padding:    '0 var(--space-4)',
          }}
        >
          Auto-sync is available in the Android app via WorkManager.
          Manual sync only in this web prototype.
        </p>
      </div>
    </div>
  );
}
