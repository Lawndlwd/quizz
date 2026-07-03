import type { Server as SocketServer } from 'socket.io';
import { db, getRankedPlayers } from '../db';
import {
  type ActiveSession,
  activeSessions,
  buildLeaderboard,
  getStateBySessionId,
  sessionIdToPin,
} from './gameState';

let io: SocketServer | null = null;

export function setSocketIo(server: SocketServer): void {
  io = server;
}

function clearSessionTimers(state: ActiveSession): void {
  if (state.questionTimer) {
    clearTimeout(state.questionTimer);
    state.questionTimer = null;
  }
  if (state.resultsTimer) {
    clearTimeout(state.resultsTimer);
    state.resultsTimer = null;
  }
}

export async function endActiveSession(state: ActiveSession): Promise<void> {
  if (!io) return;

  clearSessionTimers(state);
  state.status = 'finished';

  await db.run(
    "UPDATE sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ?",
    state.sessionId,
  );

  const players = await getRankedPlayers(state.sessionId);
  const finalLeaderboard = buildLeaderboard(players, state.playerAvatars);

  io.to(`session:${state.sessionId}`).emit('game:ended', { leaderboard: finalLeaderboard });

  activeSessions.delete(state.pin);
  sessionIdToPin.delete(state.sessionId);
}

/** Ends a live in-memory session and/or marks the DB row finished. */
export async function terminateSessionById(sessionId: number): Promise<void> {
  const state = getStateBySessionId(sessionId);

  if (state) {
    await endActiveSession(state);
    return;
  }

  await db.run(
    "UPDATE sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ? AND status != 'finished'",
    sessionId,
  );
}
