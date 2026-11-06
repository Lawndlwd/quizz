import { Maximize, Minimize, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { SlideDisplay } from '@/components/game/SlideDisplay';
import { PageCenter, PageLoading } from '@/components/layout';
import { MuteToggle } from '@/components/MuteToggle';
import { useCountdown } from '@/hooks/useCountdown';
import { getSocket, useSocketEvent } from '@/hooks/useSocket';
import { sound } from '@/lib/sound';
import type {
  FinalLeaderboardEntry,
  GameEndedPayload,
  LeaderboardEntry,
  PlayerInfo,
  QuestionPayload,
  QuestionResults,
  QuizIntro,
  SlidePayload,
} from '@/types';
import { CountdownScreen } from '../play/components/CountdownScreen';
import { ScreenEnded } from './components/ScreenEnded';
import { ScreenLobby } from './components/ScreenLobby';
import { ScreenResults } from './components/ScreenResults';

interface ScreenState {
  pin: string;
  status: 'waiting' | 'active' | 'finished';
  quizTitle: string;
  chooseQuizMaker: boolean;
  players: PlayerInfo[];
  questionCount: number;
  quizIntro?: QuizIntro;
}

type Phase = 'connecting' | 'lobby' | 'countdown' | 'question' | 'results' | 'slide' | 'ended';

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/** Read-only room display for presentation games. The host drives it from their console. */
export default function Screen() {
  const { pin = '' } = useParams<{ pin: string }>();
  const socket = getSocket();

  const [phase, setPhase] = useState<Phase>('connecting');
  const [info, setInfo] = useState<ScreenState | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [slide, setSlide] = useState<SlidePayload | null>(null);
  const [finalBoard, setFinalBoard] = useState<FinalLeaderboardEntry[]>([]);
  const [countdownSec, setCountdownSec] = useState(3);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const questionTimer = useCountdown(0);


  useEffect(() => {
    function join() {
      socket.emit('screen:join', { pin });
    }
    socket.on('connect', join);
    if (socket.connected) join();
    else socket.connect();
    return () => {
      socket.off('connect', join);
    };
  }, [socket, pin]);

  // Browsers block sound and autoplay until a user gesture. The page still works
  // without one, so a TV with no input just stays silent.
  useEffect(() => {
    if (unlocked) return;
    function unlock() {
      setUnlocked(true);
      sound.play('blip');
    }
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [unlocked]);

  // Esc and browser controls also leave fullscreen, so follow the browser's state.
  useEffect(() => {
    function sync() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useSocketEvent<void>('connect', () => setOnline(true));
  useSocketEvent<void>('disconnect', () => setOnline(false));

  useSocketEvent<{ message: string }>('screen:error', (data) => setError(data.message));

  useSocketEvent<ScreenState>('screen:state', (data) => {
    setError(null);
    setInfo(data);
    setPlayers(data.players);
    if (data.status === 'waiting') setPhase('lobby');
  });

  useSocketEvent<{ playerId: number; username: string; avatar?: string }>(
    'game:player-joined',
    (data) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.playerId)) return prev;
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

  useSocketEvent<QuestionPayload>('game:question', (data) => {
    if (question?.questionId !== data.questionId) setAnsweredCount(0);
    setQuestion(data);
    setPhase('question');
    questionTimer.start(data.timeRemaining ?? data.timeSec);
  });

  useSocketEvent<SlidePayload>('game:slide', (data) => {
    setSlide(data);
    setPhase('slide');
    questionTimer.stop();
  });

  useSocketEvent<{ answeredCount: number; totalPlayers: number }>('game:answer-count', (data) => {
    setAnsweredCount(data.answeredCount);
    setTotalPlayers(data.totalPlayers);
  });

  useSocketEvent<QuestionResults>('game:question-results', (data) => {
    setResults(data);
    setPhase('results');
    questionTimer.stop();
  });

  // The host removed points: keep the visible standings honest.
  useSocketEvent<{ leaderboard: LeaderboardEntry[] }>('game:leaderboard-update', (data) => {
    setResults((prev) => {
      if (!prev) return prev;
      const updates = new Map(data.leaderboard.map((e) => [e.playerId, e]));
      const leaderboard = prev.leaderboard
        .map((e) => {
          const u = updates.get(e.playerId);
          return u ? { ...e, totalScore: u.totalScore, rank: u.rank } : e;
        })
        .sort((a, b) => a.rank - b.rank);
      return { ...prev, leaderboard };
    });
  });

  useSocketEvent<GameEndedPayload>('game:ended', (data) => {
    setFinalBoard(data.leaderboard);
    setPhase('ended');
    questionTimer.stop();
  });

  if (error) {
    return (
      <PageCenter>
        <h1 className="text-center text-3xl font-extrabold">{error}</h1>
        <p className="mt-2 text-muted-foreground">PIN: {pin}</p>
      </PageCenter>
    );
  }

  if (!info || phase === 'connecting') return <PageLoading message="Connecting to the game…" />;

  return (
    <div className="screen-stage flex min-h-screen flex-1 flex-col">
      {phase === 'lobby' && (
        <ScreenLobby
          pin={info.pin}
          title={info.quizTitle}
          questionCount={info.questionCount}
          intro={info.quizIntro}
          players={players}
        />
      )}
      {phase === 'countdown' && <CountdownScreen seconds={countdownSec} />}
      {phase === 'question' && question && (
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center p-4 lg:p-8">
          <QuestionDisplay
            stage
            question={question}
            timeLeft={questionTimer.seconds}
            answeredCount={answeredCount}
            totalPlayers={totalPlayers || players.length}
          />
        </div>
      )}
      {phase === 'results' && results && <ScreenResults results={results} />}
      {phase === 'slide' && slide && (
        <div className="flex flex-1 flex-col justify-center p-4 lg:p-8">
          <SlideDisplay stage slide={slide} />
        </div>
      )}
      {phase === 'ended' && (
        <ScreenEnded
          title={info.quizTitle}
          leaderboard={finalBoard}
          chooseQuizMaker={info.chooseQuizMaker}
        />
      )}

      <MuteToggle className="fixed left-3 bottom-3 z-50" />
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="fixed right-3 bottom-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[var(--surface2)] text-[var(--text2)] transition-colors hover:text-foreground"
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      {!unlocked && (
        <p className="fixed inset-x-0 bottom-3 z-50 mx-auto w-fit rounded-full bg-black/70 px-4 py-1.5 text-sm text-white">
          Click anywhere for sound
        </p>
      )}
      {!online && (
        <output className="fixed inset-x-0 bottom-14 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-warn px-4 py-1.5 text-sm font-semibold text-black">
          <WifiOff className="size-4" /> Reconnecting…
        </output>
      )}
    </div>
  );
}
