/**
 * SALUS Sync — BottomNav
 * Fixed mobile bottom navigation bar with four tabs.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { Home, Activity, RefreshCw, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard/home',     label: 'Home',    Icon: Home       },
  { to: '/dashboard/health',   label: 'Health',  Icon: Activity   },
  { to: '/dashboard/sync',     label: 'Sync',    Icon: RefreshCw  },
  { to: '/dashboard/settings', label: 'Settings', Icon: Settings  },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position:        'fixed',
        bottom:          0,
        left:            '50%',
        transform:       'translateX(-50%)',
        width:           '100%',
        maxWidth:        'var(--app-max-width)',
        height:          'var(--bottom-nav-height)',
        background:      'var(--color-surface-raised)',
        borderTop:       '1px solid var(--color-border)',
        display:         'flex',
        alignItems:      'stretch',
        zIndex:          'var(--z-sticky)',
        boxShadow:       '0 -4px 16px rgba(20,134,109,0.06)',
      }}
    >
      {NAV_ITEMS.map(({ to, label, Icon }) => {
        const isActive = location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '3px',
              color:          isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              textDecoration: 'none',
              transition:     'color var(--transition-fast)',
              minHeight:      44, // WCAG touch target
              position:       'relative',
            }}
          >
            {isActive && (
              <span
                aria-hidden="true"
                style={{
                  position:     'absolute',
                  top:          0,
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  width:        24,
                  height:       3,
                  background:   'var(--color-primary)',
                  borderRadius: '0 0 3px 3px',
                }}
              />
            )}
            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 1.8}
              aria-hidden="true"
            />
            <span
              style={{
                fontSize:   'var(--font-size-xs)',
                fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
