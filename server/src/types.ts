export interface GameSettings {
  baseScore?: number;
  streakBonusEnabled?: boolean;
  streakBonusBase?: number;
  jokersEnabled: { pass: boolean; fiftyFifty: boolean };
}

export interface AppConfig {
  port: number;
  appName: string;
  appSubtitle: string;
  jwtSecret: string;
  questionTimeSec: number;
  defaultBaseScore: number;
  speedBonusMax: number;
  speedBonusMin: number;
  maxPlayersPerSession: number;
  showLeaderboardAfterQuestion: boolean;
  streakBonusEnabled: boolean;
  streakMinimum: number;
  streakBonusBase: number;
  resultsAutoAdvanceSec: number;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'open_text' | 'multi_select';

export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  correctIndices?: number[];
  baseScore: number;
  timeSec?: number;
  imageUrl?: string;
  questionType?: QuestionType;
  correctAnswer?: string;
}

export interface QuizImportPayload {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

export interface DbQuiz {
  id: number;
  title: string;
  description: string;
  created_at: string;
  question_count?: number;
}

export interface DbQuestion {
  id: number;
  quiz_id: number;
  text: string;
  options: string; // JSON string
  correct_index: number;
  correct_indices: string | null; // JSON array string, used for multi_select
  base_score: number;
  time_sec: number;
  order_index: number;
  image_url: string | null;
  question_type: QuestionType;
  correct_answer: string | null;
}

export interface DbSession {
  id: number;
  quiz_id: number;
  pin: string;
  status: 'waiting' | 'active' | 'finished';
  current_question_index: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  quiz_title?: string;
}

export interface DbPlayer {
  id: number;
  session_id: number;
  username: string;
  total_score: number;
  joined_at: string;
}

export interface DbAnswer {
  id: number;
  player_id: number;
  session_id: number;
  question_id: number;
  chosen_index: number;
  chosen_indices: string | null; // JSON array string, used for multi_select
  is_correct: number;
  score: number;
  answer_order: number;
  answered_at: string;
  chosen_text: string | null;
}

// Socket payloads
export interface PlayerJoinPayload {
  pin: string;
  username: string;
}

export interface PlayerAnswerPayload {
  sessionId: number;
  questionId: number;
  chosenIndex: number;
  chosenIndices?: number[];
  chosenText?: string;
}

export interface QuestionResult {
  questionId: number;
  questionText: string;
  correctIndex: number;
  options: string[];
  players: Array<{
    username: string;
    chosenIndex: number | null;
    isCorrect: boolean;
    score: number;
    totalScore: number;
    rank: number;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalScore: number;
  playerId: number;
}
