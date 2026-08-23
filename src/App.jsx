import { useState } from 'react';
import CameraView from './components/CameraView';
import HistoryScreen from './components/HistoryScreen';
import ProgressScreen from './components/ProgressScreen';
import SettingsScreen from './components/SettingsScreen';
import NavBar from './components/NavBar';
import './App.css';

function App() {
  const [tab, setTab] = useState('workout');

  return (
    <div className="app">
      <h1>AI Workout Form Coach</h1>
      <NavBar active={tab} onChange={setTab} />

      <div className="app-content">
        {/* CameraView stays mounted regardless of tab — it owns the live
            camera stream, the pose-detection loop, and the in-progress
            workout/session state. Unmounting it every time someone peeks
            at History would tear the camera down and lose that state;
            hiding it with CSS instead keeps it running underneath. */}
        <div className={`app-workout-tab${tab === 'workout' ? '' : ' app-hidden'}`}>
          <CameraView />
        </div>

        {tab === 'history' && <HistoryScreen />}
        {tab === 'progress' && <ProgressScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </div>
    </div>
  );
}

export default App;
