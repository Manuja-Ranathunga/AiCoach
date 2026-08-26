import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextInput({ label, style, type, ...rest }: TextInputProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <div
        style={{
          font: '500 11px var(--font-mono)',
          letterSpacing: '.1em',
          color: 'var(--text-50)',
          marginBottom: 9,
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 48,
          border: '1px solid var(--border-18)',
          background: 'var(--bg-input)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
        }}
      >
        <input
          {...rest}
          type={isPassword && revealed ? 'text' : type}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            font: '400 15px var(--font-body)',
            color: 'var(--text)',
            ...style,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            style={{
              background: 'transparent',
              border: 'none',
              font: '400 12px var(--font-body)',
              color: 'var(--text-45)',
            }}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
}
