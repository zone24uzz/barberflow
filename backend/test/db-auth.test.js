import { test, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Use a throwaway DB file so tests never touch the real barberflow.sqlite
const TEST_DB = path.join(process.cwd(), 'test-barberflow.sqlite');
for (const suffix of ['', '-wal', '-shm']) {
  if (fs.existsSync(TEST_DB + suffix)) fs.unlinkSync(TEST_DB + suffix);
}
process.env.SQLITE_DB_PATH = TEST_DB;

// The repo's backend/.env has real Supabase credentials configured (needed for
// normal dev/deploy). Force the adapter's "unconfigured" path for these tests so
// they exercise the SQLite fallback as documented, instead of hitting the live
// Supabase project (whose profiles table lacks a password_hash column).
// Setting these (even to '') before supabaseDb.js's dotenv.config() runs prevents
// dotenv from populating them, since dotenv never overwrites an already-set key.
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SUPABASE_ANON_KEY = '';
process.env.SUPABASE_KEY = '';

const { db } = await import('../src/sqliteDb.js');

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
