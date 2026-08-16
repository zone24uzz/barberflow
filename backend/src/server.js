import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { db } from './sqliteDb.js';
import { initTelegramBot, sendTelegramNotification } from './telegramBot.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize Telegram Bot
const botInstance = initTelegramBot(process.env.APP_URL || 'http://localhost:5173');

// Broadcast state to all connected WebSocket clients
function broadcastState(eventType = 'STATE_UPDATE', extraData = null) {
  const payload = JSON.stringify({
    type: eventType,
    data: db.getState(),
    extra: extraData,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: db.getState(),
    timestamp: new Date().toISOString()
  }));

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

// --- REST API Endpoints ---

// 0. Root Status Page for Browser Viewers
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8">
      <title>BarberFlow Backend API Status</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #05070e; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
        h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #fff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #06b6d4, #2563eb); color: #fff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 999px; box-shadow: 0 10px 20px rgba(6,182,212,0.25); transition: transform 0.2s; }
        .btn:hover { transform: scale(1.03); }
        .endpoints { margin-top: 24px; text-align: left; background: #020617; padding: 16px; border-radius: 16px; font-size: 12px; color: #64748b; font-family: monospace; }
        .endpoints strong { color: #38bdf8; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">🟢 Backend API Faol & Ishlayapti</span>
        <h1>💈 BarberFlow API Server</h1>
        <p>Siz hozir <strong>Backend (Port 5050)</strong>dasiz. Asosiy vizual ilovani ko'rish uchun quyidagi tugmani bosing:</p>
        <a class="btn" href="http://localhost:5173" target="_self">🚀 Frontend Ilovani Ochish (localhost:5173)</a>
        <div class="endpoints">
          <div><strong>REST API:</strong> GET /api/state, /api/health</div>
          <div><strong>WebSocket:</strong> ws://localhost:5050/ws</div>
          <div><strong>Telegram:</strong> /api/telegram/test-notify</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 1. Health check & current full state
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), telegramActive: !botInstance?.isMock });
});

app.get('/api/state', (req, res) => {
  res.json(db.getState());
});

// 2. Add new appointment (Walk-in or online booking)
app.post('/api/appointments', async (req, res) => {
  try {
    const apt = db.addAppointment(req.body);
    const state = db.getState();
    const barber = state.profiles.find(p => p.id === apt.barber_id);
    const service = state.services.find(s => s.id === apt.service_id);

    // Send Telegram Notification
    await sendTelegramNotification('NEW_APPOINTMENT', {
      client_name: apt.client_name,
      client_phone: apt.client_phone,
      barber_name: barber?.full_name,
      service_name: service?.name,
      price: apt.price,
      queue_number: apt.queue_number
    });

    broadcastState('APPOINTMENT_ADDED', apt);
    res.status(201).json({ success: true, data: apt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update appointment status (in_progress, completed, no_show, cancelled)
app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const updated = db.updateAppointmentStatus(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const state = db.getState();
    const barber = state.profiles.find(p => p.id === updated.barber_id);

    if (req.body.status === 'in_progress') {
      await sendTelegramNotification('QUEUE_TURN', {
        client_name: updated.client_name,
        barber_name: barber?.full_name
      });
    } else if (req.body.status === 'completed') {
      await sendTelegramNotification('PAYMENT_RECEIVED', {
        client_name: updated.client_name,
        amount: updated.price,
        payment_type: req.body.payment_type || 'cash'
      });

      // Check low stock
      const blade = state.inventory.find(i => i.id === 'inv-1');
      if (blade && blade.stock_quantity <= blade.min_alert_threshold) {
        await sendTelegramNotification('LOW_STOCK', blade);
      }
    }

    broadcastState('APPOINTMENT_UPDATED', updated);
    res.json({ success: true, data: updated, state: db.getState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Record manual transaction
app.post('/api/transactions', (req, res) => {
  try {
    const tx = db.addTransaction(req.body);
    broadcastState('TRANSACTION_ADDED', tx);
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update inventory item
app.patch('/api/inventory/:id', (req, res) => {
  try {
    const item = db.updateInventory(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    broadcastState('INVENTORY_UPDATED', item);
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Offline Sync Batch Endpoint (Crucial Hackathon Resilience Feature)
app.post('/api/sync', (req, res) => {
  try {
    const { actions } = req.body;
    console.log(`🔄 Processing ${actions?.length || 0} offline sync actions...`);
    const newState = db.syncOfflineActions(actions);
    broadcastState('SYNC_COMPLETED', { count: actions?.length || 0 });
    res.json({ success: true, syncedCount: actions?.length || 0, state: newState });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Telegram Bot status and test notification endpoint
app.post('/api/telegram/test-notify', async (req, res) => {
  try {
    const { type, data } = req.body;
    const result = await sendTelegramNotification(type || 'NEW_APPOINTMENT', data || {
      client_name: 'Test Mijoz (Demo)',
      barber_name: 'Anvar Usta',
      service_name: 'Klassik Soch Olish',
      price: 50000,
      queue_number: 1
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/telegram/status', (req, res) => {
  res.json({
    active: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    botTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    adminChatConfigured: Boolean(process.env.TELEGRAM_ADMIN_CHAT_ID)
  });
});

// 8. Reset demo data
app.post('/api/reset', (req, res) => {
  const data = db.reset();
  broadcastState('DEMO_RESET', null);
  res.json({ success: true, message: 'Demo data reset successfully', state: data });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`💈 BarberFlow Backend API & WebSocket running on http://localhost:${PORT}`);
});
