import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const base: React.CSSProperties = {
  height: 48,
  padding: '0 28px',
  border: 'none',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 120ms ease, background 120ms ease',
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--text)', color: 'var(--bg-card)' },
  secondary: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-22)' },
  ghost: { background: 'transparent', color: 'var(--text-60)', padding: '0 12px' },
};

export function Button({ variant = 'primary', fullWidth, style, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...base,
        ...variantStyles[variant],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    />
  );
}
