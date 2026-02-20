import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import CreateQuiz from './pages/admin/CreateQuiz';
import Dashboard from './pages/admin/Dashboard';
import EditQuiz from './pages/admin/EditQuiz';
import GameControl from './pages/admin/GameControl';
import History from './pages/admin/History';
import Login from './pages/admin/Login';
import SessionDetail from './pages/admin/SessionDetail';
import Settings from './pages/admin/Settings';
import Game from './pages/play/Game';
import Join from './pages/play/Join';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, checking } = useAuth();
  if (checking)
    return (
      <div className="page-center">
        <div className="text-muted">Loading…</div>
      </div>
    );
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Admin */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Dashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/quiz/new"
        element={
          <RequireAdmin>
            <CreateQuiz />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/quiz/:id/edit"
        element={
          <RequireAdmin>
            <EditQuiz />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/history"
        element={
          <RequireAdmin>
            <History />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sessions/:id"
        element={
          <RequireAdmin>
            <SessionDetail />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/game/:sessionId"
        element={
          <RequireAdmin>
            <GameControl />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <Settings />
          </RequireAdmin>
        }
      />

      {/* Player */}
      <Route path="/play" element={<Join />} />
      <Route path="/play/:pin" element={<Join />} />
      <Route path="/play/game/:sessionId" element={<Game />} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/play" replace />} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
