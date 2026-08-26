import type { CheckStatus } from '../../lib/pose-engine';

interface ChecklistItemProps {
  label: string;
  message: string;
  status: CheckStatus;
}

function Icon({ status }: { status: CheckStatus }) {
  if (status === 'pass') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ flex: 'none', marginTop: 1 }}>
        <circle cx="9" cy="9" r="8.25" fill="none" stroke="#5FBF8B" strokeWidth="1.2" />
        <path d="M5.5 9.2l2.4 2.4 4.6-4.8" fill="none" stroke="#5FBF8B" strokeWidth="1.4" />
      </svg>
    );
  }
  if (status === 'warn') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ flex: 'none', marginTop: 1 }}>
        <circle cx="9" cy="9" r="8.25" fill="none" stroke="#E0A458" strokeWidth="1.2" />
        <path d="M9 5.4v5.2M9 12.4v.9" stroke="#E0A458" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flex: 'none', marginTop: 1 }}>
      <circle
        cx="9"
        cy="9"
        r="8.25"
        fill="none"
        stroke="rgba(237,237,232,.28)"
        strokeWidth="1.2"
        strokeDasharray="2.4 3"
      />
    </svg>
  );
}

export function ChecklistItem({ label, message, status }: ChecklistItemProps) {
  const dim = status === 'pending';
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        padding: '16px 0',
        borderBottom: '1px solid var(--border-08)',
      }}
    >
      <Icon status={status} />
      <div>
        <div style={{ font: '500 14px var(--font-body)', color: dim ? 'var(--text-55)' : 'var(--text)' }}>
          {label}
        </div>
        <div
          style={{
            marginTop: 5,
            font: '400 12.5px/1.5 var(--font-body)',
            color: status === 'warn' ? '#E0A458' : dim ? 'var(--text-35)' : 'var(--text-45)',
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
