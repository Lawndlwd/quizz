import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import type { GameEndedPayload, QuestionPayload, QuestionResults } from '../../types';
import { AnsweredScreen } from './components/AnsweredScreen';
import { CountdownScreen } from './components/CountdownScreen';
import { EndedScreen } from './components/EndedScreen';
import { PodiumScreen } from './components/PodiumScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { WaitingScreen } from './components/WaitingScreen';

type Phase = 'waiting' | 'countdown' | 'question' | 'answered' | 'results' | 'podium' | 'ended';

export default function Game() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  // Read identity once from sessionStorage, keep in state so clearing storage later
  // doesn't break the component mid-render.
  const [playerId] = useState(() => Number(sessionStorage.getItem('playerId')));
  const [username] = useState(() => sessionStorage.getItem('username') ?? 'Player');
  const [myAvatar] = useState(() => sessionStorage.getItem('avatar') ?? '🎮');

  const [phase, setPhase] = useState<Phase>('waiting');
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openTextInput, setOpenTextInput] = useState('');
  const [openTextSubmitted, setOpenTextSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    score: number;
    wasPassJoker?: boolean;
  } | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [jokersEnabled, setJokersEnabled] = useState({ pass: false, fiftyFifty: false });
  const [jokersUsed, setJokersUsed] = useState({ pass: false, fiftyFifty: false });
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [finalBoard, setFinalBoard] = useState<GameEndedPayload['leaderboard']>([]);
  const [countdownSec, setCountdownSec] = useState(3);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playerId) navigate('/play', { replace: true });
  }, [navigate, playerId]);

  // Reconnect: re-emit player:join on socket connect/reconnect
  useEffect(() => {
    const storedPin = sessionStorage.getItem('pin');
    if (!playerId || !username || !storedPin) return;

    const storedAvatar = sessionStorage.getItem('avatar');

    function rejoin() {
      socket.emit('player:join', {
        pin: storedPin,
        username,
        avatar: storedAvatar ?? '',
      });
    }

    if (!socket.connected) {
      socket.connect();
    }
    // Always rejoin on (re)connect — handles both fresh page load and transient disconnects
    socket.on('connect', rejoin);
    // If already connected, rejoin immediately (the 'connect' event already fired)
    if (socket.connected) {
      rejoin();
    }
    return () => {
      socket.off('connect', rejoin);
    };
  }, [socket, playerId, username]);

  useSocketEvent<{ jokersEnabled: { pass: boolean; fiftyFifty: boolean } }>(
    'game:started',
    (data) => {
      if (data?.jokersEnabled) setJokersEnabled(data.jokersEnabled);
    },
  );

  useSocketEvent<{ seconds: number }>('game:countdown', (data) => {
    setCountdownSec(data.seconds);
    setPhase('countdown');
  });

  useSocketEvent<{
    jokersEnabled: { pass: boolean; fiftyFifty: boolean };
    jokersUsed: { pass: boolean; fiftyFifty: boolean };
  }>('player:joker-state', (data) => {
    setJokersEnabled(data.jokersEnabled);
    setJokersUsed(data.jokersUsed);
  });

  useSocketEvent<{ eliminatedIndices: number[] }>('player:joker-5050-applied', (data) => {
    setEliminatedIndices(data.eliminatedIndices);
    setJokersUsed((prev) => ({ ...prev, fiftyFifty: true }));
  });

  useSocketEvent<{ answeredCount: number; totalPlayers: number }>('game:answer-count', (data) => {
    setAnsweredCount(data.answeredCount);
    setTotalPlayers(data.totalPlayers);
  });

  useSocketEvent<QuestionPayload>('game:question', (data) => {
    setQuestion(data);
    setSelectedIndex(null);
    setOpenTextInput('');
    setOpenTextSubmitted(false);
    setAnswerResult(null);
    setResults(null);
    setEliminatedIndices([]);
    setAnsweredCount(0);
    // On reconnect the server sends timeRemaining; otherwise use full timeSec
    setTimeLeft(data.timeRemaining ?? data.timeSec);
    setPhase('question');

    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  });

  useSocketEvent<{ isCorrect: boolean; score: number; wasPassJoker?: boolean }>(
    'player:answer-received',
    (data) => {
      setAnswerResult(data);
      setPhase('answered');
      if (timerRef.current) clearInterval(timerRef.current);
    },
  );

  useSocketEvent<QuestionResults>('game:question-results', (data) => {
    setResults(data);
    setPhase('results');
    if (timerRef.current) clearInterval(timerRef.current);

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
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    setPhase('podium');
  });

  function clearGameSession() {
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('pin');
  }

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

  if (phase === 'waiting') return <WaitingScreen username={username} avatar={myAvatar} />;

  if (phase === 'countdown') return <CountdownScreen seconds={countdownSec} />;

  if (phase === 'question' && question)
    return (
      <QuestionScreen
        question={question}
        timeLeft={timeLeft}
        selectedIndex={selectedIndex}
        openTextInput={openTextInput}
        openTextSubmitted={openTextSubmitted}
        eliminatedIndices={eliminatedIndices}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
        jokersEnabled={jokersEnabled}
        jokersUsed={jokersUsed}
        onAnswer={submitAnswer}
        onOpenTextChange={setOpenTextInput}
        onOpenTextSubmit={submitOpenText}
        onPassJoker={() => {
          if (jokersUsed.pass) return;
          setJokersUsed((prev) => ({ ...prev, pass: true }));
          socket.emit('player:joker-pass', { sessionId: Number(sessionId), playerId });
        }}
        onFiftyFiftyJoker={() => {
          if (jokersUsed.fiftyFifty) return;
          socket.emit('player:joker-5050', { sessionId: Number(sessionId), playerId });
        }}
      />
    );

  if (phase === 'answered' && answerResult)
    return (
      <AnsweredScreen
        isCorrect={answerResult.isCorrect}
        score={answerResult.score}
        wasPassJoker={answerResult.wasPassJoker}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
      />
    );

  if (phase === 'results' && results)
    return (
      <ResultsScreen results={results} playerId={playerId} autoAdvanceLeft={autoAdvanceLeft} />
    );

  if (phase === 'podium')
    return <PodiumScreen leaderboard={finalBoard} onContinue={() => setPhase('ended')} />;

  if (phase === 'ended')
    return (
      <EndedScreen
        leaderboard={finalBoard}
        username={username}
        onPlayAgain={() => {
          clearGameSession();
          navigate('/play');
        }}
      />
    );

  return null;
}
