import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { db } from './supabaseDb.js';
import { initTelegramBot, sendTelegramNotification } from './telegramBot.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Initialize Telegram Bot
const botInstance = initTelegramBot(process.env.APP_URL || 'http://localhost:5173');

// Broadcast state to all connected WebSocket clients
async function broadcastState(eventType = 'STATE_UPDATE', extraData = null) {
  try {
    const currentState = await db.getState();
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

wss.on('connection', async (ws) => {
  try {
    const currentState = await db.getState();
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
        <p>Backend port <strong>5050</strong>da faol. Frontend dasturini ochish uchun quyidagi tugmani bosing:</p>
        <a class="btn" href="${process.env.APP_URL || 'http://localhost:5173'}" target="_self">🚀 Frontend Ilovani Ochish</a>
        <div class="endpoints">
          <div><strong>Database:</strong> ${process.env.SUPABASE_URL ? 'Supabase PostgreSQL' : 'Local SQLite (barberflow.sqlite)'}</div>
          <div><strong>REST API:</strong> GET /api/state, /api/health</div>
          <div><strong>WebSocket:</strong> /ws</div>
          <div><strong>Telegram:</strong> /api/telegram/test-notify</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 1. Health check & current full state
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: process.env.SUPABASE_URL ? 'supabase' : 'sqlite',
    telegramActive: !botInstance?.isMock,
    time: new Date().toISOString()
  });
});

app.get('/api/state', async (req, res) => {
  try {
    const state = await db.getState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Add new appointment (Walk-in or online booking)
app.post('/api/appointments', async (req, res) => {
  try {
    const apt = await db.addAppointment(req.body);
    const state = await db.getState();
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

    await broadcastState('APPOINTMENT_ADDED', apt);
    res.status(201).json({ success: true, data: apt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update appointment status (in_progress, completed, no_show, cancelled)
app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const updated = await db.updateAppointmentStatus(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const state = await db.getState();
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

    await broadcastState('APPOINTMENT_UPDATED', updated);
    res.json({ success: true, data: updated, state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Record manual transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = await db.addTransaction(req.body);
    await broadcastState('TRANSACTION_ADDED', tx);
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update inventory item
app.patch('/api/inventory/:id', async (req, res) => {
  try {
    const item = await db.updateInventory(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    await broadcastState('INVENTORY_UPDATED', item);
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Offline Sync Batch Endpoint
app.post('/api/sync', async (req, res) => {
  try {
    const { actions } = req.body;
    console.log(`🔄 Processing ${actions?.length || 0} offline sync actions...`);
    const newState = await db.syncOfflineActions(actions);
    await broadcastState('SYNC_COMPLETED', { count: actions?.length || 0 });
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
app.post('/api/reset', async (req, res) => {
  const data = await db.reset();
  await broadcastState('DEMO_RESET', null);
  res.json({ success: true, message: 'Demo data reset successfully', state: data });
});

// Port & Host Configuration (0.0.0.0 for Docker & Railway)
const PORT = process.env.PORT || 5050;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`💈 BarberFlow Backend API & WebSocket running on http://${HOST}:${PORT}`);
});
