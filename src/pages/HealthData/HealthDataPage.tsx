/**
 * SALUS Sync — Health Data Page
 * Full metric detail view with source, device, and empty states.
 */

import { useEffect, useState } from 'react';
import { Heart, Footprints, Wind, Moon, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { MetricDetail } from '../../components/health/MetricDetail';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { appHealthDataProvider } from '../../providers/AppHealthDataProvider';
import type { MetricDisplay } from '../../models/health';

const METRIC_ICONS: Record<string, React.ReactNode> = {
  HEART_RATE: <Heart size={22} strokeWidth={2} />,
  STEPS:      <Footprints size={22} strokeWidth={2} />,
  SPO2:       <Wind size={22} strokeWidth={2} />,
  SLEEP:      <Moon size={22} strokeWidth={2} />,
};

const METRIC_COLORS: Record<string, string> = {
  HEART_RATE: '#e74c4c',
  STEPS:      '#f59e0b',
  SPO2:       '#3b82f6',
  SLEEP:      '#8b5cf6',
};

const METRIC_ORDER = ['HEART_RATE', 'STEPS', 'SPO2', 'SLEEP'];

type PageStatus = 'loading' | 'loaded' | 'error';

export function HealthDataPage() {
  const [metrics, setMetrics]   = useState<MetricDisplay[]>([]);
  const [status, setStatus]     = useState<PageStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  async function loadMetrics() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const displays = await appHealthDataProvider.getMetricDisplays();
      // Ensure consistent ordering
      const ordered = METRIC_ORDER.map(
        type => displays.find(m => m.type === type) ?? {
          type: type as MetricDisplay['type'],
          label: type,
          value: null,
          unit: '',
          displayValue: '--',
          lastRecordedAt: null,
          source: '',
          deviceName: undefined,
          hasData: false,
        }
      );
      setMetrics(ordered);
      setStatus('loaded');
    } catch {
      setStatus('error');
      setErrorMsg('Failed to load health data. Please try again.');
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

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
              fontSize:     'var(--font-size-xs)',
              color:        'var(--color-text-tertiary)',
              fontWeight:   'var(--font-weight-medium)',
              letterSpacing:'0.08em',
              textTransform:'uppercase',
              margin:       0,
            }}
          >
            Health
          </p>
          <h1
            style={{
              fontSize:    'var(--font-size-xl)',
              fontWeight:  'var(--font-weight-bold)',
              color:       'var(--color-text-primary)',
              margin:      0,
              marginTop:   2,
              letterSpacing: '-0.01em',
            }}
          >
            Health Data
          </h1>
        </div>
        <button
          onClick={loadMetrics}
          disabled={status === 'loading'}
          aria-label="Refresh health data"
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
            cursor:         status === 'loading' ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw
            size={16}
            style={{ animation: status === 'loading' ? 'spin 0.7s linear infinite' : 'none' }}
          />
        </button>
      </header>

      <div style={{ padding: 'var(--space-5)' }}>
        {/* Source notice */}
        <div
          style={{
            marginBottom:  'var(--space-4)',
            padding:       'var(--space-3) var(--space-4)',
            background:    'var(--color-warning-bg)',
            border:        '1px solid #fde68a',
            borderRadius:  'var(--radius-md)',
            fontSize:      'var(--font-size-xs)',
            color:         'var(--color-warning)',
          }}
        >
          ⚠️ Health Data provided by {Capacitor.isNativePlatform() ? 'Health Connect' : 'Mock Provider'}.
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            'var(--space-4)',
              paddingTop:     'var(--space-12)',
            }}
          >
            <LoadingSpinner size={36} />
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              Reading health data…
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div
            style={{
              padding:      'var(--space-5)',
              background:   'var(--color-error-bg)',
              border:       '1px solid var(--color-error-border)',
              borderRadius: 'var(--radius-lg)',
              textAlign:    'center',
            }}
          >
            <p style={{ color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>{errorMsg}</p>
            <button
              onClick={loadMetrics}
              style={{
                background:   'var(--color-error)',
                color:        'white',
                border:       'none',
                borderRadius: 'var(--radius-md)',
                padding:      'var(--space-2) var(--space-5)',
                cursor:       'pointer',
                fontSize:     'var(--font-size-sm)',
                fontWeight:   'var(--font-weight-medium)',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Metrics list */}
        {status === 'loaded' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {metrics.map(metric => (
              <MetricDetail
                key={metric.type}
                metric={metric}
                icon={METRIC_ICONS[metric.type]}
                color={METRIC_COLORS[metric.type]}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        {status === 'loaded' && (
          <p
            style={{
              textAlign:  'center',
              fontSize:   'var(--font-size-xs)',
              color:      'var(--color-text-tertiary)',
              marginTop:  'var(--space-5)',
            }}
          >
            Health Connect integration available in the Android app
          </p>
        )}
      </div>
    </div>
  );
}
