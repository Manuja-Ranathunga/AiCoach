import { useState } from 'react';
import './VoiceSettings.css';

// Voice on/off is deliberately its own always-visible button, separate
// from the rest of the settings — it needs to be killable in one click,
// not buried behind an expand/collapse.
function VoiceSettings({ settings, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch) => onChange({ ...settings, ...patch });

  return (
    <div className="voice-settings">
      {expanded && (
        <div className="voice-settings-panel">
          <label className="voice-settings-row">
            Volume
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(event) => update({ volume: Number(event.target.value) })}
            />
          </label>

          <label className="voice-settings-row">
            Rate
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={settings.rate}
              onChange={(event) => update({ rate: Number(event.target.value) })}
            />
          </label>

          <label className="voice-settings-row voice-settings-checkbox-row">
            <input
              type="checkbox"
              checked={settings.correctionsOnly}
              onChange={(event) => update({ correctionsOnly: event.target.checked })}
            />
            Corrections only
          </label>
        </div>
      )}

      <div className="voice-settings-buttons">
        <button
          className={`voice-mute-button${settings.enabled ? '' : ' voice-mute-button-off'}`}
          onClick={() => update({ enabled: !settings.enabled })}
        >
          {settings.enabled ? 'Voice: On' : 'Voice: Off'}
        </button>
        <button className="voice-settings-toggle" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? 'Close' : 'Voice settings'}
        </button>
      </div>
    </div>
  );
}

export default VoiceSettings;
