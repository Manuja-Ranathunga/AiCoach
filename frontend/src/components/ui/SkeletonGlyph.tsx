type GlyphState = 'neutral' | 'tracking' | 'good' | 'warn';

interface SkeletonGlyphProps {
  size?: number;
  state?: GlyphState;
  /** Amber-out the lower body (knee/ankle) segment, e.g. to flag a squat depth fault. */
  flagLowerBody?: boolean;
}

const STROKE_BY_STATE: Record<GlyphState, string> = {
  neutral: 'rgba(237,237,232,.22)',
  tracking: '#4C7CFF',
  good: '#5FBF8B',
  warn: '#4C7CFF',
};

const DOT_BY_STATE: Record<GlyphState, string> = {
  neutral: 'rgba(237,237,232,.5)',
  tracking: '#4C7CFF',
  good: '#5FBF8B',
  warn: '#4C7CFF',
};

/** Decorative stick-figure pose glyph shared across the login, dashboard and tracking screens. */
export function SkeletonGlyph({ size = 120, state = 'neutral', flagLowerBody = false }: SkeletonGlyphProps) {
  const stroke = STROKE_BY_STATE[state];
  const dot = DOT_BY_STATE[state];
  const warnColor = '#E0A458';
  const lowerStroke = flagLowerBody ? warnColor : stroke;
  const lowerDot = flagLowerBody ? warnColor : dot;

  return (
    <svg width={size} height={size * (200 / 120)} viewBox="0 0 120 200" fill="none" aria-hidden="true">
      <circle cx="60" cy="24" r="10" stroke={stroke} strokeWidth="1.6" />
      <path d="M60 34V90M36 52h48M36 52l-8 34-4 32M84 52l8 34 4 32M60 90v14" stroke={stroke} strokeWidth="1.6" />
      <path
        d="M40 104h40M40 104l-4 44 4 42M80 104l4 44-4 42"
        stroke={lowerStroke}
        strokeWidth="1.6"
      />
      <g fill={dot} stroke="none">
        <circle cx="36" cy="52" r="3.2" />
        <circle cx="84" cy="52" r="3.2" />
        <circle cx="28" cy="86" r="2.8" />
        <circle cx="92" cy="86" r="2.8" />
        <circle cx="24" cy="118" r="2.8" />
        <circle cx="96" cy="118" r="2.8" />
      </g>
      <g fill={lowerDot} stroke="none">
        <circle cx="40" cy="104" r="3.4" />
        <circle cx="80" cy="104" r="3.4" />
        <circle cx="36" cy="148" r="3.4" />
        <circle cx="84" cy="148" r="3.4" />
        <circle cx="40" cy="190" r="2.8" />
        <circle cx="80" cy="190" r="2.8" />
      </g>
    </svg>
  );
}
