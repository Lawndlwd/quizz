import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import { QuestionPayload, QuestionResults, GameEndedPayload } from '../../types';

type Phase = 'waiting' | 'question' | 'answered' | 'results' | 'ended';

export default function Game() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  const playerId = Number(sessionStorage.getItem('playerId'));
  const username = sessionStorage.getItem('username') ?? 'Player';

  const [phase, setPhase] = useState<Phase>('waiting');
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; score: number } | null>(null);
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [finalBoard, setFinalBoard] = useState<GameEndedPayload['leaderboard']>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if no player id
  useEffect(() => {
    if (!playerId) navigate('/play');
  }, []);

  useSocketEvent<Record<string, never>>('game:started', () => {
    setPhase('waiting');
  });

  useSocketEvent<QuestionPayload>('game:question', data => {
    setQuestion(data);
    setSelectedIndex(null);
    setAnswerResult(null);
    setResults(null);
    setTimeLeft(data.timeSec);
    setPhase('question');

    // Local countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  });

  useSocketEvent<{ isCorrect: boolean; score: number }>('player:answer-received', data => {
    setAnswerResult(data);
    setPhase('answered');
    if (timerRef.current) clearInterval(timerRef.current);
  });

  useSocketEvent<QuestionResults>('game:question-results', data => {
    setResults(data);
    setPhase('results');
    if (timerRef.current) clearInterval(timerRef.current);
  });

  useSocketEvent<GameEndedPayload>('game:ended', data => {
    setFinalBoard(data.leaderboard);
    setPhase('ended');
    if (timerRef.current) clearInterval(timerRef.current);
  });

  function submitAnswer(chosenIndex: number) {
    if (!question || phase !== 'question') return;
    setSelectedIndex(chosenIndex);
    socket.emit('player:answer', {
      sessionId: Number(sessionId),
      questionId: question.questionId,
      chosenIndex,
      playerId,
    });
  }

  // ─── WAITING ──────────────────────────────────────────────────────────────
  if (phase === 'waiting') return (
    <div className="page-center">
      <div className="card text-center">
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎮</div>
        <h2>Get Ready!</h2>
        <p className="subtitle mt-2 mb-6">Waiting for the game to start<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
        <div className="player-chip" style={{ display: 'inline-block', fontSize: '1rem', padding: '8px 20px' }}>👤 {username}</div>
      </div>
    </div>
  );

  // ─── QUESTION ─────────────────────────────────────────────────────────────
  if (phase === 'question' && question) {
    const pct = (timeLeft / question.timeSec) * 100;
    const urgent = timeLeft <= 5;
    return (
      <div className="page" style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <div className="question-header">
          <div className="question-counter">Question {question.questionIndex + 1} of {question.totalQuestions}</div>
          <div className="question-text">{question.text}</div>
          <div className="timer-wrap">
            <div className="progress-bar"><div className={`progress-fill ${urgent ? 'urgent' : ''}`} style={{ width: `${pct}%` }} /></div>
            <div className={`timer-value ${urgent ? 'urgent' : ''}`}>{timeLeft}</div>
          </div>
        </div>
        <div className="options-grid">
          {question.options.map((opt, i) => (
            <button
              key={i}
              disabled={selectedIndex !== null}
              onClick={() => submitAnswer(i)}
              className={`option-btn ${selectedIndex === i ? 'selected' : ''}`}
            >
              <div className="option-letter">{String.fromCharCode(65 + i)}</div>
              <div className="option-text">{opt}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── ANSWERED (waiting for results) ───────────────────────────────────────
  if (phase === 'answered' && answerResult) return (
    <div className="page-center">
      <div className="card text-center">
        <div className="answer-overlay">
          <span className="answer-icon">{answerResult.isCorrect ? '✅' : '❌'}</span>
          <div className="answer-label">{answerResult.isCorrect ? 'Correct!' : 'Wrong answer'}</div>
          {answerResult.isCorrect && (
            <div className="answer-pts">+<strong>{answerResult.score}</strong> pts</div>
          )}
          <p className="text-muted mt-4 text-sm">Waiting for other players<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>
    </div>
  );

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === 'results' && results && question) {
    const myEntry = results.leaderboard.find(e => e.playerId === playerId);
    return (
      <div className="page" style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '24px 16px' }}>
        {/* Correct answer reveal */}
        <div className="card mb-4">
          <p className="text-muted text-sm mb-2">{results.questionText}</p>
          <div className="options-grid" style={{ padding: 0, gap: 8 }}>
            {results.options.map((opt, i) => {
              const isCorrect = i === results.correctIndex;
              const myChoice = myEntry?.chosenIndex === i;
              return (
                <div key={i} className={`option-btn ${isCorrect ? 'correct' : myChoice ? 'wrong' : ''}`} style={{ cursor: 'default', padding: '12px 14px' }}>
                  <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                  <div className="option-text">{opt}</div>
                  {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* My result */}
        {myEntry && (
          <div className={`alert ${myEntry.isCorrect ? 'alert-success' : 'alert-error'} text-center mb-4`} style={{ fontSize: '1.05rem', fontWeight: 600 }}>
            {myEntry.isCorrect
              ? `✓ Correct! +${myEntry.questionScore} pts · Total: ${myEntry.totalScore.toLocaleString()}`
              : `✗ Wrong — ${myEntry.totalScore.toLocaleString()} pts total`}
          </div>
        )}

        {/* Leaderboard */}
        <div className="card">
          <h2 className="mb-4 text-center">🏆 Standings</h2>
          <ul className="leaderboard">
            {results.leaderboard.slice(0, 8).map(e => (
              <li key={e.playerId} className={`lb-item rank-${Math.min(e.rank, 4)} ${e.playerId === playerId ? '' : ''}`}
                style={e.playerId === playerId ? { borderColor: 'var(--accent2)', background: 'rgba(168,85,247,.08)' } : {}}>
                <div className="lb-rank">{e.rank}</div>
                <div className="lb-name">{e.username}{e.playerId === playerId ? ' 👈' : ''}</div>
                {e.questionScore > 0 && <span className="lb-delta">+{e.questionScore}</span>}
                <div className="lb-score">{e.totalScore.toLocaleString()}</div>
              </li>
            ))}
          </ul>
          <p className="text-center text-muted text-sm mt-4">Waiting for admin to continue<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>
    );
  }

  // ─── ENDED ────────────────────────────────────────────────────────────────
  if (phase === 'ended') {
    const myRank = finalBoard.find(e => e.username === username);
    return (
      <div className="page-center">
        <div className="card card-md">
          <div className="text-center mb-6">
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🏁</div>
            <h1>Game Over!</h1>
            {myRank && (
              <p className="subtitle mt-2">You finished <strong style={{ color: 'var(--accent2)' }}>#{myRank.rank}</strong> with <strong style={{ color: 'var(--accent2)' }}>{myRank.totalScore.toLocaleString()} pts</strong></p>
            )}
          </div>
          <h2 className="mb-4 text-center">🏆 Final Scores</h2>
          <ul className="leaderboard">
            {finalBoard.map(e => (
              <li key={e.rank} className={`lb-item rank-${Math.min(e.rank, 4)}`}
                style={e.username === username ? { borderColor: 'var(--accent2)', background: 'rgba(168,85,247,.08)' } : {}}>
                <div className="lb-rank">{e.rank}</div>
                <div className="lb-name">{e.username}{e.username === username ? ' 👈' : ''}</div>
                <div className="lb-score">{e.totalScore.toLocaleString()}</div>
              </li>
            ))}
          </ul>
          <button onClick={() => navigate('/play')} className="btn btn-primary btn-full mt-6 btn-lg">Play Again</button>
        </div>
      </div>
    );
  }

  return null;
}
