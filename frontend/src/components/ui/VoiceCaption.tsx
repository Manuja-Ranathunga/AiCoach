type CaptionTone = 'neutral' | 'good' | 'warn';

interface VoiceCaptionProps {
  text: string;
  tone?: CaptionTone;
}

const BORDER_BY_TONE: Record<CaptionTone, string> = {
  neutral: 'var(--border-22)',
  good: 'rgba(95,191,139,.45)',
  warn: 'rgba(224,164,88,.5)',
};

const DOT_BY_TONE: Record<CaptionTone, string> = {
  neutral: 'rgba(237,237,232,.5)',
  good: '#5FBF8B',
  warn: '#E0A458',
};

export function VoiceCaption({ text, tone = 'neutral' }: VoiceCaptionProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'rgba(11,12,14,.82)',
        border: `1px solid ${BORDER_BY_TONE[tone]}`,
        padding: '18px 28px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOT_BY_TONE[tone] }} />
      <div style={{ font: '500 22px var(--font-display)', color: 'var(--text)' }}>{text}</div>
      <div
        style={{
          font: '400 10.5px var(--font-mono)',
          color: 'var(--text-40)',
          borderLeft: '1px solid var(--border-18)',
          paddingLeft: 16,
        }}
      >
        SPOKEN
      </div>
    </div>
  );
}
