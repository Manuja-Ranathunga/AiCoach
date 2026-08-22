import { useEffect, useRef, useState } from 'react';
import { FeedbackManager, buildFormCueCandidate, numberToWords } from '../core/feedbackManager';
import { pickPrimaryError } from '../core/feedbackState';
import { speechEngine } from '../core/speechEngine';
import { SQUAT_CONFIG } from '../core/exercises/squatConfig';
import * as sessionStore from '../storage/sessionStore';

// Phase 9: settings now live in IndexedDB (via sessionStore) instead of
// localStorage, so they show up in export/import alongside session
// history. Kept as a fallback read-path only, for the one-time migration
// below — nothing writes here anymore.
const LEGACY_STORAGE_KEY = 'aicoach.voiceSettings';

const DEFAULT_SETTINGS = {
  enabled: true,
  volume: 1,
  rate: 1.1,
  correctionsOnly: false,
};

// Wraps FeedbackManager + speechEngine for the component tree: applies
// settings (persisted via sessionStore/IndexedDB), warms up speech on the
// user's first click, tracks the clean-rep streak praise needs, and
// exposes calls the detection loop / UI can make without knowing any of
// the throttling rules themselves.
export function useSpeechFeedback() {
  const [manager] = useState(() => new FeedbackManager());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Storage is async (IndexedDB), so settings start at defaults and are
  // replaced once the real values load — see the load effect below. This
  // also guards the save effect from writing DEFAULT_SETTINGS back over
  // whatever's actually stored before the load has even finished.
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const cleanStreakRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let loaded = await sessionStore.loadSettings();

      if (!loaded) {
        // One-time migration: this user has settings from before Phase 9
        // in localStorage. Move them into IndexedDB and stop using the
        // old key.
        try {
          const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (raw) {
            loaded = JSON.parse(raw);
            await sessionStore.saveSettings(loaded);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        } catch {
          // No legacy settings, or they were corrupt — fall through to defaults.
        }
      }

      if (cancelled) return;
      if (loaded) setSettings({ ...DEFAULT_SETTINGS, ...loaded });
      setSettingsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    speechEngine.setRate(settings.rate);
    speechEngine.setVolume(settings.enabled ? settings.volume : 0);
    if (!settings.enabled) speechEngine.cancel(); // instant silence, regardless of what's mid-utterance

    if (!settingsLoaded) return; // don't stomp stored settings with defaults before the load above resolves

    // Best-effort: if storage is unavailable, voice control still works
    // for this session, it just won't remember settings for next time —
    // matches the "degrade to in-memory" rule the rest of storage follows.
    sessionStore.saveSettings(settings);
  }, [settings, settingsLoaded]);

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

  // Call once when a set is finalized into a summary (see CameraView's
  // finalizeSet). Deliberately bypasses FeedbackManager's throttling —
  // same reasoning as Countdown.jsx: this is a one-shot lifecycle event,
  // not a per-frame coaching cue subject to the nagging-prevention rules.
  // "Nothing more" is the whole design goal here, so keep it to one line.
  const announceSetSummary = (validReps, formScore) => {
    if (!settings.enabled) return;
    const repWord = `${numberToWords(validReps)} valid rep${validReps === 1 ? '' : 's'}`;
    const text = formScore != null ? `${repWord}. Form score ${formScore}.` : `${repWord}.`;
    speechEngine.speak(text, { priority: 'info', interrupt: true });
  };

  const reset = () => {
    manager.reset();
    cleanStreakRef.current = 0;
  };

  return { settings, setSettings, update, announceRep, announceSetupHint, announceSetEnd, announceSetSummary, reset };
}
