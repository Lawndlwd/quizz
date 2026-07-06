import type { DbPlayer, DbQuestion, DbSession, GameSettings, LeaderboardEntry } from '../types';

const defaultGameSettings = (): GameSettings => ({
  jokersEnabled: { pass: false, fiftyFifty: false },
});

export function createActiveSession(
  session: Pick<DbSession, 'id' | 'quiz_id' | 'pin' | 'status' | 'current_question_index'>,
  questions: DbQuestion[],
  adminSocketId = '',
): ActiveSession {
  return {
    sessionId: session.id,
    quizId: session.quiz_id,
    pin: session.pin,
    adminSocketId,
    questions,
    currentQuestionIndex: session.current_question_index,
    playerSockets: new Map(),
    socketPlayers: new Map(),
    answeredPlayers: new Map(),
    correctAnswerCount: new Map(),
    playerStreaks: new Map(),
    playerAvatars: new Map(),
    questionTimer: null,
    questionStartedAt: null,
    resultsTimer: null,
    resultsShownAt: null,
    status: session.status as ActiveSession['status'],
    questionPhase: null,
    lastQuestionPayload: null,
    lastResultsPayload: null,
    gameSettings: defaultGameSettings(),
    playerJokersUsed: new Map(),
    playerFiftyFiftyIndices: new Map(),
    // Per-game seed so answer options shuffle differently each game, but stay
    // stable within the game. Derived from the session id (not Math.random())
    // so a cold rebuild after a server restart recomputes the SAME permutation —
    // stored display-slot answers stay decodable and options don't jump.
    answerSeed: session.id,
  };
}

export interface ActiveSession {
  sessionId: number;
  quizId: number;
  pin: string;
  adminSocketId: string;
  questions: DbQuestion[];
  currentQuestionIndex: number;
  // playerId → socket id
  playerSockets: Map<number, string>;
  // socket id → playerId
  socketPlayers: Map<string, number>;
  // questionId → Set of playerIds who answered
  answeredPlayers: Map<number, Set<number>>;
  // questionId → count of correct answers so far (for speed bonus)
  correctAnswerCount: Map<number, number>;
  // playerId → consecutive correct answer streak count
  playerStreaks: Map<number, number>;
  // playerId → base64 data URI or emoji string
  playerAvatars: Map<number, string>;
  questionTimer: ReturnType<typeof setTimeout> | null;
  // Timestamp (Date.now()) when the current question was sent to players
  questionStartedAt: number | null;
  // Auto-advance timer after showing results
  resultsTimer: ReturnType<typeof setTimeout> | null;
  // Timestamp (Date.now()) when results were shown to players
  resultsShownAt: number | null;
  status: 'waiting' | 'active' | 'finished';
  // Current phase within an active game
  questionPhase: 'question' | 'results' | null;
  // Last payloads for reconnecting players
  lastQuestionPayload: object | null;
  lastResultsPayload: object | null;
  // Per-game settings (set at game start, overrides global config)
  gameSettings: GameSettings;
  // Per-player joker usage: playerId → { pass: used, fiftyFifty: used }
  playerJokersUsed: Map<number, { pass: boolean; fiftyFifty: boolean }>;
  // Per-player 50/50 eliminated indices for the current question (reset per question)
  playerFiftyFiftyIndices: Map<number, number[]>;
  // Random seed mixed into the per-question answer-option shuffle (see shuffle.ts)
  answerSeed: number;
}

// pin → ActiveSession
export const activeSessions = new Map<string, ActiveSession>();
// sessionId → pin
export const sessionIdToPin = new Map<number, string>();

/** Resolve the in-memory session state from a session id (via its PIN). */
export function getStateBySessionId(sessionId: number): ActiveSession | undefined {
  const pin = sessionIdToPin.get(sessionId);
  return pin ? activeSessions.get(pin) : undefined;
}

/** Get (or lazily create) the set of playerIds who answered the given question. */
export function getOrCreateAnsweredSet(state: ActiveSession, questionId: number): Set<number> {
  let answered = state.answeredPlayers.get(questionId);
  if (!answered) {
    answered = new Set();
    state.answeredPlayers.set(questionId, answered);
  }
  return answered;
}

/** Build ranked leaderboard entries from players already sorted by score. */
export function buildLeaderboard(
  players: DbPlayer[],
  playerAvatars?: Map<number, string>,
): Array<LeaderboardEntry & { avatar: string | undefined }> {
  return players.map((p, i) => ({
    rank: i + 1,
    playerId: p.id,
    username: p.username,
    totalScore: p.total_score,
    avatar: playerAvatars?.get(p.id),
  }));
}
