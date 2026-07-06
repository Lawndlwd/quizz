import { validateClosestToQuestion, withKey, type QuestionWithKey } from '@/helpers';
import { normalizeQuestion } from '@/pages/admin/components/studio/questionOps';
import { THEME_IDS, type ImportPayload, type ThemeId } from '@/types';

/** Full import example — one question per supported type, with every optional field shown. */
export const QUIZ_IMPORT_EXAMPLE = {
  title: 'General Knowledge Quiz',
  description: 'A quick 12-question warm-up — geography, code, music & more',
  coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200',
  theme: 'space',
  questions: [
    {
      text: 'What is the capital of France?',
      options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
      correctIndex: 2,
      baseScore: 500,
      timeSec: 20,
      questionType: 'multiple_choice',
      imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
      explanation: 'Paris has been the capital of France since 987 AD.',
      tags: ['easy', 'geography'],
    },
    {
      text: 'What does this print?\n```js\nconst a = [1, 2, 3];\nconsole.log(a.map(x => x * 2));\n```',
      options: ['[1, 2, 3]', '[2, 4, 6]', '[1, 4, 9]', 'undefined'],
      correctIndex: 1,
      baseScore: 500,
      timeSec: 30,
      questionType: 'multiple_choice',
      explanation: 'map doubles each element, so `[1,2,3]` becomes `[2,4,6]`.',
      tags: ['code', 'javascript'],
    },
    {
      text: 'Which of these animals is a fox?',
      options: [
        'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600',
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
        'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600',
      ],
      correctIndex: 0,
      baseScore: 500,
      timeSec: 20,
      questionType: 'multiple_choice',
      explanation: 'A: fox · B: dog · C: cat · D: elephant',
      tags: ['images', 'animals'],
    },
    {
      text: 'Listen — who is the artist?',
      options: ['Rick Astley', 'Bruno Mars', 'The Weeknd', 'Ed Sheeran'],
      correctIndex: 0,
      baseScore: 500,
      timeSec: 30,
      questionType: 'multiple_choice',
      mediaType: 'audio',
      mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43',
      explanation: "Rick Astley — 'Never Gonna Give You Up' (starts at 0:43).",
      tags: ['music', 'fun'],
    },
    {
      text: 'The first-ever YouTube video — where was it filmed?',
      options: ['At the zoo', 'At a concert', 'In a car', 'At home'],
      correctIndex: 0,
      baseScore: 500,
      timeSec: 30,
      questionType: 'multiple_choice',
      mediaType: 'video',
      mediaUrl: 'https://youtu.be/jNQXAC9IVRw',
      explanation: "'Me at the zoo' — San Diego Zoo, 2005.",
      tags: ['trivia', 'fun'],
    },
    {
      text: 'Which of these are prime numbers?',
      options: ['2', '4', '7', '9'],
      correctIndex: 0,
      correctIndices: [0, 2],
      baseScore: 600,
      timeSec: 25,
      questionType: 'multi_select',
      explanation:
        'A prime number has exactly two divisors: 1 and itself. 2 and 7 qualify; 4 and 9 do not.',
      tags: ['math', 'medium'],
    },
    {
      text: 'The Earth is flat.',
      options: ['True', 'False'],
      correctIndex: 1,
      baseScore: 300,
      timeSec: 20,
      questionType: 'true_false',
      explanation:
        'Earth is an oblate spheroid — photos from space and centuries of science confirm this.',
      tags: ['science', 'easy'],
    },
    {
      text: 'What is 2 + 2?',
      options: [],
      correctIndex: 0,
      correctAnswer: '4',
      baseScore: 400,
      timeSec: 20,
      questionType: 'open_text',
      explanation: 'Basic addition: 2 + 2 = 4.',
      tags: ['math', 'easy'],
    },
    {
      text: 'How many countries are in the African Union?',
      options: [],
      correctIndex: 0,
      correctAnswer: '55',
      rangeMin: 1,
      rangeMax: 100,
      baseScore: 500,
      timeSec: 25,
      questionType: 'closest_to',
      explanation: 'The African Union has 55 member states.',
      tags: ['geography', 'medium'],
    },
    {
      text: 'The ___ is the largest planet, and ___ is closest to the Sun.',
      options: [],
      correctIndex: 0,
      questionType: 'fill_blank',
      blanks: [['Jupiter'], ['Mercury']],
      baseScore: 500,
      timeSec: 25,
      explanation: 'Partial credit is awarded per blank.',
      tags: ['science', 'space'],
    },
    {
      text: 'Put these events in chronological order (earliest first).',
      options: ['Fall of Rome', 'Renaissance', 'Moon landing', 'First iPhone'],
      correctIndex: 0,
      questionType: 'ordering',
      baseScore: 600,
      timeSec: 30,
      explanation: 'Score is proportional to how many items land in the right spot.',
      tags: ['history', 'medium'],
    },
    {
      text: 'Drop a pin on Paris.',
      options: [],
      correctIndex: 0,
      questionType: 'geo',
      geo: { lat: 48.8566, lng: 2.3522 },
      baseScore: 500,
      timeSec: 25,
      explanation: 'Closest pin wins — GeoGuessr-style, scored by real distance.',
      tags: ['geography', 'fun'],
    },
  ],
} satisfies ImportPayload;

export const QUIZ_IMPORT_JSON = JSON.stringify(QUIZ_IMPORT_EXAMPLE, null, 2);

/** Compact hint for the empty textarea. */
export const QUIZ_IMPORT_JSON_SHORT = `{
  "title": "My Quiz",
  "description": "Optional subtitle shown in the lobby",
  "coverImage": "https://example.com/cover.jpg",
  "theme": "default",
  "questions": [
    {
      "text": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctIndex": 2,
      "baseScore": 500,
      "timeSec": 20,
      "questionType": "multiple_choice"
    }
  ]
}`;

/** JSON Schema for the Quizz import format — copied by "Copy schema". */
const QUIZ_IMPORT_SCHEMA_OBJECT = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'QuizzImport',
  type: 'object',
  required: ['title', 'questions'],
  properties: {
    title: { type: 'string', description: 'Quiz name' },
    description: { type: 'string', description: 'Lobby subtitle' },
    coverImage: { type: 'string', description: 'Lobby cover image URL' },
    theme: {
      type: 'string',
      enum: THEME_IDS,
      default: 'default',
      description: 'Visual theme for game screens',
    },
    questions: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/question' },
    },
  },
  $defs: {
    question: {
      type: 'object',
      required: ['text', 'options', 'correctIndex'],
      properties: {
        text: {
          type: 'string',
          description: 'Question body; supports newlines, ```code blocks```, and `inline code`',
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Answer choices; image URLs render as pictures; for ordering list items in correct order; use [] for open_text, closest_to, fill_blank, geo',
        },
        correctIndex: {
          type: 'integer',
          minimum: 0,
          description: '0-based index of the correct option; use 0 when options is []',
        },
        correctIndices: {
          type: 'array',
          items: { type: 'integer', minimum: 0 },
          description: 'multi_select: indices of all correct options',
        },
        correctAnswer: {
          type: 'string',
          description: 'open_text: accepted answer; closest_to: numeric target as string',
        },
        questionType: {
          type: 'string',
          enum: [
            'multiple_choice',
            'multi_select',
            'true_false',
            'open_text',
            'closest_to',
            'fill_blank',
            'ordering',
            'geo',
          ],
          default: 'multiple_choice',
        },
        baseScore: { type: 'integer', default: 500, description: 'Points for a fully correct answer' },
        timeSec: { type: 'integer', default: 20, description: 'Seconds to answer' },
        imageUrl: { type: 'string', description: 'Question image URL' },
        explanation: { type: 'string', description: 'Shown on the results screen after reveal' },
        rangeMin: { type: 'number', description: 'closest_to slider minimum' },
        rangeMax: { type: 'number', description: 'closest_to slider maximum' },
        mediaUrl: {
          type: 'string',
          description: 'YouTube URL (supports ?t=SECONDS start offset)',
        },
        mediaType: {
          type: 'string',
          enum: ['audio', 'video'],
          description: 'audio: sound only; video: embedded player',
        },
        blanks: {
          type: 'array',
          items: { type: 'array', items: { type: 'string' } },
          description: 'fill_blank: accepted answers per ___ blank, case-insensitive',
        },
        geo: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
          description: 'geo: correct map location',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Free-form labels (topic, difficulty); shown in the lobby',
        },
      },
    },
  },
} as const;

export const QUIZ_IMPORT_SCHEMA = JSON.stringify(QUIZ_IMPORT_SCHEMA_OBJECT, null, 2);

/** Full example JSON — shown in the UI for reference, not included in schema copy. */
export const QUIZ_IMPORT_EXAMPLE_JSON = QUIZ_IMPORT_JSON;

/** AI task instructions only. */
const QUIZ_IMPORT_AI_INSTRUCTIONS = `I am building a quiz for Quizz (a Kahoot-style multiplayer quiz app).

Generate a complete quiz as JSON that matches the Quizz import schema exactly.

How to decide what to ask:
• If I attach or paste source material (document, PDF, lecture notes, slides, article, or any other media), extract questions from that content.
• If I do not provide source material, generate questions from the topic or instructions I write in this message.

Requirements:
1. Output ONLY valid JSON — no markdown code fences, no commentary before or after.
2. Use the exact field names and question types from the Quizz JSON schema below.
3. Include a clear title and description for the quiz lobby.
4. Add an explanation on each question (shown after the answer is revealed).
5. Add tags (topic, difficulty) on questions when helpful.
6. Mix question types where appropriate.
7. Double-check every correctIndex, correctIndices, correctAnswer, blanks, and geo coordinate.`;

/** Prompt + JSON schema — copied by "Copy prompt". */
export const QUIZ_IMPORT_AI_PROMPT = `${QUIZ_IMPORT_AI_INSTRUCTIONS}

=== JSON SCHEMA ===
${QUIZ_IMPORT_SCHEMA}`;

export type ParsedQuizImport =
  | { ok: true; payload: ImportPayload }
  | { ok: false; error: string };

/**
 * Parse and validate pasted quiz JSON before import or direct save.
 * Pass `requireTitle: false` for preview, where a top-level title is optional.
 */
export function parseQuizImportJson(
  text: string,
  { requireTitle = true }: { requireTitle?: boolean } = {},
): ParsedQuizImport {
  let payload: ImportPayload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON — please check the format' };
  }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return { ok: false, error: 'JSON must have a non-empty "questions" array' };
  }
  if (requireTitle && !payload.title) {
    return { ok: false, error: 'JSON must have "title" and a non-empty "questions" array' };
  }
  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i];
    if ((q.questionType ?? 'multiple_choice') === 'closest_to') {
      const err = validateClosestToQuestion(q, i);
      if (err) return { ok: false, error: err };
    }
  }
  return { ok: true, payload };
}

/** Convert a validated import payload into studio slide state. */
export function importPayloadToStudioDraft(payload: ImportPayload): {
  title: string;
  description: string;
  coverImage: string;
  theme: ThemeId;
  questions: QuestionWithKey[];
} {
  return {
    title: payload.title,
    description: payload.description ?? '',
    coverImage: payload.coverImage ?? '',
    theme: THEME_IDS.includes(payload.theme as ThemeId) ? (payload.theme as ThemeId) : 'default',
    questions: payload.questions.map((q) => withKey(normalizeQuestion(q))),
  };
}
