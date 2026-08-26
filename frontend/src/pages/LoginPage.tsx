import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { Button } from '../components/ui/Button';
import { SkeletonGlyph } from '../components/ui/SkeletonGlyph';
import { TextInput } from '../components/ui/TextInput';
import { useAuthStore } from '../store/authStore';

type Mode = 'signin' | 'signup';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token =
        mode === 'signin'
          ? await authApi.login({ email, password })
          : await authApi.signup({ email, password, display_name: displayName });
      const user = await authApi.fetchMeWithToken(token.access_token);
      setAuth(token.access_token, user);
      navigate('/exercises');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Something went wrong. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: '1fr 560px' }}>
      <div
        style={{
          padding: 64,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--border-08)',
        }}
      >
        <div style={{ font: '600 13px var(--font-mono)', letterSpacing: '.18em', color: 'var(--text)' }}>
          FORMSPOTTER
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap' }}>
          <SkeletonGlyph size={200} state="tracking" />
          <div style={{ maxWidth: 400 }}>
            <div style={{ font: "500 34px/1.25 var(--font-display)", color: 'var(--text)' }}>
              Real-time form analysis, computed on your machine.
            </div>
            <div style={{ marginTop: 20, font: '400 15px/1.7 var(--font-body)', color: 'var(--text-55)' }}>
              Pose detection runs in the browser. Frames are never uploaded, stored, or streamed.
            </div>
          </div>
        </div>
        <div style={{ font: '400 11px var(--font-mono)', color: 'var(--text-30)' }}>v0.9 · on-device pose engine</div>
      </div>

      <div style={{ padding: '64px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--border-14)',
            borderRadius: 2,
            padding: 3,
            width: '100%',
            marginBottom: 40,
          }}
        >
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '9px 0',
                background: mode === m ? 'var(--border-10)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-50)',
                font: '500 13px var(--font-body)',
                border: 'none',
                borderRadius: 1,
              }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {mode === 'signup' && (
            <TextInput
              label="NAME"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dana"
              required
            />
          )}
          <TextInput
            label="EMAIL"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dana@labmail.com"
            required
          />
          <TextInput
            label="PASSWORD"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            minLength={8}
            required
          />

          {error && <div style={{ font: '400 13px var(--font-body)', color: '#E0A458' }}>{error}</div>}

          <Button type="submit" fullWidth disabled={loading} style={{ marginTop: 10 }}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div
          style={{
            marginTop: 44,
            paddingTop: 22,
            borderTop: '1px solid var(--border-08)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 2 }} fill="none" stroke="var(--text-45)" strokeWidth="1.2">
            <rect x="1.5" y="5" width="11" height="8" />
            <path d="M4.5 5V3a2.5 2.5 0 015 0v2" />
          </svg>
          <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--text-50)' }}>
            Your camera never leaves your device.
          </div>
        </div>
      </div>
    </div>
  );
}
