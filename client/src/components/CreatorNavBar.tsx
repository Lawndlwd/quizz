import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const navBtn =
  'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground';

interface Props {
  basePath: string;
  loginPath: string;
  showUsers?: boolean;
  playLabel?: string;
}

export default function CreatorNavBar({
  basePath,
  loginPath,
  showUsers = false,
  playLabel = 'Play ↗',
}: Props) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { appName } = useApp();

  const active = (path: string) =>
    cn(navBtn, location.pathname === path && 'bg-muted text-foreground');

  async function handleLogout() {
    await logout();
    navigate(loginPath);
  }

  return (
    <nav className="sticky top-0 z-50 flex min-h-14 flex-wrap items-center gap-1.5 border-b border-border bg-card px-4">
      <Link
        to={basePath}
        className="mr-3 text-xl font-extrabold bg-gradient-to-br from-blue-600 to-blue-400 bg-clip-text text-transparent"
      >
        {appName ? (
          <>
            {appName}{' '}
            <span className="font-normal text-[0.72em] text-muted-foreground opacity-80">
              by ⚡ Quizz
            </span>
          </>
        ) : (
          '⚡ Quizz'
        )}
      </Link>
      <Link to={basePath} className={active(basePath)}>
        Dashboard
      </Link>
      <Link to={`${basePath}/quiz/new`} className={active(`${basePath}/quiz/new`)}>
        + New Quiz
      </Link>
      <Link to={`${basePath}/history`} className={active(`${basePath}/history`)}>
        History
      </Link>
      {showUsers && (
        <Link to={`${basePath}/users`} className={active(`${basePath}/users`)}>
          Users
        </Link>
      )}
      <Link to={`${basePath}/settings`} className={active(`${basePath}/settings`)}>
        Settings
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <a href="/play" target="_blank" className={navBtn} rel="noopener">
          {playLabel}
        </a>
        <Button type="button" onClick={handleLogout} variant="ghost" size="sm">
          Log out
        </Button>
      </div>
    </nav>
  );
}
