import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import type { GameEndedPayload, QuestionPayload, QuestionResults } from '../../types';
import { AnsweredScreen } from './components/AnsweredScreen';
import { EndedScreen } from './components/EndedScreen';
import { PodiumScreen } from './components/PodiumScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { WaitingScreen } from './components/WaitingScreen';

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playerId) navigate('/play');
  }, [navigate, playerId]);

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
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket.on, socket.off, socket.emit]);

  useSocketEvent<{ jokersEnabled: { pass: boolean; fiftyFifty: boolean } }>(
    'game:started',
    (data) => {
      setPhase('waiting');
      if (data?.jokersEnabled) setJokersEnabled(data.jokersEnabled);
    },
  );

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

  useSocketEvent<QuestionPayload>('game:question', (data) => {
    setQuestion(data);
    setSelectedIndex(null);
    setOpenTextInput('');
    setOpenTextSubmitted(false);
    setAnswerResult(null);
    setResults(null);
    setEliminatedIndices([]);
    setTimeLeft(data.timeSec);
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

  if (phase === 'question' && question)
    return (
      <QuestionScreen
        question={question}
        timeLeft={timeLeft}
        selectedIndex={selectedIndex}
        openTextInput={openTextInput}
        openTextSubmitted={openTextSubmitted}
        eliminatedIndices={eliminatedIndices}
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
      />
    );

  if (phase === 'results' && results && question)
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
        onPlayAgain={() => navigate('/play')}
      />
    );

  return null;
}
