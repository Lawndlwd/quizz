import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { Quiz, Session, AppConfig, GameSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';


function PreGameSettingsModal({ config, onConfirm, onCancel }: {
  config: AppConfig;
  onConfirm: (settings: GameSettings) => void;
  onCancel: () => void;
}) {
  const [baseScore, setBaseScore] = useState(config.defaultBaseScore);
  const [streakEnabled, setStreakEnabled] = useState(config.streakBonusEnabled);
  const [streakBase, setStreakBase] = useState(config.streakBonusBase);
  const [passEnabled, setPassEnabled] = useState(false);
  const [fiftyFiftyEnabled, setFiftyFiftyEnabled] = useState(false);

  const defaultSettings: GameSettings = {
    baseScore: config.defaultBaseScore,
    streakBonusEnabled: config.streakBonusEnabled,
    streakBonusBase: config.streakBonusBase,
    jokersEnabled: { pass: false, fiftyFifty: false },
  };

  const currentSettings: GameSettings = {
    baseScore,
    streakBonusEnabled: streakEnabled,
    streakBonusBase: streakBase,
    jokersEnabled: { pass: passEnabled, fiftyFifty: fiftyFiftyEnabled },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="card card-md" style={{ maxWidth: 520, width: '100%', zIndex: 201, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="mb-1">Game Settings</h2>
        <p className="text-muted text-sm mb-5">These settings apply to this game only and won't change your defaults.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pass joker score */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Pass Joker Score</label>
            <p className="text-muted text-sm" style={{ marginBottom: 8 }}>Points awarded to each player when the Pass joker is used</p>
            <input type="number" min={0} value={baseScore} onChange={e => setBaseScore(Number(e.target.value))}
              style={{ width: '100%' }} />
          </div>

          {/* Streak bonus */}
          <div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={streakEnabled} onChange={e => setStreakEnabled(e.target.checked)} />
              Enable streak bonus
            </label>
            {streakEnabled && (
              <div style={{ marginTop: 10, paddingLeft: 26 }}>
                <label style={{ display: 'block', color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 6 }}>
                  Points per streak level above minimum
                </label>
                <input type="number" min={0} value={streakBase} onChange={e => setStreakBase(Number(e.target.value))}
                  style={{ width: '100%' }} />
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <h3 style={{ marginBottom: 4 }}>Jokers</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 14 }}>Activate jokers from the game control panel during gameplay. Each joker can be used once per game.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={passEnabled} onChange={e => setPassEnabled(e.target.checked)} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Pass</div>
                  <div className="text-muted text-sm">Skip the current question and award base score to all unanswered players</div>
                </div>
              </label>

              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={fiftyFiftyEnabled} onChange={e => setFiftyFiftyEnabled(e.target.checked)} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>50/50</div>
                  <div className="text-muted text-sm">Eliminate 2 wrong answers for all players (multiple choice only)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => onConfirm(defaultSettings)} style={{ flex: 1 }}>Use Defaults</button>
          <button className="btn btn-success" onClick={() => onConfirm(currentSettings)} style={{ flex: 1 }}>Start →</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [pendingStartQuizId, setPendingStartQuizId] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

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

  async function handleStartClick(quizId: number) {
    if (!appConfig) {
      const res = await fetch('/api/admin/config', { headers });
      const data: AppConfig = await res.json();
      setAppConfig(data);
    }
    setPendingStartQuizId(quizId);
    setShowSettingsModal(true);
  }

  async function confirmStart(gameSettings: GameSettings) {
    if (!pendingStartQuizId) return;
    setStarting(pendingStartQuizId);
    setShowSettingsModal(false);
    const res = await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: pendingStartQuizId }),
    });
    const data = await res.json();
    setStarting(null);
    setPendingStartQuizId(null);
    if (res.ok) {
      sessionStorage.setItem(`gameSettings:${data.id}`, JSON.stringify(gameSettings));
      navigate(`/admin/game/${data.id}`);
    }
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
          <div className="card mb-6 flex flex-col gap-4" style={{ borderColor: 'rgba(124,58,237,.4)', background: 'rgba(124,58,237,.06)', padding: '16px 20px' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontWeight: 600 }}>🎮 {activeSessions.length} open session{activeSessions.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col gap-2" >
              {activeSessions.map(s => (
                <div key={s.id} className="flex flex-col items-center gap-2" style={{
                  background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)',
                }}>
                  <div className="flex items-center gap-2">
                  <span className={`badge badge-${s.status}`} style={{ flexShrink: 0 }}>{s.status}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{s.quiz_title}</span>
                  </div>
                                    <div className="flex items-center gap-2">

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
                          onClick={() => handleStartClick(q.id)}
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

      {showSettingsModal && appConfig && (
        <PreGameSettingsModal
          config={appConfig}
          onConfirm={confirmStart}
          onCancel={() => { setShowSettingsModal(false); setPendingStartQuizId(null); }}
        />
      )}
    </div>
  );
}
