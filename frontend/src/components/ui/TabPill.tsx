interface TabPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function TabPill({ label, active, onClick }: TabPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        font: '500 12.5px var(--font-body)',
        background: active ? 'var(--border-12)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-55)',
        border: active ? 'none' : '1px solid var(--border-14)',
      }}
    >
      {label}
    </button>
  );
}
