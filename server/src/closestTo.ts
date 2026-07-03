import { computeSpeedBonus } from './questionScoring';

export function parseIntegerInRange(
  value: string | undefined,
  min: number,
  max: number,
): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function closestToDistance(guess: number, correct: number): number {
  return Math.abs(guess - correct);
}

export function closestToMaxDistance(correct: number, min: number, max: number): number {
  return Math.max(correct - min, max - correct, 1);
}

export function scoreClosestToGuess(
  guess: number,
  correct: number,
  min: number,
  max: number,
  baseScore: number,
  correctCount: number,
  totalPlayers: number,
  speedBonusMax: number,
  speedBonusMin: number,
): { score: number; isCorrect: boolean; distance: number } {
  const distance = closestToDistance(guess, correct);
  const isCorrect = distance === 0;

  if (isCorrect) {
    const bonus = computeSpeedBonus(correctCount, totalPlayers, speedBonusMax, speedBonusMin);
    return {
      score: baseScore + bonus,
      isCorrect: true,
      distance,
    };
  }

  const maxDistance = closestToMaxDistance(correct, min, max);
  const ratio = 1 - distance / maxDistance;
  return {
    score: Math.max(0, Math.round(baseScore * ratio * 0.75)),
    isCorrect: false,
    distance,
  };
}
