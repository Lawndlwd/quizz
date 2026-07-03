export interface GameSettings {
  baseScore?: number;
  streakBonusEnabled?: boolean;
  streakBonusBase?: number;
  showLeaderboardAfterQuestion?: boolean;
  jokersEnabled: { pass: boolean; fiftyFifty: boolean };
}

export interface AppConfig {
  port: number;
  appName: string;
  appSubtitle: string;
  jwtSecret: string;
  allowedDomain: string;
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
  /** Show the "next quiz maker" random picker on the final podium screen */
  chooseQuizMaker: boolean;
}

export type AuthRole = 'super_admin' | 'user';

export interface JwtPayload {
  id: number;
  role: AuthRole;
  username: string;
}

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'open_text'
  | 'multi_select'
  | 'closest_to'
  | 'fill_blank'
  | 'ordering'
  | 'geo';

/**
 * GeoGuessr-style config: the correct location as real-world coordinates.
 * Players drop a pin on a live map and score by great-circle distance.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  correctIndices?: number[];
  baseScore: number;
  timeSec?: number;
  imageUrl?: string;
  explanation?: string;
  rangeMin?: number;
  rangeMax?: number;
  questionType?: QuestionType;
  correctAnswer?: string;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
  /** fill_blank: accepted answers per blank, in order of the `___` markers. */
  blanks?: string[][];
  /** geo: the correct point on the map image (GeoGuessr-style). */
  geo?: GeoPoint;
  /** Free-form labels (difficulty/topic), e.g. ["easy", "geography"]. */
  tags?: string[];
}

export interface QuizImportPayload {
  title: string;
  description?: string;
  coverImage?: string;
  questions: QuizQuestion[];
}

/** Lobby intro shown to players on the waiting screen before the game starts. */
export interface QuizIntro {
  title: string;
  subtitle: string;
  coverImage: string | null;
  /** [tag, number of questions using it] pairs across the quiz. */
  tags: Array<[string, number]>;
  questionCount: number;
  /** Ordered [questionType, count] pairs present in this quiz. */
  typeCounts: Array<[QuestionType, number]>;
  totalTimeSec: number;
}

export interface DbQuiz {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  created_at: string;
  question_count?: number;
  owner_id: number | null;
  owner_kind: 'admin' | 'user';
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
  explanation: string | null;
  range_min: number | null;
  range_max: number | null;
  question_type: QuestionType;
  correct_answer: string | null;
  media_url: string | null;
  media_type: string | null;
  blanks: string | null; // JSON string[][], used for fill_blank
  geo: string | null; // JSON GeoPoint {x,y}, used for geo
  tags: string | null; // JSON string[] of free-form labels
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
  hosted_by_user_id: number | null;
}

export interface DbPlayer {
  id: number;
  session_id: number;
  username: string;
  total_score: number;
  joined_at: string;
}

export interface DbUser {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  is_banned: number;
  created_at: string;
  last_password_change: string | null;
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
