import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  color: isActive ? 'var(--text)' : 'var(--text-50)',
  paddingBottom: 2,
  borderBottom: isActive ? '1px solid var(--text)' : '1px solid transparent',
  font: '500 13px var(--font-body)',
});

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initial = user?.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          height: 64,
          flex: 'none',
          borderBottom: '1px solid var(--border-08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          <div style={{ font: "600 12px var(--font-mono)", letterSpacing: '.18em', color: 'var(--text)' }}>
            FORMSPOTTER
          </div>
          <nav style={{ display: 'flex', gap: 28 }}>
            <NavLink to="/exercises" style={navLinkStyle}>
              Exercises
            </NavLink>
            <NavLink to="/history" style={navLinkStyle}>
              History
            </NavLink>
            <NavLink to="/progress" style={navLinkStyle}>
              Progress
            </NavLink>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-45)' }}>{user?.email}</div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--border-12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              font: '500 11px var(--font-body)',
              color: 'var(--text)',
            }}
          >
            {initial}
          </div>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
