import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import { QuestionPayload, QuestionResults, GameEndedPayload, QuestionType } from '../../types';
import { AvatarDisplay } from '../../components/AvatarPicker';

type Phase = 'waiting' | 'question' | 'answered' | 'results' | 'podium' | 'ended';

export default function Game() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  const playerId = Number(sessionStorage.getItem('playerId'));
  const username = sessionStorage.getItem('username') ?? 'Player';
  const myAvatar = sessionStorage.getItem('avatar') ?? '🎮';

  const [phase, setPhase] = useState<Phase>('waiting');
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openTextInput, setOpenTextInput] = useState('');
  const [openTextSubmitted, setOpenTextSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; score: number; wasPassJoker?: boolean } | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [jokersEnabled, setJokersEnabled] = useState({ pass: false, fiftyFifty: false });
  const [jokersUsed, setJokersUsed] = useState({ pass: false, fiftyFifty: false });
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [finalBoard, setFinalBoard] = useState<GameEndedPayload['leaderboard']>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if no player id
  useEffect(() => {
    if (!playerId) navigate('/play');
  }, []);

  // Reconnect: re-emit player:join on socket reconnect
  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('playerId');
    const storedUsername = sessionStorage.getItem('username');
    const storedPin = sessionStorage.getItem('pin');
    const storedAvatar = sessionStorage.getItem('avatar');

    if (!storedPlayerId || !storedUsername || !storedPin) return;

    function handleReconnect() {
      socket.emit('player:join', {
        pin: storedPin,
        username: storedUsername,
        avatar: storedAvatar ?? '',
      });
    }

    socket.on('connect', handleReconnect);
    return () => { socket.off('connect', handleReconnect); };
  }, []);

  useSocketEvent<{ jokersEnabled: { pass: boolean; fiftyFifty: boolean } }>('game:started', data => {
    setPhase('waiting');
    if (data?.jokersEnabled) setJokersEnabled(data.jokersEnabled);
  });

  useSocketEvent<{ jokersEnabled: { pass: boolean; fiftyFifty: boolean }; jokersUsed: { pass: boolean; fiftyFifty: boolean } }>('player:joker-state', data => {
    setJokersEnabled(data.jokersEnabled);
    setJokersUsed(data.jokersUsed);
  });

  useSocketEvent<{ eliminatedIndices: number[] }>('player:joker-5050-applied', data => {
    setEliminatedIndices(data.eliminatedIndices);
    setJokersUsed(prev => ({ ...prev, fiftyFifty: true }));
  });

  useSocketEvent<QuestionPayload>('game:question', data => {
    setQuestion(data);
    setSelectedIndex(null);
    setOpenTextInput('');
    setOpenTextSubmitted(false);
    setAnswerResult(null);
    setResults(null);
    setEliminatedIndices([]);
    setTimeLeft(data.timeSec);
    setPhase('question');

    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }

    // Local countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  });

  useSocketEvent<{ isCorrect: boolean; score: number; wasPassJoker?: boolean }>('player:answer-received', data => {
    setAnswerResult(data);
    setPhase('answered');
    if (timerRef.current) clearInterval(timerRef.current);
  });

  useSocketEvent<QuestionResults>('game:question-results', data => {
    setResults(data);
    setPhase('results');
    if (timerRef.current) clearInterval(timerRef.current);

    // Auto-advance countdown display
    setAutoAdvanceLeft(data.autoAdvanceSec);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(() => {
      setAutoAdvanceLeft(t => {
        if (t <= 1) { clearInterval(autoAdvanceRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  });

  useSocketEvent<GameEndedPayload>('game:ended', data => {
    setFinalBoard(data.leaderboard);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    setPhase('podium');
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

  function submitOpenText() {
    if (!question || phase !== 'question' || openTextSubmitted) return;
    setOpenTextSubmitted(true);
    socket.emit('player:answer', {
      sessionId: Number(sessionId),
      questionId: question.questionId,
      chosenIndex: -1,
      playerId,
      chosenText: openTextInput.trim(),
    });
  }

  // ─── WAITING ──────────────────────────────────────────────────────────────
  if (phase === 'waiting') return (
    <div className="page-center">
      <div className="card text-center">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <AvatarDisplay avatar={myAvatar} size={80} style={{ border: '3px solid var(--accent)' }} />
        </div>
        <h2>Get Ready!</h2>
        <p className="subtitle mt-2 mb-6">Waiting for the game to start<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
        <div className="player-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1rem', padding: '8px 20px' }}>
          <AvatarDisplay avatar={myAvatar} size={24} />
          {username}
        </div>
      </div>
    </div>
  );

  // ─── QUESTION ─────────────────────────────────────────────────────────────
  if (phase === 'question' && question) {
    const pct = (timeLeft / question.timeSec) * 100;
    const urgent = timeLeft <= 5;
    const isTrueFalse = question.questionType === 'true_false';
    const isOpenText = question.questionType === 'open_text';

    return (
      <div className="page-vcenter">
        <div style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <div className="question-header">
            <div className="question-counter">Question {question.questionIndex + 1} of {question.totalQuestions}</div>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="Question"
                style={{ width: '100%', maxHeight: 340, borderRadius: 12, margin: '12px 0 0', display: 'block', objectFit: 'cover' }}
              />
            )}
            <div className="question-text" style={{ marginTop: question.imageUrl ? 12 : 0 }}>{question.text}</div>
            <div className="timer-wrap">
              <div className="progress-bar"><div className={`progress-fill ${urgent ? 'urgent' : ''}`} style={{ width: `${pct}%` }} /></div>
              <div className={`timer-value ${urgent ? 'urgent' : ''}`}>{timeLeft}</div>
            </div>
          </div>

          {/* Joker buttons — only visible if enabled, not yet used, and player hasn't answered */}
          {(jokersEnabled.pass || jokersEnabled.fiftyFifty) && selectedIndex === null && !openTextSubmitted && (
            <div style={{ display: 'flex', gap: 10, padding: '0 20px 4px', justifyContent: 'flex-end' }}>
              {jokersEnabled.pass && (
                <button
                  className="btn btn-warning btn-sm"
                  disabled={jokersUsed.pass}
                  title={jokersUsed.pass ? 'Pass already used' : 'Skip this question and receive the base score'}
                  onClick={() => {
                    if (jokersUsed.pass) return;
                    setJokersUsed(prev => ({ ...prev, pass: true }));
                    socket.emit('player:joker-pass', { sessionId: Number(sessionId), playerId });
                  }}
                >
                  {jokersUsed.pass ? '✓ Pass' : '⏭ Pass'}
                </button>
              )}
              {jokersEnabled.fiftyFifty && !isTrueFalse && !isOpenText && (
                <button
                  className="btn btn-warning btn-sm"
                  disabled={jokersUsed.fiftyFifty}
                  title={jokersUsed.fiftyFifty ? '50/50 already used' : 'Eliminate 2 wrong answers'}
                  onClick={() => {
                    if (jokersUsed.fiftyFifty) return;
                    socket.emit('player:joker-5050', { sessionId: Number(sessionId), playerId });
                  }}
                >
                  {jokersUsed.fiftyFifty ? '✓ 50/50' : '50/50'}
                </button>
              )}
            </div>
          )}

          {isTrueFalse ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '20px' }}>
              {['True', 'False'].map((label, i) => (
                <button
                  key={i}
                  disabled={selectedIndex !== null}
                  onClick={() => submitAnswer(i)}
                  className={`option-btn ${selectedIndex === i ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, minHeight: 90,
                    background: i === 0 ? (selectedIndex === 0 ? undefined : 'rgba(34,197,94,.08)') : (selectedIndex === 1 ? undefined : 'rgba(239,68,68,.08)'),
                    borderColor: i === 0 ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>{i === 0 ? '✓' : '✗'}</span>
                  {label}
                </button>
              ))}
            </div>
          ) : isOpenText ? (
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <label style={{ display: 'block', color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 10, fontWeight: 500 }}>Your answer</label>
                <input
                  type="text"
                  value={openTextInput}
                  onChange={e => setOpenTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !openTextSubmitted && submitOpenText()}
                  disabled={openTextSubmitted}
                  placeholder="Type your answer…"
                  style={{ width: '100%', marginBottom: 12, fontSize: '1.1rem' }}
                  autoFocus
                />
                <button
                  onClick={submitOpenText}
                  disabled={openTextSubmitted || !openTextInput.trim()}
                  className="btn btn-primary btn-full btn-lg"
                >
                  {openTextSubmitted ? 'Submitted!' : 'Submit Answer →'}
                </button>
              </div>
            </div>
          ) : (
            <div className="options-grid">
              {question.options.map((opt, i) => {
                const isEliminated = eliminatedIndices.includes(i);
                return (
                  <button
                    key={i}
                    disabled={selectedIndex !== null || isEliminated}
                    onClick={() => submitAnswer(i)}
                    className={`option-btn ${selectedIndex === i ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`}
                  >
                    <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                    <div className="option-text">{isEliminated ? '—' : opt}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ANSWERED (waiting for results) ───────────────────────────────────────
  if (phase === 'answered' && answerResult) return (
    <div className="page-center">
      <div className="card text-center">
        <div className="answer-overlay">
          {answerResult.wasPassJoker ? (
            <>
              <span className="answer-icon">⏭</span>
              <div className="answer-label">Question Skipped</div>
              <div className="answer-pts">+<strong>{answerResult.score}</strong> pts</div>
            </>
          ) : (
            <>
              <span className="answer-icon">{answerResult.isCorrect ? '✅' : '❌'}</span>
              <div className="answer-label">{answerResult.isCorrect ? 'Correct!' : 'Wrong answer'}</div>
              {answerResult.isCorrect && (
                <div className="answer-pts">+<strong>{answerResult.score}</strong> pts</div>
              )}
            </>
          )}
          <p className="text-muted mt-4 text-sm">Waiting for other players<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>
    </div>
  );

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === 'results' && results && question) {
    const myEntry = results.leaderboard.find(e => e.playerId === playerId);
    const isOpenText = (results.questionType as QuestionType) === 'open_text';
    return (
      <div className="page" style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '24px 16px' }}>
        {/* Correct answer reveal */}
        <div className="card mb-4" style={{ maxWidth: '100%', minWidth: 0 }}>
          <p className="text-muted text-sm mb-2">{results.questionText}</p>
          {isOpenText ? (
            <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: 4 }}>Correct answer</p>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>{results.correctAnswer}</p>
            </div>
          ) : (
            <div className="options-grid" style={{ padding: 0, gap: 8 }}>
              {results.options.map((opt, i) => {
                const isCorrect = i === results.correctIndex;
                const myChoice = myEntry?.chosenIndex === i;
                return (
                  <div key={i} className={`option-btn ${isCorrect ? 'correct' : myChoice ? 'wrong' : ''}`} style={{ cursor: 'default' }}>
                    <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                    <div className="option-text">{opt}</div>
                    {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My result */}
        {myEntry && (
          <div
            className={`alert ${myEntry.isCorrect ? 'alert-success' : 'alert-error'} text-center mb-4`}
            style={{ fontSize: '1.05rem', fontWeight: 600, padding: '16px 20px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}
          >
            {myEntry.isCorrect
              ? `✓ Correct! +${myEntry.questionScore} pts · Total: ${myEntry.totalScore.toLocaleString()}`
              : `✗ Wrong — ${myEntry.totalScore.toLocaleString()} pts total`}
          </div>
        )}

        {/* Leaderboard */}
        <div className="card" style={{ maxWidth: '100%', minWidth: 0 }}>
          <h2 className="mb-4 text-center">🏆 Standings</h2>
          <ul className="leaderboard">
            {results.leaderboard.slice(0, 8).map(e => (
              <li key={e.playerId} className={`lb-item rank-${Math.min(e.rank, 4)}`}
                style={e.playerId === playerId ? { borderColor: 'var(--accent2)', background: 'rgba(168,85,247,.08)' } : {}}>
                <div className="lb-rank">{e.rank}</div>
                <AvatarDisplay avatar={e.avatar} size={30} />
                <div className="lb-name">{e.username}{e.playerId === playerId ? ' 👈' : ''}</div>
                {e.questionScore > 0 && <span className="lb-delta">+{e.questionScore}</span>}
                <div className="lb-score">{e.totalScore.toLocaleString()}</div>
              </li>
            ))}
          </ul>
          {results.autoAdvanceSec > 0 ? (
            <p className="text-center text-muted text-sm mt-4">
              Next question in <strong style={{ color: 'var(--accent2)' }}>{autoAdvanceLeft}s</strong>…
            </p>
          ) : (
            <p className="text-center text-muted text-sm mt-4">Waiting for admin to continue…</p>
          )}
        </div>
      </div>
    );
  }

  // ─── PODIUM ───────────────────────────────────────────────────────────────
  if (phase === 'podium') {
    const top3 = finalBoard.slice(0, 3);
    const podiumOrder = [
      { entry: top3[1], medal: '🥈', place: 2, color: '#9ca3af', barH: 120 },
      { entry: top3[0], medal: '🥇', place: 1, color: '#fbbf24', barH: 160 },
      { entry: top3[2], medal: '🥉', place: 3, color: '#cd7c3a', barH: 90 },
    ];
    return (
      <div className="page-center" style={{ flexDirection: 'column', gap: 32 }}>
        <h1 style={{ textAlign: 'center', fontSize: '2rem' }}>🏁 Game Over!</h1>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 420 }}>
          {podiumOrder.map(({ entry, medal, place, color, barH }, idx) => {
            if (!entry) return <div key={idx} style={{ flex: 1 }} />;
            const isFirst = place === 1;
            return (
              <div
                key={entry.rank}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: `podiumRise 0.5s ease ${idx * 0.12}s both`,
                }}
              >
                {/* Avatar + name above the bar */}
                <div style={{ textAlign: 'center', marginBottom: 8, padding: '0 4px' }}>
                  <div style={{ fontSize: isFirst ? '2rem' : '1.6rem', marginBottom: 6 }}>{medal}</div>
                  <AvatarDisplay
                    avatar={entry.avatar}
                    size={isFirst ? 56 : 44}
                    style={{ border: `3px solid ${color}`, marginBottom: 6 }}
                  />
                  <div style={{
                    fontWeight: 700,
                    fontSize: isFirst ? '0.9rem' : '0.78rem',
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}>
                    {entry.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color }}>
                    {entry.totalScore.toLocaleString()} pts
                  </div>
                </div>

                {/* Podium bar */}
                <div style={{
                  width: '100%',
                  height: barH,
                  background: `linear-gradient(180deg, ${color}, ${color}bb)`,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isFirst ? '2rem' : '1.6rem',
                  fontWeight: 900,
                  color: place === 1 ? '#000' : '#fff',
                }}>
                  {place}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setPhase('ended')} className="btn btn-primary btn-lg">
          See Full Results →
        </button>
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
                <AvatarDisplay avatar={e.avatar} size={30} />
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
