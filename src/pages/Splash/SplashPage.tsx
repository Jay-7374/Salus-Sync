/**
 * SALUS Sync — Splash Screen
 * Shown briefly on app launch. Auto-navigates based on auth state.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function SplashPage() {
  const { isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/dashboard/home', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 1600);

    return () => clearTimeout(timer);
  }, [isReady, isAuthenticated, navigate]);

  return (
    <div
      className="app-wrapper"
      style={{
        minHeight:      '100dvh',
        background:     'linear-gradient(160deg, var(--color-mint-bg) 0%, var(--color-cream) 60%)',
      }}
    >
      <div
        className="app-shell"
        style={{
          background: 'transparent',
          boxShadow:  'none',
        }}
      >
        <div
          style={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            'var(--space-6)',
            padding:        'var(--space-8)',
            animation:      'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
          className="animate-scale-in"
        >
          {/* Logo */}
          <div
            style={{
              width:          96,
              height:         96,
              borderRadius:   'var(--radius-2xl)',
              background:     'var(--color-primary)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 12px 40px rgba(20,134,109,0.30)',
            }}
          >
            <img
              src="/salus-icon.svg"
              alt="SALUS Sync"
              width={64}
              height={64}
            />
          </div>

          {/* Brand name */}
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize:    'var(--font-size-3xl)',
                fontWeight:  'var(--font-weight-bold)',
                color:       'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin:      0,
              }}
            >
              SALUS{' '}
              <span style={{ color: 'var(--color-primary)' }}>Sync</span>
            </h1>
            <p
              style={{
                fontSize:   'var(--font-size-base)',
                color:      'var(--color-text-secondary)',
                marginTop:  'var(--space-2)',
                fontStyle:  'italic',
              }}
            >
              Your health, connected.
            </p>
          </div>

          {/* Loading indicator */}
          <div
            style={{
              marginTop:   'var(--space-8)',
              display:     'flex',
              gap:         6,
              alignItems:  'center',
            }}
          >
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width:        6,
                  height:       6,
                  borderRadius: '50%',
                  background:   'var(--color-primary)',
                  animation:    `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity:      0.6,
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding:    'var(--space-6)',
            textAlign:  'center',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Companion app for the SALUS healthcare platform
          </p>
        </div>
      </div>
    </div>
  );
}
