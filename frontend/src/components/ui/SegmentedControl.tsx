interface SegmentedControlProps<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--border-18)',
        height: 48,
        font: '500 14px var(--font-body)',
      }}
      className="tabular-nums"
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              width: 64,
              background: active ? 'var(--border-12)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-55)',
              border: 'none',
              borderLeft: i > 0 ? '1px solid var(--border-14)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
