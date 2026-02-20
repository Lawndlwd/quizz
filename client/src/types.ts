export type QuestionType = 'multiple_choice' | 'true_false' | 'open_text';

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
  image_url?: string;
  question_type: QuestionType;
  correct_answer?: string;
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
  chosenText?: string | null;
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
  imageUrl?: string;
  questionType: QuestionType;
  correctAnswer?: string; // provided for open_text so player sees what to type (optional reveal)
}

export interface QuestionResults {
  questionId: number;
  questionText: string;
  correctIndex: number;
  correctAnswer: string | null;
  questionType: QuestionType;
  options: string[];
  leaderboard: LeaderboardEntry[];
  isLastQuestion: boolean;
  autoAdvanceSec: number;
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
  imageUrl?: string;
  questionType?: QuestionType;
  correctAnswer?: string;
}

export interface ImportPayload {
  title: string;
  description?: string;
  questions: ImportQuestion[];
}

export interface GameSettings {
  baseScore?: number;
  streakBonusEnabled?: boolean;
  streakBonusBase?: number;
  jokersEnabled: { pass: boolean; fiftyFifty: boolean };
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
  resultsAutoAdvanceSec: number;
}
