interface StatTileProps {
  label: string;
  value: string | number;
  valueColor?: string;
  size?: number;
}

export function StatTile({ label, value, valueColor = 'var(--text)', size = 24 }: StatTileProps) {
  return (
    <div>
      <div style={{ font: "500 10.5px var(--font-mono)", letterSpacing: '.12em', color: 'var(--text-45)' }}>
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{
          marginTop: 10,
          font: `500 ${size}px var(--font-display)`,
          color: valueColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}
