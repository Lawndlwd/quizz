import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { type Socket, Server as SocketServer } from 'socket.io';
import { config } from '../config';
import { db } from '../db';
import type { DbPlayer, DbQuestion, DbSession, GameSettings } from '../types';
import { type ActiveSession, activeSessions, sessionIdToPin } from './gameState';

export function setupSockets(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket: Socket) => {
    // ─── Admin join ───────────────────────────────────────────────────────────
    socket.on('admin:join-session', async (data: { sessionId: number; token: string }) => {
      try {
        jwt.verify(data.token, config.jwtSecret);
      } catch {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

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

      let state = activeSessions.get(session.pin);
      if (!state) {
        state = {
          sessionId: session.id,
          quizId: session.quiz_id,
          pin: session.pin,
          adminSocketId: socket.id,
          questions,
          currentQuestionIndex: session.current_question_index,
          playerSockets: new Map(),
          socketPlayers: new Map(),
          answeredPlayers: new Map(),
          correctAnswerCount: new Map(),
          playerStreaks: new Map(),
          playerAvatars: new Map(),
          questionTimer: null,
          resultsTimer: null,
          status: session.status as ActiveSession['status'],
          questionPhase: null,
          lastQuestionPayload: null,
          lastResultsPayload: null,
          gameSettings: { jokersEnabled: { pass: false, fiftyFifty: false } },
          playerJokersUsed: new Map(),
          playerFiftyFiftyIndices: new Map(),
        };
        activeSessions.set(session.pin, state);
        sessionIdToPin.set(session.id, session.pin);
      } else {
        state.adminSocketId = socket.id;
      }

      socket.join(`session:${session.id}`);
      socket.join(`admin:${session.id}`);

      // Send current players to admin
      const players = await db.all<DbPlayer[]>(
        'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC',
        session.id,
      );

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
      });
    });

    // ─── Admin: start game ────────────────────────────────────────────────────
    socket.on(
      'admin:start-game',
      async (data: { sessionId: number; token: string; gameSettings?: GameSettings }) => {
        try {
          jwt.verify(data.token, config.jwtSecret);
        } catch {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const pin = sessionIdToPin.get(data.sessionId);
        const state = pin ? activeSessions.get(pin) : undefined;
        if (!state) {
          socket.emit('error', { message: 'Session not active' });
          return;
        }
        if (state.status !== 'waiting') {
          socket.emit('error', { message: 'Game already started' });
          return;
        }

        if (data.gameSettings) {
          state.gameSettings = data.gameSettings;
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
        sendQuestion(io, state, 0);
      },
    );

    // ─── Admin: next question ─────────────────────────────────────────────────
    socket.on('admin:next-question', (data: { sessionId: number; token: string }) => {
      try {
        jwt.verify(data.token, config.jwtSecret);
      } catch {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
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

    // ─── Admin: end game ──────────────────────────────────────────────────────
    socket.on('admin:end-game', (data: { sessionId: number; token: string }) => {
      try {
        jwt.verify(data.token, config.jwtSecret);
      } catch {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
      if (!state) return;
      endGame(io, state);
    });

    // ─── Player: join (also handles reconnection) ─────────────────────────────
    socket.on('player:join', async (data: { pin: string; username: string; avatar?: string }) => {
      const { pin, username, avatar } = data;

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

      // Check if player already exists (reconnection scenario)
      const existing = await db.get<DbPlayer>(
        'SELECT * FROM players WHERE session_id = ? AND username = ?',
        session.id,
        cleanName,
      );

      if (existing) {
        // ── Reconnect path ────────────────────────────────────────────────────
        const playerId = existing.id;

        socket.join(`session:${session.id}`);
        socket.join(`player:${playerId}`);

        let state = activeSessions.get(pin);
        if (!state) {
          const questions = await db.all<DbQuestion[]>(
            'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
            session.quiz_id,
          );
          state = {
            sessionId: session.id,
            quizId: session.quiz_id,
            pin,
            adminSocketId: '',
            questions,
            currentQuestionIndex: session.current_question_index,
            playerSockets: new Map(),
            socketPlayers: new Map(),
            answeredPlayers: new Map(),
            correctAnswerCount: new Map(),
            playerStreaks: new Map(),
            playerAvatars: new Map(),
            questionTimer: null,
            resultsTimer: null,
            status: session.status as ActiveSession['status'],
            questionPhase: null,
            lastQuestionPayload: null,
            lastResultsPayload: null,
            gameSettings: { jokersEnabled: { pass: false, fiftyFifty: false } },
            playerJokersUsed: new Map(),
            playerFiftyFiftyIndices: new Map(),
          };
          activeSessions.set(pin, state);
          sessionIdToPin.set(session.id, pin);
        }

        // Remove old socket mapping
        const oldSocketId = state?.playerSockets.get(playerId);
        if (oldSocketId) state?.socketPlayers.delete(oldSocketId);
        state?.playerSockets.set(playerId, socket.id);
        state?.socketPlayers.set(socket.id, playerId);
        if (avatar) state?.playerAvatars.set(playerId, avatar);

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
        });

        // Notify admin that player is back
        io.to(`admin:${session.id}`).emit('game:player-joined', {
          playerId,
          username: cleanName,
          playerCount: state?.playerSockets.size,
          avatar: state?.playerAvatars.get(playerId) ?? avatar,
        });

        // Restore game state for reconnecting player
        if (session.status === 'active') {
          // Send joker config so UI can show the right buttons
          const myJokersUsed = state?.playerJokersUsed.get(playerId) ?? {
            pass: false,
            fiftyFifty: false,
          };
          socket.emit('player:joker-state', {
            jokersEnabled: state?.gameSettings.jokersEnabled,
            jokersUsed: myJokersUsed,
          });
          if (state?.questionPhase === 'question' && state?.lastQuestionPayload) {
            socket.emit('game:question', state?.lastQuestionPayload);
            // Restore 50/50 if this player already used it this question
            const myEliminated = state?.playerFiftyFiftyIndices.get(playerId);
            if (myEliminated) {
              socket.emit('player:joker-5050-applied', { eliminatedIndices: myEliminated });
            }
          } else if (state?.questionPhase === 'results' && state?.lastResultsPayload) {
            socket.emit('game:question-results', state?.lastResultsPayload);
          }
        }
        return;
      }

      // ── New player join path ───────────────────────────────────────────────
      if (session.status === 'active' && !config.allowLateJoin) {
        socket.emit('player:error', { message: 'Game already in progress' });
        return;
      }

      const result = await db.run(
        'INSERT INTO players (session_id, username) VALUES (?, ?)',
        session.id,
        cleanName,
      );
      const playerId = Number(result.lastID);

      socket.join(`session:${session.id}`);
      socket.join(`player:${playerId}`);

      let state = activeSessions.get(pin);
      if (!state) {
        const questions = await db.all<DbQuestion[]>(
          'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
          session.quiz_id,
        );
        state = {
          sessionId: session.id,
          quizId: session.quiz_id,
          pin,
          adminSocketId: '',
          questions,
          currentQuestionIndex: session.current_question_index,
          playerSockets: new Map(),
          socketPlayers: new Map(),
          answeredPlayers: new Map(),
          correctAnswerCount: new Map(),
          playerStreaks: new Map(),
          playerAvatars: new Map(),
          questionTimer: null,
          resultsTimer: null,
          status: session.status as ActiveSession['status'],
          questionPhase: null,
          lastQuestionPayload: null,
          lastResultsPayload: null,
          gameSettings: { jokersEnabled: { pass: false, fiftyFifty: false } },
          playerJokersUsed: new Map(),
          playerFiftyFiftyIndices: new Map(),
        };
        activeSessions.set(pin, state);
        sessionIdToPin.set(session.id, pin);
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
      });

      io.to(`admin:${session.id}`).emit('game:player-joined', {
        playerId,
        username: cleanName,
        playerCount: players.length,
        avatar,
      });
    });

    // ─── Player: answer ───────────────────────────────────────────────────────
    socket.on(
      'player:answer',
      async (data: {
        sessionId: number;
        questionId: number;
        chosenIndex: number;
        playerId: number;
        chosenText?: string;
      }) => {
        const { sessionId, questionId, chosenIndex, playerId, chosenText } = data;

        const pin = sessionIdToPin.get(sessionId);
        const state = pin ? activeSessions.get(pin) : undefined;
        if (!state || state.status !== 'active') return;

        const currentQ = state.questions[state.currentQuestionIndex];
        if (!currentQ || currentQ.id !== questionId) return;

        // Prevent duplicate answer
        let answered = state.answeredPlayers.get(questionId);
        if (!answered) {
          answered = new Set();
          state.answeredPlayers.set(questionId, answered);
        }
        if (answered.has(playerId)) return;
        answered.add(playerId);

        // Determine correctness based on question type
        let isCorrect = false;
        if (currentQ.question_type === 'open_text') {
          const submitted = (chosenText ?? '').toLowerCase().trim();
          const expected = (currentQ.correct_answer ?? '').toLowerCase().trim();
          isCorrect = submitted.length > 0 && submitted === expected;
        } else {
          isCorrect = chosenIndex === currentQ.correct_index;
        }

        let score = 0;

        // Track player streak before computing score
        const currentStreak = state.playerStreaks.get(playerId) ?? 0;
        const newStreak = isCorrect ? currentStreak + 1 : 0;
        state.playerStreaks.set(playerId, newStreak);

        if (isCorrect) {
          score += currentQ.base_score;
          // Speed bonus
          const correctCount = state.correctAnswerCount.get(questionId) ?? 0;
          const bonuses = config.speedBonuses;
          const bonus =
            correctCount < bonuses.length ? bonuses[correctCount] : config.defaultSpeedBonus;
          score += bonus;
          state.correctAnswerCount.set(questionId, correctCount + 1);

          // Streak bonus (game-level settings override global config)
          const effectiveStreakEnabled =
            state.gameSettings.streakBonusEnabled ?? config.streakBonusEnabled;
          const effectiveStreakBase = state.gameSettings.streakBonusBase ?? config.streakBonusBase;
          if (effectiveStreakEnabled && newStreak > config.streakMinimum) {
            score += (newStreak - config.streakMinimum) * effectiveStreakBase;
          }
        }

        const answerOrder = answered.size;
        const storedIndex = currentQ.question_type === 'open_text' ? -1 : chosenIndex;

        await db.run(
          'INSERT INTO answers (player_id, session_id, question_id, chosen_index, is_correct, score, answer_order, chosen_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          playerId,
          sessionId,
          questionId,
          storedIndex,
          isCorrect ? 1 : 0,
          score,
          answerOrder,
          chosenText ?? null,
        );

        if (isCorrect) {
          await db.run(
            'UPDATE players SET total_score = total_score + ? WHERE id = ?',
            score,
            playerId,
          );
        }

        socket.emit('player:answer-received', { isCorrect, score, streak: newStreak });

        // Notify admin
        io.to(`admin:${sessionId}`).emit('game:answer-received', {
          playerId,
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
      },
    );

    // ─── Player: joker - pass ─────────────────────────────────────────────────
    socket.on('player:joker-pass', async (data: { sessionId: number; playerId: number }) => {
      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
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
      let answered = state.answeredPlayers.get(currentQ.id);
      if (!answered) {
        answered = new Set();
        state.answeredPlayers.set(currentQ.id, answered);
      }
      if (answered.has(playerId)) return; // already answered, joker wasted — ignore
      answered.add(playerId);

      const answerOrder = answered.size;
      await db.run(
        'INSERT INTO answers (player_id, session_id, question_id, chosen_index, is_correct, score, answer_order, chosen_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        playerId,
        data.sessionId,
        currentQ.id,
        -2,
        0,
        awardedScore,
        answerOrder,
        null,
      );
      await db.run(
        'UPDATE players SET total_score = total_score + ? WHERE id = ?',
        awardedScore,
        playerId,
      );

      socket.emit('player:answer-received', {
        isCorrect: false,
        score: awardedScore,
        streak: 0,
        wasPassJoker: true,
      });
      io.to(`admin:${data.sessionId}`).emit('game:answer-received', {
        playerId,
        answeredCount: answered.size,
        totalPlayers: state.playerSockets.size,
      });

      // Auto-advance if everyone has now answered
      if (answered.size >= state.playerSockets.size) {
        if (state.questionTimer) {
          clearTimeout(state.questionTimer);
          state.questionTimer = null;
        }
        showResults(io, state, currentQ.id);
      }
    });

    // ─── Player: joker - 50/50 ───────────────────────────────────────────────
    socket.on('player:joker-5050', (data: { sessionId: number; playerId: number }) => {
      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
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
      const correctIndex = currentQ.correct_index;

      // Pick 2 random wrong indices
      const wrongIndices = options.map((_, i) => i).filter((i) => i !== correctIndex);
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

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
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

  const payload = {
    questionIndex: index,
    totalQuestions: state.questions.length,
    questionId: q.id,
    text: q.text,
    options: JSON.parse(q.options) as string[],
    timeSec: q.time_sec,
    imageUrl: q.image_url ?? undefined,
    questionType: q.question_type,
    correctAnswer: q.question_type === 'open_text' ? q.correct_answer : undefined,
  };

  state.questionPhase = 'question';
  state.lastQuestionPayload = payload;

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
    db.all<DbPlayer[]>(
      'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC',
      state.sessionId,
    ),
    db.all<
      Array<{
        player_id: number;
        username: string;
        chosen_index: number;
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

    const leaderboard = players.map((p, i) => {
      const ans = answerMap.get(p.id);
      return {
        rank: i + 1,
        playerId: p.id,
        username: p.username,
        totalScore: p.total_score,
        chosenIndex: ans?.chosen_index ?? null,
        chosenText: ans?.chosen_text ?? null,
        isCorrect: (ans?.is_correct ?? 0) === 1,
        questionScore: ans?.score ?? 0,
        avatar: state.playerAvatars.get(p.id),
      };
    });

    const autoAdvanceSec = config.resultsAutoAdvanceSec ?? 5;

    const resultsPayload = {
      questionId,
      questionText: q.text,
      correctIndex: q.correct_index,
      correctAnswer: q.correct_answer,
      questionType: q.question_type,
      options: JSON.parse(q.options) as string[],
      leaderboard,
      isLastQuestion: state.currentQuestionIndex >= state.questions.length - 1,
      autoAdvanceSec,
    };

    state.questionPhase = 'results';
    state.lastResultsPayload = resultsPayload;

    io.to(`session:${state.sessionId}`).emit('game:question-results', resultsPayload);

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

function endGame(io: SocketServer, state: ActiveSession): void {
  if (state.questionTimer) {
    clearTimeout(state.questionTimer);
    state.questionTimer = null;
  }
  if (state.resultsTimer) {
    clearTimeout(state.resultsTimer);
    state.resultsTimer = null;
  }
  state.status = 'finished';

  db.run(
    "UPDATE sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ?",
    state.sessionId,
  );

  db.all<DbPlayer[]>(
    'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC',
    state.sessionId,
  ).then((players) => {
    const finalLeaderboard = players.map((p, i) => ({
      rank: i + 1,
      username: p.username,
      totalScore: p.total_score,
      avatar: state.playerAvatars.get(p.id),
    }));

    io.to(`session:${state.sessionId}`).emit('game:ended', { leaderboard: finalLeaderboard });
  });

  activeSessions.delete(state.pin);
  sessionIdToPin.delete(state.sessionId);
}
