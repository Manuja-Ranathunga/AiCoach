import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActiveTrackingPage } from './pages/ActiveTrackingPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { CountdownPage } from './pages/CountdownPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { ProgressPage } from './pages/ProgressPage';
import { SessionConfigPage } from './pages/SessionConfigPage';
import { SessionSummaryPage } from './pages/SessionSummaryPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function shell(page: React.ReactNode) {
  return (
    <ProtectedRoute>
      <AppShell>{page}</AppShell>
    </ProtectedRoute>
  );
}

function bare(page: React.ReactNode) {
  return <ProtectedRoute>{page}</ProtectedRoute>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/exercises" element={shell(<DashboardPage />)} />
          <Route path="/history" element={shell(<HistoryPage />)} />
          <Route path="/progress" element={shell(<ProgressPage />)} />

          <Route path="/exercises/:slug/calibrate" element={bare(<CalibrationPage />)} />
          <Route path="/exercises/:slug/configure" element={bare(<SessionConfigPage />)} />
          <Route path="/exercises/:slug/countdown" element={bare(<CountdownPage />)} />
          <Route path="/exercises/:slug/track" element={bare(<ActiveTrackingPage />)} />

          <Route path="/sessions/:id" element={bare(<SessionSummaryPage />)} />

          <Route path="/" element={<Navigate to="/exercises" replace />} />
          <Route path="*" element={<Navigate to="/exercises" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
