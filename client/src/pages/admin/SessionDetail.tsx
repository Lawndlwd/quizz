import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { Session, Player, Question } from '../../types';

interface FullSession {
  session: Session;
  players: Player[];
  questions: Question[];
  answers: Array<{
    player_id: number;
    username: string;
    question_id: number;
    chosen_index: number;
    is_correct: number;
    score: number;
  }>;
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<FullSession | null>(null);

  useEffect(() => {
    fetch(`/api/admin/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData);
  }, [id]);

  if (!data) return (
    <div className="page"><AdminNav /><div className="page-center"><p className="text-muted">Loading…</p></div></div>
  );

  const { session, players, questions, answers } = data;
  const answerMap = new Map(answers.map(a => [`${a.player_id}:${a.question_id}`, a]));

  const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score);

  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin/history" className="btn btn-ghost btn-sm">← Back</Link>
          <div>
            <h1>{session.quiz_title}</h1>
            <p className="subtitle">
              Session <code className="font-mono" style={{ color: 'var(--accent2)' }}>#{session.id}</code> · PIN <code className="font-mono" style={{ color: 'var(--accent2)' }}>{session.pin}</code>
              {session.finished_at && ` · ${new Date(session.finished_at).toLocaleString()}`}
            </p>
          </div>
          <span className={`badge badge-${session.status}`} style={{ marginLeft: 'auto' }}>{session.status}</span>
        </div>

        {/* Stats */}
        <div className="grid-3 mb-6">
          <div className="stat-card">
            <div className="stat-value">{players.length}</div>
            <div className="stat-label">Players</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{questions.length}</div>
            <div className="stat-label">Questions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{sortedPlayers[0]?.total_score ?? 0}</div>
            <div className="stat-label">Top Score</div>
          </div>
        </div>

        <div className="grid-2 gap-6">
          {/* Leaderboard */}
          <div className="card">
            <h2 className="mb-4">🏆 Final Leaderboard</h2>
            <ul className="leaderboard" style={{ gap: 6 }}>
              {sortedPlayers.map((p, i) => (
                <li key={p.id} className={`lb-item rank-${Math.min(i + 1, 4)}`}>
                  <div className="lb-rank">{i + 1}</div>
                  <div className="lb-name">{p.username}</div>
                  <div className="lb-score">{p.total_score.toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Per-question breakdown */}
          <div className="card">
            <h2 className="mb-4">📊 Question Breakdown</h2>
            {questions.map((q, qi) => {
              const qAnswers = players.map(p => answerMap.get(`${p.id}:${q.id}`));
              const correct = qAnswers.filter(a => a?.is_correct).length;
              const pct = players.length ? Math.round((correct / players.length) * 100) : 0;
              return (
                <div key={q.id} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ fontWeight: 600 }}>Q{qi + 1}: {q.text.slice(0, 60)}{q.text.length > 60 ? '…' : ''}</span>
                    <span className="text-xs text-muted">{correct}/{players.length} ({pct}%)</span>
                  </div>
                  <div className="answer-bar">
                    <div className="answer-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-muted mt-1">Correct: {q.options[q.correct_index]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full answer matrix */}
        <div className="card card-xl mt-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="p-4">
            <h2>Answer Matrix</h2>
            <p className="subtitle">Every player&apos;s answer for each question</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  {questions.map((q, i) => <th key={q.id}>Q{i + 1}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, pi) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: pi < 3 ? 700 : 400 }}>
                      {pi === 0 ? '🥇 ' : pi === 1 ? '🥈 ' : pi === 2 ? '🥉 ' : ''}{p.username}
                    </td>
                    {questions.map(q => {
                      const a = answerMap.get(`${p.id}:${q.id}`);
                      return (
                        <td key={q.id}>
                          {a == null ? (
                            <span className="text-muted">—</span>
                          ) : a.is_correct ? (
                            <span style={{ color: 'var(--success)' }}>✓ +{a.score}</span>
                          ) : (
                            <span style={{ color: 'var(--danger)' }}>✗</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: 700, color: 'var(--accent2)' }}>{p.total_score.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
