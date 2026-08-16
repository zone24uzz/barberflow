import { WebSocketServer, WebSocket } from 'ws';
import { db as defaultDb } from '../db/index.js';

let wss = null;
let activeDb = defaultDb;

export function initWebSocketServer(server, database = defaultDb) {
  activeDb = database;
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws) => {
    try {
      const currentState = await activeDb.getState();
      ws.send(JSON.stringify({
        type: 'INITIAL_STATE',
        data: currentState,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('WS init error:', e);
    }

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    });
  });

  return wss;
}

export async function broadcastState(eventType = 'STATE_UPDATE', extraData = null) {
  if (!wss) return;

  try {
    const currentState = await activeDb.getState();
    const payload = JSON.stringify({
      type: eventType,
      data: currentState,
      extra: extraData,
      timestamp: new Date().toISOString()
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  } catch (err) {
    console.error('WebSocket broadcast error:', err);
  }
}

export function getWss() {
  return wss;
}
