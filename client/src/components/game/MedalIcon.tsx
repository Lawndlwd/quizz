import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Gold / silver / bronze tint per podium place — single source for all screens. */
export const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-300',
  3: 'text-amber-600',
};

/** Podium medal icon; renders nothing for places without a medal. */
export function MedalIcon({ place, className }: { place: number; className?: string }) {
  const color = MEDAL_COLORS[place];
  if (!color) return null;
  return <Medal className={cn(color, className)} />;
}
