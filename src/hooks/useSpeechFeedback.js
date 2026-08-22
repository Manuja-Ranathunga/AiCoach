import { useEffect, useRef, useState } from 'react';
import { FeedbackManager, buildFormCueCandidate } from '../core/feedbackManager';
import { pickPrimaryError } from '../core/feedbackState';
import { speechEngine } from '../core/speechEngine';
import { SQUAT_CONFIG } from '../core/exercises/squatConfig';

const SETTINGS_STORAGE_KEY = 'aicoach.voiceSettings';

const DEFAULT_SETTINGS = {
  enabled: true,
  volume: 1,
  rate: 1.1,
  correctionsOnly: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Wraps FeedbackManager + speechEngine for the component tree: applies
// settings (persisted to localStorage), warms up speech on the user's
// first click, tracks the clean-rep streak praise needs, and exposes
// three calls the detection loop / UI can make without knowing any of
// the throttling rules themselves.
export function useSpeechFeedback() {
  const [manager] = useState(() => new FeedbackManager());
  const [settings, setSettings] = useState(loadSettings);
  const cleanStreakRef = useRef(0);

  useEffect(() => {
    speechEngine.setRate(settings.rate);
    speechEngine.setVolume(settings.enabled ? settings.volume : 0);
    if (!settings.enabled) speechEngine.cancel(); // instant silence, regardless of what's mid-utterance

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing / quota exceeded — voice still works this
      // session, it just won't remember settings for next time.
    }
  }, [settings]);

  useEffect(() => {
    const warmUpOnce = () => {
      speechEngine.warmUp();
      window.removeEventListener('click', warmUpOnce);
    };
    window.addEventListener('click', warmUpOnce);
    return () => window.removeEventListener('click', warmUpOnce);
  }, []);

  const speakIfDecided = (decision) => {
    if (decision) speechEngine.speak(decision.text, { priority: decision.priority, interrupt: decision.interrupt });
  };

  // Call every frame with the live rep state + feedbackState.js output.
  const update = (state, feedback) => {
    if (!settings.enabled) return;

    const formCue = buildFormCueCandidate(feedback, SQUAT_CONFIG);
    const decision = manager.decide(
      {
        state,
        formCue,
        eventCue: null,
        isSpeaking: speechEngine.isSpeaking(),
        speakingPriority: speechEngine.getCurrentPriority(),
      },
      performance.now()
    );
    speakIfDecided(decision);
  };

  // Call once when a rep completes.
  const announceRep = (state, rep, validReps) => {
    cleanStreakRef.current = rep.errors.length === 0 ? cleanStreakRef.current + 1 : 0;

    if (!settings.enabled) return;

    // Completion-only checks (depth) never appear in the live per-frame
    // activeErrors that update() speaks from — rep completion is the
    // ONLY moment they can ever be voiced, so give a failed rep's worst
    // error a shot here too. Uses the same cue id as the live path, so
    // it shares that id's cooldown/repetition-cap bookkeeping.
    if (!rep.valid) {
      const failure = pickPrimaryError(rep.errors, SQUAT_CONFIG.errorPriority);
      const check = failure && SQUAT_CONFIG.checks.find((c) => c.id === failure.id);
      if (failure && check) {
        const correctionCue = { id: failure.id, priority: failure.severity, category: 'correction', phrases: check.voiceCues };
        const decision = manager.decide(
          { state, formCue: null, eventCue: correctionCue, isSpeaking: speechEngine.isSpeaking(), speakingPriority: speechEngine.getCurrentPriority() },
          performance.now()
        );
        speakIfDecided(decision);
      }
    }

    if (settings.correctionsOnly) return; // corrections-only disables milestones/praise below

    const eventCue = manager.buildRepEventCue({ validReps, cleanStreak: cleanStreakRef.current });
    if (!eventCue) return;

    const decision = manager.decide(
      { state, formCue: null, eventCue, isSpeaking: speechEngine.isSpeaking(), speakingPriority: speechEngine.getCurrentPriority() },
      performance.now()
    );
    speakIfDecided(decision);
  };

  // Call every frame during setup (or mid-set repositioning) with the
  // current failing hint, or null if everything's passing. Shares
  // FeedbackManager's cooldown rules — same "don't nag" behavior as
  // in-workout coaching, just with the rep-state gate bypassed via
  // eventCue (there's no rep state yet during setup).
  const announceSetupHint = (hint) => {
    if (!settings.enabled || !hint) return;

    const eventCue = { id: 'setup_hint', priority: 'info', category: 'setup', text: hint };
    const decision = manager.decide(
      { state: 'SETUP', formCue: null, eventCue, isSpeaking: speechEngine.isSpeaking(), speakingPriority: speechEngine.getCurrentPriority() },
      performance.now()
    );
    speakIfDecided(decision);
  };

  // Call when the current set ends (currently wired to the Reset button).
  const announceSetEnd = (state, validReps) => {
    if (!settings.enabled || settings.correctionsOnly) return;

    const eventCue = manager.buildSetEndCue(validReps);
    if (!eventCue) return;

    const decision = manager.decide(
      { state, formCue: null, eventCue, isSpeaking: speechEngine.isSpeaking(), speakingPriority: speechEngine.getCurrentPriority() },
      performance.now()
    );
    speakIfDecided(decision);
  };

  const reset = () => {
    manager.reset();
    cleanStreakRef.current = 0;
  };

  return { settings, setSettings, update, announceRep, announceSetupHint, announceSetEnd, reset };
}
