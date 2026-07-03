/**
 * Player identity for the current game, persisted in sessionStorage so a
 * reload/reconnect can rejoin the same session.
 */

export interface StoredPlayerSession {
  playerId: string | null;
  sessionId: string | null;
  username: string | null;
  avatar: string | null;
  pin: string | null;
}

/** Normalize a game PIN: trim and strip all whitespace. */
export function cleanPin(pin: string): string {
  return pin.trim().replace(/\s/g, '');
}

export function loadPlayerSession(): StoredPlayerSession {
  return {
    playerId: sessionStorage.getItem('playerId'),
    sessionId: sessionStorage.getItem('sessionId'),
    username: sessionStorage.getItem('username'),
    avatar: sessionStorage.getItem('avatar'),
    pin: sessionStorage.getItem('pin'),
  };
}

/**
 * Persist the joined-player session. `username` falls back to the stored
 * value when missing, and `avatar`/`pin` fall back when empty — existing
 * values are never blindly overwritten with blanks.
 */
export function savePlayerSession(session: {
  playerId: number;
  sessionId: number;
  username?: string | null;
  avatar?: string;
  pin?: string;
}): void {
  sessionStorage.setItem('playerId', String(session.playerId));
  sessionStorage.setItem('sessionId', String(session.sessionId));
  sessionStorage.setItem('username', session.username ?? sessionStorage.getItem('username') ?? '');
  sessionStorage.setItem('avatar', session.avatar || sessionStorage.getItem('avatar') || '');
  sessionStorage.setItem('pin', session.pin || sessionStorage.getItem('pin') || '');
}

/**
 * Clear the identifiers tying the player to a specific game. `username` and
 * `avatar` are intentionally kept so the next join is pre-filled.
 */
export function clearPlayerSession(): void {
  sessionStorage.removeItem('playerId');
  sessionStorage.removeItem('sessionId');
  sessionStorage.removeItem('pin');
}
