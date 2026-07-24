/**
 * SALUS Sync — Login Page
 *
 * Authenticates against the existing FastAPI backend.
 * POST /api/auth/login → JWT stored in AuthContext.
 *
 * Only users with role === 'patient' are valid SALUS Sync users.
 * No registration button — users create accounts via the SALUS web platform.
 */

import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { login } from '../../api/authApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type FormStatus = 'idle' | 'loading' | 'error';

export function LoginPage() {
  const { setSession } = useAuth();
  const { backendUrl } = useAppConfig();
  const navigate = useNavigate();

  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus]             = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const usernameId = useId();
  const passwordId = useId();

  const isValid   = username.trim().length > 0 && password.length > 0;
  const isLoading = status === 'loading';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setStatus('loading');
    setErrorMessage('');

    const result = await login(backendUrl, { username: username.trim(), password });

    if (result.error) {
      setStatus('error');
      if (result.error.isNetworkError) {
        setErrorMessage(
          'Unable to reach the server. Check your internet connection or update the backend URL in Settings.'
        );
      } else if (result.error.status === 401 || result.error.status === 400) {
        setErrorMessage('Invalid username or password. Please try again.');
      } else {
        setErrorMessage(result.error.message || 'Sign in failed. Please try again.');
      }
      return;
    }

    const response = result.data!;

    // Only allow patient role
    if (response.user.role !== 'patient') {
      setStatus('error');
      setErrorMessage(
        'SALUS Sync is for patients only. Please use the SALUS web platform for other roles.'
      );
      return;
    }

    try {
      await setSession(response.access_token, response.user);
      navigate('/dashboard/home', { replace: true });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Secure storage unavailable');
    }
  }

  return (
    <div
      className="app-wrapper"
      style={{
        minHeight:  '100dvh',
        background: 'var(--color-mint-bg)',
      }}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--color-cream)',
          display:    'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header band */}
        <div
          style={{
            background:     'var(--color-primary)',
            padding:        'var(--space-12) var(--space-6) var(--space-10)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            'var(--space-4)',
          }}
        >
          <div
            style={{
              width:          72,
              height:         72,
              borderRadius:   'var(--radius-xl)',
              background:     'rgba(255,255,255,0.15)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <HeartPulse size={36} color="white" strokeWidth={2} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize:    'var(--font-size-2xl)',
                fontWeight:  'var(--font-weight-bold)',
                color:       'white',
                margin:      0,
                letterSpacing: '-0.02em',
              }}
            >
              SALUS Sync
            </h1>
            <p
              style={{
                fontSize:  'var(--font-size-sm)',
                color:     'rgba(255,255,255,0.75)',
                margin:    0,
                marginTop: 'var(--space-1)',
              }}
            >
              Sign in to your patient account
            </p>
          </div>
        </div>

        {/* Form card */}
        <div
          style={{
            flex:          1,
            padding:       'var(--space-6)',
            display:       'flex',
            flexDirection: 'column',
            gap:           'var(--space-5)',
          }}
          className="animate-slide-up"
        >
          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label
                htmlFor={usernameId}
                style={{
                  fontSize:   'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color:      'var(--color-text-secondary)',
                }}
              >
                Username
              </label>
              <input
                id={usernameId}
                type="text"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your username"
                style={{
                  width:        '100%',
                  padding:      'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border:       `1.5px solid ${status === 'error' ? 'var(--color-error-border)' : 'var(--color-border)'}`,
                  background:   isLoading ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                  fontSize:     'var(--font-size-md)',
                  color:        'var(--color-text-primary)',
                  outline:      'none',
                  transition:   'border-color var(--transition-fast)',
                  boxSizing:    'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                onBlur={e => (e.target.style.borderColor = status === 'error' ? 'var(--color-error-border)' : 'var(--color-border)')}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label
                htmlFor={passwordId}
                style={{
                  fontSize:   'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color:      'var(--color-text-secondary)',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your password"
                  style={{
                    width:        '100%',
                    padding:      'var(--space-4)',
                    paddingRight: '52px',
                    borderRadius: 'var(--radius-md)',
                    border:       `1.5px solid ${status === 'error' ? 'var(--color-error-border)' : 'var(--color-border)'}`,
                    background:   isLoading ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                    fontSize:     'var(--font-size-md)',
                    color:        'var(--color-text-primary)',
                    outline:      'none',
                    transition:   'border-color var(--transition-fast)',
                    boxSizing:    'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.target.style.borderColor = status === 'error' ? 'var(--color-error-border)' : 'var(--color-border)')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  disabled={isLoading}
                  style={{
                    position:       'absolute',
                    right:          'var(--space-3)',
                    top:            '50%',
                    transform:      'translateY(-50%)',
                    width:          36,
                    height:         36,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    color:          'var(--color-text-tertiary)',
                    background:     'transparent',
                    border:         'none',
                    cursor:         'pointer',
                    padding:        0,
                    borderRadius:   'var(--radius-sm)',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {status === 'error' && errorMessage && (
              <div
                role="alert"
                style={{
                  padding:      'var(--space-3) var(--space-4)',
                  background:   'var(--color-error-bg)',
                  border:       '1px solid var(--color-error-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize:     'var(--font-size-sm)',
                  color:        'var(--color-error)',
                  lineHeight:   'var(--line-height-relaxed)',
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || isLoading}
              style={{
                width:          '100%',
                padding:        'var(--space-4)',
                borderRadius:   'var(--radius-md)',
                background:     isLoading ? 'var(--color-primary-alpha)' : 'var(--color-primary)',
                color:          isLoading ? 'var(--color-primary)' : 'white',
                fontSize:       'var(--font-size-md)',
                fontWeight:     'var(--font-weight-semibold)',
                border:         'none',
                cursor:         !isValid || isLoading ? 'not-allowed' : 'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            'var(--space-2)',
                transition:     'background var(--transition-base), opacity var(--transition-base)',
                opacity:        !isValid ? 0.6 : 1,
                marginTop:      'var(--space-2)',
              }}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={18} color="var(--color-primary)" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* No registration notice */}
          <div
            style={{
              marginTop:    'var(--space-2)',
              padding:      'var(--space-4)',
              background:   'var(--color-mint-bg)',
              border:       '1px solid var(--color-mint-border)',
              borderRadius: 'var(--radius-md)',
              textAlign:    'center',
            }}
          >
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
              Don't have an account?
            </p>
            <p
              style={{
                fontSize:   'var(--font-size-sm)',
                color:      'var(--color-primary)',
                fontWeight: 'var(--font-weight-medium)',
                margin:     0,
                marginTop:  'var(--space-1)',
              }}
            >
              Create your account on the{' '}
              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>SALUS web platform.</span>
            </p>
          </div>

          {/* Backend notice */}
          <p
            style={{
              textAlign:  'center',
              fontSize:   'var(--font-size-xs)',
              color:      'var(--color-text-tertiary)',
              marginTop:  'auto',
            }}
          >
            Connecting to: {backendUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
