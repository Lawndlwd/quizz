import { DbQuestion } from '../types';

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
  questionTimer: ReturnType<typeof setTimeout> | null;
  status: 'waiting' | 'active' | 'finished';
}

// pin → ActiveSession
export const activeSessions = new Map<string, ActiveSession>();
// sessionId → pin
export const sessionIdToPin = new Map<number, string>();
