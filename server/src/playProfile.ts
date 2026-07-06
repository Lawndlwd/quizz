import { db } from './db';
import { verifyToken } from './middleware';

export async function savePlayProfile(
  userId: number,
  displayName: string,
  avatar?: string,
): Promise<void> {
  await db.run(
    'UPDATE users SET play_display_name = ?, play_avatar = ? WHERE id = ?',
    displayName,
    avatar?.trim() || null,
    userId,
  );
}

/**
 * Seed a logged-in user's play defaults from an ad-hoc join, filling only
 * columns that are still NULL. Never clobbers a name/avatar the user already
 * configured in Settings.
 */
export async function seedPlayProfile(
  userId: number,
  displayName: string,
  avatar?: string,
): Promise<void> {
  await db.run(
    'UPDATE users SET play_display_name = COALESCE(play_display_name, ?), play_avatar = COALESCE(play_avatar, ?) WHERE id = ?',
    displayName,
    avatar?.trim() || null,
    userId,
  );
}

/** Resolve a logged-in user from an optional JWT passed over the socket. */
export function resolveUserFromAuthToken(authToken?: string): number | null {
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!payload || payload.role !== 'user') return null;
  return payload.id;
}

export async function linkPlayerToUser(
  playerId: number,
  userId: number,
  avatar?: string,
): Promise<void> {
  await db.run(
    'UPDATE players SET user_id = ?, avatar = COALESCE(?, avatar) WHERE id = ?',
    userId,
    avatar?.trim() || null,
    playerId,
  );
}
