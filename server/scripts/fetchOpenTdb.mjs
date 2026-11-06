// Downloads the verified Open Trivia DB questions to server/assets/opentdb.json.
// Run with: node server/scripts/fetchOpenTdb.mjs   (takes about 15 minutes: one request per 5s)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://opentdb.com';
const OUT = path.join(import.meta.dirname, '..', 'assets', 'opentdb.json');
const WAIT_MS = 5500;
const PAGE = 50;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decode = (s) => Buffer.from(s, 'base64').toString('utf8');
const getJson = async (url) => {
  const res = await fetch(url);
  if (res.status !== 200 && res.status !== 429) throw new Error(`${res.status} from ${url}`);
  return res.status === 429 ? { response_code: 5 } : res.json();
};

const { token } = await getJson(`${API}/api_token.php?command=request`);
const { trivia_categories: categories } = await getJson(`${API}/api_category.php`);
const seen = new Set();
const questions = [];

for (const category of categories) {
  await sleep(WAIT_MS);
  const counts = await getJson(`${API}/api_count.php?category=${category.id}`);
  let left = counts.category_question_count.total_question_count;
  while (left > 0) {
    await sleep(WAIT_MS);
    const amount = Math.min(PAGE, left);
    const url = `${API}/api.php?amount=${amount}&category=${category.id}&encode=base64&token=${token}`;
    const data = await getJson(url);
    if (data.response_code === 5) continue; // rate limited: wait and retry
    if (data.response_code !== 0) break; // token exhausted for this category
    for (const q of data.results) {
      const text = decode(q.question);
      if (seen.has(text)) continue;
      seen.add(text);
      questions.push({
        category: category.name,
        difficulty: decode(q.difficulty),
        type: decode(q.type),
        text,
        correct: decode(q.correct_answer),
        incorrect: q.incorrect_answers.map(decode),
      });
    }
    left -= amount;
    console.log(`${category.name}: ${left} left, ${questions.length} total`);
  }
}

await writeFile(
  OUT,
  `${JSON.stringify({
    source: 'Open Trivia DB',
    sourceUrl: 'https://opentdb.com',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    fetchedAt: new Date().toISOString().slice(0, 10),
    questions,
  })}\n`,
);
console.log(`Wrote ${questions.length} questions to ${OUT}`);
