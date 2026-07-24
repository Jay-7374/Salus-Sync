/**
 * SALUS Sync — SyncFlowDiagram
 * Visual representation of the sync pipeline:
 * Health Connect → SALUS Sync → SALUS Cloud
 */


import { Watch, Smartphone, Cloud, ArrowDown } from 'lucide-react';

interface SyncFlowDiagramProps {
  healthDataCount: number;
  backendConnected: boolean | null;
  lastSyncTime: string | null;
  isSyncing: boolean;
}

interface FlowNodeProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status?: 'ok' | 'warning' | 'idle';
  isPulsing?: boolean;
}

function FlowNode({ icon, title, subtitle, status = 'idle', isPulsing }: FlowNodeProps) {
  const statusColor =
    status === 'ok'      ? 'var(--color-success)' :
    status === 'warning' ? 'var(--color-warning)'  :
                           'var(--color-text-tertiary)';

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            'var(--space-2)',
        flex:           1,
      }}
    >
      <div
        style={{
          width:          56,
          height:         56,
          borderRadius:   'var(--radius-xl)',
          background:     status === 'ok' ? 'var(--color-mint-bg)' : 'var(--color-surface)',
          border:         `2px solid ${status === 'ok' ? 'var(--color-mint-border)' : 'var(--color-border)'}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          statusColor,
          animation:      isPulsing ? 'pulse 1s ease-in-out infinite' : undefined,
          transition:     'background var(--transition-base), border-color var(--transition-base)',
        }}
      >
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize:   'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color:      'var(--color-text-primary)',
            margin:     0,
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color:    statusColor,
            margin:   0,
            marginTop: 2,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function FlowArrow({ active }: { active: boolean }) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        paddingTop:     4,
      }}
    >
      <ArrowDown
        size={18}
        strokeWidth={2}
        color={active ? 'var(--color-primary)' : 'var(--color-text-disabled)'}
        style={{ transition: 'color var(--transition-base)' }}
      />
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

export function SyncFlowDiagram({
  healthDataCount,
  backendConnected,
  lastSyncTime,
  isSyncing,
}: SyncFlowDiagramProps) {
  const hasHealth  = healthDataCount > 0;
  const hasBackend = backendConnected === true;

  return (
    <div
      style={{
        background:    'var(--color-surface-raised)',
        border:        '1px solid var(--color-border)',
        borderRadius:  'var(--radius-xl)',
        padding:       'var(--space-6)',
        boxShadow:     'var(--shadow-sm)',
      }}
    >
      {/* Flow diagram */}
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            'var(--space-2)',
          marginBottom:   'var(--space-6)',
        }}
      >
        <FlowNode
          icon={<Watch size={24} />}
          title="Health Data"
          subtitle={hasHealth ? `${healthDataCount} metrics available` : 'No data'}
          status={hasHealth ? 'ok' : 'idle'}
          isPulsing={isSyncing && hasHealth}
        />
        <FlowArrow active={hasHealth && !isSyncing} />
        <FlowNode
          icon={<Smartphone size={24} />}
          title="SALUS Sync"
          subtitle={isSyncing ? 'Syncing…' : 'Ready'}
          status={isSyncing ? 'ok' : 'idle'}
          isPulsing={isSyncing}
        />
        <FlowArrow active={isSyncing || hasBackend} />
        <FlowNode
          icon={<Cloud size={24} />}
          title="SALUS Cloud"
          subtitle={
            backendConnected === null ? 'Checking…' :
            hasBackend              ? 'Connected'  :
                                      'Unavailable'
          }
          status={hasBackend ? 'ok' : backendConnected === false ? 'warning' : 'idle'}
          isPulsing={backendConnected === null}
        />
      </div>

      {/* Status cards */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap:                 'var(--space-3)',
        }}
      >
        <StatusInfoCard
          label="Health Data"
          value={hasHealth ? `${healthDataCount} metrics` : 'No data'}
          ok={hasHealth}
        />
        <StatusInfoCard
          label="Backend"
          value={
            backendConnected === null    ? 'Checking…' :
            backendConnected             ? 'Connected'  :
                                           'Offline'
          }
          ok={hasBackend}
        />
        <StatusInfoCard
          label="Last Sync"
          value={formatLastSync(lastSyncTime)}
          ok={!!lastSyncTime}
        />
      </div>
    </div>
  );
}

function StatusInfoCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      style={{
        background:    ok ? 'var(--color-mint-bg)' : 'var(--color-surface)',
        border:        `1px solid ${ok ? 'var(--color-mint-border)' : 'var(--color-border)'}`,
        borderRadius:  'var(--radius-md)',
        padding:       'var(--space-3)',
        textAlign:     'center',
        transition:    'background var(--transition-base)',
      }}
    >
      <p
        style={{
          fontSize:   'var(--font-size-xs)',
          color:      'var(--color-text-tertiary)',
          margin:     0,
          marginBottom: 4,
          fontWeight: 'var(--font-weight-medium)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize:   'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color:      ok ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          margin:     0,
          wordBreak:  'break-word',
        }}
      >
        {value}
      </p>
    </div>
  );
}
