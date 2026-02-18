import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import path from 'path';
import { initDb } from './db';
import { config } from './config';
import { adminRouter } from './routes/admin';
import { setupSockets } from './socket/index';

const app = express();
const httpServer = http.createServer(app);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/admin', adminRouter);

// In production serve the built React app
const clientDist = path.join(process.cwd(), '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

initDb();
setupSockets(httpServer);

httpServer.listen(config.port, () => {
  console.log(`\n🎯  Quizz — http://localhost:${config.port}`);
  console.log(`    Admin : http://localhost:${config.port}/admin`);
  console.log(`    Play  : http://localhost:${config.port}/play\n`);
});
