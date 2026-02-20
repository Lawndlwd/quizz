import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import { QuestionPayload, QuestionResults, GameEndedPayload, Session, GameSettings } from '../../types';
import { GameLobby } from './components/GameLobby';
import { GameQuestion } from './components/GameQuestion';
import { GameResults } from './components/GameResults';
import { GameEnded } from './components/GameEnded';

interface PlayerInfo { id: number; username: string; totalScore: number; avatar?: string; }
interface SessionState {
  session: Session;
  players: PlayerInfo[];
  questionCount: number;
  gameSettings?: GameSettings;
  jokersUsed?: { pass: boolean; fiftyFifty: boolean };
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
  const [finalBoard, setFinalBoard] = useState<{ rank: number; username: string; totalScore: number; avatar?: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }
  });

  useSocketEvent<{ answeredCount: number; totalPlayers: number }>('game:answer-received', data => {
    setAnsweredCount(data.answeredCount);
  });

  useSocketEvent<QuestionResults>('game:question-results', data => {
    setResults(data);
    setPhase('results');
    setPlayers(data.leaderboard.map(e => ({ id: e.playerId, username: e.username, totalScore: e.totalScore, avatar: e.avatar })));

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
    setPhase('ended');
    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }
  });

  // Countdown timer (display only — real timer is server-driven)
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, question]);

  const startGame = useCallback(() => {
    const stored = sessionStorage.getItem(`gameSettings:${sessionId}`);
    const gameSettings: GameSettings = stored
      ? JSON.parse(stored)
      : { jokersEnabled: { pass: false, fiftyFifty: false } };
    socket.emit('admin:start-game', { sessionId: Number(sessionId), token, gameSettings });
  }, [sessionId, token]);

  const nextQuestion = useCallback(() => {
    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    socket.emit('admin:next-question', { sessionId: Number(sessionId), token });
  }, [sessionId, token]);

  const endGame = useCallback(() => {
    if (!confirm('End the game now?')) return;
    socket.emit('admin:end-game', { sessionId: Number(sessionId), token });
  }, [sessionId, token]);

  if (!sessionState) return (
    <div className="page">
      <AdminNav />
      <div className="page-center"><p className="text-muted">Connecting…</p></div>
    </div>
  );

  const pin = sessionState.session.pin;
  const totalQ = sessionState.questionCount;

  return (
    <div className="page">
      <AdminNav />
      {phase === 'lobby' && (
        <GameLobby
          quizTitle={sessionState.session.quiz_title ?? ''}
          questionCount={totalQ}
          pin={pin}
          shareUrl={shareUrl}
          players={players}
          onStart={startGame}
          onDiscard={endGame}
          onCopyLink={() => navigator.clipboard.writeText(shareUrl)}
        />
      )}
      {phase === 'question' && question && (
        <GameQuestion
          question={question}
          timeLeft={timeLeft}
          answeredCount={answeredCount}
          totalPlayers={players.length}
          onEndGame={endGame}
        />
      )}
      {phase === 'results' && results && (
        <GameResults
          results={results}
          questionIndex={question?.questionIndex ?? 0}
          autoAdvanceLeft={autoAdvanceLeft}
          onNextQuestion={nextQuestion}
          onEndGame={endGame}
        />
      )}
      {phase === 'ended' && (
        <GameEnded
          quizTitle={sessionState.session.quiz_title ?? ''}
          leaderboard={finalBoard}
          sessionId={sessionId ?? ''}
          onViewDetails={() => navigate(`/admin/sessions/${sessionId ?? ''}`)}
          onDashboard={() => navigate('/admin')}
        />
      )}
    </div>
  );
}
