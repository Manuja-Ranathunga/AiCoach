interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberStepper({ value, onChange, min = 0, max = 999, step = 1, suffix = '' }: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-18)', height: 48 }}>
      <button
        type="button"
        onClick={dec}
        aria-label="Decrease"
        style={{
          width: 48,
          height: '100%',
          background: 'transparent',
          border: 'none',
          borderRight: '1px solid var(--border-14)',
          font: '400 18px var(--font-body)',
          color: 'var(--text-60)',
        }}
      >
        −
      </button>
      <div
        className="tabular-nums"
        style={{ width: 78, textAlign: 'center', font: '500 20px var(--font-display)', color: 'var(--text)' }}
      >
        {value}
        {suffix}
      </div>
      <button
        type="button"
        onClick={inc}
        aria-label="Increase"
        style={{
          width: 48,
          height: '100%',
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid var(--border-14)',
          font: '400 18px var(--font-body)',
          color: 'var(--text-60)',
        }}
      >
        +
      </button>
    </div>
  );
}
