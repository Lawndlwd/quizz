import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import type { Session } from '../../types';

export default function History() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'finished' | 'active' | 'waiting'>('all');

  useEffect(() => {
    fetch('/api/admin/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: Session[]) => {
        setSessions(data);
        setLoading(false);
      });
  }, [token]);

  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.status === filter);

  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Game History</h1>
            <p className="subtitle">{sessions.length} sessions total</p>
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'waiting', 'finished'] as const).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="card text-center" style={{ padding: '48px 32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📊</div>
            <h2>No sessions yet</h2>
            <p className="subtitle mt-2">Start a game from the Dashboard to see history here</p>
          </div>
        ) : (
          <div className="card card-xl" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>PIN</th>
                  <th>Players</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const dur =
                    s.started_at && s.finished_at
                      ? Math.round(
                          (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) /
                            1000,
                        )
                      : null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{s.quiz_title}</span>
                      </td>
                      <td>
                        <code className="font-mono" style={{ color: 'var(--accent2)' }}>
                          {s.pin}
                        </code>
                      </td>
                      <td>{s.player_count ?? '—'}</td>
                      <td>
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      </td>
                      <td className="text-muted text-sm">
                        {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                      </td>
                      <td className="text-muted text-sm">
                        {dur != null ? `${Math.floor(dur / 60)}m ${dur % 60}s` : '—'}
                      </td>
                      <td>
                        {s.status === 'finished' ? (
                          <Link to={`/admin/sessions/${s.id}`} className="btn btn-sm btn-ghost">
                            Results →
                          </Link>
                        ) : (
                          <Link to={`/admin/game/${s.id}`} className="btn btn-sm btn-primary">
                            Resume →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
