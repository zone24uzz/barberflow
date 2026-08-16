import { db } from '../db/index.js';
import { ENV } from '../config/env.js';
import { broadcastState } from '../services/websocket.service.js';
import { getTelegramStatus } from '../services/telegram.service.js';

export const systemController = {
  getHealth(req, res) {
    const telegram = getTelegramStatus();
    res.json({
      status: 'ok',
      database: ENV.SUPABASE_URL ? 'supabase' : 'sqlite',
      telegramActive: !telegram.isMock,
      time: new Date().toISOString()
    });
  },

  async getState(req, res, next) {
    try {
      const state = await db.getState();
      res.json(state);
    } catch (err) {
      next(err);
    }
  },

  async resetDemo(req, res, next) {
    try {
      const data = await db.reset();
      await broadcastState('DEMO_RESET', null);
      res.json({ success: true, message: 'Demo data reset successfully', state: data });
    } catch (err) {
      next(err);
    }
  },

  renderRootStatus(req, res) {
    res.send(`
      <!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8">
        <title>BarberFlow Backend API Status</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0b0c10; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #10121a; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
          h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #fff; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
          .btn { display: inline-block; background: #f59e0b; color: #000; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 999px; box-shadow: 0 10px 20px rgba(245,158,11,0.25); transition: transform 0.2s; }
          .btn:hover { transform: scale(1.03); }
          .endpoints { margin-top: 24px; text-align: left; background: #020617; padding: 16px; border-radius: 16px; font-size: 12px; color: #64748b; font-family: monospace; }
          .endpoints strong { color: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">🟢 Backend API Faol & Ishlayapti</span>
          <h1>💈 BarberFlow API Server (Railway / Supabase)</h1>
          <p>Backend port <strong>${ENV.PORT}</strong>da faol. Frontend dasturini ochish uchun quyidagi tugmani bosing:</p>
          <a class="btn" href="${ENV.APP_URL}" target="_self">🚀 Frontend Ilovani Ochish</a>
          <div class="endpoints">
            <div><strong>Database:</strong> ${ENV.SUPABASE_URL ? 'Supabase PostgreSQL' : 'Local SQLite (barberflow.sqlite)'}</div>
            <div><strong>REST API:</strong> GET /api/state, /api/health</div>
            <div><strong>WebSocket:</strong> /ws</div>
            <div><strong>Telegram:</strong> /api/telegram/test-notify</div>
          </div>
        </div>
      </body>
      </html>
    `);
  }
};
