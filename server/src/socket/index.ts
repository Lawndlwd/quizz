import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';
import { DbQuestion, DbSession, DbPlayer } from '../types';
import { ActiveSession, activeSessions, sessionIdToPin } from './gameState';

export function setupSockets(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket: Socket) => {
    // ─── Admin join ───────────────────────────────────────────────────────────
    socket.on('admin:join-session', (data: { sessionId: number; token: string }) => {
      try {
        jwt.verify(data.token, config.jwtSecret);
      } catch {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(data.sessionId) as DbSession | undefined;
      if (!session) { socket.emit('error', { message: 'Session not found' }); return; }

      const questions = db.prepare(
        'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index'
      ).all(session.quiz_id) as DbQuestion[];

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
          questionTimer: null,
          status: session.status as ActiveSession['status'],
        };
        activeSessions.set(session.pin, state);
        sessionIdToPin.set(session.id, session.pin);
      } else {
        state.adminSocketId = socket.id;
      }

      socket.join(`session:${session.id}`);
      socket.join(`admin:${session.id}`);

      // Send current players to admin
      const players = db.prepare(
        'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC'
      ).all(session.id) as DbPlayer[];

      socket.emit('session:state', {
        session,
        players: players.map(p => ({ id: p.id, username: p.username, totalScore: p.total_score })),
        questionCount: questions.length,
      });
    });

    // ─── Admin: start game ────────────────────────────────────────────────────
    socket.on('admin:start-game', (data: { sessionId: number; token: string }) => {
      try { jwt.verify(data.token, config.jwtSecret); } catch { socket.emit('error', { message: 'Unauthorized' }); return; }

      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
      if (!state) { socket.emit('error', { message: 'Session not active' }); return; }
      if (state.status !== 'waiting') { socket.emit('error', { message: 'Game already started' }); return; }

      state.status = 'active';
      db.prepare("UPDATE sessions SET status = 'active', started_at = datetime('now') WHERE id = ?").run(data.sessionId);

      io.to(`session:${data.sessionId}`).emit('game:started');
      sendQuestion(io, state, 0);
    });

    // ─── Admin: next question ─────────────────────────────────────────────────
    socket.on('admin:next-question', (data: { sessionId: number; token: string }) => {
      try { jwt.verify(data.token, config.jwtSecret); } catch { socket.emit('error', { message: 'Unauthorized' }); return; }

      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
      if (!state || state.status !== 'active') return;

      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        endGame(io, state);
      } else {
        sendQuestion(io, state, nextIndex);
      }
    });

    // ─── Admin: end game ──────────────────────────────────────────────────────
    socket.on('admin:end-game', (data: { sessionId: number; token: string }) => {
      try { jwt.verify(data.token, config.jwtSecret); } catch { socket.emit('error', { message: 'Unauthorized' }); return; }

      const pin = sessionIdToPin.get(data.sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
      if (!state) return;
      endGame(io, state);
    });

    // ─── Player: join ─────────────────────────────────────────────────────────
    socket.on('player:join', (data: { pin: string; username: string }) => {
      const { pin, username } = data;

      const session = db.prepare("SELECT * FROM sessions WHERE pin = ?").get(pin) as DbSession | undefined;
      if (!session) { socket.emit('player:error', { message: 'Invalid PIN' }); return; }

      if (session.status === 'finished') { socket.emit('player:error', { message: 'Game has ended' }); return; }
      if (session.status === 'active' && !config.allowLateJoin) {
        socket.emit('player:error', { message: 'Game already in progress' }); return;
      }

      if (!username?.trim()) { socket.emit('player:error', { message: 'Username required' }); return; }
      const cleanName = username.trim().slice(0, 24);

      // Check duplicate username
      const existing = db.prepare('SELECT id FROM players WHERE session_id = ? AND username = ?').get(session.id, cleanName) as DbPlayer | undefined;
      if (existing) { socket.emit('player:error', { message: 'Username already taken' }); return; }

      const result = db.prepare('INSERT INTO players (session_id, username) VALUES (?, ?)').run(session.id, cleanName);
      const playerId = Number(result.lastInsertRowid);

      socket.join(`session:${session.id}`);
      socket.join(`player:${playerId}`);

      let state = activeSessions.get(pin);
      if (!state) {
        const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index').all(session.quiz_id) as DbQuestion[];
        state = {
          sessionId: session.id, quizId: session.quiz_id, pin,
          adminSocketId: '', questions,
          currentQuestionIndex: session.current_question_index,
          playerSockets: new Map(), socketPlayers: new Map(),
          answeredPlayers: new Map(), correctAnswerCount: new Map(),
          playerStreaks: new Map(),
          questionTimer: null, status: session.status as ActiveSession['status'],
        };
        activeSessions.set(pin, state);
        sessionIdToPin.set(session.id, pin);
      }

      state.playerSockets.set(playerId, socket.id);
      state.socketPlayers.set(socket.id, playerId);

      const players = db.prepare('SELECT * FROM players WHERE session_id = ?').all(session.id) as DbPlayer[];

      socket.emit('player:joined', {
        playerId,
        username: cleanName,
        sessionId: session.id,
        status: session.status,
        playerCount: players.length,
      });

      io.to(`admin:${session.id}`).emit('game:player-joined', {
        playerId, username: cleanName,
        playerCount: players.length,
      });
    });

    // ─── Player: answer ───────────────────────────────────────────────────────
    socket.on('player:answer', (data: { sessionId: number; questionId: number; chosenIndex: number; playerId: number }) => {
      const { sessionId, questionId, chosenIndex, playerId } = data;

      const pin = sessionIdToPin.get(sessionId);
      const state = pin ? activeSessions.get(pin) : undefined;
      if (!state || state.status !== 'active') return;

      const currentQ = state.questions[state.currentQuestionIndex];
      if (!currentQ || currentQ.id !== questionId) return;

      // Prevent duplicate answer
      let answered = state.answeredPlayers.get(questionId);
      if (!answered) { answered = new Set(); state.answeredPlayers.set(questionId, answered); }
      if (answered.has(playerId)) return;
      answered.add(playerId);

      const isCorrect = chosenIndex === currentQ.correct_index;
      let score = 0;

      // Track player streak before computing score
      const currentStreak = state.playerStreaks.get(playerId) ?? 0;
      const newStreak = isCorrect ? currentStreak + 1 : 0;
      state.playerStreaks.set(playerId, newStreak);

      if (isCorrect) {
        score += currentQ.base_score;
        // Speed bonus
        const correctCount = (state.correctAnswerCount.get(questionId) ?? 0);
        const bonuses = config.speedBonuses;
        const bonus = correctCount < bonuses.length ? bonuses[correctCount] : config.defaultSpeedBonus;
        score += bonus;
        state.correctAnswerCount.set(questionId, correctCount + 1);

        // Streak bonus: each level above streakMinimum earns streakBonusBase extra points
        if (config.streakBonusEnabled && newStreak > config.streakMinimum) {
          score += (newStreak - config.streakMinimum) * config.streakBonusBase;
        }
      }

      const answerOrder = answered.size;

      db.prepare(
        'INSERT INTO answers (player_id, session_id, question_id, chosen_index, is_correct, score, answer_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(playerId, sessionId, questionId, chosenIndex, isCorrect ? 1 : 0, score, answerOrder);

      if (isCorrect) {
        db.prepare('UPDATE players SET total_score = total_score + ? WHERE id = ?').run(score, playerId);
      }

      socket.emit('player:answer-received', { isCorrect, score, streak: newStreak });

      // Notify admin
      io.to(`admin:${sessionId}`).emit('game:answer-received', {
        playerId, answeredCount: answered.size,
        totalPlayers: state.playerSockets.size,
      });

      // Auto advance if everyone answered
      if (answered.size >= state.playerSockets.size) {
        if (state.questionTimer) { clearTimeout(state.questionTimer); state.questionTimer = null; }
        showResults(io, state, questionId);
      }
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
  const q = state.questions[index];
  state.currentQuestionIndex = index;

  db.prepare('UPDATE sessions SET current_question_index = ? WHERE id = ?').run(index, state.sessionId);

  const payload = {
    questionIndex: index,
    totalQuestions: state.questions.length,
    questionId: q.id,
    text: q.text,
    options: JSON.parse(q.options) as string[],
    timeSec: q.time_sec,
  };

  io.to(`session:${state.sessionId}`).emit('game:question', payload);

  // Timer
  if (state.questionTimer) clearTimeout(state.questionTimer);
  state.questionTimer = setTimeout(() => {
    state.questionTimer = null;
    showResults(io, state, q.id);
  }, q.time_sec * 1000);
}

function showResults(io: SocketServer, state: ActiveSession, questionId: number): void {
  const q = state.questions.find(x => x.id === questionId);
  if (!q) return;

  const players = db.prepare(
    'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC'
  ).all(state.sessionId) as DbPlayer[];

  const answers = db.prepare(
    'SELECT a.*, p.username FROM answers a JOIN players p ON p.id = a.player_id WHERE a.session_id = ? AND a.question_id = ?'
  ).all(state.sessionId, questionId) as Array<{ player_id: number; username: string; chosen_index: number; is_correct: number; score: number }>;

  const answerMap = new Map(answers.map(a => [a.player_id, a]));

  const leaderboard = players.map((p, i) => {
    const ans = answerMap.get(p.id);
    return {
      rank: i + 1,
      playerId: p.id,
      username: p.username,
      totalScore: p.total_score,
      chosenIndex: ans?.chosen_index ?? null,
      isCorrect: (ans?.is_correct ?? 0) === 1,
      questionScore: ans?.score ?? 0,
    };
  });

  const resultsPayload = {
    questionId,
    questionText: q.text,
    correctIndex: q.correct_index,
    options: JSON.parse(q.options) as string[],
    leaderboard,
    isLastQuestion: state.currentQuestionIndex >= state.questions.length - 1,
  };

  io.to(`session:${state.sessionId}`).emit('game:question-results', resultsPayload);
}

function endGame(io: SocketServer, state: ActiveSession): void {
  if (state.questionTimer) { clearTimeout(state.questionTimer); state.questionTimer = null; }
  state.status = 'finished';

  db.prepare("UPDATE sessions SET status = 'finished', finished_at = datetime('now') WHERE id = ?").run(state.sessionId);

  const players = db.prepare(
    'SELECT * FROM players WHERE session_id = ? ORDER BY total_score DESC'
  ).all(state.sessionId) as DbPlayer[];

  const finalLeaderboard = players.map((p, i) => ({
    rank: i + 1,
    username: p.username,
    totalScore: p.total_score,
  }));

  io.to(`session:${state.sessionId}`).emit('game:ended', { leaderboard: finalLeaderboard });

  activeSessions.delete(state.pin);
  sessionIdToPin.delete(state.sessionId);
}
