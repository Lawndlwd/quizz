import { LogOut, Menu, Play, X, Zap } from 'lucide-react';
import { useState } from 'react';
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
  showMyGames?: boolean;
  playLabel?: string;
}

export default function CreatorNavBar({
  basePath,
  loginPath,
  showUsers = false,
  showMyGames = false,
  playLabel = 'Play ↗',
}: Props) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { appName } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const active = (path: string) =>
    cn(navBtn, location.pathname === path && 'bg-muted text-foreground');

  const links = [
    { to: basePath, label: 'Dashboard' },
    { to: `${basePath}/quiz/new`, label: '+ New Quiz' },
    { to: `${basePath}/history`, label: 'History' },
    ...(showMyGames ? [{ to: `${basePath}/my-games`, label: 'My games' }] : []),
    ...(showUsers ? [{ to: `${basePath}/users`, label: 'Users' }] : []),
    { to: `${basePath}/settings`, label: 'Settings' },
  ];

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate(loginPath);
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="flex min-h-14 items-center gap-2 px-3 sm:px-4">
        <Link
          to={basePath}
          className="mr-1 flex min-w-0 items-center gap-1.5 text-lg font-extrabold sm:mr-3 sm:text-xl"
        >
          <Zap className="size-5 shrink-0 fill-blue-500 text-blue-500" />
          {appName ? (
            <span className="truncate">
              <span className="bg-gradient-to-br from-blue-600 to-blue-400 bg-clip-text text-transparent">
                {appName}
              </span>{' '}
              <span className="hidden font-normal text-[0.72em] text-muted-foreground opacity-80 sm:inline">
                by Quizz
              </span>
            </span>
          ) : (
            <span className="bg-gradient-to-br from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Quizz
            </span>
          )}
        </Link>

        <div className="hidden flex-wrap items-center gap-1 md:flex">
          {links.map(({ to, label }) => (
            <Link key={to} to={to} className={active(to)}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex-1" />

        <div className="hidden items-center gap-1.5 md:flex">
          <a href="/play" target="_blank" className={navBtn} rel="noopener">
            {playLabel}
          </a>
          <Button type="button" onClick={handleLogout} variant="ghost" size="sm">
            Log out
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-card px-3 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(active(to), 'block px-3 py-2.5')}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <a
              href="/play"
              target="_blank"
              rel="noopener"
              className={cn(navBtn, 'flex items-center gap-2 px-3 py-2.5')}
              onClick={() => setMenuOpen(false)}
            >
              <Play className="size-4" /> {playLabel}
            </a>
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-3"
              onClick={handleLogout}
            >
              <LogOut className="size-4" /> Log out
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
