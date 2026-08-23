import './ResumeSessionPrompt.css';

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Shown on load when storage/sessionStore.getUnfinishedSessionToday()
// finds a session that was saved incrementally (see CameraView's
// finalizeSet) but never explicitly closed with "Done" — most likely a
// refresh or crash mid-workout. Resuming loads its sets back into memory
// so the session strip and DB record keep accumulating correctly; camera
// framing/orientation can't be restored, so resuming still goes through
// full SETUP.
function ResumeSessionPrompt({ session, onResume, onDiscard }) {
  const setCount = session.sets.length;

  return (
    <div className="resume-prompt-overlay">
      <div className="resume-prompt-panel">
        <p className="resume-prompt-title">Unfinished session from {formatTime(session.startedAt)}</p>
        <p className="resume-prompt-body">
          {setCount} set{setCount === 1 ? '' : 's'} saved before this got interrupted. Resume it, or start fresh?
        </p>
        <div className="resume-prompt-actions">
          <button className="resume-prompt-discard" onClick={onDiscard}>
            Discard
          </button>
          <button className="resume-prompt-resume" onClick={onResume}>
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResumeSessionPrompt;
