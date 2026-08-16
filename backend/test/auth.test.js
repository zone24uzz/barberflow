import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

const TEST_DB = path.join(process.cwd(), 'test-auth-api.sqlite');
for (const suffix of ['', '-wal', '-shm']) {
  if (fs.existsSync(TEST_DB + suffix)) fs.unlinkSync(TEST_DB + suffix);
}
process.env.SQLITE_DB_PATH = TEST_DB;

const { db } = await import('../src/sqliteDb.js');
const { default: createAuthRouter } = await import('../src/auth.js');

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(db));
  await new Promise(resolve => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => server.close());

const post = (route, body) =>
  fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

describe('POST /api/auth/register', () => {
  test('registers a barber and never returns the password hash', async () => {
    const res = await post('/api/auth/register', {
      full_name: 'Anvar Usta',
      phone: '+998931112233',
      password: 'parol123',
      role: 'barber'
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'barber');
    assert.equal(body.user.full_name, 'Anvar Usta');
    assert.equal(body.user.password_hash, undefined);
    assert.equal(body.user.password, undefined);
  });

  test('stores a real bcrypt hash, not the plaintext password', async () => {
    const row = db.findProfileByPhone('+998931112233');
    assert.notEqual(row.password_hash, 'parol123');
    assert.match(row.password_hash, /^\$2[aby]\$/);
  });

  test('rejects a duplicate phone with 409', async () => {
    const res = await post('/api/auth/register', {
      full_name: 'Boshqa Odam',
      phone: '+998931112233',
      password: 'parol123',
      role: 'client'
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "Bu raqam allaqachon ro'yxatdan o'tgan");
  });

  test('rejects a password shorter than 4 characters with 400', async () => {
    const res = await post('/api/auth/register', {
      full_name: 'Qisqa Parol',
      phone: '+998901111111',
      password: '123',
      role: 'client'
    });
    assert.equal(res.status, 400);
  });

  test('rejects an empty full_name with 400', async () => {
    const res = await post('/api/auth/register', {
      full_name: '   ',
      phone: '+998902222222',
      password: 'parol123',
      role: 'client'
    });
    assert.equal(res.status, 400);
  });

  test('refuses to create an owner account', async () => {
    const res = await post('/api/auth/register', {
      full_name: 'Soxta Ega',
      phone: '+998903333333',
      password: 'parol123',
      role: 'owner'
    });
    assert.equal(res.status, 400);
    assert.equal(db.findProfileByPhone('+998903333333'), undefined);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const res = await post('/api/auth/login', {
      phone: '+998931112233',
      password: 'parol123'
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.user.role, 'barber');
    assert.equal(body.user.password_hash, undefined);
  });

  test('rejects a wrong password with a generic 401', async () => {
    const res = await post('/api/auth/login', {
      phone: '+998931112233',
      password: 'notmypassword'
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'Login yoki parol xato');
  });

  test('gives the same generic 401 for an unknown phone', async () => {
    const res = await post('/api/auth/login', {
      phone: '+998900000404',
      password: 'parol123'
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'Login yoki parol xato');
  });

  test('gives the same generic 401 for a legacy seeded account with no password', async () => {
    // barber-1 is seeded by the demo dataset and has password_hash = NULL
    const seeded = db.findProfileByPhone('+998 93 111 22 33');
    assert.ok(seeded, 'expected the seeded demo barber to exist');
    assert.equal(seeded.password_hash, null);

    const res = await post('/api/auth/login', {
      phone: '+998 93 111 22 33',
      password: 'anything'
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'Login yoki parol xato');
  });
});
