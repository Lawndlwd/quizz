import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import type {
  GameEndedPayload,
  GameSettings,
  QuestionPayload,
  QuestionResults,
  Session,
} from '../../types';
import { CountdownScreen } from '../play/components/CountdownScreen';
import { GameEnded } from './components/GameEnded';
import { GameLobby } from './components/GameLobby';
import { GameQuestion } from './components/GameQuestion';
import { GameResults } from './components/GameResults';
import { RemovePointsModal } from './components/RemovePointsModal';

interface PlayerInfo {
  id: number;
  username: string;
  totalScore: number;
  avatar?: string;
}
interface SessionState {
  session: Session;
  players: PlayerInfo[];
  questionCount: number;
  gameSettings?: GameSettings;
  jokersUsed?: { pass: boolean; fiftyFifty: boolean };
}

interface PlayerAnswer {
  questionId: number;
  questionText: string;
  score: number;
  isCorrect: boolean;
}

type Phase = 'lobby' | 'countdown' | 'question' | 'results' | 'ended';

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
  const [finalBoard, setFinalBoard] = useState<
    { rank: number; username: string; totalScore: number; avatar?: string }[]
  >([]);
  const [countdownSec, setCountdownSec] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Remove points modal state
  const [modalPlayerId, setModalPlayerId] = useState<number | null>(null);
  const [modalPlayerAnswers, setModalPlayerAnswers] = useState<PlayerAnswer[]>([]);

  useEffect(() => {
    if (!token || !sessionId) return;
    socket.connect();
    socket.emit('admin:join-session', { sessionId: Number(sessionId), token });
    return () => {
      socket.disconnect();
    };
  }, [sessionId, token, socket.connect, socket.disconnect, socket.emit]);

  useSocketEvent<SessionState>('session:state', (data) => {
    setSessionState(data);
    setPlayers(data.players);
    setShareUrl(`${window.location.origin}/play/${data.session.pin}`);
    if (data.session.status === 'active') setPhase('question');
    if (data.session.status === 'finished') setPhase('ended');
  });

  useSocketEvent<{ playerId: number; username: string; playerCount: number; avatar?: string }>(
    'game:player-joined',
    (data) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.playerId)) return prev;
        return [
          ...prev,
          { id: data.playerId, username: data.username, totalScore: 0, avatar: data.avatar },
        ];
      });
    },
  );

  useSocketEvent<{ playerId: number }>('game:player-left', (data) => {
    setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
  });

  useSocketEvent<Record<string, never>>('game:started', () => {
    // Phase will be set by game:countdown or game:question
  });

  useSocketEvent<{ seconds: number }>('game:countdown', (data) => {
    setCountdownSec(data.seconds);
    setPhase('countdown');
  });

  useSocketEvent<QuestionPayload>('game:question', (data) => {
    setQuestion(data);
    setAnsweredCount(0);
    setTimeLeft(data.timeSec);
    setPhase('question');
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  });

  useSocketEvent<{ answeredCount: number; totalPlayers: number }>(
    'game:answer-received',
    (data) => {
      setAnsweredCount(data.answeredCount);
    },
  );

  useSocketEvent<QuestionResults>('game:question-results', (data) => {
    setResults(data);
    setPhase('results');
    setPlayers(
      data.leaderboard.map((e) => ({
        id: e.playerId,
        username: e.username,
        totalScore: e.totalScore,
        avatar: e.avatar,
      })),
    );

    setAutoAdvanceLeft(data.autoAdvanceSec);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(() => {
      setAutoAdvanceLeft((t) => {
        if (t <= 1) {
          if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  });

  useSocketEvent<GameEndedPayload>('game:ended', (data) => {
    setFinalBoard(data.leaderboard);
    setPhase('ended');
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  });

  // Listen for points-removed response to update leaderboard in results
  useSocketEvent<{
    playerId: number;
    questionId: number;
    removedScore: number;
    newTotalScore: number;
  }>('admin:points-removed', (data) => {
    setResults((prev) => {
      if (!prev) return prev;
      const updated = prev.leaderboard
        .map((e) => {
          if (e.playerId !== data.playerId) return e;
          return {
            ...e,
            totalScore: data.newTotalScore,
            questionScore: data.questionId === prev.questionId ? 0 : e.questionScore,
          };
        })
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      return { ...prev, leaderboard: updated };
    });
    setPlayers((prev) =>
      prev.map((p) => (p.id === data.playerId ? { ...p, totalScore: data.newTotalScore } : p)),
    );
    // Update modal answers if open for this player
    if (modalPlayerId === data.playerId) {
      setModalPlayerAnswers((prev) =>
        prev.map((a) => (a.questionId === data.questionId ? { ...a, score: 0 } : a)),
      );
    }
  });

  // Listen for player answers (for the modal)
  useSocketEvent<{ playerId: number; answers: PlayerAnswer[] }>('admin:player-answers', (data) => {
    setModalPlayerId(data.playerId);
    setModalPlayerAnswers(data.answers);
  });

  // Countdown timer (display only — real timer is server-driven)
  useEffect(() => {
    if (phase !== 'question' || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft]);

  const startGame = useCallback(() => {
    const stored = sessionStorage.getItem(`gameSettings:${sessionId}`);
    const gameSettings: GameSettings = stored
      ? JSON.parse(stored)
      : { jokersEnabled: { pass: false, fiftyFifty: false } };
    socket.emit('admin:start-game', { sessionId: Number(sessionId), token, gameSettings });
  }, [sessionId, token, socket.emit]);

  const nextQuestion = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    socket.emit('admin:next-question', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket.emit]);

  const endGame = useCallback(() => {
    if (!confirm('End the game now?')) return;
    socket.emit('admin:end-game', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket.emit]);

  const finishQuestion = useCallback(() => {
    socket.emit('admin:finish-question', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket.emit]);

  const removePoints = useCallback(
    (playerId: number, questionId: number) => {
      socket.emit('admin:remove-points', {
        sessionId: Number(sessionId),
        token,
        playerId,
        questionId,
      });
    },
    [sessionId, token, socket.emit],
  );

  const openPlayerAnswers = useCallback(
    (playerId: number) => {
      socket.emit('admin:get-player-answers', {
        sessionId: Number(sessionId),
        token,
        playerId,
      });
    },
    [sessionId, token, socket.emit],
  );

  const modalPlayerName =
    players.find((p) => p.id === modalPlayerId)?.username ?? `Player #${modalPlayerId}`;

  if (!sessionState)
    return (
      <div className="page">
        <AdminNav />
        <div className="page-center">
          <p className="text-muted">Connecting…</p>
        </div>
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
      {phase === 'countdown' && (
        <div className="main-content">
          <CountdownScreen seconds={countdownSec} />
        </div>
      )}
      {phase === 'question' && question && (
        <GameQuestion
          question={question}
          timeLeft={timeLeft}
          answeredCount={answeredCount}
          totalPlayers={players.length}
          onEndGame={endGame}
          onFinishQuestion={finishQuestion}
        />
      )}
      {phase === 'results' && results && (
        <GameResults
          results={results}
          questionIndex={question?.questionIndex ?? 0}
          autoAdvanceLeft={autoAdvanceLeft}
          onNextQuestion={nextQuestion}
          onEndGame={endGame}
          onRemovePoints={removePoints}
          onOpenPlayerAnswers={openPlayerAnswers}
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
      {modalPlayerId !== null && (
        <RemovePointsModal
          playerName={modalPlayerName}
          answers={modalPlayerAnswers}
          onRemovePoints={(questionId) => removePoints(modalPlayerId, questionId)}
          onClose={() => setModalPlayerId(null)}
        />
      )}
    </div>
  );
}
