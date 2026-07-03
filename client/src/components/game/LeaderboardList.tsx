import type { ReactNode } from 'react';
import { AvatarDisplay } from '@/components/AvatarPicker';
import type { FinalLeaderboardEntry, LeaderboardEntry } from '@/types';

export const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Props {
  entries: LeaderboardEntry[];
  limit?: number;
  highlightPlayerId?: number;
  highlightUsername?: string;
  showQuestionScore?: boolean;
  animate?: boolean;
  renderActions?: (entry: LeaderboardEntry) => ReactNode;
}

export function LeaderboardList({
  entries,
  limit,
  highlightPlayerId,
  highlightUsername,
  showQuestionScore = false,
  animate = false,
  renderActions,
}: Props) {
  const list = limit ? entries.slice(0, limit) : entries;

  return (
    <ul className="leaderboard">
      {list.map((e, idx) => {
        const isHighlighted =
          (highlightPlayerId !== undefined && e.playerId === highlightPlayerId) ||
          (highlightUsername !== undefined && e.username === highlightUsername);
        return (
          <li
            key={e.playerId}
            className={`lb-item rank-${Math.min(e.rank, 4)}${animate ? ' lb-slide' : ''}`}
            style={{
              ...(animate ? { animationDelay: `${idx * 0.05}s` } : {}),
              ...(isHighlighted
                ? { borderColor: 'var(--accent2)', background: 'rgba(96,165,250,.08)' }
                : {}),
            }}
          >
            <div className="lb-rank">{MEDALS[e.rank] ?? e.rank}</div>
            <AvatarDisplay avatar={e.avatar} size={30} />
            <div className="lb-name">
              {e.username}
              {isHighlighted ? ' 👈' : ''}
            </div>
            {showQuestionScore && e.questionScore > 0 && (
              <span className="lb-delta">+{e.questionScore}</span>
            )}
            {showQuestionScore &&
              e.chosenIndex !== null &&
              e.chosenIndex !== -1 &&
              !e.isCorrect && <span className="lb-delta wrong">✗</span>}
            <div className="lb-score">{e.totalScore.toLocaleString()}</div>
            {renderActions?.(e)}
          </li>
        );
      })}
    </ul>
  );
}

interface ClosestProps {
  entries: LeaderboardEntry[];
  limit?: number;
  highlightPlayerId?: number;
  animate?: boolean;
}

export function ClosestGuessesList({
  entries,
  limit = 8,
  highlightPlayerId,
  animate = false,
}: ClosestProps) {
  return (
    <ul className="leaderboard">
      {entries.slice(0, limit).map((e, idx) => (
        <li
          key={e.playerId}
          className={`lb-item${animate ? ' lb-slide' : ''}${highlightPlayerId === e.playerId ? ' ring-1 ring-blue-400' : ''}`}
          style={animate ? { animationDelay: `${idx * 0.05}s` } : undefined}
        >
          <div className="lb-rank">{idx + 1}</div>
          <AvatarDisplay avatar={e.avatar} size={30} />
          <div className="lb-name">
            {e.username}
            {highlightPlayerId === e.playerId ? ' 👈' : ''}
          </div>
          <span className="text-sm text-muted-foreground">
            {e.chosenNumber}
            {e.distance != null && e.distance > 0 ? ` (±${e.distance})` : ' ✓'}
          </span>
          {e.questionScore > 0 && <span className="lb-delta">+{e.questionScore}</span>}
        </li>
      ))}
    </ul>
  );
}

interface FinalProps {
  entries: FinalLeaderboardEntry[];
  highlightUsername?: string;
  footer?: ReactNode;
}

export function FinalLeaderboard({ entries, highlightUsername, footer }: FinalProps) {
  return (
    <>
      <ul className="leaderboard">
        {entries.map((e) => (
          <li
            key={e.rank}
            className={`lb-item rank-${Math.min(e.rank, 4)}`}
            style={
              highlightUsername && e.username === highlightUsername
                ? { borderColor: 'var(--accent2)', background: 'rgba(96,165,250,.08)' }
                : {}
            }
          >
            <div className="lb-rank">{MEDALS[e.rank] ?? e.rank}</div>
            <AvatarDisplay avatar={e.avatar} size={30} />
            <div className="lb-name">
              {e.username}
              {highlightUsername && e.username === highlightUsername ? ' 👈' : ''}
            </div>
            <div className="lb-score">{e.totalScore.toLocaleString()}</div>
          </li>
        ))}
      </ul>
      {footer}
    </>
  );
}
