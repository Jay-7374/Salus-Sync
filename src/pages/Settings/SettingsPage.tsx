/**
 * SALUS Sync — Settings Page
 *
 * Sections:
 * - Account (name, email, role)
 * - Connection (backend URL + Test Connection)
 * - Sync (last sync time, auto-sync note)
 * - About
 * - Logout
 */

import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, ShieldCheck, Globe, CheckCircle2, XCircle,
  Clock, Smartphone, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getSyncStatus } from '../../api/healthSyncApi';
import { DEFAULT_BACKEND_URL } from '../../context/AppConfigContext';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { HealthConnect, HealthConnectPermissionResult, HealthConnectMetricResult } from '../../plugins/HealthConnect';

type TestStatus = 'idle' | 'testing' | 'connected' | 'failed';

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize:      'var(--font-size-xs)',
        fontWeight:    'var(--font-weight-semibold)',
        color:         'var(--color-text-tertiary)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        margin:        0,
        marginBottom:  'var(--space-2)',
        paddingLeft:   'var(--space-1)',
      }}
    >
      {title}
    </h2>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}
function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         'var(--space-3)',
        padding:     'var(--space-4)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        style={{
          width:          36,
          height:         36,
          borderRadius:   'var(--radius-md)',
          background:     'var(--color-mint-bg)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          'var(--color-primary)',
          flexShrink:     0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
          {label}
        </p>
        <p
          style={{
            fontSize:  'var(--font-size-sm)',
            fontWeight:'var(--font-weight-medium)',
            color:     'var(--color-text-primary)',
            margin:    0,
          }}
          className="truncate"
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background:   'var(--color-surface-raised)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow:     'hidden',
        boxShadow:    'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return isToday ? `Today, ${time}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`;
}

export function SettingsPage() {
  const { user, token, clearSession } = useAuth();
  const { backendUrl, setBackendUrl, lastSyncTime } = useAppConfig();
  const navigate = useNavigate();

  const [urlInput, setUrlInput]       = useState(backendUrl);
  const [urlSaved, setUrlSaved]       = useState(false);
  const [testStatus, setTestStatus]   = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [hcAvailability, setHcAvailability] = useState<string>('Unknown');
  const [hcPermissions, setHcPermissions] = useState<HealthConnectPermissionResult | null>(null);
  
  const [hcHeartRate, setHcHeartRate] = useState<HealthConnectMetricResult | null>(null);
  const [hcSteps, setHcSteps] = useState<HealthConnectMetricResult | null>(null);
  const [hcSpO2, setHcSpO2] = useState<HealthConnectMetricResult | null>(null);
  const [hcSleep, setHcSleep] = useState<HealthConnectMetricResult | null>(null);

  const urlInputId = useId();

  useEffect(() => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const checkHc = () => {
        HealthConnect.checkAvailability().then(res => {
          setHcAvailability(res.status);
          if (res.status === 'AVAILABLE') {
            HealthConnect.checkPermissions()
              .then(perms => {
                setHcPermissions(perms);
              })
              .catch(err => console.error('[HealthConnect B2.2] Permission check failed:', err));
          }
        }).catch(err => console.error('[HealthConnect B2.2] Availability check failed:', err));
      };
      
      checkHc();

      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          checkHc();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } else {
      setHcAvailability('Not Android');
    }
  }, []);

  async function handleGrantPermissions() {
    if (hcAvailability === 'AVAILABLE') {
      console.log('[HealthConnect B2.2] Requesting permissions...');
      try {
        await HealthConnect.requestPermissions();
        console.log('[HealthConnect B2.2] Permission request returned');
        // Authoritatively re-check permissions as requested
        const finalResult = await HealthConnect.checkPermissions();
        console.log('[HealthConnect B2.2] Final authoritative permissions:', JSON.stringify(finalResult, null, 2));
        setHcPermissions(finalResult);
      } catch (err) {
        console.error('[HealthConnect B2.2] Permission request failed:', err);
      }
    }
  }

  async function handleReadData() {
    if (hcAvailability === 'AVAILABLE') {
      console.log('[HealthConnect B2.3] Starting live data read');
      try {
        const hr = await HealthConnect.getLatestHeartRate();
        console.log('[HealthConnect B2.3] Heart Rate result:', hr);
        setHcHeartRate(hr);
        
        const st = await HealthConnect.getTodaySteps();
        console.log('[HealthConnect B2.3] Steps result:', st);
        setHcSteps(st);
        
        const o2 = await HealthConnect.getLatestSpO2();
        console.log('[HealthConnect B2.3] SpO2 result:', o2);
        setHcSpO2(o2);
        
        const sl = await HealthConnect.getLatestSleep();
        console.log('[HealthConnect B2.3] Sleep result:', sl);
        setHcSleep(sl);
      } catch (err) {
        console.error('[HealthConnect B2.3] Read data failed:', err);
      }
    }
  }

  function handleSaveUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setBackendUrl(trimmed);
    setUrlSaved(true);
    setTestStatus('idle');
    setTimeout(() => setUrlSaved(false), 2000);
  }

  async function handleTestConnection() {
    if (!token) {
      setTestStatus('failed');
      setTestMessage('Not authenticated.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('');

    const result = await getSyncStatus(urlInput.trim() || backendUrl, token);

    if (result.error) {
      setTestStatus('failed');
      setTestMessage(result.error.isNetworkError
        ? 'Unable to reach server. Check the URL and your connection.'
        : result.error.message || 'Connection failed.');
    } else {
      setTestStatus('connected');
      setTestMessage('Successfully connected to the SALUS backend.');
    }
  }

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--color-cream)' }}>
      {/* Header */}
      <header
        style={{
          padding:      'var(--space-6) var(--space-5) var(--space-4)',
          background:   'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
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
          Settings
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
          Settings
        </h1>
      </header>

      <div
        style={{
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {/* ACCOUNT */}
        <section aria-label="Account">
          <SectionHeader title="Account" />
          <Card>
            <InfoRow icon={<User size={16} />}   label="Name"  value={user?.name  ?? '—'} />
            <InfoRow icon={<Mail size={16} />}    label="Email" value={user?.email ?? '—'} />
            <InfoRow
              icon={<ShieldCheck size={16} />}
              label="Role"
              value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—'}
            />
          </Card>
        </section>

        {/* CONNECTION */}
        <section aria-label="Connection">
          <SectionHeader title="Connection" />
          <Card>
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <Globe size={16} color="var(--color-primary)" />
                <label
                  htmlFor={urlInputId}
                  style={{
                    fontSize:   'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color:      'var(--color-text-secondary)',
                  }}
                >
                  Backend URL
                </label>
              </div>

              <input
                id={urlInputId}
                type="url"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlSaved(false); setTestStatus('idle'); }}
                placeholder={DEFAULT_BACKEND_URL}
                style={{
                  width:        '100%',
                  padding:      'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border:       '1.5px solid var(--color-border)',
                  background:   'var(--color-surface)',
                  fontSize:     'var(--font-size-sm)',
                  color:        'var(--color-text-primary)',
                  outline:      'none',
                  fontFamily:   'monospace',
                  boxSizing:    'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />

              {/* Save + Test buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={handleSaveUrl}
                  style={{
                    flex:         1,
                    padding:      'var(--space-3)',
                    background:   urlSaved ? 'var(--color-success-bg)' : 'var(--color-mint-bg)',
                    color:        urlSaved ? 'var(--color-success)' : 'var(--color-primary)',
                    border:       `1.5px solid ${urlSaved ? 'var(--color-mint-border)' : 'var(--color-mint-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize:     'var(--font-size-sm)',
                    fontWeight:   'var(--font-weight-semibold)',
                    cursor:       'pointer',
                    transition:   'background var(--transition-base)',
                  }}
                >
                  {urlSaved ? '✓ Saved' : 'Save'}
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  style={{
                    flex:           1,
                    padding:        'var(--space-3)',
                    background:     'var(--color-primary)',
                    color:          'white',
                    border:         'none',
                    borderRadius:   'var(--radius-md)',
                    fontSize:       'var(--font-size-sm)',
                    fontWeight:     'var(--font-weight-semibold)',
                    cursor:         testStatus === 'testing' ? 'not-allowed' : 'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    gap:            'var(--space-2)',
                  }}
                >
                  {testStatus === 'testing' ? (
                    <><LoadingSpinner size={14} color="white" /> Testing…</>
                  ) : 'Test Connection'}
                </button>
              </div>

              {/* Test result */}
              {(testStatus === 'connected' || testStatus === 'failed') && (
                <div
                  role="status"
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          'var(--space-2)',
                    padding:      'var(--space-3) var(--space-4)',
                    background:   testStatus === 'connected' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                    border:       `1px solid ${testStatus === 'connected' ? 'var(--color-mint-border)' : 'var(--color-error-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize:     'var(--font-size-sm)',
                    color:        testStatus === 'connected' ? 'var(--color-success)' : 'var(--color-error)',
                  }}
                >
                  {testStatus === 'connected'
                    ? <CheckCircle2 size={16} />
                    : <XCircle size={16} />
                  }
                  {testMessage}
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* SYNC */}
        <section aria-label="Sync">
          <SectionHeader title="Sync" />
          <Card>
            <InfoRow
              icon={<Clock size={16} />}
              label="Last Sync"
              value={formatLastSync(lastSyncTime)}
            />
            <div
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         'var(--space-3)',
                padding:     'var(--space-4)',
              }}
            >
              <div
                style={{
                  width:          36,
                  height:         36,
                  borderRadius:   'var(--radius-md)',
                  background:     'var(--color-surface)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  color:          'var(--color-text-tertiary)',
                  flexShrink:     0,
                }}
                aria-hidden="true"
              >
                <Smartphone size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', margin: 0 }}>
                  Auto Sync
                </p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                  Available in the Android app
                </p>
              </div>
              <span
                style={{
                  fontSize:   'var(--font-size-xs)',
                  color:      'var(--color-text-disabled)',
                  background: 'var(--color-surface)',
                  border:     '1px solid var(--color-border)',
                  padding:    '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Android
              </span>
            </div>
          </Card>
        </section>

        {/* HEALTH CONNECT (DIAGNOSTIC B2.2) */}
        <section aria-label="Health Connect">
          <SectionHeader title="Health Connect (Diagnostic)" />
          <Card>
            <div style={{ padding: 'var(--space-4)' }}>
              <p style={{ margin: 0, marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Status: <span style={{ color: hcAvailability === 'AVAILABLE' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>{hcAvailability}</span>
              </p>
              
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ margin: 0, marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Permissions:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  <div>Heart Rate: <span style={{ color: hcPermissions?.permissions.heartRate ? 'var(--color-success)' : 'var(--color-error)' }}>{hcPermissions?.permissions.heartRate ? 'Granted' : 'Not granted'}</span></div>
                  <div>Steps: <span style={{ color: hcPermissions?.permissions.steps ? 'var(--color-success)' : 'var(--color-error)' }}>{hcPermissions?.permissions.steps ? 'Granted' : 'Not granted'}</span></div>
                  <div>Blood Oxygen: <span style={{ color: hcPermissions?.permissions.spo2 ? 'var(--color-success)' : 'var(--color-error)' }}>{hcPermissions?.permissions.spo2 ? 'Granted' : 'Not granted'}</span></div>
                  <div>Sleep: <span style={{ color: hcPermissions?.permissions.sleep ? 'var(--color-success)' : 'var(--color-error)' }}>{hcPermissions?.permissions.sleep ? 'Granted' : 'Not granted'}</span></div>
                </div>
              </div>

              <button
                onClick={handleGrantPermissions}
                disabled={hcAvailability !== 'AVAILABLE'}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: hcAvailability === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                  opacity: hcAvailability === 'AVAILABLE' ? 1 : 0.6,
                  marginBottom: 'var(--space-2)'
                }}
              >
                Grant Health Permissions
              </button>

              <button
                onClick={handleReadData}
                disabled={hcAvailability !== 'AVAILABLE'}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  background: 'var(--color-mint-bg)',
                  color: 'var(--color-primary)',
                  border: '1.5px solid var(--color-mint-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: hcAvailability === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                  opacity: hcAvailability === 'AVAILABLE' ? 1 : 0.6,
                  marginBottom: 'var(--space-4)'
                }}
              >
                Read Live Data (B2.3)
              </button>
              
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <p style={{ margin: 0, marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Live Data Results:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  <div>
                    Heart Rate: 
                    {hcHeartRate ? (hcHeartRate.hasData ? ` ${hcHeartRate.value} ${hcHeartRate.unit}` : (hcHeartRate.hasPermission ? ' No data in last 7 days' : ' No permission')) : ' Not read'}
                  </div>
                  <div>
                    Steps: 
                    {hcSteps ? (hcSteps.hasData ? ` ${hcSteps.value} ${hcSteps.unit}` : (hcSteps.hasPermission ? ' No data today' : ' No permission')) : ' Not read'}
                  </div>
                  <div>
                    Blood Oxygen: 
                    {hcSpO2 ? (hcSpO2.hasData ? ` ${hcSpO2.value}${hcSpO2.unit}` : (hcSpO2.hasPermission ? ' No data in last 7 days' : ' No permission')) : ' Not read'}
                  </div>
                  <div>
                    Sleep: 
                    {hcSleep ? (hcSleep.hasData ? ` ${hcSleep.value} ${hcSleep.unit}` : (hcSleep.hasPermission ? ' No data in last 7 days' : ' No permission')) : ' Not read'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ABOUT */}
        <section aria-label="About">
          <SectionHeader title="About" />
          <Card>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div
                  style={{
                    width:          44,
                    height:         44,
                    borderRadius:   'var(--radius-md)',
                    background:     'var(--color-primary)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                  }}
                >
                  <img src="/salus-icon.svg" alt="" width={28} height={28} />
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                    SALUS Sync
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                    Version 1.0.0 Prototype
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--line-height-relaxed)' }}>
                Companion app for the SALUS healthcare platform.
                Syncs wearable health data with your SALUS patient record.
              </p>
              <div
                style={{
                  marginTop:    'var(--space-3)',
                  padding:      'var(--space-3)',
                  background:   'var(--color-warning-bg)',
                  border:       '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  fontSize:     'var(--font-size-xs)',
                  color:        'var(--color-warning)',
                }}
              >
                ⚠️ Phase A Web Prototype — Not the final Android application.
              </div>
            </div>
          </Card>
        </section>

        {/* LOGOUT */}
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width:          '100%',
              padding:        'var(--space-4)',
              background:     'var(--color-error-bg)',
              color:          'var(--color-error)',
              border:         '1px solid var(--color-error-border)',
              borderRadius:   'var(--radius-lg)',
              fontSize:       'var(--font-size-base)',
              fontWeight:     'var(--font-weight-semibold)',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            'var(--space-2)',
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        ) : (
          <div
            style={{
              background:   'var(--color-error-bg)',
              border:       '1px solid var(--color-error-border)',
              borderRadius: 'var(--radius-lg)',
              padding:      'var(--space-4)',
              display:      'flex',
              flexDirection:'column',
              gap:          'var(--space-3)',
              textAlign:    'center',
            }}
          >
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
              Are you sure you want to sign out?
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex:         1,
                  padding:      'var(--space-3)',
                  background:   'var(--color-surface)',
                  color:        'var(--color-text-secondary)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize:     'var(--font-size-sm)',
                  fontWeight:   'var(--font-weight-medium)',
                  cursor:       'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex:         1,
                  padding:      'var(--space-3)',
                  background:   'var(--color-error)',
                  color:        'white',
                  border:       'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize:     'var(--font-size-sm)',
                  fontWeight:   'var(--font-weight-semibold)',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  gap:          'var(--space-1)',
                }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 'var(--space-4)' }} />
      </div>
    </div>
  );
}
