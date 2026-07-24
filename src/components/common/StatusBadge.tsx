/**
 * SALUS Sync — StatusBadge
 * Colored dot + label for connection/status indicators.
 */


type StatusVariant = 'success' | 'warning' | 'error' | 'idle' | 'loading';

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  size?: 'sm' | 'md';
}

const variantColors: Record<StatusVariant, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error:   'var(--color-error)',
  idle:    'var(--color-text-tertiary)',
  loading: 'var(--color-primary)',
};

const variantBg: Record<StatusVariant, string> = {
  success: 'var(--color-success-bg)',
  warning: 'var(--color-warning-bg)',
  error:   'var(--color-error-bg)',
  idle:    'var(--color-surface)',
  loading: 'var(--color-primary-alpha)',
};

export function StatusBadge({ variant, label, size = 'md' }: StatusBadgeProps) {
  const dotSize = size === 'sm' ? 6 : 8;
  const fontSize = size === 'sm' ? 'var(--font-size-xs)' : 'var(--font-size-sm)';

  return (
    <span
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '6px',
        padding:        size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius:   'var(--radius-full)',
        background:     variantBg[variant],
        fontSize,
        fontWeight:     'var(--font-weight-medium)',
        color:          variantColors[variant],
      }}
    >
      <span
        style={{
          width:        dotSize,
          height:       dotSize,
          borderRadius: '50%',
          background:   variantColors[variant],
          flexShrink:   0,
          animation:    variant === 'loading' ? 'pulse 1.4s ease-in-out infinite' : undefined,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
