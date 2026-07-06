import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageCenter } from '@/components/layout';
import { useAuth } from './context/AuthContext';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const CreateQuiz = lazy(() => import('./pages/admin/CreateQuiz'));
const EditQuiz = lazy(() => import('./pages/admin/EditQuiz'));
const History = lazy(() => import('./pages/admin/History'));
const SessionDetail = lazy(() => import('./pages/admin/SessionDetail'));
const GameControl = lazy(() => import('./pages/admin/GameControl'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const UserLogin = lazy(() => import('./pages/auth/UserLogin'));
const UserRegister = lazy(() => import('./pages/auth/UserRegister'));
const UserSettings = lazy(() => import('./pages/user/UserSettings'));
const PlayHistory = lazy(() => import('./pages/user/PlayHistory'));
const PlaySessionDetail = lazy(() => import('./pages/user/PlaySessionDetail'));
const Game = lazy(() => import('./pages/play/Game'));
const Join = lazy(() => import('./pages/play/Join'));

function Loading() {
  return (
    <PageCenter>
      <div className="text-muted-foreground">Loading…</div>
    </PageCenter>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { role, checking } = useAuth();
  if (checking) return <Loading />;
  if (role !== 'super_admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const { role, checking } = useAuth();
  if (checking) return <Loading />;
  if (role !== 'user') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const creatorPages = [
  { path: '', Component: Dashboard },
  { path: 'quiz/new', Component: CreateQuiz },
  { path: 'quiz/:id/edit', Component: EditQuiz },
  { path: 'history', Component: History },
  { path: 'sessions/:id', Component: SessionDetail },
  { path: 'game/:sessionId', Component: GameControl },
] as const;

function guardedCreatorRoutes(base: '/admin' | '/u', Guard: typeof RequireSuperAdmin) {
  return creatorPages.map(({ path, Component }) => (
    <Route
      key={`${base}-${path || 'index'}`}
      path={path === '' ? base : `${base}/${path}`}
      element={
        <Lazy>
          <Guard>
            <Component />
          </Guard>
        </Lazy>
      }
    />
  ));
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Lazy>
            <Landing />
          </Lazy>
        }
      />

      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin/settings"
        element={
          <Lazy>
            <RequireSuperAdmin>
              <Settings />
            </RequireSuperAdmin>
          </Lazy>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Lazy>
            <RequireSuperAdmin>
              <UserManagement />
            </RequireSuperAdmin>
          </Lazy>
        }
      />
      {guardedCreatorRoutes('/admin', RequireSuperAdmin)}

      <Route
        path="/login"
        element={
          <Lazy>
            <UserLogin />
          </Lazy>
        }
      />
      <Route
        path="/register"
        element={
          <Lazy>
            <UserRegister />
          </Lazy>
        }
      />
      <Route
        path="/u/settings"
        element={
          <Lazy>
            <RequireUser>
              <UserSettings />
            </RequireUser>
          </Lazy>
        }
      />
      <Route
        path="/u/my-games"
        element={
          <Lazy>
            <RequireUser>
              <PlayHistory />
            </RequireUser>
          </Lazy>
        }
      />
      <Route
        path="/u/my-games/:id"
        element={
          <Lazy>
            <RequireUser>
              <PlaySessionDetail />
            </RequireUser>
          </Lazy>
        }
      />
      {guardedCreatorRoutes('/u', RequireUser)}

      <Route
        path="/play"
        element={
          <Lazy>
            <Join />
          </Lazy>
        }
      />
      <Route
        path="/play/:pin"
        element={
          <Lazy>
            <Join />
          </Lazy>
        }
      />
      <Route
        path="/play/game/:sessionId"
        element={
          <Lazy>
            <Game />
          </Lazy>
        }
      />

      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
