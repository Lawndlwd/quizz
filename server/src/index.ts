import http from 'node:http';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { avatarsDir, initAvatars, listAvatars } from './avatars';
import { config } from './config';
import { initDb } from './db';
import { adminRouter } from './routes/admin';
import { setupSockets } from './socket/index';

const app = express();
const httpServer = http.createServer(app);

app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// ── Public config (no auth) ───────────────────────────────────────────────────
app.get('/api/public', (_req, res) => res.json({ appName: config.appName ?? '' }));

// ── Avatars ──────────────────────────────────────────────────────────────────
initAvatars();
app.use('/avatars', express.static(avatarsDir));
app.get('/api/avatars', (_req, res) => res.json(listAvatars()));

app.use('/api/admin', adminRouter);

// In production serve the built React app
const clientDist = path.join(process.cwd(), '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

initDb().then(() => {
  setupSockets(httpServer);
  httpServer.listen(config.port, () => {
    console.log(`\n🎯  Quizz — http://localhost:${config.port}`);
    console.log(`    Admin : http://localhost:${config.port}/admin`);
    console.log(`    Play  : http://localhost:${config.port}/play\n`);
  });
});
