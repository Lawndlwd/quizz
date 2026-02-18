export interface Quiz {
  id: number;
  title: string;
  description: string;
  created_at: string;
  question_count: number;
}

export interface Question {
  id: number;
  quiz_id: number;
  text: string;
  options: string[];
  correct_index: number;
  base_score: number;
  time_sec: number;
  order_index: number;
}

export interface Session {
  id: number;
  quiz_id: number;
  pin: string;
  status: 'waiting' | 'active' | 'finished';
  current_question_index: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  quiz_title?: string;
  player_count?: number;
}

export interface Player {
  id: number;
  session_id: number;
  username: string;
  total_score: number;
  joined_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: number;
  username: string;
  totalScore: number;
  chosenIndex: number | null;
  isCorrect: boolean;
  questionScore: number;
  avatar?: string;
}

export interface QuestionPayload {
  questionIndex: number;
  totalQuestions: number;
  questionId: number;
  text: string;
  options: string[];
  timeSec: number;
}

export interface QuestionResults {
  questionId: number;
  questionText: string;
  correctIndex: number;
  options: string[];
  leaderboard: LeaderboardEntry[];
  isLastQuestion: boolean;
}

export interface GameEndedPayload {
  leaderboard: Array<{ rank: number; username: string; totalScore: number; avatar?: string }>;
}

export interface ImportQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  baseScore: number;
  timeSec?: number;
}

export interface ImportPayload {
  title: string;
  description?: string;
  questions: ImportQuestion[];
}

export interface AppConfig {
  port: number;
  appName: string;
  adminUsername: string;
  questionTimeSec: number;
  defaultBaseScore: number;
  speedBonuses: number[];
  defaultSpeedBonus: number;
  maxPlayersPerSession: number;
  showLeaderboardAfterQuestion: boolean;
  allowLateJoin: boolean;
  streakBonusEnabled: boolean;
  streakMinimum: number;
  streakBonusBase: number;
}
