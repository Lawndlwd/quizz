import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { Quiz, Session } from '../../types';
import { useAuth } from '../../context/AuthContext';


export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [closing, setClosing] = useState<number | null>(null);
  const headers = { Authorization: `Bearer ${token}` };

  async function loadSessions() {
    const sRes = await fetch('/api/admin/sessions', { headers });
    const sData: Session[] = await sRes.json();
    setActiveSessions(sData.filter(s => s.status !== 'finished'));
  }

  async function load() {
    const [qRes, sRes] = await Promise.all([
      fetch('/api/admin/quizzes', { headers }),
      fetch('/api/admin/sessions', { headers }),
    ]);
    const qData: Quiz[] = await qRes.json();
    const sData: Session[] = await sRes.json();
    setQuizzes(qData);
    setActiveSessions(sData.filter(s => s.status !== 'finished'));
    setLoading(false);
  }

  // Auto-refresh active sessions every 5 s so stale "active" banners disappear
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    load();
    pollRef.current = setInterval(loadSessions, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function forceClose(sessionId: number) {
    if (!confirm('Force-close this session? Players will be disconnected.')) return;
    setClosing(sessionId);
    await fetch(`/api/admin/sessions/${sessionId}/force-end`, { method: 'POST', headers });
    setClosing(null);
    loadSessions();
  }

  async function startSession(quizId: number) {
    setStarting(quizId);
    const res = await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId }),
    });
    const data = await res.json();
    setStarting(null);
    if (res.ok) navigate(`/admin/game/${data.id}`);
  }

  async function deleteQuiz(id: number) {
    if (!confirm('Delete this quiz and all its data?')) return;
    setDeleting(id);
    await fetch(`/api/admin/quizzes/${id}`, { method: 'DELETE', headers });
    setDeleting(null);
    load();
  }

  if (loading) return (
    <div className="page">
      <AdminNav />
      <div className="page-center"><p className="text-muted">Loading…</p></div>
    </div>
  );

  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">

        {/* Active sessions banner */}
        {activeSessions.length > 0 && (
          <div className="card mb-6" style={{ borderColor: 'rgba(124,58,237,.4)', background: 'rgba(124,58,237,.06)', padding: '16px 20px' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontWeight: 600 }}>🎮 {activeSessions.length} open session{activeSessions.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeSessions.map(s => (
                <div key={s.id} className="flex items-center gap-2" style={{
                  background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)',
                }}>
                  <span className={`badge badge-${s.status}`} style={{ flexShrink: 0 }}>{s.status}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{s.quiz_title}</span>
                  <span className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>PIN {s.pin}</span>
                  <button onClick={() => navigate(`/admin/game/${s.id}`)} className="btn btn-sm btn-primary">
                    Resume →
                  </button>
                  <button
                    onClick={() => forceClose(s.id)}
                    disabled={closing === s.id}
                    className="btn btn-sm btn-ghost"
                    title="Force-close this session"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  >
                    {closing === s.id ? '…' : '✕ Close'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>My Quizzes</h1>
            <p className="subtitle">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} total</p>
          </div>
          <Link to="/admin/quiz/new" className="btn btn-primary btn-lg">+ Create Quiz</Link>
        </div>

        {quizzes.length === 0 ? (
          <div className="card text-center" style={{ padding: '60px 32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📝</div>
            <h2>No quizzes yet</h2>
            <p className="subtitle mt-2 mb-6">Create your first quiz to get started</p>
            <Link to="/admin/quiz/new" className="btn btn-primary btn-lg">Create Quiz</Link>
          </div>
        ) : (
          <div className="table-wrap card card-xl" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Questions</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(q => (
                  <tr key={q.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.title}</div>
                      {q.description && <div className="text-muted text-sm mt-1 truncate" style={{ maxWidth: 360 }}>{q.description}</div>}
                    </td>
                    <td>{q.question_count} Q</td>
                    <td className="text-muted text-sm">{new Date(q.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => startSession(q.id)}
                          disabled={starting === q.id}
                          className="btn btn-success btn-sm"
                        >
                          {starting === q.id ? '…' : '▶ Start'}
                        </button>
                        <Link
                          to={`/admin/quiz/${q.id}/edit`}
                          className="btn btn-secondary btn-sm"
                        >
                          ✎ Edit
                        </Link>
                        <button
                          onClick={() => deleteQuiz(q.id)}
                          disabled={deleting === q.id}
                          className="btn btn-ghost btn-sm"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
