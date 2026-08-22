// Thin wrapper over the Web Speech API. This is the ONLY file that
// touches window.speechSynthesis — everything else (feedbackManager,
// components) goes through the exported `speechEngine` instance so the
// browser-API quirks below stay contained in one place:
//
// - getVoices() is often empty on first call; the real list arrives
//   asynchronously via the 'voiceschanged' event.
// - Browsers block audio (including speech) until the page has seen a
//   user gesture — warmUp() plays a silent utterance on first click to
//   unlock real speech for later, un-gestured calls.
// - Some browsers/environments have no speech support at all; every
//   method below is a safe no-op in that case so visuals keep working.

const DEFAULTS = {
  rate: 1.1, // slightly fast — a cue needs to land while the movement is still happening
  pitch: 1,
  volume: 1,
};

function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

class SpeechEngine {
  constructor() {
    this.supported = isSupported();
    this.rate = DEFAULTS.rate;
    this.pitch = DEFAULTS.pitch;
    this.volume = DEFAULTS.volume;
    this.voice = null;
    this.preferredVoiceName = null;
    this.warmedUp = false;
    // Priority of the utterance currently playing (or null) — lets
    // feedbackManager enforce "nothing interrupts a critical cue" even
    // if a caller mistakenly asks to interrupt.
    this.currentPriority = null;

    if (this.supported) {
      this._refreshVoice();
      window.speechSynthesis.addEventListener('voiceschanged', () => this._refreshVoice());
    }
  }

  _refreshVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    if (this.preferredVoiceName) {
      const preferred = voices.find((voice) => voice.name === this.preferredVoiceName);
      if (preferred) {
        this.voice = preferred;
        return;
      }
    }
    this.voice = voices.find((voice) => voice.lang?.startsWith('en')) ?? voices[0] ?? null;
  }

  getVoices() {
    return this.supported ? window.speechSynthesis.getVoices() : [];
  }

  setVoiceByName(name) {
    this.preferredVoiceName = name;
    this._refreshVoice();
  }

  setRate(rate) {
    this.rate = rate;
  }

  setPitch(pitch) {
    this.pitch = pitch;
  }

  setVolume(volume) {
    this.volume = volume;
  }

  // Must be called from inside a real user gesture handler (e.g. a click
  // listener) — that's what satisfies the browser's autoplay policy for
  // every subsequent, un-gestured speak() call later in the session.
  warmUp() {
    if (!this.supported || this.warmedUp) return;
    this.warmedUp = true;

    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  }

  isSpeaking() {
    return this.supported && window.speechSynthesis.speaking;
  }

  getCurrentPriority() {
    return this.currentPriority;
  }

  cancel() {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    this.currentPriority = null;
  }

  // Returns true if it actually started speaking, false if it was
  // dropped (unsupported, empty text, or blocked by the rules below) —
  // callers use this to decide whether to update their own bookkeeping.
  speak(text, { priority = 'info', interrupt = false } = {}) {
    if (!this.supported || !text) return false;

    if (this.isSpeaking()) {
      // Nothing interrupts a critical cue, regardless of what the caller asks.
      if (this.currentPriority === 'critical') return false;
      // Never let the native API silently queue a second utterance —
      // that's exactly the "chatty coach" behavior this app must avoid.
      if (!interrupt) return false;
      this.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;
    if (this.voice) utterance.voice = this.voice;

    utterance.onstart = () => {
      this.currentPriority = priority;
    };
    utterance.onend = () => {
      this.currentPriority = null;
    };
    utterance.onerror = () => {
      this.currentPriority = null;
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }
}

export const speechEngine = new SpeechEngine();
