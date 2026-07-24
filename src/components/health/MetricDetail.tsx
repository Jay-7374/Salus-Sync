/**
 * SALUS Sync — MetricDetail
 * Expanded row for Health Data screen showing full metric detail.
 */

import { type ReactNode } from 'react';
import type { MetricDisplay } from '../../models/health';

interface MetricDetailProps {
  metric: MetricDisplay;
  icon: ReactNode;
  color?: string;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`;
}

export function MetricDetail({ metric, icon, color = 'var(--color-primary)' }: MetricDetailProps) {
  const iconBg = `${color}18`;

  return (
    <div
      style={{
        background:    'var(--color-surface-raised)',
        border:        '1px solid var(--color-border)',
        borderRadius:  'var(--radius-lg)',
        padding:       'var(--space-4)',
        display:       'flex',
        gap:           'var(--space-4)',
        alignItems:    'flex-start',
        boxShadow:     'var(--shadow-sm)',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width:          44,
          height:         44,
          borderRadius:   'var(--radius-md)',
          background:     iconBg,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color,
          flexShrink:     0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Metric name */}
        <p
          style={{
            fontSize:   'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color:      'var(--color-text-secondary)',
            margin:     0,
            marginBottom: 2,
          }}
        >
          {metric.label}
        </p>

        {/* Value */}
        {metric.hasData ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 'var(--space-2)' }}>
            <span
              style={{
                fontSize:   'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color:      'var(--color-text-primary)',
                lineHeight: 1.1,
              }}
            >
              {metric.displayValue}
            </span>
            {metric.unit && (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {metric.unit}
              </span>
            )}
          </div>
        ) : (
          <p
            style={{
              fontSize:     'var(--font-size-sm)',
              color:        'var(--color-text-tertiary)',
              margin:       '0 0 var(--space-2)',
              fontStyle:    'italic',
            }}
          >
            No {metric.label.toLowerCase()} records available yet.
          </p>
        )}

        {/* Meta info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {metric.lastRecordedAt && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Last recorded: {formatTimestamp(metric.lastRecordedAt)}
            </span>
          )}
          {metric.source && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Source: {metric.source}
            </span>
          )}
          {metric.deviceName && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Device: {metric.deviceName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
