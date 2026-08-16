import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TEST_DB = path.join(os.tmpdir(), `barberflow-test-api-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
for (const suffix of ['', '-wal', '-shm']) {
  try {
    if (fs.existsSync(TEST_DB + suffix)) fs.unlinkSync(TEST_DB + suffix);
  } catch {
    // Ignore
  }
}
process.env.SQLITE_DB_PATH = TEST_DB;
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SUPABASE_ANON_KEY = '';
process.env.SUPABASE_KEY = '';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      if (fs.existsSync(TEST_DB + suffix)) fs.unlinkSync(TEST_DB + suffix);
    } catch {
      // Ignore
    }
  }
});

const req = (route, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  return fetch(`${baseUrl}${route}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
};

describe('System & Health Endpoints', () => {
  test('GET / renders status HTML page', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('BarberFlow'));
  });

  test('GET /api/health returns system health', async () => {
    const res = await req('/api/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'sqlite');
  });

  test('GET /api/state returns full application state', async () => {
    const res = await req('/api/state');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.profiles));
    assert.ok(Array.isArray(body.services));
    assert.ok(Array.isArray(body.appointments));
    assert.ok(Array.isArray(body.inventory));
    assert.ok(Array.isArray(body.transactions));
  });
});

describe('Appointments Endpoints', () => {
  let createdAptId;

  test('POST /api/appointments creates a new appointment', async () => {
    const res = await req('/api/appointments', {
      method: 'POST',
      body: {
        client_name: 'Alisher Test',
        client_phone: '+998901234567',
        barber_id: 'barber-1',
        service_id: 'srv-1',
        price: 50000
      }
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.client_name, 'Alisher Test');
    createdAptId = body.data.id;
  });

  test('PATCH /api/appointments/:id updates appointment status to in_progress and completed', async () => {
    // 1. Move to in_progress
    const resProgress = await req(`/api/appointments/${createdAptId}`, {
      method: 'PATCH',
      body: { status: 'in_progress' }
    });
    assert.equal(resProgress.status, 200);
    const bodyProgress = await resProgress.json();
    assert.equal(bodyProgress.data.status, 'in_progress');
    assert.ok(bodyProgress.data.started_at);

    // 2. Move to completed
    const resCompleted = await req(`/api/appointments/${createdAptId}`, {
      method: 'PATCH',
      body: { status: 'completed', payment_type: 'card' }
    });
    assert.equal(resCompleted.status, 200);
    const bodyCompleted = await resCompleted.json();
    assert.equal(bodyCompleted.data.status, 'completed');
    assert.ok(bodyCompleted.data.completed_at);
  });

  test('PATCH /api/appointments/:id returns 404 for unknown appointment', async () => {
    const res = await req('/api/appointments/non-existent-id', {
      method: 'PATCH',
      body: { status: 'completed' }
    });
    assert.equal(res.status, 404);
  });
});

describe('Transactions & Inventory Endpoints', () => {
  test('POST /api/transactions creates manual transaction', async () => {
    const res = await req('/api/transactions', {
      method: 'POST',
      body: {
        client_name: 'Manual Tx Client',
        barber_id: 'barber-1',
        amount: 80000,
        payment_type: 'uzum'
      }
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.amount, 80000);
  });

  test('PATCH /api/inventory/:id updates stock quantity', async () => {
    const res = await req('/api/inventory/inv-1', {
      method: 'PATCH',
      body: { stock_quantity: 45 }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.stock_quantity, 45);
  });
});

describe('Offline Sync & Telegram & Reset Endpoints', () => {
  test('POST /api/sync processes offline actions batch', async () => {
    const res = await req('/api/sync', {
      method: 'POST',
      body: {
        actions: [
          {
            type: 'ADD_APPOINTMENT',
            payload: {
              id: 'apt-offline-1',
              client_name: 'Offline Mijoz',
              barber_id: 'barber-2',
              service_id: 'srv-2',
              price: 30000,
              is_offline_created: true
            }
          }
        ]
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.syncedCount, 1);
  });

  test('GET /api/telegram/status & POST /api/telegram/test-notify', async () => {
    const statusRes = await req('/api/telegram/status');
    assert.equal(statusRes.status, 200);

    const notifyRes = await req('/api/telegram/test-notify', {
      method: 'POST',
      body: {
        type: 'NEW_APPOINTMENT',
        data: { client_name: 'Test', price: 50000 }
      }
    });
    assert.equal(notifyRes.status, 200);
    const notifyBody = await notifyRes.json();
    assert.equal(notifyBody.success, true);
  });

  test('POST /api/reset resets data back to seeds', async () => {
    const res = await req('/api/reset', { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.state.profiles.length > 0);
  });

  test('POST /api/ai/chat returns intelligent role responses for client, barber, owner', async () => {
    // 1. Client AI query
    const clientRes = await req('/api/ai/chat', {
      method: 'POST',
      body: {
        role: 'client',
        prompt: 'Dumaloq yuzga qanday soch turmagi yarashadi?'
      }
    });
    assert.equal(clientRes.status, 200);
    const clientBody = await clientRes.json();
    assert.equal(clientBody.success, true);
    assert.ok(clientBody.reply.length > 10);

    // 2. Barber AI query
    const barberRes = await req('/api/ai/chat', {
      method: 'POST',
      body: {
        role: 'barber',
        prompt: 'Navbatimda qancha mijoz bor?',
        userContext: { id: 'barber-1' }
      }
    });
    assert.equal(barberRes.status, 200);
    const barberBody = await barberRes.json();
    assert.equal(barberBody.success, true);
    assert.ok(barberBody.reply.length > 10);

    // 3. Owner AI query
    const ownerRes = await req('/api/ai/chat', {
      method: 'POST',
      body: {
        role: 'owner',
        prompt: 'Bugungi kassa va tushum holati qanday?'
      }
    });
    assert.equal(ownerRes.status, 200);
    const ownerBody = await ownerRes.json();
    assert.equal(ownerBody.success, true);
    assert.ok(ownerBody.reply.length > 10);
  });

  test('Unknown route returns 404 JSON', async () => {
    const res = await req('/api/unknown-endpoint');
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });
});
