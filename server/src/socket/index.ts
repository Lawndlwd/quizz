import type { Server as HttpServer } from 'node:http';
import { type Socket, Server as SocketServer } from 'socket.io';
import { parseIntegerInRange, scoreClosestToGuess } from '../closestTo';
import { config } from '../config';
import { db, getRankedPlayers } from '../db';
import { verifyToken } from '../middleware';
import { linkPlayerToUser, resolveUserFromAuthToken, seedPlayProfile } from '../playProfile';
import {
  computeSpeedBonus,
  geoDistanceKm,
  matchFillBlank,
  parseLatLng,
  parseStringArray,
  scoreGeo,
  scoreOrdering,
} from '../questionScoring';
import { invertPerm, seededPerm, seededShuffle } from '../shuffle';
import type {
  DbPlayer,
  DbQuestion,
  DbQuiz,
  DbSession,
  GameSettings,
  JwtPayload,
  QuestionType,
  QuizIntro,
} from '../types';
import { normalizeImageUrl } from '../utils';
import {
  type ActiveSession,
  activeSessions,
  buildLeaderboard,
  createActiveSession,
  getOrCreateAnsweredSet,
  getStateBySessionId,
  sessionIdToPin,
} from './gameState';
import { endActiveSession, setSocketIo } from './sessionLifecycle';

/**
 * Verify a socket admin token and check that the bearer may operate on the
 * given session. Returns the JWT payload on success, or null on failure.
 * Super admin (id: 0) always passes; users must own the session
 * (hosted_by_user_id === their id).
 */
async function authorizeAdmin(token: string, sessionId: number): Promise<JwtPayload | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.role === 'super_admin') return payload;
  const session = await db.get<DbSession>(
    'SELECT hosted_by_user_id FROM sessions WHERE id = ?',
    sessionId,
  );
  if (!session) return null;
  if (session.hosted_by_user_id !== payload.id) return null;
  return payload;
}

/**
 * Guard for admin:* socket handlers: authorize the token for the session,
 * emitting the Unauthorized error itself. Returns the payload or null.
 */
async function requireAdminAuth(
  socket: Socket,
  token: string,
  sessionId: number,
): Promise<JwtPayload | null> {
  const auth = await authorizeAdmin(token, sessionId);
  if (!auth) {
    socket.emit('error', { message: 'Unauthorized' });
    return null;
  }
  return auth;
}

/** Allowed lobby reaction emojis — mirrors the client button set. */
const REACTION_EMOJIS = ['👍', '😂', '🔥', '❤️', '🎉', '😮'];
const REACTION_COOLDOWN_MS = 1500;

export function setupSockets(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, { cors: { origin: '*' } });
  setSocketIo(io);

  // Per-socket lobby-reaction rate limiting (cleared on disconnect).
  const reactionCooldowns = new Map<string, number>();

  io.on('connection', (socket: Socket) => {
    // ─── Admin join ───────────────────────────────────────────────────────────
    socket.on('admin:join-session', async (data: { sessionId: number; token: string }) => {
      const auth = await requireAdminAuth(socket, data.token, data.sessionId);
      if (!auth) return;

      const session = await db.get<DbSession>(
        'SELECT * FROM sessions WHERE id = ?',
        data.sessionId,
      );
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const questions = await db.all<DbQuestion[]>(
        'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
        session.quiz_id,
      );
      const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', session.quiz_id);

      let state = activeSessions.get(session.pin);
      if (!state) {
        state = createActiveSession(session, questions, socket.id);
        activeSessions.set(session.pin, state);
        sessionIdToPin.set(session.id, session.pin);
      } else {
        state.adminSocketId = socket.id;
      }

      socket.join(`session:${session.id}`);
      socket.join(`admin:${session.id}`);

      // Send current players to admin
      const players = await getRankedPlayers(session.id);

      socket.emit('session:state', {
        session,
        players: players.map((p) => ({
          id: p.id,
          username: p.username,
          totalScore: p.total_score,
          avatar: state?.playerAvatars?.get(p.id),
        })),
        questionCount: questions.length,
        gameSettings: state?.gameSettings ?? { jokersEnabled: { pass: false, fiftyFifty: false } },
        quizIntro: quiz ? buildQuizIntro(quiz, questions) : undefined,
      });

      // Restore the host's in-game view on reload / resume. Without this the
      // client sets phase='question' from session:state but never receives the
      // question payload → blank page.
      if (session.status === 'finished') {
        socket.emit('game:ended', {
          leaderboard: buildLeaderboard(players, state.playerAvatars),
        });
      } else if (session.status === 'active') {
        if (state.questionPhase === 'results' && state.lastResultsPayload) {
          restoreResultsPhase(socket, state);
          emitNextPreview(io, state);
        } else {
          // Live question (in memory) or cold state after a server restart —
          // rebuild from the DB index so the host sees the question.
          let payload: Record<string, unknown> | null;
          if (state.questionPhase === 'question' && state.lastQuestionPayload) {
            payload = state.lastQuestionPayload as Record<string, unknown>;
          } else {
            payload = coldRebuildQuestion(io, state, session);
          }
          const currentQ = state.questions[state.currentQuestionIndex];
          if (payload && currentQ) {
            restoreQuestionPhase(socket, state, payload);
            const answered = state.answeredPlayers.get(currentQ.id);
            socket.emit('game:answer-received', {
              answeredCount: answered?.size ?? 0,
              totalPlayers: state.playerSockets.size,
            });
          }
        }
      }
    });

    // ─── Admin: start game ────────────────────────────────────────────────────
    socket.on(
      'admin:start-game',
      async (data: { sessionId: number; token: string; gameSettings?: GameSettings }) => {
        const auth = await requireAdminAuth(socket, data.token, data.sessionId);
        if (!auth) return;

        const state = getStateBySessionId(data.sessionId);
        if (!state) {
          socket.emit('error', { message: 'Session not active' });
          return;
        }
        if (state.status !== 'waiting') {
          socket.emit('error', { message: 'Game already started' });
          return;
        }

        if (data.gameSettings) {
          state.gameSettings = {
            ...data.gameSettings,
            showLeaderboardAfterQuestion: config.showLeaderboardAfterQuestion,
          };
          state.playerJokersUsed = new Map();
          state.playerFiftyFiftyIndices = new Map();
        }

        state.status = 'active';
        await db.run(
          "UPDATE sessions SET status = 'active', started_at = datetime('now') WHERE id = ?",
          data.sessionId,
        );

        io.to(`session:${data.sessionId}`).emit('game:started', {
          jokersEnabled: state.gameSettings.jokersEnabled,
        });

        // 3-2-1 countdown before first question
        io.to(`session:${data.sessionId}`).emit('game:countdown', { seconds: 3 });
        setTimeout(() => {
          sendQuestion(io, state, 0);
        }, 4000);
      },
    );

    // ─── Admin: next question ─────────────────────────────────────────────────
    socket.on('admin:next-question', async (data: { sessionId: number; token: string }) => {
      const auth = await requireAdminAuth(socket, data.token, data.sessionId);
      if (!auth) return;

      const state = getStateBySessionId(data.sessionId);
      if (!state || state.status !== 'active') return;

      // Cancel auto-advance timer if admin manually advances
      if (state.resultsTimer) {
        clearTimeout(state.resultsTimer);
        state.resultsTimer = null;
      }

      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        endGame(io, state);
      } else {
        sendQuestion(io, state, nextIndex);
      }
    });

    // ─── Admin: finish question early ─────────────────────────────────────────
    socket.on('admin:finish-question', async (data: { sessionId: number; token: string }) => {
      const auth = await requireAdminAuth(socket, data.token, data.sessionId);
      if (!auth) return;

      const state = getStateBySessionId(data.sessionId);
      if (!state || state.status !== 'active' || state.questionPhase !== 'question') return;

      if (state.questionTimer) {
        clearTimeout(state.questionTimer);
        state.questionTimer = null;
      }

      const currentQ = state.questions[state.currentQuestionIndex];
      if (currentQ) {
        showResults(io, state, currentQ.id);
      }
    });

    // ─── Admin: end game ──────────────────────────────────────────────────────
    socket.on('admin:end-game', async (data: { sessionId: number; token: string }) => {
      const auth = await requireAdminAuth(socket, data.token, data.sessionId);
      if (!auth) return;

      const state = getStateBySessionId(data.sessionId);
      if (!state) return;
      endGame(io, state);
    });

    // ─── Admin: remove points ─────────────────────────────────────────────────
    socket.on(
      'admin:remove-points',
      async (data: { sessionId: number; token: string; playerId: number; questionId: number }) => {
        const auth = await requireAdminAuth(socket, data.token, data.sessionId);
        if (!auth) return;

        const { sessionId, playerId, questionId } = data;

        const answer = await db.get<{ score: number }>(
          'SELECT score FROM answers WHERE player_id = ? AND question_id = ? AND session_id = ?',
          playerId,
          questionId,
          sessionId,
        );

        if (!answer) {
          socket.emit('error', { message: 'Answer not found' });
          return;
        }

        const removedScore = answer.score;

        // Floor total_score at 0
        await db.run(
          'UPDATE players SET total_score = MAX(total_score - ?, 0) WHERE id = ?',
          removedScore,
          playerId,
        );

        await db.run(
          'UPDATE answers SET score = 0 WHERE player_id = ? AND question_id = ? AND session_id = ?',
          playerId,
          questionId,
          sessionId,
        );

        const player = await db.get<DbPlayer>('SELECT * FROM players WHERE id = ?', playerId);
        const newTotalScore = player?.total_score ?? 0;

        socket.emit('admin:points-removed', {
          playerId,
          questionId,
          removedScore,
          newTotalScore,
        });

        // Broadcast updated leaderboard to session
        const state = getStateBySessionId(sessionId);
        if (state) {
          const players = await getRankedPlayers(sessionId);
          const leaderboard = buildLeaderboard(players, state.playerAvatars);
          io.to(`session:${sessionId}`).emit('game:leaderboard-update', { leaderboard });
        }
      },
    );

    // ─── Admin: get player answers ──────────────────────────────────────────────
    socket.on(
      'admin:get-player-answers',
      async (data: { sessionId: number; token: string; playerId: number }) => {
        const auth = await requireAdminAuth(socket, data.token, data.sessionId);
        if (!auth) return;

        const { sessionId, playerId } = data;

        const answers = await db.all<
          Array<{
            question_id: number;
            score: number;
            is_correct: number;
            text: string;
          }>
        >(
          `SELECT a.question_id, a.score, a.is_correct, q.text
           FROM answers a
           JOIN questions q ON q.id = a.question_id
           WHERE a.player_id = ? AND a.session_id = ?
           ORDER BY q.order_index`,
          playerId,
          sessionId,
        );

        socket.emit('admin:player-answers', {
          playerId,
          answers: answers.map((a) => ({
            questionId: a.question_id,
            questionText: a.text,
            score: a.score,
            isCorrect: a.is_correct === 1,
          })),
        });
      },
    );

    // ─── Player: join (also handles reconnection) ─────────────────────────────
    socket.on(
      'player:join',
      async (data: {
        pin: string;
        username: string;
        avatar?: string;
        playerId?: number;
        authToken?: string;
      }) => {
        const { pin, username, avatar, authToken } = data;
        const linkedUserId = resolveUserFromAuthToken(authToken);

        const session = await db.get<DbSession>('SELECT * FROM sessions WHERE pin = ?', pin);
        if (!session) {
          socket.emit('player:error', { message: 'Invalid PIN' });
          return;
        }

        if (session.status === 'finished') {
          socket.emit('player:error', { message: 'Game has ended' });
          return;
        }

        if (!username?.trim()) {
          socket.emit('player:error', { message: 'Username required' });
          return;
        }
        const cleanName = username.trim().slice(0, 24);

        const quiz = await db.get<DbQuiz>('SELECT * FROM quizzes WHERE id = ?', session.quiz_id);

        // Reconnect: match by playerId (reload) or username (same device)
        let existing: DbPlayer | undefined;
        if (data.playerId) {
          existing = await db.get<DbPlayer>(
            'SELECT * FROM players WHERE id = ? AND session_id = ?',
            data.playerId,
            session.id,
          );
        }
        if (!existing) {
          existing = await db.get<DbPlayer>(
            'SELECT * FROM players WHERE session_id = ? AND username = ?',
            session.id,
            cleanName,
          );
        }

        if (existing) {
          // ── Reconnect path ────────────────────────────────────────────────────
          const playerId = existing.id;

          if (linkedUserId) {
            await linkPlayerToUser(playerId, linkedUserId, avatar);
            await seedPlayProfile(linkedUserId, cleanName, avatar);
          } else if (avatar) {
            await db.run('UPDATE players SET avatar = ? WHERE id = ?', avatar, playerId);
          }

          socket.join(`session:${session.id}`);
          socket.join(`player:${playerId}`);

          let state = activeSessions.get(pin);
          if (!state) {
            const questions = await db.all<DbQuestion[]>(
              'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
              session.quiz_id,
            );
            state = createActiveSession(session, questions);
            activeSessions.set(pin, state);
            sessionIdToPin.set(session.id, pin);
          } else {
            state.status = session.status as ActiveSession['status'];
          }

          // Remove old socket mapping
          const oldSocketId = state.playerSockets.get(playerId);
          if (oldSocketId) state.socketPlayers.delete(oldSocketId);
          state.playerSockets.set(playerId, socket.id);
          state.socketPlayers.set(socket.id, playerId);
          if (avatar) state.playerAvatars.set(playerId, avatar);

          const players = await db.all<DbPlayer[]>(
            'SELECT * FROM players WHERE session_id = ?',
            session.id,
          );

          socket.emit('player:joined', {
            playerId,
            username: cleanName,
            sessionId: session.id,
            status: session.status,
            playerCount: players.length,
            avatar: state?.playerAvatars.get(playerId) ?? avatar,
            reconnected: true,
            quizIntro: quiz ? buildQuizIntro(quiz, state.questions) : undefined,
          });

          // Notify admin that player is back
          io.to(`admin:${session.id}`).emit('game:player-joined', {
            playerId,
            username: cleanName,
            playerCount: state?.playerSockets.size,
            avatar: state?.playerAvatars.get(playerId) ?? avatar,
          });

          await emitReconnectGameState(socket, io, state, session, playerId);
          return;
        }

        // ── New player join path ───────────────────────────────────────────────
        const playerCount = await db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM players WHERE session_id = ?',
          session.id,
        );
        if ((playerCount?.count ?? 0) >= config.maxPlayersPerSession) {
          socket.emit('player:error', { message: 'Session is full' });
          return;
        }

        const result = await db.run(
          'INSERT INTO players (session_id, username, user_id, avatar) VALUES (?, ?, ?, ?)',
          session.id,
          cleanName,
          linkedUserId,
          avatar?.trim() || null,
        );
        const playerId = Number(result.lastID);

        if (linkedUserId) {
          await seedPlayProfile(linkedUserId, cleanName, avatar);
        }

        socket.join(`session:${session.id}`);
        socket.join(`player:${playerId}`);

        let state = activeSessions.get(pin);
        if (!state) {
          const questions = await db.all<DbQuestion[]>(
            'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
            session.quiz_id,
          );
          state = createActiveSession(session, questions);
          activeSessions.set(pin, state);
          sessionIdToPin.set(session.id, pin);
        } else {
          state.status = session.status as ActiveSession['status'];
        }

        state.playerSockets.set(playerId, socket.id);
        state.socketPlayers.set(socket.id, playerId);
        if (avatar) state.playerAvatars.set(playerId, avatar);

        const players = await db.all<DbPlayer[]>(
          'SELECT * FROM players WHERE session_id = ?',
          session.id,
        );

        socket.emit('player:joined', {
          playerId,
          username: cleanName,
          sessionId: session.id,
          status: session.status,
          playerCount: players.length,
          avatar,
          quizIntro: quiz ? buildQuizIntro(quiz, state.questions) : undefined,
        });

        io.to(`admin:${session.id}`).emit('game:player-joined', {
          playerId,
          username: cleanName,
          playerCount: players.length,
          avatar,
        });

        if (session.status === 'active') {
          await emitReconnectGameState(socket, io, state, session, playerId);
        }
      },
    );

    // ─── Player: answer ───────────────────────────────────────────────────────
    socket.on(
      'player:answer',
      async (data: {
        sessionId: number;
        questionId: number;
        chosenIndex: number;
        chosenIndices?: number[];
        playerId: number;
        chosenText?: string;
      }) => {
        const { sessionId, questionId, chosenIndex, chosenIndices, playerId, chosenText } = data;

        const state = getStateBySessionId(sessionId);
        if (!state || state.status !== 'active') return;
        // Reject answers once results are revealed — otherwise a player can wait
        // for the correct answer broadcast, then submit it for full points.
        if (state.questionPhase !== 'question') return;
        if (state.socketPlayers.get(socket.id) !== playerId) return;

        const currentQ = state.questions[state.currentQuestionIndex];
        if (!currentQ || currentQ.id !== questionId) return;

        // Prevent duplicate answer
        const answered = getOrCreateAnsweredSet(state, questionId);
        if (answered.has(playerId)) return;
        answered.add(playerId);

        // Determine correctness and score based on question type
        let isCorrect = false;
        let score = 0;
        let newStreak = 0;

        if (currentQ.question_type === 'closest_to') {
          const min = currentQ.range_min ?? 0;
          const max = currentQ.range_max ?? 100;
          const correct = Number.parseInt(currentQ.correct_answer ?? '', 10);
          const guess = parseIntegerInRange(chosenText, min, max);
          if (guess === null || Number.isNaN(correct)) return;

          const correctCount = state.correctAnswerCount.get(questionId) ?? 0;
          const scored = scoreClosestToGuess(
            guess,
            correct,
            min,
            max,
            currentQ.base_score,
            correctCount,
            Math.max(state.playerSockets.size, 1),
            config.speedBonusMax,
            config.speedBonusMin,
          );
          isCorrect = scored.isCorrect;
          score = scored.score;
          const streak = applyStreakBonus(state, playerId, isCorrect);
          newStreak = streak.newStreak;

          if (isCorrect) {
            state.correctAnswerCount.set(questionId, correctCount + 1);
            score += streak.bonus;
          }
        } else if (currentQ.question_type === 'geo') {
          const correct = parseLatLng(currentQ.geo);
          const guess = parseLatLng(chosenText);
          if (correct === null || guess === null) return;

          const correctCount = state.correctAnswerCount.get(questionId) ?? 0;
          const scored = scoreGeo(
            guess,
            correct,
            currentQ.base_score,
            correctCount,
            Math.max(state.playerSockets.size, 1),
            config.speedBonusMax,
            config.speedBonusMin,
          );
          isCorrect = scored.isCorrect;
          score = scored.score;
          const streak = applyStreakBonus(state, playerId, isCorrect);
          newStreak = streak.newStreak;

          if (isCorrect) {
            state.correctAnswerCount.set(questionId, correctCount + 1);
            score += streak.bonus;
          }
        } else if (
          currentQ.question_type === 'fill_blank' ||
          currentQ.question_type === 'ordering'
        ) {
          // Partial-credit types: award a fraction of the base score, and the
          // speed/streak bonus only on a fully-correct answer.
          let fraction = 0;
          if (currentQ.question_type === 'fill_blank') {
            const blanks = parseStringArray(currentQ.blanks).length
              ? (JSON.parse(currentQ.blanks ?? '[]') as string[][])
              : [];
            const submitted = parseStringArray(chosenText);
            const { matched, total } = matchFillBlank(submitted, blanks);
            fraction = total > 0 ? matched / total : 0;
          } else {
            const n = (JSON.parse(currentQ.options) as string[]).length;
            const perm = seededPerm(n, currentQ.id);
            const { matched, total } = scoreOrdering(chosenIndices ?? [], perm);
            fraction = total > 0 ? matched / total : 0;
          }

          isCorrect = fraction >= 1;
          score = Math.round(currentQ.base_score * fraction);
          const streak = applyStreakBonus(state, playerId, isCorrect);
          newStreak = streak.newStreak;

          if (isCorrect) {
            const correctCount = state.correctAnswerCount.get(questionId) ?? 0;
            score += computeSpeedBonus(
              correctCount,
              Math.max(state.playerSockets.size, 1),
              config.speedBonusMax,
              config.speedBonusMin,
            );
            state.correctAnswerCount.set(questionId, correctCount + 1);
            score += streak.bonus;
          }
        } else {
          if (currentQ.question_type === 'open_text') {
            const submitted = (chosenText ?? '').toLowerCase().trim();
            const expected = (currentQ.correct_answer ?? '').toLowerCase().trim();
            isCorrect = submitted.length > 0 && submitted === expected;
          } else if (currentQ.question_type === 'multi_select') {
            // Players click display slots; translate back to original indices.
            const correctIndices = JSON.parse(currentQ.correct_indices ?? '[]') as number[];
            const chosen = (chosenIndices ?? []).map((slot) =>
              slotToOriginal(currentQ, state.answerSeed, slot),
            );
            isCorrect =
              chosen.length === correctIndices.length &&
              correctIndices.every((i) => chosen.includes(i)) &&
              chosen.every((i) => correctIndices.includes(i));
          } else {
            const originalChosen =
              chosenIndex != null
                ? slotToOriginal(currentQ, state.answerSeed, chosenIndex)
                : chosenIndex;
            isCorrect = originalChosen === currentQ.correct_index;
          }

          const streak = applyStreakBonus(state, playerId, isCorrect);
          newStreak = streak.newStreak;

          if (isCorrect) {
            score += currentQ.base_score;
            const correctCount = state.correctAnswerCount.get(questionId) ?? 0;
            score += computeSpeedBonus(
              correctCount,
              Math.max(state.playerSockets.size, 1),
              config.speedBonusMax,
              config.speedBonusMin,
            );
            state.correctAnswerCount.set(questionId, correctCount + 1);
            score += streak.bonus;
          }
        }

        const sentinelIndex: Partial<Record<string, number>> = {
          open_text: -1,
          multi_select: -3,
          closest_to: -4,
          fill_blank: -5,
          ordering: -6,
          geo: -7,
        };
        const storedIndex = sentinelIndex[currentQ.question_type] ?? chosenIndex;
        const storedChosenIndices =
          currentQ.question_type === 'multi_select' || currentQ.question_type === 'ordering'
            ? JSON.stringify(chosenIndices ?? [])
            : null;

        await recordAnswer({
          io,
          socket,
          state,
          answered,
          sessionId,
          questionId,
          playerId,
          storedIndex,
          isCorrect,
          score,
          streak: newStreak,
          chosenText: chosenText ?? null,
          chosenIndices: storedChosenIndices,
        });
      },
    );

    // ─── Player: joker - pass ─────────────────────────────────────────────────
    socket.on('player:joker-pass', async (data: { sessionId: number; playerId: number }) => {
      const state = getStateBySessionId(data.sessionId);
      if (!state || state.status !== 'active' || state.questionPhase !== 'question') return;
      if (!state.gameSettings.jokersEnabled.pass) return;

      const { playerId } = data;
      // Verify the socket owns this playerId
      if (state.socketPlayers.get(socket.id) !== playerId) return;

      const myJokers = state.playerJokersUsed.get(playerId) ?? { pass: false, fiftyFifty: false };
      if (myJokers.pass) return;
      myJokers.pass = true;
      state.playerJokersUsed.set(playerId, myJokers);

      const currentQ = state.questions[state.currentQuestionIndex];
      const awardedScore = state.gameSettings.baseScore ?? currentQ.base_score;

      // Mark this player as answered (if not already)
      const answered = getOrCreateAnsweredSet(state, currentQ.id);
      if (answered.has(playerId)) return; // already answered, joker wasted — ignore
      answered.add(playerId);

      await recordAnswer({
        io,
        socket,
        state,
        answered,
        sessionId: data.sessionId,
        questionId: currentQ.id,
        playerId,
        storedIndex: -2,
        isCorrect: false,
        score: awardedScore,
        streak: 0,
        chosenText: null,
        chosenIndices: null,
        wasPassJoker: true,
        alwaysUpdateTotal: true,
      });
    });

    // ─── Player: joker - 50/50 ───────────────────────────────────────────────
    socket.on('player:joker-5050', (data: { sessionId: number; playerId: number }) => {
      const state = getStateBySessionId(data.sessionId);
      if (!state || state.status !== 'active' || state.questionPhase !== 'question') return;
      if (!state.gameSettings.jokersEnabled.fiftyFifty) return;

      const { playerId } = data;
      if (state.socketPlayers.get(socket.id) !== playerId) return;

      const myJokers = state.playerJokersUsed.get(playerId) ?? { pass: false, fiftyFifty: false };
      if (myJokers.fiftyFifty) return;

      const currentQ = state.questions[state.currentQuestionIndex];
      if (currentQ.question_type !== 'multiple_choice') return;

      myJokers.fiftyFifty = true;
      state.playerJokersUsed.set(playerId, myJokers);

      const options = JSON.parse(currentQ.options) as string[];
      // Work in the player's display order: the correct answer's display slot is
      // the shuffle-inverse of its stored index. Eliminate 2 of the other slots.
      const correctSlot = originalToSlot(currentQ, state.answerSeed, currentQ.correct_index);

      const wrongIndices = options.map((_, i) => i).filter((i) => i !== correctSlot);
      for (let i = wrongIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
      }
      const eliminatedIndices = wrongIndices.slice(0, 2);

      // Store for reconnection
      state.playerFiftyFiftyIndices.set(playerId, eliminatedIndices);

      // Only this player sees the eliminated answers
      socket.emit('player:joker-5050-applied', { eliminatedIndices });
    });

    // ─── Player: lobby emoji reaction ───────────────────────────────────────────
    socket.on('player:reaction', (data: { sessionId: number; playerId: number; emoji: string }) => {
      const state = getStateBySessionId(data.sessionId);
      if (!state || state.status !== 'waiting') return; // lobby only
      if (state.socketPlayers.get(socket.id) !== data.playerId) return; // ownership
      if (!REACTION_EMOJIS.includes(data.emoji)) return; // allowlist

      const last = reactionCooldowns.get(socket.id) ?? 0;
      const now = Date.now();
      if (now - last < REACTION_COOLDOWN_MS) return; // rate limit
      reactionCooldowns.set(socket.id, now);

      io.to(`session:${data.sessionId}`).emit('game:reaction', {
        playerId: data.playerId,
        emoji: data.emoji,
      });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      reactionCooldowns.delete(socket.id);
      for (const [_pin, state] of activeSessions.entries()) {
        const playerId = state.socketPlayers.get(socket.id);
        if (playerId) {
          state.socketPlayers.delete(socket.id);
          state.playerSockets.delete(playerId);
          io.to(`admin:${state.sessionId}`).emit('game:player-left', { playerId });
        }
      }
    });
  });

  return io;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Advance (or reset) the player's consecutive-correct streak and compute the
 * streak bonus earned by this answer. Always updates `state.playerStreaks`.
 * The bonus is 0 when the answer is incorrect, streak bonuses are disabled, or
 * the new streak has not exceeded `config.streakMinimum` (strictly greater).
 * Callers add the bonus to the score only on a correct answer.
 */
function applyStreakBonus(
  state: ActiveSession,
  playerId: number,
  isCorrect: boolean,
): { newStreak: number; bonus: number } {
  const currentStreak = state.playerStreaks.get(playerId) ?? 0;
  const newStreak = isCorrect ? currentStreak + 1 : 0;
  state.playerStreaks.set(playerId, newStreak);

  if (!isCorrect) return { newStreak, bonus: 0 };

  const effectiveStreakEnabled = state.gameSettings.streakBonusEnabled ?? config.streakBonusEnabled;
  const effectiveStreakBase = state.gameSettings.streakBonusBase ?? config.streakBonusBase;
  const bonus =
    effectiveStreakEnabled && newStreak > config.streakMinimum
      ? (newStreak - config.streakMinimum) * effectiveStreakBase
      : 0;
  return { newStreak, bonus };
}

/**
 * Shared tail of `player:answer` and `player:joker-pass`: persist the answer
 * row, credit the player's total score, emit the received/count events, and
 * show results early once everyone has answered. The caller must have already
 * added the player to `answered` (so `answered.size` includes this answer).
 * `alwaysUpdateTotal` runs the total_score UPDATE even for a 0 score (the
 * joker path always updated; the answer path only when score > 0).
 */
async function recordAnswer(opts: {
  io: SocketServer;
  socket: Socket;
  state: ActiveSession;
  answered: Set<number>;
  sessionId: number;
  questionId: number;
  playerId: number;
  storedIndex: number;
  isCorrect: boolean;
  score: number;
  streak: number;
  chosenText: string | null;
  chosenIndices: string | null;
  wasPassJoker?: boolean;
  alwaysUpdateTotal?: boolean;
}): Promise<void> {
  const { io, socket, state, answered, sessionId, questionId, playerId, score } = opts;

  const answerOrder = answered.size;
  await db.run(
    'INSERT INTO answers (player_id, session_id, question_id, chosen_index, is_correct, score, answer_order, chosen_text, chosen_indices) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    playerId,
    sessionId,
    questionId,
    opts.storedIndex,
    opts.isCorrect ? 1 : 0,
    score,
    answerOrder,
    opts.chosenText,
    opts.chosenIndices,
  );

  if (opts.alwaysUpdateTotal || score > 0) {
    await db.run('UPDATE players SET total_score = total_score + ? WHERE id = ?', score, playerId);
  }

  socket.emit(
    'player:answer-received',
    opts.wasPassJoker
      ? { isCorrect: opts.isCorrect, score, streak: opts.streak, wasPassJoker: true }
      : { isCorrect: opts.isCorrect, score, streak: opts.streak },
  );

  // Notify admin
  io.to(`admin:${sessionId}`).emit('game:answer-received', {
    playerId,
    answeredCount: answered.size,
    totalPlayers: state.playerSockets.size,
  });

  // Broadcast answer count to all players in the session
  io.to(`session:${sessionId}`).emit('game:answer-count', {
    answeredCount: answered.size,
    totalPlayers: state.playerSockets.size,
  });

  // Auto advance if everyone answered
  if (answered.size >= state.playerSockets.size) {
    if (state.questionTimer) {
      clearTimeout(state.questionTimer);
      state.questionTimer = null;
    }
    showResults(io, state, questionId);
  }
}

/** Send the host (only) a preview of the next question's text so they can talk it up. */
function emitNextPreview(io: SocketServer, state: ActiveSession): void {
  const nextIndex = state.currentQuestionIndex + 1;
  const nextQ = state.questions[nextIndex];
  io.to(`admin:${state.sessionId}`).emit('game:next-preview', {
    hasNext: !!nextQ,
    index: nextIndex,
    total: state.questions.length,
    text: nextQ?.text ?? null,
    mediaType: nextQ?.media_type ?? null,
  });
}

/** Seconds left of `totalSec` given the timestamp the phase started (0 floor). */
function remainingSec(startedAt: number | null, totalSec: number): number {
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  return Math.max(totalSec - elapsed, 0);
}

/** Re-emit the last results payload with the auto-advance countdown adjusted. */
function restoreResultsPhase(socket: Socket, state: ActiveSession): void {
  const rPayload = state.lastResultsPayload as Record<string, unknown>;
  const originalAutoAdvance = (rPayload.autoAdvanceSec as number) ?? 0;
  socket.emit('game:question-results', {
    ...rPayload,
    autoAdvanceSec: remainingSec(state.resultsShownAt, originalAutoAdvance),
  });
}

/** Re-emit the current question payload with the remaining time adjusted. */
function restoreQuestionPhase(
  socket: Socket,
  state: ActiveSession,
  payload: Record<string, unknown>,
): void {
  const originalTimeSec = (payload.timeSec as number) ?? 0;
  socket.emit('game:question', {
    ...payload,
    timeRemaining: remainingSec(state.questionStartedAt, originalTimeSec),
  });
}

/**
 * Cold state (server restarted mid-game): rebuild the current question in
 * memory from the DB index (`session.current_question_index` is the source of
 * truth) and re-arm the question timeout so the question still times out.
 * Returns the rebuilt payload, or null when there is no current question.
 */
function coldRebuildQuestion(
  io: SocketServer,
  state: ActiveSession,
  session: DbSession,
): Record<string, unknown> | null {
  const index = session.current_question_index;
  const currentQ = state.questions[index];
  if (!currentQ) return null;

  state.currentQuestionIndex = index;
  const payload = buildQuestionPayload(
    currentQ,
    index,
    state.questions.length,
    state.answerSeed,
  ) as Record<string, unknown>;
  state.questionPhase = 'question';
  state.lastQuestionPayload = payload;
  state.questionStartedAt = Date.now();

  if (!state.questionTimer) {
    state.questionTimer = setTimeout(() => {
      state.questionTimer = null;
      showResults(io, state, currentQ.id);
    }, currentQ.time_sec * 1000);
  }

  return payload;
}

/** Restore in-game UI for a player reconnecting mid-session (reload, tab switch, etc.). */
async function emitReconnectGameState(
  socket: Socket,
  io: SocketServer,
  state: ActiveSession,
  session: DbSession,
  playerId: number,
): Promise<void> {
  if (session.status !== 'active') return;

  const myJokersUsed = state.playerJokersUsed.get(playerId) ?? {
    pass: false,
    fiftyFifty: false,
  };
  socket.emit('player:joker-state', {
    jokersEnabled: state.gameSettings.jokersEnabled,
    jokersUsed: myJokersUsed,
  });

  if (state.questionPhase === 'results' && state.lastResultsPayload) {
    restoreResultsPhase(socket, state);
    return;
  }

  const currentQ = state.questions[state.currentQuestionIndex];
  if (!currentQ) return;

  const dbAnswer = await db.get<{ is_correct: number; score: number }>(
    'SELECT is_correct, score FROM answers WHERE player_id = ? AND question_id = ? AND session_id = ?',
    playerId,
    currentQ.id,
    session.id,
  );

  if (dbAnswer) {
    const answered = getOrCreateAnsweredSet(state, currentQ.id);
    answered.add(playerId);

    const allAnswers = await db.all<Array<{ player_id: number }>>(
      'SELECT player_id FROM answers WHERE question_id = ? AND session_id = ?',
      currentQ.id,
      session.id,
    );
    for (const row of allAnswers) answered.add(row.player_id);

    socket.emit('game:answer-count', {
      answeredCount: answered.size,
      totalPlayers: state.playerSockets.size,
    });
    socket.emit('player:answer-received', {
      isCorrect: dbAnswer.is_correct === 1,
      score: dbAnswer.score,
      streak: state.playerStreaks.get(playerId) ?? 0,
    });
    return;
  }

  if (state.questionPhase === 'question' && state.lastQuestionPayload) {
    restoreQuestionPhase(socket, state, state.lastQuestionPayload as Record<string, unknown>);
    const myEliminated = state.playerFiftyFiftyIndices.get(playerId);
    if (myEliminated) {
      socket.emit('player:joker-5050-applied', { eliminatedIndices: myEliminated });
    }
    return;
  }

  // Cold state: server restarted — rebuild question from DB index
  const coldPayload = coldRebuildQuestion(io, state, session);
  if (coldPayload) {
    socket.emit('game:question', coldPayload);
  }
}

function sendQuestion(io: SocketServer, state: ActiveSession, index: number): void {
  // Cancel any pending results auto-advance timer
  if (state.resultsTimer) {
    clearTimeout(state.resultsTimer);
    state.resultsTimer = null;
  }

  // Reset per-question per-player 50/50 state
  state.playerFiftyFiftyIndices = new Map();

  const q = state.questions[index];
  state.currentQuestionIndex = index;

  db.run('UPDATE sessions SET current_question_index = ? WHERE id = ?', index, state.sessionId);

  const payload = buildQuestionPayload(q, index, state.questions.length, state.answerSeed);

  state.questionPhase = 'question';
  state.lastQuestionPayload = payload;
  state.questionStartedAt = Date.now();

  io.to(`session:${state.sessionId}`).emit('game:question', payload);

  // Server-side timer
  if (state.questionTimer) clearTimeout(state.questionTimer);
  state.questionTimer = setTimeout(() => {
    state.questionTimer = null;
    showResults(io, state, q.id);
  }, q.time_sec * 1000);
}

function showResults(io: SocketServer, state: ActiveSession, questionId: number): void {
  const q = state.questions.find((x) => x.id === questionId);
  if (!q) return;

  Promise.all([
    getRankedPlayers(state.sessionId),
    db.all<
      Array<{
        player_id: number;
        username: string;
        chosen_index: number;
        chosen_indices: string | null;
        is_correct: number;
        score: number;
        chosen_text: string | null;
      }>
    >(
      'SELECT a.*, p.username FROM answers a JOIN players p ON p.id = a.player_id WHERE a.session_id = ? AND a.question_id = ?',
      state.sessionId,
      questionId,
    ),
  ]).then(([players, answers]) => {
    const answerMap = new Map(answers.map((a) => [a.player_id, a]));
    const isClosestTo = q.question_type === 'closest_to';
    const isOrdering = q.question_type === 'ordering';
    const isFillBlank = q.question_type === 'fill_blank';
    const isGeo = q.question_type === 'geo';
    const correctNumber =
      isClosestTo && q.correct_answer ? Number.parseInt(q.correct_answer, 10) : null;
    const correctGeo = isGeo ? parseLatLng(q.geo) : null;

    // For ordering, translate each player's display-slot arrangement back into
    // the actual item text they placed, top to bottom.
    const orderingItems = isOrdering ? (JSON.parse(q.options) as string[]) : [];
    const orderingPerm = isOrdering ? seededPerm(orderingItems.length, q.id) : [];

    const leaderboard = buildLeaderboard(players, state.playerAvatars).map((entry) => {
      const ans = answerMap.get(entry.playerId);
      const chosenNumber =
        isClosestTo && ans?.chosen_text != null ? Number.parseInt(ans.chosen_text, 10) : null;
      const chosenPoint = isGeo ? (parseLatLng(ans?.chosen_text) ?? undefined) : undefined;
      const distance =
        isClosestTo &&
        chosenNumber !== null &&
        correctNumber !== null &&
        !Number.isNaN(chosenNumber)
          ? Math.abs(chosenNumber - correctNumber)
          : isGeo && chosenPoint && correctGeo
            ? geoDistanceKm(chosenPoint, correctGeo)
            : null;

      let chosenOrder: string[] | undefined;
      if (isOrdering && ans?.chosen_indices) {
        const order = JSON.parse(ans.chosen_indices) as number[];
        chosenOrder = order.map((slot) => orderingItems[orderingPerm[slot]] ?? '?');
      }
      const chosenBlanks = isFillBlank ? parseStringArray(ans?.chosen_text) : undefined;

      return {
        ...entry,
        chosenIndex: ans?.chosen_index ?? null,
        chosenIndices: ans?.chosen_indices ? (JSON.parse(ans.chosen_indices) as number[]) : null,
        chosenText: ans?.chosen_text ?? null,
        chosenNumber: Number.isNaN(chosenNumber ?? NaN) ? null : chosenNumber,
        chosenOrder,
        chosenBlanks,
        chosenPoint,
        distance,
        isCorrect: (ans?.is_correct ?? 0) === 1,
        questionScore: ans?.score ?? 0,
      };
    });

    const closestRanking = isClosestTo
      ? [...leaderboard]
          .filter((e) => e.chosenNumber !== null)
          .sort(
            (a, b) =>
              (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER),
          )
      : undefined;

    const autoAdvanceSec = config.resultsAutoAdvanceSec ?? 5;

    const showLeaderboard =
      state.gameSettings.showLeaderboardAfterQuestion ?? config.showLeaderboardAfterQuestion;

    // Reveal everything in the same shuffled order the players saw, so the
    // correct highlight and vote distribution (keyed by display slot) line up.
    const perm = optionPerm(q, state.answerSeed);
    const rawOptions = JSON.parse(q.options) as string[];
    const options = perm ? perm.map((i) => rawOptions[i]) : rawOptions;
    const correctIndex = originalToSlot(q, state.answerSeed, q.correct_index);
    const correctIndices =
      q.question_type === 'multi_select' && q.correct_indices
        ? (JSON.parse(q.correct_indices) as number[]).map((i) =>
            originalToSlot(q, state.answerSeed, i),
          )
        : undefined;

    // Vote distribution — how many players chose each option (option-based types only)
    let answerDistribution: number[] | undefined;
    if (q.question_type === 'multi_select') {
      answerDistribution = new Array<number>(options.length).fill(0);
      for (const a of answers) {
        const idxs = a.chosen_indices ? (JSON.parse(a.chosen_indices) as number[]) : [];
        for (const idx of idxs) {
          if (idx >= 0 && idx < options.length) answerDistribution[idx]++;
        }
      }
    } else if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      answerDistribution = new Array<number>(options.length).fill(0);
      for (const a of answers) {
        const idx = a.chosen_index;
        if (idx != null && idx >= 0 && idx < options.length) answerDistribution[idx]++;
      }
    }

    // Reveal-only fields for the newer question types (safe post-answer).
    const correctBlanks =
      q.question_type === 'fill_blank'
        ? (() => {
            try {
              const b = JSON.parse(q.blanks ?? '[]') as string[][];
              return b.map((accepted) => accepted[0] ?? '');
            } catch {
              return [];
            }
          })()
        : undefined;
    const correctOrder = q.question_type === 'ordering' ? options : undefined;
    const geoPoint = isGeo ? (parseLatLng(q.geo) ?? undefined) : undefined;

    const resultsPayload = {
      questionId,
      questionText: q.text,
      correctIndex,
      correctIndices,
      correctAnswer: q.correct_answer,
      correctBlanks,
      correctOrder,
      geo: geoPoint,
      imageUrl: isGeo ? normalizeImageUrl(q.image_url) : undefined,
      questionType: q.question_type,
      options,
      answerDistribution,
      explanation: q.explanation?.trim() || undefined,
      rangeMin: isClosestTo ? (q.range_min ?? undefined) : undefined,
      rangeMax: isClosestTo ? (q.range_max ?? undefined) : undefined,
      closestRanking,
      leaderboard,
      showLeaderboard,
      isLastQuestion: state.currentQuestionIndex >= state.questions.length - 1,
      autoAdvanceSec,
    };

    state.questionPhase = 'results';
    state.lastResultsPayload = resultsPayload;
    state.resultsShownAt = Date.now();

    io.to(`session:${state.sessionId}`).emit('game:question-results', resultsPayload);

    // Host-only preview of the upcoming question (text only — never the answers,
    // and never sent to players).
    emitNextPreview(io, state);

    // Auto-advance only if configured (0 = manual only)
    if (state.resultsTimer) clearTimeout(state.resultsTimer);
    if (autoAdvanceSec > 0) {
      state.resultsTimer = setTimeout(() => {
        state.resultsTimer = null;
        const nextIndex = state.currentQuestionIndex + 1;
        if (nextIndex >= state.questions.length) {
          endGame(io, state);
        } else {
          sendQuestion(io, state, nextIndex);
        }
      }, autoAdvanceSec * 1000);
    }
  });
}

function endGame(_io: SocketServer, state: ActiveSession): void {
  void endActiveSession(state);
}

function buildQuizIntro(quiz: DbQuiz, questions: DbQuestion[]): QuizIntro {
  const counts = new Map<QuestionType, number>();
  let totalTimeSec = 0;
  for (const q of questions) {
    counts.set(q.question_type, (counts.get(q.question_type) ?? 0) + 1);
    totalTimeSec += q.time_sec;
  }
  // Aggregate tags across questions with a count of how many questions use each
  // (case-insensitive; the first-seen spelling is the display label).
  const tagCounts = new Map<string, number>();
  const tagLabels = new Map<string, string>();
  for (const q of questions) {
    if (!q.tags) continue;
    try {
      const parsed = JSON.parse(q.tags);
      if (!Array.isArray(parsed)) continue;
      const perQuestion = new Set<string>();
      for (const t of parsed) {
        const s = String(t);
        const key = s.toLowerCase();
        if (!s || perQuestion.has(key)) continue;
        perQuestion.add(key);
        if (!tagLabels.has(key)) tagLabels.set(key, s);
        tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    } catch {
      /* skip malformed tags */
    }
  }
  const tags: Array<[string, number]> = [...tagCounts.entries()].map(([key, count]) => [
    tagLabels.get(key) ?? key,
    count,
  ]);
  return {
    title: quiz.title,
    subtitle: quiz.description ?? '',
    coverImage: normalizeImageUrl(quiz.cover_image) ?? null,
    tags,
    questionCount: questions.length,
    typeCounts: [...counts.entries()],
    totalTimeSec,
    theme: (quiz.theme as QuizIntro['theme']) ?? 'default',
  };
}

/**
 * The permutation used to shuffle answer options for a single-/multi-choice
 * question — `perm[displaySlot] = originalIndex`. Returns null for question
 * types whose option order is meaningful or fixed (ordering, true/false, …), so
 * their indices pass through unchanged. Stable for a given (question, game seed).
 */
const optionPermCache = new Map<string, number[] | null>();

function optionPerm(q: DbQuestion, answerSeed: number): number[] | null {
  if (q.question_type !== 'multiple_choice' && q.question_type !== 'multi_select') return null;
  const cacheKey = `${q.id}:${answerSeed}`;
  const cached = optionPermCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const n = (JSON.parse(q.options) as string[]).length;
  // seededShuffle (not seededPerm): the identity must stay a valid outcome,
  // otherwise a 2-option question is deterministically reversed in every game.
  const perm = n <= 1 ? null : seededShuffle(n, q.id + answerSeed);
  optionPermCache.set(cacheKey, perm);
  return perm;
}

/** Translate a display slot the player clicked back to the original option index. */
function slotToOriginal(q: DbQuestion, answerSeed: number, slot: number): number {
  const perm = optionPerm(q, answerSeed);
  return perm ? (perm[slot] ?? slot) : slot;
}

/** Translate a stored original option index to the display slot the player saw. */
function originalToSlot(q: DbQuestion, answerSeed: number, index: number): number {
  const perm = optionPerm(q, answerSeed);
  if (!perm) return index;
  const inv = invertPerm(perm);
  return inv[index] ?? index;
}

function buildQuestionPayload(
  q: DbQuestion,
  questionIndex: number,
  totalQuestions: number,
  answerSeed = 0,
) {
  const payload: Record<string, unknown> = {
    questionIndex,
    totalQuestions,
    questionId: q.id,
    text: q.text,
    options: JSON.parse(q.options) as string[],
    timeSec: q.time_sec,
    imageUrl: normalizeImageUrl(q.image_url),
    questionType: q.question_type,
    mediaUrl: q.media_url ?? undefined,
    mediaType: (q.media_type as 'audio' | 'video' | null) ?? undefined,
  };

  // Shuffle single-/multi-choice answers so their positions vary each game.
  const perm = optionPerm(q, answerSeed);
  if (perm) {
    const original = JSON.parse(q.options) as string[];
    payload.options = perm.map((i) => original[i]);
  }

  // Note: open_text never sends correct_answer during the question phase —
  // grading is server-side and the answer is revealed only in the results payload.

  if (q.question_type === 'closest_to') {
    payload.rangeMin = q.range_min ?? 0;
    payload.rangeMax = q.range_max ?? 100;
  }

  if (q.question_type === 'ordering') {
    // Present the items in a stable, id-seeded shuffle so the stored (correct)
    // order is never sent to the client.
    const original = JSON.parse(q.options) as string[];
    const perm = seededPerm(original.length, q.id);
    payload.options = perm.map((i) => original[i]);
  }

  if (q.question_type === 'fill_blank') {
    // Send only the count of blanks, never the accepted answers.
    let count = 0;
    try {
      const parsed = JSON.parse(q.blanks ?? '[]');
      if (Array.isArray(parsed)) count = parsed.length;
    } catch {
      /* no blanks */
    }
    payload.blankCount = count;
  }

  return payload;
}
