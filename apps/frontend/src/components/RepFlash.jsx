import './RepFlash.css';

// Brief full-frame edge pulse on rep completion: green for valid, red for
// invalid (with the failure reason). `flash.id` changes every time a new
// rep completes; keying the element on it remounts the div and replays
// the CSS fade-out animation from scratch, even for reps that finish
// back-to-back — no timers or manual animation restarts needed.
function RepFlash({ flash }) {
  if (!flash) return null;

  return (
    <div key={flash.id} className={`rep-flash ${flash.valid ? 'rep-flash-valid' : 'rep-flash-invalid'}`}>
      {!flash.valid && flash.reason && <div className="rep-flash-reason">{flash.reason}</div>}
    </div>
  );
}

export default RepFlash;
