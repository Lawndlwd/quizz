// TEMP demo harness for the quiz-maker picker — not for commit.
import { createRoot } from 'react-dom/client';
import { QuizMakerPicker } from './components/game/QuizMakerPicker';
import './styles/index.css';

const params = new URLSearchParams(location.search);
if (params.has('turbo')) {
  // Fast-forward: each animation frame advances fake time by 50ms (= sim's max catch-up).
  let fake = performance.now();
  performance.now = () => fake;
  window.requestAnimationFrame = (cb) =>
    window.setTimeout(() => {
      fake += 50;
      cb(fake);
    }, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}

const n = Number(params.get('n') ?? 20);
const emojis = ['🦊', '🐼', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🐧', '🦄'];
const players = Array.from({ length: n }, (_, i) => ({
  rank: i + 1,
  playerId: i + 1,
  username: `Player${i + 1}`,
  totalScore: 1000 - i * 40,
  avatar: emojis[i % emojis.length],
}));

const root = document.getElementById('root');
if (root) createRoot(root).render(<QuizMakerPicker players={players} />);
