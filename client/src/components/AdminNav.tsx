import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function AdminNav() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { appName } = useApp();
  const active = (path: string) => location.pathname === path ? 'nav-btn active' : 'nav-btn';

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <nav className="nav">
      <Link to="/admin" className="nav-logo">
        {appName ? (
          <>{appName} <span style={{ fontWeight: 400, fontSize: '0.72em', WebkitTextFillColor: 'var(--text2)', opacity: 0.8 }}>by ⚡ Quizz</span></>
        ) : '⚡ Quizz'}
      </Link>
      <Link to="/admin" className={active('/admin')}>Dashboard</Link>
      <Link to="/admin/quiz/new" className={active('/admin/quiz/new')}>+ New Quiz</Link>
      <Link to="/admin/history" className={active('/admin/history')}>History</Link>
      <Link to="/admin/settings" className={active('/admin/settings')}>Settings</Link>
      <div className="nav-spacer" />
      <div className="nav-right">
        <a href="/play" target="_blank" className="nav-btn">Player View ↗</a>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm">Log out</button>
      </div>
    </nav>
  );
}
