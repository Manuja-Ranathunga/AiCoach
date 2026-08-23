import { useEffect, useState } from 'react';
import './SettingsScreen.css';
import * as sessionStore from '../storage/sessionStore';

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Voice/coaching controls stay on the always-visible in-workout
// VoiceSettings panel (Phase 6) — this screen is specifically the data
// management surface the Phase 9 spec asks for: export, import, clear,
// storage used.
function SettingsScreen() {
  const [estimate, setEstimate] = useState(null);
  const [status, setStatus] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    sessionStore.getStorageEstimate().then(setEstimate);
  }, []);

  const refreshEstimate = () => sessionStore.getStorageEstimate().then(setEstimate);

  const handleExport = async () => {
    const ok = await sessionStore.exportAllData();
    setStatus(ok ? 'Export downloaded.' : 'Export failed — storage may be unavailable.');
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later

    if (!file) return;
    if (!window.confirm('Importing adds these sessions to what you already have (sessions with a matching ID are overwritten). Continue?')) {
      return;
    }

    setImporting(true);
    const text = await file.text();
    const result = await sessionStore.importData(text);
    setImporting(false);
    setStatus(result.success ? `Imported ${result.sessionsImported} session(s).` : `Import failed: ${result.error}`);
    refreshEstimate();
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL saved sessions and settings? This cannot be undone.')) return;
    if (!window.confirm('Really delete everything? There is no way back unless you have an exported backup.')) return;

    const ok = await sessionStore.clearAllData();
    setStatus(ok ? 'All data cleared.' : 'Could not clear data.');
    refreshEstimate();
  };

  const storageStatus = sessionStore.getStorageStatus();

  return (
    <div className="settings-screen">
      <section className="settings-section">
        <h3>Data</h3>
        <p className="settings-note">
          Storage: {storageStatus.available ? 'working' : 'unavailable in this browser'}
          {' · approx. used: '}
          {formatBytes(estimate?.usage)}
          {estimate?.quota ? ` of ${formatBytes(estimate.quota)}` : ''}
        </p>

        <div className="settings-actions">
          <button onClick={handleExport}>Export all data (JSON)</button>

          <label className="settings-import-button">
            {importing ? 'Importing…' : 'Import from JSON'}
            <input type="file" accept="application/json" onChange={handleImportFile} disabled={importing} />
          </label>

          <button className="settings-danger-button" onClick={handleClearAll}>
            Clear all data
          </button>
        </div>

        {status && <p className="settings-status">{status}</p>}
      </section>
    </div>
  );
}

export default SettingsScreen;
