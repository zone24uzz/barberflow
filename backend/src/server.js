import http from 'http';
import app from './app.js';
import { ENV } from './config/env.js';
import { db } from './db/index.js';
import { initWebSocketServer } from './services/websocket.service.js';
import { initTelegramBot } from './services/telegram.service.js';

const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server, db);

// Initialize Telegram Bot
initTelegramBot(ENV.APP_URL, db);

// Port & Host Configuration (0.0.0.0 for Docker & Railway)
const PORT = ENV.PORT;
const HOST = ENV.HOST;

server.listen(PORT, HOST, () => {
  console.log(`💈 BarberFlow Backend API & WebSocket running on http://${HOST}:${PORT}`);
});

export { server, app };
