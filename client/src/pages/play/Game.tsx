import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clearPlayerSession, loadPlayerSession } from '@/helpers/playerSession';
import { useCountdown } from '@/hooks/useCountdown';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';
import type { GameEndedPayload, QuestionPayload, QuestionResults, QuizIntro } from '../../types';
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

  const [storedSession] = useState(loadPlayerSession);
  const playerId = Number(storedSession.playerId);
  const username = storedSession.username ?? 'Player';
  const myAvatar = storedSession.avatar ?? '🎮';

  const [phase, setPhase] = useState<Phase>('waiting');
  const [reconnecting, setReconnecting] = useState(() =>
    Boolean(storedSession.playerId && storedSession.pin),
  );
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [multiSelectSubmitted, setMultiSelectSubmitted] = useState(false);
  const [openTextInput, setOpenTextInput] = useState('');
  const [openTextSubmitted, setOpenTextSubmitted] = useState(false);
  const [closestValue, setClosestValue] = useState(50);
  const [closestSubmitted, setClosestSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    score: number;
    wasPassJoker?: boolean;
    streak?: number;
  } | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [jokersEnabled, setJokersEnabled] = useState({ pass: false, fiftyFifty: false });
  const [jokersUsed, setJokersUsed] = useState({ pass: false, fiftyFifty: false });
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [finalBoard, setFinalBoard] = useState<GameEndedPayload['leaderboard']>([]);
  const [countdownSec, setCountdownSec] = useState(3);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [quizIntro, setQuizIntro] = useState<QuizIntro | null>(null);

  const questionTimer = useCountdown(0);
  const autoAdvanceTimer = useCountdown(0);

  const effectiveSessionId = Number(sessionId) || Number(storedSession.sessionId) || 0;

  useEffect(() => {
    if (!playerId) navigate('/play', { replace: true });
  }, [navigate, playerId]);

  useSocketEvent<{ jokersEnabled: { pass: boolean; fiftyFifty: boolean } }>(
    'game:started',
    (data) => {
      if (data?.jokersEnabled) setJokersEnabled(data.jokersEnabled);
    },
  );

  useSocketEvent<{ quizIntro?: QuizIntro }>('player:joined', (data) => {
    if (data.quizIntro) setQuizIntro(data.quizIntro);
    // We're connected and in the lobby now — clear the initial "reconnecting" flag.
    setReconnecting(false);
  });

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
    setReconnecting(false);
    setQuestion(data);
    setSelectedIndex(null);
    setSelectedIndices([]);
    setMultiSelectSubmitted(false);
    setOpenTextInput('');
    setOpenTextSubmitted(false);
    setClosestSubmitted(false);
    if (data.questionType === 'closest_to') {
      const min = data.rangeMin ?? 0;
      const max = data.rangeMax ?? 100;
      setClosestValue(Math.round((min + max) / 2));
    }
    setAnswerResult(null);
    setResults(null);
    setEliminatedIndices([]);
    setAnsweredCount(0);
    setPhase('question');
    autoAdvanceTimer.stop();
    questionTimer.start(data.timeRemaining ?? data.timeSec);
  });

  useSocketEvent<{ isCorrect: boolean; score: number; wasPassJoker?: boolean; streak?: number }>(
    'player:answer-received',
    (data) => {
      setReconnecting(false);
      setAnswerResult(data);
      setPhase('answered');
      questionTimer.stop();
    },
  );

  useSocketEvent<QuestionResults>('game:question-results', (data) => {
    setReconnecting(false);
    setResults(data);
    setPhase('results');
    questionTimer.stop();
    autoAdvanceTimer.start(data.autoAdvanceSec);
  });

  useSocketEvent<GameEndedPayload>('game:ended', (data) => {
    setFinalBoard(data.leaderboard);
    questionTimer.stop();
    autoAdvanceTimer.stop();
    setReconnecting(false);
    setPhase('podium');
  });

  useEffect(() => {
    const { pin: storedPin, avatar: storedAvatar } = loadPlayerSession();
    if (!playerId || !username || !storedPin) return;

    function rejoin() {
      socket.emit('player:join', {
        pin: storedPin,
        username,
        avatar: storedAvatar ?? '',
        playerId,
      });
    }

    if (!socket.connected) socket.connect();
    socket.on('connect', rejoin);
    if (socket.connected) rejoin();
    return () => {
      socket.off('connect', rejoin);
    };
  }, [socket, playerId, username]);

  function submitAnswer(chosenIndex: number) {
    if (!question || phase !== 'question' || !effectiveSessionId) return;
    setSelectedIndex(chosenIndex);
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex,
      playerId,
    });
  }

  function submitOpenText() {
    if (!question || phase !== 'question' || openTextSubmitted) return;
    setOpenTextSubmitted(true);
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex: -1,
      playerId,
      chosenText: openTextInput.trim(),
    });
  }

  function submitClosestTo() {
    if (!question || phase !== 'question' || closestSubmitted) return;
    setClosestSubmitted(true);
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex: -4,
      playerId,
      chosenText: String(closestValue),
    });
  }

  function toggleMultiSelectIndex(index: number) {
    if (multiSelectSubmitted) return;
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  function submitMultiSelect() {
    if (!question || phase !== 'question' || multiSelectSubmitted) return;
    setMultiSelectSubmitted(true);
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex: -3,
      chosenIndices: selectedIndices,
      playerId,
    });
  }

  function submitFill(answers: string[]) {
    if (!question || phase !== 'question') return;
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex: -5,
      playerId,
      chosenText: JSON.stringify(answers),
    });
  }

  function submitOrder(order: number[]) {
    if (!question || phase !== 'question') return;
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex: -6,
      chosenIndices: order,
      playerId,
    });
  }

  function submitGeo(lat: number, lng: number) {
    if (!question || phase !== 'question') return;
    socket.emit('player:answer', {
      sessionId: effectiveSessionId,
      questionId: question.questionId,
      chosenIndex: -7,
      playerId,
      chosenText: JSON.stringify({ lat, lng }),
    });
  }

  if (phase === 'waiting')
    return (
      <WaitingScreen
        username={username}
        avatar={myAvatar}
        reconnecting={reconnecting}
        intro={quizIntro}
      />
    );

  if (phase === 'countdown') return <CountdownScreen seconds={countdownSec} />;

  if (phase === 'question' && question)
    return (
      <QuestionScreen
        question={question}
        timeLeft={questionTimer.seconds}
        selectedIndex={selectedIndex}
        selectedIndices={selectedIndices}
        multiSelectSubmitted={multiSelectSubmitted}
        openTextInput={openTextInput}
        openTextSubmitted={openTextSubmitted}
        closestValue={closestValue}
        closestSubmitted={closestSubmitted}
        eliminatedIndices={eliminatedIndices}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
        jokersEnabled={jokersEnabled}
        jokersUsed={jokersUsed}
        onAnswer={submitAnswer}
        onToggleMultiSelect={toggleMultiSelectIndex}
        onMultiSelectSubmit={submitMultiSelect}
        onOpenTextChange={setOpenTextInput}
        onOpenTextSubmit={submitOpenText}
        onClosestChange={setClosestValue}
        onClosestSubmit={submitClosestTo}
        onPassJoker={() => {
          if (jokersUsed.pass) return;
          setJokersUsed((prev) => ({ ...prev, pass: true }));
          socket.emit('player:joker-pass', { sessionId: effectiveSessionId, playerId });
        }}
        onFiftyFiftyJoker={() => {
          if (jokersUsed.fiftyFifty) return;
          socket.emit('player:joker-5050', { sessionId: effectiveSessionId, playerId });
        }}
        onFillSubmit={submitFill}
        onOrderSubmit={submitOrder}
        onGeoSubmit={submitGeo}
      />
    );

  if (phase === 'answered' && answerResult)
    return (
      <AnsweredScreen
        isCorrect={answerResult.isCorrect}
        score={answerResult.score}
        streak={answerResult.streak}
        wasPassJoker={answerResult.wasPassJoker}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
      />
    );

  if (phase === 'results' && results)
    return (
      <ResultsScreen
        results={results}
        playerId={playerId}
        autoAdvanceLeft={autoAdvanceTimer.seconds}
      />
    );

  if (phase === 'podium')
    return <PodiumScreen leaderboard={finalBoard} onContinue={() => setPhase('ended')} />;

  if (phase === 'ended')
    return (
      <EndedScreen
        leaderboard={finalBoard}
        username={username}
        onPlayAgain={() => {
          clearPlayerSession();
          navigate('/play');
        }}
      />
    );

  return null;
}
