/**
 * SALUS Sync — Dashboard Page
 *
 * Main home screen. Shows:
 * - Greeting with user name
 * - Connection/status indicator
 * - 4 health metric cards from MockHealthDataProvider
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Heart, Footprints, Wind, Moon, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { MetricCard } from '../../components/health/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { appHealthDataProvider } from '../../providers/AppHealthDataProvider';
import type { MetricDisplay } from '../../models/health';

const METRIC_CONFIG = [
  {
    type:        'HEART_RATE' as const,
    icon:        <Heart size={18} strokeWidth={2} />,
    color:       '#e74c4c',
    badge:       'BPM',
  },
  {
    type:        'STEPS' as const,
    icon:        <Footprints size={18} strokeWidth={2} />,
    color:       '#f59e0b',
    badge:       undefined,
  },
  {
    type:        'SPO2' as const,
    icon:        <Wind size={18} strokeWidth={2} />,
    color:       '#3b82f6',
    badge:       'SPO2',
  },
  {
    type:        'SLEEP' as const,
    icon:        <Moon size={18} strokeWidth={2} />,
    color:       '#8b5cf6',
    badge:       'SLEEP',
  },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { user } = useAuth();
  const { lastSyncTime } = useAppConfig();
  const navigate = useNavigate();

  const [metrics, setMetrics]   = useState<MetricDisplay[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const displays = await appHealthDataProvider.getMetricDisplays();
      if (!cancelled) {
        setMetrics(displays);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const metricByType = (type: string) =>
    metrics.find(m => m.type === type);

  return (
    <div style={{ minHeight: '100%', background: 'var(--color-cream)' }}>
      {/* Header */}
      <header
        style={{
          padding:         'var(--space-6) var(--space-5) var(--space-4)',
          background:      'var(--color-surface-raised)',
          borderBottom:    '1px solid var(--color-border)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
        }}
      >
        <div>
          <p
            style={{
              fontSize:   'var(--font-size-xs)',
              color:      'var(--color-text-tertiary)',
              fontWeight: 'var(--font-weight-medium)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin:     0,
            }}
          >
            SALUS Sync
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
            {getGreeting()},{' '}
            <span style={{ color: 'var(--color-primary)' }}>
              {user?.name ?? 'there'}
            </span>
          </h1>
        </div>
        <button
          aria-label="Notifications"
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
            cursor:         'pointer',
          }}
        >
          <Bell size={18} />
        </button>
      </header>

      <div style={{ padding: 'var(--space-5)' }}>
        {/* Status badge */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <StatusBadge
            variant="success"
            label="Ready to Sync"
          />
        </div>

        {/* Section heading */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   'var(--space-4)',
          }}
        >
          <h2
            style={{
              fontSize:   'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color:      'var(--color-text-secondary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              margin:     0,
            }}
          >
            Health Metrics
          </h2>
          <button
            onClick={() => navigate('/dashboard/health')}
            style={{
              fontSize:   'var(--font-size-sm)',
              color:      'var(--color-primary)',
              fontWeight: 'var(--font-weight-medium)',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
            }}
          >
            See all →
          </button>
        </div>

        {/* 2×2 metric cards grid */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 'var(--space-3)',
            marginBottom:        'var(--space-6)',
          }}
        >
          {METRIC_CONFIG.map(({ type, icon, color, badge }) => {
            const metric = metricByType(type);
            return (
              <MetricCard
                key={type}
                icon={icon}
                label={metric?.label ?? type}
                value={metric?.displayValue ?? '--'}
                unit={metric?.unit}
                badge={badge}
                color={color}
                loading={loading}
                isEmpty={!loading && (!metric || !metric.hasData)}
                emptyMessage="No data"
              />
            );
          })}
        </div>

        {/* Quick sync card */}
        <div
          style={{
            background:   'var(--color-primary)',
            borderRadius: 'var(--radius-xl)',
            padding:      'var(--space-5)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            gap:          'var(--space-4)',
            boxShadow:    'var(--shadow-lg)',
          }}
        >
          <div>
            <p
              style={{
                fontSize:   'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color:      'rgba(255,255,255,0.8)',
                margin:     0,
              }}
            >
              {lastSyncTime
                ? `Last sync: ${new Date(lastSyncTime).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})}`
                : 'Not synced yet'
              }
            </p>
            <p
              style={{
                fontSize:   'var(--font-size-base)',
                fontWeight: 'var(--font-weight-bold)',
                color:      'white',
                margin:     0,
                marginTop:  4,
              }}
            >
              Sync your health data
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/sync')}
            style={{
              background:   'rgba(255,255,255,0.20)',
              border:       '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 'var(--radius-md)',
              padding:      'var(--space-3) var(--space-5)',
              fontSize:     'var(--font-size-sm)',
              fontWeight:   'var(--font-weight-semibold)',
              color:        'white',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
              backdropFilter: 'blur(4px)',
            }}
          >
            Sync Now
          </button>
        </div>

        {/* Phase A notice */}
        <div
          style={{
            marginTop:    'var(--space-4)',
            padding:      'var(--space-3) var(--space-4)',
            background:   'var(--color-warning-bg)',
            border:       '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            fontSize:     'var(--font-size-xs)',
            color:        'var(--color-warning)',
            textAlign:    'center',
          }}
        >
          ⚠️ Health Data provided by {Capacitor.isNativePlatform() ? 'Health Connect' : 'Mock Provider'}
        </div>
      </div>
    </div>
  );
}
