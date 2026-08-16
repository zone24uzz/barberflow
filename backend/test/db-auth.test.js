import { test, before, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Use a throwaway DB file in OS temp directory so tests never touch the repo workspace
const TEST_DB = path.join(os.tmpdir(), `barberflow-test-db-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
for (const suffix of ['', '-wal', '-shm']) {
  try {
    if (fs.existsSync(TEST_DB + suffix)) fs.unlinkSync(TEST_DB + suffix);
  } catch {
    // Ignore
  }
}
process.env.SQLITE_DB_PATH = TEST_DB;

// Force adapter to use SQLite fallback
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SUPABASE_ANON_KEY = '';
process.env.SUPABASE_KEY = '';

const { db } = await import('../src/sqliteDb.js');

after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      if (fs.existsSync(TEST_DB + suffix)) fs.unlinkSync(TEST_DB + suffix);
    } catch {
      // Ignore
    }
  }
});

describe('sqliteDb auth methods', () => {
  test('registerProfile creates a barber and returns the safe shape', () => {
    const created = db.registerProfile({
      full_name: 'Test Usta',
      phone: '+998900000001',
      password_hash: 'fake-hash-value',
      role: 'barber'
    });

    assert.equal(created.full_name, 'Test Usta');
    assert.equal(created.phone, '+998900000001');
    assert.equal(created.role, 'barber');
    assert.ok(created.id);
    assert.equal(created.password_hash, undefined, 'must not leak password_hash');
  });

  test('findProfileByPhone returns the full row including password_hash', () => {
    const found = db.findProfileByPhone('+998900000001');
    assert.ok(found);
    assert.equal(found.password_hash, 'fake-hash-value');
    assert.equal(found.role, 'barber');
  });

  test('findProfileByPhone returns undefined for an unknown phone', () => {
    assert.equal(db.findProfileByPhone('+998999999999'), undefined);
  });

  test('registerProfile throws PHONE_TAKEN on duplicate phone', () => {
    assert.throws(
      () => db.registerProfile({
        full_name: 'Boshqa Odam',
        phone: '+998900000001',
        password_hash: 'another-hash',
        role: 'client'
      }),
      /PHONE_TAKEN/
    );
  });

  test('registerProfile creates a client with a distinct id prefix', () => {
    const created = db.registerProfile({
      full_name: 'Test Mijoz',
      phone: '+998900000002',
      password_hash: 'client-hash',
      role: 'client'
    });
    assert.equal(created.role, 'client');
    assert.ok(created.id.startsWith('client-'));
  });
});

describe('supabaseDb adapter falls back to sqlite when unconfigured', () => {
  test('registerProfile and findProfileByPhone work through the adapter', async () => {
    // No SUPABASE_URL is set in the test env, so the adapter uses the SQLite path.
    const { db: adapter } = await import('../src/supabaseDb.js');

    const created = await adapter.registerProfile({
      full_name: 'Adapter Usta',
      phone: '+998900000003',
      password_hash: 'adapter-hash',
      role: 'barber'
    });
    assert.equal(created.role, 'barber');
    assert.equal(created.password_hash, undefined);

    const found = await adapter.findProfileByPhone('+998900000003');
    assert.equal(found.password_hash, 'adapter-hash');
  });

  test('adapter surfaces PHONE_TAKEN for duplicates', async () => {
    const { db: adapter } = await import('../src/supabaseDb.js');
    await assert.rejects(
      adapter.registerProfile({
        full_name: 'Takror',
        phone: '+998900000003',
        password_hash: 'x',
        role: 'client'
      }),
      /PHONE_TAKEN/
    );
  });
});

describe('getState never leaks password_hash', () => {
  test('sqliteDb getState().profiles includes the registered profile but no password_hash key', () => {
    db.registerProfile({
      full_name: 'Sirli Usta',
      phone: '+998900000099',
      password_hash: 'super-secret-bcrypt-hash',
      role: 'barber'
    });

    const { profiles } = db.getState();
    const match = profiles.find(p => p.phone === '+998900000099');

    assert.ok(match, 'registered profile must be present in getState().profiles');
    assert.equal('password_hash' in match, false, 'profile object must not carry a password_hash key');
    for (const p of profiles) {
      assert.equal('password_hash' in p, false, 'no profile in getState() may carry a password_hash key');
    }
  });

  test('supabaseDb adapter getState().profiles includes the registered profile but no password_hash key', async () => {
    const { db: adapter } = await import('../src/supabaseDb.js');

    await adapter.registerProfile({
      full_name: 'Sirli Mijoz',
      phone: '+998900000098',
      password_hash: 'another-super-secret-bcrypt-hash',
      role: 'client'
    });

    const { profiles } = await adapter.getState();
    const match = profiles.find(p => p.phone === '+998900000098');

    assert.ok(match, 'registered profile must be present in getState().profiles');
    assert.equal('password_hash' in match, false, 'profile object must not carry a password_hash key');
    for (const p of profiles) {
      assert.equal('password_hash' in p, false, 'no profile in getState() may carry a password_hash key');
    }
  });
});
