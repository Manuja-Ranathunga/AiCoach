import './NavBar.css';

const TABS = [
  { id: 'workout', label: 'Workout' },
  { id: 'history', label: 'History' },
  { id: 'progress', label: 'Progress' },
  { id: 'settings', label: 'Settings' },
];

function NavBar({ active, onChange }) {
  return (
    <nav className="nav-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-bar-item${active === tab.id ? ' nav-bar-item-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default NavBar;
