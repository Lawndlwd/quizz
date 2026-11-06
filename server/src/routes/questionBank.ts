import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type Request, type Response, Router } from 'express';
import { requireAuth } from '../middleware';

interface BankQuestion {
  category: string;
  difficulty: string;
  type: string;
  text: string;
  /** Multiple choice and true/false only. */
  correct?: string;
  incorrect?: string[];
  /** Map questions only. */
  textFr?: string;
  geo?: { lat: number; lng: number };
}

interface BankSource {
  source: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}

interface BankFile extends BankSource {
  questions: BankQuestion[];
}

interface Bank {
  sources: BankSource[];
  questions: BankQuestion[];
}

const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
const BANK_FILES = ['opentdb.json', 'geo-bank.json'];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

let bank: Bank | null = null;

/** Read on first use: most server runs never open the bank. */
function loadBank(): Bank | null {
  if (bank) return bank;
  try {
    const files = BANK_FILES.map(
      (name) => JSON.parse(readFileSync(path.join(ASSETS_DIR, name), 'utf8')) as BankFile,
    );
    bank = {
      sources: files.map(({ source, sourceUrl, license, licenseUrl }) => ({
        source,
        sourceUrl,
        license,
        licenseUrl,
      })),
      questions: files.flatMap((file) => file.questions),
    };
  } catch {
    return null;
  }
  return bank;
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const questionBankRouter = Router();

questionBankRouter.get('/meta', requireAuth, (_req: Request, res: Response) => {
  const data = loadBank();
  if (!data) {
    res.status(503).json({ error: 'Question bank is not available' });
    return;
  }
  const counts = new Map<string, number>();
  for (const q of data.questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  res.json({
    sources: data.sources,
    total: data.questions.length,
    categories: [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
});

questionBankRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const data = loadBank();
  if (!data) {
    res.status(503).json({ error: 'Question bank is not available' });
    return;
  }
  const { category, difficulty, type, search, random, limit } = req.query;
  const needle = typeof search === 'string' ? search.trim().toLowerCase() : '';
  const matches = data.questions
    .map((q, id) => ({ id, ...q }))
    .filter(
      (q) =>
        (typeof category !== 'string' || q.category === category) &&
        (typeof difficulty !== 'string' || q.difficulty === difficulty) &&
        (typeof type !== 'string' || q.type === type) &&
        (!needle || q.text.toLowerCase().includes(needle)),
    );
  const size = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const ordered = random === '1' ? shuffled(matches) : matches;
  res.json({ total: matches.length, questions: ordered.slice(0, size) });
});
