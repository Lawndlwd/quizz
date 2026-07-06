export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'open_text'
  | 'multi_select'
  | 'closest_to'
  | 'fill_blank'
  | 'ordering'
  | 'geo';

/** GeoGuessr-style correct location as real-world coordinates. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Visual/audio theme applied to a quiz's game screens. */
export type ThemeId = 'default' | 'neon' | 'paper' | 'space' | 'retro';

export const THEME_IDS: ThemeId[] = ['default', 'neon', 'paper', 'space', 'retro'];

export type AuthRole = 'super_admin' | 'user';

export interface AuthUser {
  id: number;
  email: string | null;
  username: string;
  playDisplayName?: string | null;
  playAvatar?: string | null;
}

export interface UserAccount {
  id: number;
  email: string;
  username: string;
  is_banned: number;
  created_at: string;
  last_password_change: string | null;
  quiz_count: number;
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  cover_image?: string | null;
  theme?: ThemeId | null;
  created_at: string;
  question_count: number;
  owner_id?: number | null;
  owner_kind?: 'admin' | 'user';
  owner_email?: string | null;
  owner_username?: string | null;
}

export interface Question {
  id: number;
  quiz_id: number;
  text: string;
  options: string[];
  correct_index: number;
  correct_indices?: number[];
  base_score: number;
  time_sec: number;
  order_index: number;
  image_url?: string;
  explanation?: string;
  range_min?: number;
  range_max?: number;
  question_type: QuestionType;
  correct_answer?: string;
  media_url?: string;
  media_type?: 'audio' | 'video';
  blanks?: string[][] | null;
  geo?: GeoPoint | null;
  tags?: string[] | null;
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
  hosted_by_user_id?: number | null;
  host_email?: string | null;
  host_username?: string | null;
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
  chosenIndices?: number[] | null;
  chosenText?: string | null;
  chosenNumber?: number | null;
  /** ordering: the items in the order this player arranged them. */
  chosenOrder?: string[] | null;
  /** fill_blank: this player's entry per blank. */
  chosenBlanks?: string[] | null;
  /** geo: where this player dropped their pin (lat/lng). */
  chosenPoint?: { lat: number; lng: number } | null;
  distance?: number | null;
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
  /** Remaining seconds — only present on reconnect; absent means use timeSec */
  timeRemaining?: number;
  imageUrl?: string;
  explanation?: string;
  questionType: QuestionType;
  correctAnswer?: string;
  rangeMin?: number;
  rangeMax?: number;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
  /** fill_blank: number of blanks the player must fill. */
  blankCount?: number;
}

export interface QuestionResults {
  questionId: number;
  questionText: string;
  correctIndex: number;
  correctIndices?: number[];
  correctAnswer: string | null;
  /** fill_blank: one representative correct answer per blank. */
  correctBlanks?: string[];
  /** ordering: the items in their correct order. */
  correctOrder?: string[];
  /** geo: the correct point + the map image it applies to. */
  geo?: GeoPoint;
  imageUrl?: string;
  questionType: QuestionType;
  options: string[];
  /** Per-option vote counts (option-based question types only) */
  answerDistribution?: number[];
  explanation?: string;
  rangeMin?: number;
  rangeMax?: number;
  closestRanking?: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  showLeaderboard?: boolean;
  isLastQuestion: boolean;
  autoAdvanceSec: number;
}

/** Lobby/host view of a connected player. */
export interface PlayerInfo {
  id: number;
  username: string;
  totalScore: number;
  avatar?: string;
}

/** Host-only preview of the upcoming question between rounds. */
export interface NextPreview {
  hasNext: boolean;
  index: number;
  total: number;
  text: string | null;
  mediaType: 'audio' | 'video' | null;
}

/** One row of the end-of-game leaderboard. */
export interface FinalLeaderboardEntry {
  rank: number;
  username: string;
  totalScore: number;
  avatar?: string;
}

export interface GameEndedPayload {
  leaderboard: FinalLeaderboardEntry[];
}

export interface PlayHistoryEntry {
  session_id: number;
  pin: string;
  quiz_title: string;
  status: Session['status'];
  total_score: number;
  player_count: number;
  rank: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface ImportQuestion {
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
  blanks?: string[][];
  geo?: GeoPoint;
  tags?: string[];
}

export interface ImportPayload {
  title: string;
  description?: string;
  coverImage?: string;
  theme?: ThemeId;
  questions: ImportQuestion[];
}

/** Lobby intro shown to players on the waiting screen before the game starts. */
export interface QuizIntro {
  title: string;
  subtitle: string;
  coverImage: string | null;
  tags: Array<[string, number]>;
  questionCount: number;
  typeCounts: Array<[QuestionType, number]>;
  totalTimeSec: number;
  theme?: ThemeId;
}

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
  allowedDomain?: string;
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
  chooseQuizMaker: boolean;
}
