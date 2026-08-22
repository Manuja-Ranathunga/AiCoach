import './StorageWarningBanner.css';

// Shown once (see CameraView's warnStorageOnce) the first time a save to
// IndexedDB fails — private browsing, quota exceeded, or a browser that
// doesn't support it at all. The workout itself never depends on this
// succeeding (see finalizeSet — everything shown on screen is already
// in memory before the save is even attempted), so this is purely
// informational: your data won't be there next time.
function StorageWarningBanner({ onDismiss }) {
  return (
    <div className="storage-warning-banner">
      <span>Couldn't save to this device's storage — your workout still works, but history won't be kept.</span>
      <button onClick={onDismiss}>×</button>
    </div>
  );
}

export default StorageWarningBanner;
