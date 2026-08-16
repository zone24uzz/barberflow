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
