/**
 * SALUS Sync — MetricCard
 * Dashboard compact card for a single health metric.
 */

import { type ReactNode } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  badge?: string;
  color?: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  badge,
  color = 'var(--color-primary)',
  loading = false,
  isEmpty = false,
  emptyMessage = 'No data',
}: MetricCardProps) {
  const iconBg = `${color}18`;

  return (
    <div
      style={{
        background:   'var(--color-surface-raised)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding:      'var(--space-4)',
        display:      'flex',
        flexDirection:'column',
        gap:          'var(--space-3)',
        boxShadow:    'var(--shadow-sm)',
        transition:   'box-shadow var(--transition-base)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width:        36,
            height:       36,
            borderRadius: 'var(--radius-md)',
            background:   iconBg,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            color,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        {badge && (
          <span
            style={{
              fontSize:     'var(--font-size-xs)',
              fontWeight:   'var(--font-weight-semibold)',
              color,
              background:   iconBg,
              padding:      '2px 8px',
              borderRadius: 'var(--radius-full)',
              letterSpacing: '0.04em',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 32 }}>
            <LoadingSpinner size={18} color={color} />
          </div>
        ) : isEmpty ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', minHeight: 32, display: 'flex', alignItems: 'center' }}>
            {emptyMessage}
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
            <span
              style={{
                fontSize:   'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color:      'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            {unit && (
              <span
                style={{
                  fontSize:   'var(--font-size-sm)',
                  color:      'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Label */}
      <p
        style={{
          fontSize:   'var(--font-size-sm)',
          color:      'var(--color-text-secondary)',
          fontWeight: 'var(--font-weight-medium)',
          margin:     0,
        }}
      >
        {label}
      </p>
    </div>
  );
}
