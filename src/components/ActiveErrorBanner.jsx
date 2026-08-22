import './ActiveErrorBanner.css';

// Plain text banner for the current highest-severity confirmed error.
// No colors/icons yet — Phase 5 does the visual design. 'critical' beats
// 'warning' when both are active at once.
function ActiveErrorBanner({ activeErrors }) {
  if (!activeErrors || activeErrors.length === 0) return null;

  const worst =
    activeErrors.find((error) => error.severity === 'critical') ?? activeErrors[0];

  return (
    <div className="active-error-banner">
      [{worst.severity}] {worst.message}
    </div>
  );
}

export default ActiveErrorBanner;
