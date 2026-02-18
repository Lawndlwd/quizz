import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import { QuestionPayload, QuestionResults, GameEndedPayload, Session } from '../../types';
import { AvatarDisplay } from '../../components/AvatarPicker';

interface PlayerInfo { id: number; username: string; totalScore: number; avatar?: string; }
interface SessionState {
  session: Session;
  players: PlayerInfo[];
  questionCount: number;
}

type Phase = 'lobby' | 'question' | 'results' | 'ended';

export default function GameControl() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const socket = getSocket();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [finalBoard, setFinalBoard] = useState<{ rank: number; username: string; totalScore: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!token || !sessionId) return;
    socket.connect();
    socket.emit('admin:join-session', { sessionId: Number(sessionId), token });
    return () => { socket.disconnect(); };
  }, [sessionId, token]);

  useSocketEvent<SessionState>('session:state', data => {
    setSessionState(data);
    setPlayers(data.players);
    setShareUrl(`${window.location.origin}/play/${data.session.pin}`);
    if (data.session.status === 'active') setPhase('question');
    if (data.session.status === 'finished') setPhase('ended');
  });

  useSocketEvent<{ playerId: number; username: string; playerCount: number; avatar?: string }>('game:player-joined', data => {
    setPlayers(prev => {
      if (prev.find(p => p.id === data.playerId)) return prev;
      return [...prev, { id: data.playerId, username: data.username, totalScore: 0, avatar: data.avatar }];
    });
  });

  useSocketEvent<{ playerId: number }>('game:player-left', data => {
    setPlayers(prev => prev.filter(p => p.id !== data.playerId));
  });

  useSocketEvent<Record<string, never>>('game:started', () => {
    setPhase('question');
  });

  useSocketEvent<QuestionPayload>('game:question', data => {
    setQuestion(data);
    setAnsweredCount(0);
    setTimeLeft(data.timeSec);
    setPhase('question');
  });

  useSocketEvent<{ answeredCount: number; totalPlayers: number }>('game:answer-received', data => {
    setAnsweredCount(data.answeredCount);
  });

  useSocketEvent<QuestionResults>('game:question-results', data => {
    setResults(data);
    setPhase('results');
    setPlayers(data.leaderboard.map(e => ({ id: e.playerId, username: e.username, totalScore: e.totalScore, avatar: e.avatar })));
  });

  useSocketEvent<GameEndedPayload>('game:ended', data => {
    setFinalBoard(data.leaderboard);
    setPhase('ended');
  });

  // Countdown timer (display only — real timer is server-driven)
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, question]);

  const startGame = useCallback(() => {
    socket.emit('admin:start-game', { sessionId: Number(sessionId), token });
  }, [sessionId, token]);

  const nextQuestion = useCallback(() => {
    socket.emit('admin:next-question', { sessionId: Number(sessionId), token });
  }, [sessionId, token]);

  const endGame = useCallback(() => {
    if (!confirm('End the game now?')) return;
    socket.emit('admin:end-game', { sessionId: Number(sessionId), token });
  }, [sessionId, token]);

  const copyLink = () => { navigator.clipboard.writeText(shareUrl); };

  if (!sessionState) return (
    <div className="page">
      <AdminNav />
      <div className="page-center"><p className="text-muted">Connecting…</p></div>
    </div>
  );

  const pin = sessionState.session.pin;
  const totalQ = sessionState.questionCount;

  // ─── LOBBY ────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>{sessionState.session.quiz_title}</h1>
            <p className="subtitle">Waiting for players — {totalQ} question{totalQ !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={endGame} className="btn btn-ghost btn-sm">Discard</button>
        </div>

        <div className="grid-2 gap-6">
          <div className="card">
            <h2 className="mb-2">Game PIN</h2>
            <div className="pin-display">{pin}</div>
            <div className="mt-4">
              <p className="text-sm text-muted mb-2">Share this link:</p>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} style={{ flex: 1 }} onClick={e => (e.target as HTMLInputElement).select()} />
                <button onClick={copyLink} className="btn btn-secondary">Copy</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2>Players ({players.length})</h2>
              <button
                onClick={startGame}
                disabled={players.length === 0}
                className="btn btn-success btn-lg"
              >
                ▶ Start Game
              </button>
            </div>
            <div className="players-grid">
              {players.length === 0 ? (
                <p className="text-muted text-sm">Waiting for players to join<span className="dots"> <span>.</span><span>.</span><span>.</span></span></p>
              ) : (
                players.map(p => (
                  <div key={p.id} className="player-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AvatarDisplay avatar={p.avatar} size={22} />
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── QUESTION ─────────────────────────────────────────────────────────────
  if (phase === 'question' && question) {
    const pct = (timeLeft / question.timeSec) * 100;
    const urgent = timeLeft <= 5;
    const answerPct = players.length > 0 ? (answeredCount / players.length) * 100 : 0;
    return (
      <div className="page">
        <AdminNav />
        <div className="main-content">
          <div className="flex items-center justify-between mb-4">
            <h2>Question {question.questionIndex + 1} / {question.totalQuestions}</h2>
            <div className="flex gap-2">
              <button onClick={endGame} className="btn btn-ghost btn-sm">End Game</button>
            </div>
          </div>

          <div className="card card-lg mb-4">
            <div className="flex items-center justify-between mb-4">
              <div style={{ flex: 1 }}>
                <p className="text-muted text-sm mb-2">Question {question.questionIndex + 1}</p>
                <h2 style={{ fontSize: '1.3rem' }}>{question.text}</h2>
              </div>
              <div className={`timer-value ${urgent ? 'urgent' : ''}`} style={{ marginLeft: 24, minWidth: 60 }}>{timeLeft}</div>
            </div>
            <div className="progress-bar"><div className={`progress-fill ${urgent ? 'urgent' : ''}`} style={{ width: `${pct}%` }} /></div>

            <div className="options-grid mt-4">
              {question.options.map((opt, i) => (
                <div key={i} className="option-btn" style={{ cursor: 'default' }}>
                  <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                  <div className="option-text">{opt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2 gap-4">
            <div className="stat-card">
              <div className="stat-value">{answeredCount} / {players.length}</div>
              <div className="stat-label">Answered</div>
              <div className="answer-bar mt-2"><div className="answer-bar-fill" style={{ width: `${answerPct}%` }} /></div>
            </div>
            <div className="stat-card flex items-center justify-center">
              <p className="text-muted text-sm text-center">Results show automatically<br/>when timer ends or everyone answers</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === 'results' && results) return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center justify-between mb-4">
          <h2>Results — Q{(question?.questionIndex ?? 0) + 1}</h2>
          <div className="flex gap-2">
            <button onClick={endGame} className="btn btn-ghost btn-sm">End Game</button>
            <button onClick={nextQuestion} className="btn btn-primary btn-lg">
              {results.isLastQuestion ? '🏁 Show Final Scores' : 'Next Question →'}
            </button>
          </div>
        </div>

        <div className="card card-lg mb-4">
          <p className="text-muted text-sm mb-2">Question</p>
          <h2 style={{ marginBottom: 16 }}>{results.questionText}</h2>
          <div className="options-grid">
            {results.options.map((opt, i) => (
              <div key={i} className={`option-btn ${i === results.correctIndex ? 'correct' : ''}`} style={{ cursor: 'default' }}>
                <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                <div className="option-text">{opt}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-lg">
          <h2 className="mb-4">Leaderboard</h2>
          <ul className="leaderboard">
            {results.leaderboard.slice(0, 10).map(e => (
              <li key={e.playerId} className={`lb-item rank-${Math.min(e.rank, 4)}`}>
                <div className="lb-rank">{e.rank}</div>
                <AvatarDisplay avatar={e.avatar} size={30} />
                <div className="lb-name">{e.username}</div>
                {e.questionScore > 0 && <span className="lb-delta">+{e.questionScore}</span>}
                {e.chosenIndex !== null && !e.isCorrect && <span className="lb-delta wrong">✗</span>}
                <div className="lb-score">{e.totalScore.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // ─── ENDED ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="text-center mb-6">
          <div style={{ fontSize: '4rem', marginBottom: 12 }}>🏁</div>
          <h1>Game Over!</h1>
          <p className="subtitle mt-2">{sessionState.session.quiz_title}</p>
        </div>

        <div className="card card-md" style={{ margin: '0 auto' }}>
          <h2 className="mb-4 text-center">🏆 Final Leaderboard</h2>
          <ul className="leaderboard">
            {finalBoard.map(e => (
              <li key={e.rank} className={`lb-item rank-${Math.min(e.rank, 4)}`}>
                <div className="lb-rank">{e.rank}</div>
                <AvatarDisplay avatar={e.avatar} size={30} />
                <div className="lb-name">{e.username}</div>
                <div className="lb-score">{e.totalScore.toLocaleString()}</div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-6">
            <button onClick={() => navigate(`/admin/sessions/${sessionId}`)} className="btn btn-secondary btn-full">View Details</button>
            <button onClick={() => navigate('/admin')} className="btn btn-primary btn-full">← Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
