import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainContent, Page, PageLoading } from '@/components/layout';
import { useCountdown } from '@/hooks/useCountdown';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { copyText, publicBaseUrl } from '@/helpers';
import { MuteToggle } from '@/components/MuteToggle';
import { sound } from '@/lib/sound';
import CreatorNav from '../../components/CreatorNav';
import { useAuth } from '../../context/AuthContext';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import type {
  AnswerKey,
  FinalLeaderboardEntry,
  GameEndedPayload,
  GameSettings,
  NextPreview,
  PlayerInfo,
  QuestionPayload,
  QuestionResults,
  QuizIntro,
  Session,
} from '../../types';
import { CountdownScreen } from '../play/components/CountdownScreen';
import { AnswerKeyPanel } from './components/AnswerKeyPanel';
import { GameEnded } from './components/GameEnded';
import { GameLobby } from './components/GameLobby';
import { GameQuestion } from './components/GameQuestion';
import { GameResults } from './components/GameResults';
import { PresentationActionBar, PresentationPanel } from './components/PresentationControls';
import { RemovePointsModal } from './components/RemovePointsModal';

interface SessionState {
  session: Session;
  players: PlayerInfo[];
  questionCount: number;
  gameSettings?: GameSettings;
  jokersUsed?: { pass: boolean; fiftyFifty: boolean };
  quizIntro?: QuizIntro;
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
  const basePath = useCreatorBase();
  const socket = getSocket();
  const { confirm } = useDialog();
  const { publicUrl } = useApp();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [finalBoard, setFinalBoard] = useState<FinalLeaderboardEntry[]>([]);
  const [countdownSec, setCountdownSec] = useState(3);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [nextPreview, setNextPreview] = useState<NextPreview | null>(null);
  const [screenCount, setScreenCount] = useState(0);
  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null);

  const questionTimer = useCountdown(0);
  const autoAdvanceTimer = useCountdown(0);

  const presentationMode = sessionState?.session.presentation_mode === 1;

  // The big screen is the room's speaker; a second source here would echo.
  useEffect(() => {
    sound.setSuppressed(presentationMode);
    return () => sound.setSuppressed(false);
  }, [presentationMode]);

  const [modalPlayerId, setModalPlayerId] = useState<number | null>(null);
  const [modalPlayerAnswers, setModalPlayerAnswers] = useState<PlayerAnswer[]>([]);

  useEffect(() => {
    if (!token || !sessionId) return;
    // Shared singleton socket: never disconnect it here — other pages use it.
    // socket.io buffers emits until connected, so no 'connect' listener needed.
    socket.connect();
    socket.emit('admin:join-session', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket]);

  useSocketEvent<SessionState>('session:state', (data) => {
    setSessionState(data);
    setPlayers(data.players);
    if (data.session.status === 'active') setPhase('question');
    if (data.session.status === 'finished') setPhase('ended');
  });

  useSocketEvent<{ count: number }>('game:screen-status', (data) => setScreenCount(data.count));
  useSocketEvent<AnswerKey>('game:answer-key', setAnswerKey);

  useSocketEvent<{ playerId: number; username: string; playerCount: number; avatar?: string }>(
    'game:player-joined',
    (data) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.playerId)) return prev;
        sound.play('blip');
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

  useSocketEvent<{ seconds: number }>('game:countdown', (data) => {
    setCountdownSec(data.seconds);
    setPhase('countdown');
  });

  useSocketEvent<typeof nextPreview>('game:next-preview', (data) => {
    setNextPreview(data);
  });

  useSocketEvent<QuestionPayload>('game:question', (data) => {
    setQuestion(data);
    setAnsweredCount(0);
    setNextPreview(null);
    setPhase('question');
    autoAdvanceTimer.stop();
    questionTimer.start(data.timeRemaining ?? data.timeSec);
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
    questionTimer.stop();
    setPlayers(
      data.leaderboard.map((e) => ({
        id: e.playerId,
        username: e.username,
        totalScore: e.totalScore,
        avatar: e.avatar,
      })),
    );
    autoAdvanceTimer.start(data.autoAdvanceSec);
  });

  useSocketEvent<GameEndedPayload>('game:ended', (data) => {
    setFinalBoard(data.leaderboard);
    setPhase('ended');
    questionTimer.stop();
    autoAdvanceTimer.stop();
  });

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
    if (modalPlayerId === data.playerId) {
      setModalPlayerAnswers((prev) =>
        prev.map((a) => (a.questionId === data.questionId ? { ...a, score: 0 } : a)),
      );
    }
  });

  useSocketEvent<{ playerId: number; answers: PlayerAnswer[] }>('admin:player-answers', (data) => {
    setModalPlayerId(data.playerId);
    setModalPlayerAnswers(data.answers);
  });

  const startGame = useCallback(() => {
    const stored = sessionStorage.getItem(`gameSettings:${sessionId}`);
    const gameSettings: GameSettings = stored
      ? JSON.parse(stored)
      : { jokersEnabled: { pass: false, fiftyFifty: false } };
    socket.emit('admin:start-game', { sessionId: Number(sessionId), token, gameSettings });
  }, [sessionId, token, socket]);

  const nextQuestion = useCallback(() => {
    autoAdvanceTimer.stop();
    socket.emit('admin:next-question', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket, autoAdvanceTimer]);

  const endGame = useCallback(async () => {
    const ok = await confirm({
      title: 'End game?',
      message: 'This ends the game now and shows the final scores.',
      confirmText: 'End game',
      variant: 'danger',
    });
    if (!ok) return;
    socket.emit('admin:end-game', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket, confirm]);

  const finishQuestion = useCallback(() => {
    socket.emit('admin:finish-question', { sessionId: Number(sessionId), token });
  }, [sessionId, token, socket]);

  const removePoints = useCallback(
    (playerId: number, questionId: number) => {
      socket.emit('admin:remove-points', {
        sessionId: Number(sessionId),
        token,
        playerId,
        questionId,
      });
    },
    [sessionId, token, socket],
  );

  const openPlayerAnswers = useCallback(
    (playerId: number) => {
      socket.emit('admin:get-player-answers', {
        sessionId: Number(sessionId),
        token,
        playerId,
      });
    },
    [sessionId, token, socket],
  );

  // Clicker and keyboard pacing. Debounced so a double press can't skip a whole question.
  const lastAdvanceAt = useRef(0);
  useEffect(() => {
    if (!presentationMode) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!['n', 'N', 'ArrowRight', 'PageDown'].includes(e.key)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (modalPlayerId !== null || document.querySelector('[role="dialog"]')) return;
      if (phase !== 'question' && phase !== 'results') return;
      const now = Date.now();
      if (now - lastAdvanceAt.current < 800) return;
      lastAdvanceAt.current = now;
      e.preventDefault();
      if (phase === 'question') finishQuestion();
      else nextQuestion();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presentationMode, modalPlayerId, phase, finishQuestion, nextQuestion]);

  const modalPlayerName =
    players.find((p) => p.id === modalPlayerId)?.username ?? `Player #${modalPlayerId}`;

  if (!sessionState) return <PageLoading message="Connecting…" />;

  const pin = sessionState.session.pin;
  const totalQ = sessionState.questionCount;
  const baseUrl = publicBaseUrl(publicUrl);
  const shareUrl = `${baseUrl}/play/${pin}`;

  return (
    <Page className={presentationMode ? 'pb-20 sm:pb-0' : undefined}>
      <CreatorNav />
      {!presentationMode && <MuteToggle className="fixed left-3 bottom-3 z-50" />}
      {presentationMode && phase !== 'ended' && (
        <PresentationPanel baseUrl={baseUrl} pin={pin} screenCount={screenCount} />
      )}
      {phase === 'lobby' && (
        <GameLobby
          quizTitle={sessionState.session.quiz_title ?? ''}
          questionCount={totalQ}
          intro={sessionState.quizIntro ?? null}
          pin={pin}
          shareUrl={shareUrl}
          players={players}
          onStart={startGame}
          onDiscard={endGame}
          onCopyLink={() => void copyText(shareUrl)}
        />
      )}
      {phase === 'countdown' && (
        <MainContent>
          <CountdownScreen seconds={countdownSec} />
        </MainContent>
      )}
      {phase === 'question' && question && (
        <GameQuestion
          question={question}
          timeLeft={questionTimer.seconds}
          answeredCount={answeredCount}
          totalPlayers={players.length}
          presentationMode={presentationMode}
          onEndGame={endGame}
          onFinishQuestion={finishQuestion}
        >
          {presentationMode && answerKey?.questionId === question.questionId && (
            <AnswerKeyPanel key={question.questionId} answerKey={answerKey} />
          )}
        </GameQuestion>
      )}
      {phase === 'results' && results && (
        <GameResults
          results={results}
          questionIndex={question?.questionIndex ?? 0}
          autoAdvanceLeft={autoAdvanceTimer.seconds}
          nextPreview={nextPreview}
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
          chooseQuizMaker={sessionState.session.choose_quiz_maker === 1 && !presentationMode}
          onViewDetails={() => navigate(`${basePath}/sessions/${sessionId ?? ''}`)}
          onDashboard={() => navigate(basePath)}
        />
      )}
      {presentationMode && (phase === 'question' || phase === 'results') && (
        <PresentationActionBar
          phase={phase}
          isLastQuestion={!!results?.isLastQuestion}
          onFinishQuestion={finishQuestion}
          onNextQuestion={nextQuestion}
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
    </Page>
  );
}
