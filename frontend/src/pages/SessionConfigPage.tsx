import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { NumberStepper } from '../components/ui/NumberStepper';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useExerciseBySlug } from '../hooks/useExerciseBySlug';
import { useExerciseSettings, useUpdateExerciseSettings } from '../hooks/queries';
import type { RunSettings } from '../types/run';

export function SessionConfigPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { exercise } = useExerciseBySlug(slug);
  const { data: settings } = useExerciseSettings(exercise?.id);
  const updateSettings = useUpdateExerciseSettings(exercise?.id ?? '');

  const [targetReps, setTargetReps] = useState(12);
  const [countdown, setCountdown] = useState(5);
  const [inactivityTimeout, setInactivityTimeout] = useState(30);
  const [voiceCoaching, setVoiceCoaching] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setTargetReps(settings.target_reps);
    setCountdown(settings.countdown_seconds);
    setInactivityTimeout(settings.inactivity_timeout_seconds);
    setVoiceCoaching(settings.voice_coaching_enabled);
  }, [settings]);

  async function handleStart() {
    if (!exercise) return;
    await updateSettings.mutateAsync({
      target_reps: targetReps,
      countdown_seconds: countdown,
      inactivity_timeout_seconds: inactivityTimeout,
      voice_coaching_enabled: voiceCoaching,
    });
    const runSettings: RunSettings = {
      exerciseId: exercise.id,
      exerciseSlug: exercise.slug,
      exerciseName: exercise.name,
      targetReps,
      countdownSeconds: countdown,
      inactivityTimeoutSeconds: inactivityTimeout,
      voiceCoachingEnabled: voiceCoaching,
    };
    navigate(`/exercises/${slug}/countdown`, { state: runSettings });
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 64,
          flex: 'none',
          borderBottom: '1px solid var(--border-08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            onClick={() => navigate(`/exercises/${slug}/calibrate`)}
            style={{ background: 'none', border: 'none', font: '400 13px var(--font-body)', color: 'var(--text-50)' }}
          >
            ← Back
          </button>
          <div style={{ font: '500 12px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text)' }}>
            SESSION SETUP · {(exercise?.name ?? slug).toUpperCase()}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            font: '400 11px var(--font-mono)',
            color: 'var(--text-40)',
            border: '1px solid var(--border-14)',
            padding: '5px 10px',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-22)' }} />
          CAMERA OFF
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '80px 48px' }}>
        <div style={{ width: 600 }}>
          <div style={{ font: '500 28px/1.2 var(--font-display)', color: 'var(--text)' }}>Configure the set</div>
          <div style={{ marginTop: 10, font: '400 14px/1.6 var(--font-body)', color: 'var(--text-50)' }}>
            Defaults come from your last {exercise?.name.toLowerCase() ?? ''} session.
          </div>

          <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column' }}>
            <Row
              title="Target reps"
              description="Set ends automatically at the target."
              control={<NumberStepper value={targetReps} onChange={setTargetReps} min={1} max={100} />}
            />
            <Row
              title="Pre-start countdown"
              description="Time to get into position."
              control={
                <SegmentedControl
                  options={[
                    { label: '3s', value: 3 },
                    { label: '5s', value: 5 },
                    { label: '10s', value: 10 },
                  ]}
                  value={countdown}
                  onChange={setCountdown}
                />
              }
            />
            <Row
              title="Inactivity timeout"
              description="Session ends if no movement is detected."
              control={
                <NumberStepper value={inactivityTimeout} onChange={setInactivityTimeout} min={5} max={300} step={5} suffix="s" />
              }
              last
            />
          </div>

          <div style={{ marginTop: 48, display: 'flex', gap: 14 }}>
            <Button fullWidth style={{ height: 52 }} onClick={handleStart} disabled={updateSettings.isPending}>
              Start
            </Button>
            <Button
              variant="secondary"
              style={{ width: 160, height: 52 }}
              onClick={() => navigate(`/exercises/${slug}/calibrate`)}
            >
              Recalibrate
            </Button>
          </div>
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              font: '400 12.5px/1.6 var(--font-body)',
              color: 'var(--text-40)',
            }}
          >
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={voiceCoaching} onChange={(e) => setVoiceCoaching(e.target.checked)} />
              Voice coaching is on. Corrections are spoken once per rep at most.
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  description,
  control,
  last = false,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 0',
        borderTop: '1px solid var(--border-10)',
        borderBottom: last ? '1px solid var(--border-10)' : undefined,
      }}
    >
      <div>
        <div style={{ font: '500 15px var(--font-body)', color: 'var(--text)' }}>{title}</div>
        <div style={{ marginTop: 6, font: '400 12.5px var(--font-body)', color: 'var(--text-45)' }}>{description}</div>
      </div>
      {control}
    </div>
  );
}
