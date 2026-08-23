// THE THROTTLING BRAIN. Decides whether and what to speak — never
// touches window.speechSynthesis directly (that's speechEngine.js's
// job). Every method that cares about time takes `now` as a parameter
// instead of reading Date.now()/performance.now() itself, so all of this
// is testable with fake timestamps and no real waiting.
//
// Design goal: silence is the default, speech is the exception. A coach
// who narrates every rep gets muted; these rules exist to stop that.

export const FEEDBACK_CONFIG = {
  // (a) Minimum gap between ANY two spoken cues, of any kind. Without
  // this, back-to-back corrections (e.g. depth then valgus) would stack
  // up and start to sound like an alarm instead of a coach.
  globalCooldownMs: 2500,
  // (b) The same cue id can't repeat sooner than this even once the
  // global cooldown has cleared — "knees out, knees out, knees out"
  // every 2.5s is still nagging.
  perCueCooldownMs: 6000,
  // (c) Once a cue has actually been SPOKEN this many times, it's been
  // heard — repeating it further doesn't help, so go quiet on it.
  repetitionCap: 3,
  // (c) ...for this long, before it's allowed to speak again (e.g. if
  // the same fault reappears well after the person seemed to fix it).
  repetitionCapCooldownMs: 30000,
  // (d.2) Minimum gap between positive/milestone cues specifically — a
  // whole set of "nice, nice, nice" isn't earned praise, it's noise.
  praiseIntervalMs: 30000,
  // (d.1) Announce every Nth valid rep, not every rep.
  milestoneInterval: 5,
  // (d.2) Consecutive fully-clean reps required before praise is offered.
  cleanRepStreakForPraise: 3,
  // (e) Form-error cues may only be offered while the user can actually
  // act on them — never mid-ASCENDING, when they're under load and the
  // rep is basically already decided.
  speakableStates: ['DESCENDING', 'BOTTOM'],
};

const PRIORITY_RANK = { critical: 3, warning: 2, info: 1 };

const PRAISE_PHRASES = ['Nice', 'Good form', 'Nice work'];

// Small English number-to-words for rep milestones ("five", "ten") —
// covers any realistic single-set rep count; falls back to the numeral
// past 99 rather than crashing on an edge case nobody will hit.
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0 ? TENS[tens] : `${TENS[tens]}-${ONES[ones]}`;
  }
  return String(n);
}

// Turns feedbackState.js's primary-error output into a speakable
// candidate. Voice and the on-screen cue banner both originate from the
// exact same primaryId/primaryMessage — this is what guarantees voice
// never says something the banner isn't already showing.
export function buildFormCueCandidate(feedback, exerciseConfig) {
  if (!feedback.primaryId) return null;

  const check = exerciseConfig.checks.find((c) => c.id === feedback.primaryId);
  return {
    id: feedback.primaryId,
    priority: feedback.primarySeverity,
    category: 'correction',
    phrases: check?.voiceCues ?? [feedback.primaryMessage],
  };
}

export class FeedbackManager {
  constructor(config = {}) {
    this.config = { ...FEEDBACK_CONFIG, ...config };
    this._resetMemory();
  }

  reset() {
    this._resetMemory();
  }

  _resetMemory() {
    this.lastGlobalSpokenAt = -Infinity;
    this.lastPraiseAt = -Infinity;
    this.cueMemory = new Map(); // id -> { repeatCount, lastSpokenAt, cappedUntil }
  }

  // Rep-completion event candidates. Milestone takes priority over
  // praise when both would technically apply on the same rep (e.g. the
  // 5th rep also happens to be the 3rd clean one in a row) — a milestone
  // is the rarer, more specific thing to say.
  buildRepEventCue({ validReps, cleanStreak }) {
    if (validReps > 0 && validReps % this.config.milestoneInterval === 0) {
      return { id: 'milestone', priority: 'info', category: 'milestone', text: numberToWords(validReps) };
    }
    if (cleanStreak >= this.config.cleanRepStreakForPraise) {
      return { id: 'praise', priority: 'info', category: 'praise', phrases: PRAISE_PHRASES };
    }
    return null;
  }

  buildSetEndCue(validReps) {
    if (validReps <= 0) return null;
    return {
      id: 'set_end',
      priority: 'info',
      category: 'info',
      text: `Set complete. ${validReps} rep${validReps === 1 ? '' : 's'}.`,
    };
  }

  // Called once per frame (formCue) and once per rep completion
  // (eventCue). Returns { id, priority, text, interrupt } to hand to
  // speechEngine.speak(), or null to stay silent this call.
  //
  // context:
  //   state            - current rep-state-machine state
  //   formCue          - candidate built from buildFormCueCandidate(), or null
  //   eventCue         - candidate from buildRepEventCue()/buildSetEndCue(), or null
  //   isSpeaking       - speechEngine.isSpeaking()
  //   speakingPriority - speechEngine.getCurrentPriority()
  decide({ state, formCue, eventCue, isSpeaking, speakingPriority }, now) {
    // (g) Never speak while untracked / out of frame — IDLE covers both
    // "no person seen yet" and "abandoned mid-rep because they left".
    if (state === 'IDLE') return null;

    const candidates = [];
    // (e) Form-error cues are only offered in states the user can react
    // to; gating it here means it's simply never a candidate otherwise.
    if (formCue && this.config.speakableStates.includes(state)) candidates.push(formCue);
    // Event cues fire once, exactly at rep completion — already "just
    // after rep completion" per rule (e), so no state gate needed.
    if (eventCue) candidates.push(eventCue);

    if (candidates.length === 0) return null;

    // (d) Only ever the single highest-priority candidate — never queue.
    candidates.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
    const chosen = candidates[0];

    if (!this._isEligible(chosen, now)) return null;

    // (f) Interruption rules.
    if (isSpeaking) {
      if (speakingPriority === 'critical') return null; // nothing interrupts a critical cue
      if (PRIORITY_RANK[chosen.priority] <= PRIORITY_RANK[speakingPriority]) return null; // must be strictly more urgent
    }

    // (a) Global cooldown — applies even to interruptions; a cue
    // starting to play is still "a spoken cue" for this rule's purpose.
    if (now - this.lastGlobalSpokenAt < this.config.globalCooldownMs) return null;

    const text = this._resolveText(chosen, now);
    this._recordSpoken(chosen, now);

    return { id: chosen.id, priority: chosen.priority, text, interrupt: isSpeaking };
  }

  _isEligible(cue, now) {
    // (d.2) Praise has its own, longer cooldown independent of the
    // per-cue one below (which would otherwise let it re-fire every 6s).
    if (cue.category === 'praise' && now - this.lastPraiseAt < this.config.praiseIntervalMs) {
      return false;
    }

    const entry = this.cueMemory.get(cue.id);
    if (!entry) return true;

    // (c) Repetition cap.
    if (entry.repeatCount >= this.config.repetitionCap && now < entry.cappedUntil) {
      return false;
    }

    // (b) Per-cue cooldown.
    if (now - entry.lastSpokenAt < this.config.perCueCooldownMs) {
      return false;
    }

    return true;
  }

  // Rotates through a cue's phrasings using its repeat count, so the
  // same correction doesn't sound identical every time — "Push your
  // knees out" the first time, "Knees out" the next.
  _resolveText(cue, now) {
    if (!cue.phrases || cue.phrases.length === 0) return cue.text ?? '';
    const entry = this.cueMemory.get(cue.id);
    const repeatCount = this._effectiveRepeatCount(entry, now);
    return cue.phrases[repeatCount % cue.phrases.length];
  }

  _effectiveRepeatCount(entry, now) {
    if (!entry) return 0;
    // A cap that has already expired means this is a fresh cycle.
    return now >= entry.cappedUntil ? 0 : entry.repeatCount;
  }

  _recordSpoken(cue, now) {
    this.lastGlobalSpokenAt = now;
    if (cue.category === 'praise') this.lastPraiseAt = now;

    const existing = this.cueMemory.get(cue.id);
    const repeatCount = this._effectiveRepeatCount(existing, now) + 1;

    this.cueMemory.set(cue.id, {
      repeatCount,
      lastSpokenAt: now,
      cappedUntil: repeatCount >= this.config.repetitionCap ? now + this.config.repetitionCapCooldownMs : -Infinity,
    });
  }
}
