import type { HTMLAttributes } from 'react';

export function Card({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-10)',
        ...style,
      }}
      {...rest}
    />
  );
}
