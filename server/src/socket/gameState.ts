import { DbQuestion, GameSettings } from '../types';

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
  // Auto-advance timer after showing results
  resultsTimer: ReturnType<typeof setTimeout> | null;
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
}

// pin → ActiveSession
export const activeSessions = new Map<string, ActiveSession>();
// sessionId → pin
export const sessionIdToPin = new Map<number, string>();
