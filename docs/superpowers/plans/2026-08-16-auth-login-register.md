# Usta/Mijoz Login & Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add separate login/register for barbers and clients, so a barber sees only their own queue and a client must be logged in to book a slot with a specific barber.

**Architecture:** Client-trust sessions. The backend verifies `phone` + `password` (bcryptjs) once against a new `password_hash` column on `profiles`, and returns a safe profile object. The frontend stores it as `currentUser` in the existing Zustand `persist` store and uses it to decide which view renders. No JWT, no session table, no `Authorization` header — every existing REST endpoint stays exactly as open as it is today.

**Tech Stack:** Node.js ESM + Express (backend), `bcryptjs`, `node:test` (built-in test runner), better-sqlite3 (local fallback DB), Supabase PostgreSQL (cloud DB), React 19 + Zustand + Tailwind v4 (frontend).

**Spec:** `docs/superpowers/specs/2026-08-16-auth-login-register-design.md`

## Global Constraints

- **Backend is ESM** (`"type": "module"` in `backend/package.json`) — use `import`, never `require`.
- **Use `bcryptjs`, NOT `bcrypt`.** `bcrypt` is a native module; this project already lost a deploy to a native-binary/musl crash (see `backend/Dockerfile`, now `node:22-slim`). `bcryptjs` is pure JS and has no build step.
- **All user-facing strings are Uzbek Latin.** Match the existing tone in the codebase (e.g. `'Noma\'lum mijoz'`, `'Navbat Muvaffaqiyatli Olindi!'`).
- **Never return `password_hash` to the client.** Every auth response returns exactly `{ id, full_name, phone, role }`.
- **Login/register error message for bad credentials is always the same generic string** — `"Login yoki parol xato"` — whether the phone is unknown, the password is wrong, or the row is a legacy seeded profile with `password_hash = NULL`. Do not leak which.
- **`role` on register must be validated to be exactly `'barber'` or `'client'`.** Never allow `'owner'` through the register endpoint.
- **Minimum password length is 4 characters.** Validated on both frontend (pre-submit) and backend (400).
- **Do not delete `selectedBarberId` from `useAppStore.js`.** The spec suggested it might be removable, but it is still used as a fallback at `useAppStore.js:74` (`addAppointment`) and is in `partialize` at line 273. Only `BarberView.jsx` stops reading it.
- **Existing API endpoints stay unauthenticated.** This plan adds `/api/auth/*` only; it does not add middleware to any existing route.
- **Frontend API calls go through `API_BASE`** (`import.meta.env.VITE_API_URL || ''`), the pattern already established at `useAppStore.js:4`.

---

## File Structure

**Backend**
- Create `backend/src/auth.js` — the two route handlers (`register`, `login`) as an Express router. Owns all validation and hashing. One responsibility: credential handling.
- Create `backend/test/auth.test.js` — `node:test` suite for the auth endpoints, run against the SQLite fallback.
- Modify `backend/src/sqliteDb.js` — add `password_hash` to the schema, add an in-place migration for existing DB files, add `findProfileByPhone` + `registerProfile` methods.
- Modify `backend/src/supabaseDb.js` — add the same two methods on the Supabase adapter, each falling back to SQLite like every other method in that file.
- Modify `backend/src/server.js` — mount the auth router.
- Modify `backend/package.json` — add `bcryptjs`, add a `test` script.
- Modify `backend/supabase_schema.sql` — add the column + unique index so a fresh Supabase project gets it.

**Frontend**
- Create `frontend/src/components/AuthGate.jsx` — the login/register screen with Usta/Mijoz tabs. One responsibility: collecting credentials and calling the store.
- Modify `frontend/src/store/useAppStore.js` — `currentUser` state, `login`, `register`, `logout`.
- Modify `frontend/src/App.jsx` — route barber/client views through the gate.
- Modify `frontend/src/components/Navbar.jsx` — logout button + current user name.
- Modify `frontend/src/components/views/BarberView.jsx` — remove the barber switcher, source identity from `currentUser`.
- Modify `frontend/src/components/views/ClientView.jsx` — pre-fill name/phone from `currentUser`.

**Migration**
- Create `scripts/migrate-add-password-hash.mjs` — one-off script to add the column + index to the live Supabase database.

---

### Task 1: Database layer — schema, migration, and profile lookup

**Files:**
- Modify: `backend/src/sqliteDb.js` (schema at lines 16-79, `initSchema()` at 15-86, new methods on `SqliteDB` class)
- Modify: `backend/supabase_schema.sql`
- Create: `scripts/migrate-add-password-hash.mjs`
- Test: `backend/test/db-auth.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `SqliteDB.prototype.findProfileByPhone(phone: string) => profileRow | undefined` — returns the **full** row including `password_hash`. Internal use only; never sent to a client.
  - `SqliteDB.prototype.registerProfile({ full_name, phone, password_hash, role }) => { id, full_name, phone, role }` — returns the safe shape, no hash. Throws `Error('PHONE_TAKEN')` if the phone already exists.

- [ ] **Step 1: Add `bcryptjs` and a test script to backend/package.json**

Edit `backend/package.json` — add to `dependencies` (keep alphabetical order):

```json
    "bcryptjs": "^2.4.3",
```

and add to `scripts`:

```json
    "test": "node --test test/"
```

Then install:

```bash
cd backend && npm install
```

- [ ] **Step 2: Write the failing test**

Create `backend/test/db-auth.test.js`:

```js
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
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd backend && npm test
```

Expected: FAIL — `db.registerProfile is not a function`.

- [ ] **Step 4: Make the DB path configurable and add `password_hash` to the schema**

In `backend/src/sqliteDb.js`, change the `DB_PATH` constant (currently line 7) so tests can point it elsewhere:

```js
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '../barberflow.sqlite');
```

Then in `initSchema()`, add the column to the `profiles` table definition (currently lines 17-25):

```js
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL, -- 'owner' | 'barber' | 'client'
      is_active INTEGER DEFAULT 1,
      avatar_badge TEXT,
      password_hash TEXT,
      created_at TEXT NOT NULL
    );
```

- [ ] **Step 5: Add the in-place migration for already-created local DB files**

`CREATE TABLE IF NOT EXISTS` will not add a column to a database file that already exists, and developers (plus the Railway container, if it ever falls back to SQLite) already have one. Inside `initSchema()`, immediately after the `sqlite.exec(...)` block and **before** the seed check, add:

```js
  // Existing barberflow.sqlite files predate password_hash — add it once.
  const profileColumns = sqlite.prepare('PRAGMA table_info(profiles)').all();
  if (!profileColumns.some(c => c.name === 'password_hash')) {
    sqlite.exec('ALTER TABLE profiles ADD COLUMN password_hash TEXT');
  }
```

- [ ] **Step 6: Add the two methods to the `SqliteDB` class**

In `backend/src/sqliteDb.js`, add these methods to the `SqliteDB` class (place them after `getState()`, before `addAppointment()`):

```js
  findProfileByPhone(phone) {
    return sqlite.prepare('SELECT * FROM profiles WHERE phone = ?').get(phone);
  }

  registerProfile({ full_name, phone, password_hash, role }) {
    if (this.findProfileByPhone(phone)) {
      throw new Error('PHONE_TAKEN');
    }

    const id = `${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const avatar = role === 'barber' ? '💈' : '🙂';

    sqlite.prepare(`
      INSERT INTO profiles (id, full_name, phone, role, is_active, avatar_badge, password_hash, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(id, full_name, phone, role, avatar, password_hash, new Date().toISOString());

    return { id, full_name, phone, role };
  }
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd backend && npm test
```

Expected: PASS — all 5 tests in `db-auth.test.js`.

- [ ] **Step 8: Add the column and unique index to the Supabase schema file**

In `backend/supabase_schema.sql`, add `password_hash` to the `profiles` CREATE TABLE (after `avatar_badge`):

```sql
    password_hash TEXT,
```

and add this immediately after that `CREATE TABLE` statement:

```sql
-- Phone is the login identifier, so it must be unique where present.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles(phone) WHERE phone IS NOT NULL;
```

- [ ] **Step 9: Write the live-Supabase migration script**

The live Supabase project already has a `profiles` table without this column, so editing the schema file is not enough. Create `scripts/migrate-add-password-hash.mjs`:

```js
// One-off migration: add password_hash + phone unique index to a live Supabase DB.
// Usage: PG_CONN='postgresql://...' node scripts/migrate-add-password-hash.mjs
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.PG_CONN,
  ssl: { rejectUnauthorized: false }
});

const SQL = `
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
    ON public.profiles(phone) WHERE phone IS NOT NULL;
`;

try {
  await client.connect();
  await client.query(SQL);
  console.log('MIGRATION_OK');
} catch (err) {
  console.error('MIGRATION_FAILED:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
```

Note for the operator: connect via the **pooler** host (`aws-0-<region>.pooler.supabase.com:6543`), not `db.<ref>.supabase.co` — the direct host is IPv6-only on new Supabase projects and will fail with `ENOTFOUND`. The seeded demo profiles share no duplicate phone numbers, so the unique index will build cleanly.

- [ ] **Step 10: Commit**

```bash
git add backend/src/sqliteDb.js backend/supabase_schema.sql backend/package.json backend/package-lock.json backend/test/db-auth.test.js scripts/migrate-add-password-hash.mjs
git commit -m "feat: add password_hash column and profile lookup/registration to DB layer"
```

---

### Task 2: Supabase adapter methods

**Files:**
- Modify: `backend/src/supabaseDb.js` (add two methods to `SupabaseAdapter`)
- Test: `backend/test/db-auth.test.js` (extend — the adapter delegates to SQLite when unconfigured, which is exactly the path tests exercise)

**Interfaces:**
- Consumes: `SqliteDB.findProfileByPhone`, `SqliteDB.registerProfile` from Task 1.
- Produces: identical signatures on `SupabaseAdapter`, so `server.js` can call `db.findProfileByPhone(...)` / `db.registerProfile(...)` without caring which backend is live.

- [ ] **Step 1: Write the failing test**

Append to `backend/test/db-auth.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && npm test
```

Expected: FAIL — `adapter.registerProfile is not a function`.

- [ ] **Step 3: Add the two methods to `SupabaseAdapter`**

In `backend/src/supabaseDb.js`, add these methods to the class (place after `getState()`, before `addAppointment()`). Note the deliberate difference from every other method in this file: **`PHONE_TAKEN` must be rethrown, not swallowed into a SQLite fallback** — a duplicate phone is a real answer from the database, not a Supabase outage, and falling back would create the account locally and desync the two databases.

```js
  async findProfileByPhone(phone) {
    if (!this.isConfigured) {
      return sqliteDb.findProfileByPhone(phone);
    }

    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;
    return data || undefined;
  }

  async registerProfile({ full_name, phone, password_hash, role }) {
    if (!this.isConfigured) {
      return sqliteDb.registerProfile({ full_name, phone, password_hash, role });
    }

    const existing = await this.findProfileByPhone(phone);
    if (existing) throw new Error('PHONE_TAKEN');

    const newProfile = {
      id: `${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      full_name,
      phone,
      role,
      is_active: true,
      avatar_badge: role === 'barber' ? '💈' : '🙂',
      password_hash,
      created_at: new Date().toISOString()
    };

    const { error } = await this.client.from('profiles').insert(newProfile);
    if (error) {
      // 23505 = unique_violation, i.e. the phone index caught a race.
      if (error.code === '23505') throw new Error('PHONE_TAKEN');
      throw error;
    }

    return { id: newProfile.id, full_name, phone, role };
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npm test
```

Expected: PASS — all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/supabaseDb.js backend/test/db-auth.test.js
git commit -m "feat: add auth profile methods to Supabase adapter"
```

---

### Task 3: Auth API endpoints

**Files:**
- Create: `backend/src/auth.js`
- Modify: `backend/src/server.js` (add import near line 8, mount router after the existing middleware block around line 18)
- Test: `backend/test/auth.test.js`

**Interfaces:**
- Consumes: `db.findProfileByPhone`, `db.registerProfile` from Tasks 1-2.
- Produces:
  - `POST /api/auth/register` — body `{ full_name, phone, password, role }` → 201 `{ success: true, user: { id, full_name, phone, role } }`
  - `POST /api/auth/login` — body `{ phone, password }` → 200 `{ success: true, user: { id, full_name, phone, role } }`
  - Both error shapes: `{ success: false, error: "<uzbek message>" }`
  - Default export: `createAuthRouter(db)` returning an Express `Router`.

- [ ] **Step 1: Write the failing test**

Create `backend/test/auth.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && npm test
```

Expected: FAIL — cannot resolve `../src/auth.js`.

- [ ] **Step 3: Write the auth router**

Create `backend/src/auth.js`:

```js
import express from 'express';
import bcrypt from 'bcryptjs';

const BAD_CREDENTIALS = 'Login yoki parol xato';
const ALLOWED_ROLES = ['barber', 'client'];
const MIN_PASSWORD_LENGTH = 4;

function toSafeUser({ id, full_name, phone, role }) {
  return { id, full_name, phone, role };
}

export default function createAuthRouter(db) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { full_name, phone, password, role } = req.body || {};

    if (!full_name?.trim()) {
      return res.status(400).json({ success: false, error: 'Ismingizni kiriting' });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, error: 'Telefon raqamingizni kiriting' });
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lsin` });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Roli notogri (faqat usta yoki mijoz)' });
    }

    try {
      const password_hash = await bcrypt.hash(password, 10);
      const user = await db.registerProfile({
        full_name: full_name.trim(),
        phone: phone.trim(),
        password_hash,
        role
      });
      res.status(201).json({ success: true, user: toSafeUser(user) });
    } catch (err) {
      if (err.message === 'PHONE_TAKEN') {
        return res.status(409).json({ success: false, error: "Bu raqam allaqachon ro'yxatdan o'tgan" });
      }
      console.error('Register error:', err);
      res.status(500).json({ success: false, error: 'Server xatosi, keyinroq urinib ko\'ring' });
    }
  });

  router.post('/login', async (req, res) => {
    const { phone, password } = req.body || {};

    if (!phone?.trim() || !password) {
      return res.status(400).json({ success: false, error: 'Telefon va parolni kiriting' });
    }

    try {
      const profile = await db.findProfileByPhone(phone.trim());

      // Same generic response for unknown phone, legacy row without a hash,
      // and wrong password — never reveal which one it was.
      if (!profile?.password_hash) {
        return res.status(401).json({ success: false, error: BAD_CREDENTIALS });
      }

      const matches = await bcrypt.compare(password, profile.password_hash);
      if (!matches) {
        return res.status(401).json({ success: false, error: BAD_CREDENTIALS });
      }

      res.json({ success: true, user: toSafeUser(profile) });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Server xatosi, keyinroq urinib ko\'ring' });
    }
  });

  return router;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npm test
```

Expected: PASS — all 17 tests across both files.

- [ ] **Step 5: Mount the router in server.js**

In `backend/src/server.js`, add the import alongside the others (after line 8):

```js
import createAuthRouter from './auth.js';
```

and mount it after the `app.use(morgan('dev'));` line (currently line 18):

```js
app.use('/api/auth', createAuthRouter(db));
```

- [ ] **Step 6: Verify the server still boots**

```bash
cd backend && timeout 5 node src/server.js
```

Expected: the usual startup lines (`Connected to Supabase...` / `Backend API & WebSocket running on http://0.0.0.0:5050`) and no stack trace. Exit code 124 is just the timeout, not a failure.

- [ ] **Step 7: Add test artifacts to .gitignore**

Add to the root `.gitignore` (the existing `*.sqlite` rule already covers the test DBs, but the test directory produces WAL files too — confirm `*.sqlite-wal` and `*.sqlite-shm` are already listed; they are). No change needed if so — verify with:

```bash
cd /c/Users/admin/barberflow && git status --porcelain | grep -i sqlite
```

Expected: no output (test DBs are ignored).

- [ ] **Step 8: Commit**

```bash
git add backend/src/auth.js backend/src/server.js backend/test/auth.test.js
git commit -m "feat: add /api/auth/register and /api/auth/login endpoints"
```

---

### Task 4: Store auth state and actions

**Files:**
- Modify: `frontend/src/store/useAppStore.js` (state block near line 17, setters near line 32, `partialize` at 266-274)

**Interfaces:**
- Consumes: the `/api/auth/*` endpoints from Task 3.
- Produces (used by Tasks 5-8):
  - `currentUser: { id, full_name, phone, role } | null`
  - `login(phone, password) => Promise<{ ok: boolean, error?: string }>`
  - `register({ full_name, phone, password, role }) => Promise<{ ok: boolean, error?: string }>`
  - `logout() => void`

- [ ] **Step 1: Add `currentUser` to state and to the persisted set**

In `frontend/src/store/useAppStore.js`, add to the state block right after `currentRole` (line 17):

```js
      currentUser: null, // { id, full_name, phone, role } once logged in
```

and add it to `partialize` (in the object at lines 266-274), after `offlineQueue`:

```js
        currentUser: state.currentUser,
```

- [ ] **Step 2: Add the three auth actions**

Add these to the store, after `setActivePaymentApt` (line 35). They deliberately do **not** use the offline queue: a credential check has no local equivalent to run against, so offline is a hard failure rather than a deferred write.

```js
      login: async (phone, password) => {
        if (!get().getEffectiveOnline()) {
          return { ok: false, error: 'Internetga ulaning' };
        }

        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
          });
          const data = await res.json();

          if (!res.ok) return { ok: false, error: data.error || 'Kirishda xatolik' };

          set({ currentUser: data.user, currentRole: data.user.role });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Serverga ulanib bolmadi' };
        }
      },

      register: async ({ full_name, phone, password, role }) => {
        if (!get().getEffectiveOnline()) {
          return { ok: false, error: 'Internetga ulaning' };
        }

        try {
          const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, phone, password, role })
          });
          const data = await res.json();

          if (!res.ok) return { ok: false, error: data.error || 'Royxatdan otishda xatolik' };

          // Registering logs you straight in — no second step.
          set({ currentUser: data.user, currentRole: data.user.role });
          await get().fetchServerState(); // pick up the new barber in everyone's profile list
          return { ok: true };
        } catch {
          return { ok: false, error: 'Serverga ulanib bolmadi' };
        }
      },

      logout: () => set({ currentUser: null }),
```

- [ ] **Step 3: Verify the app still builds**

```bash
cd frontend && npm install && npm run build
```

Expected: `✓ built in <time>`, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/useAppStore.js
git commit -m "feat: add currentUser state and login/register/logout actions to store"
```

---

### Task 5: AuthGate component

**Files:**
- Create: `frontend/src/components/AuthGate.jsx`

**Interfaces:**
- Consumes: `login`, `register`, `currentRole` from the store (Task 4); `sound` from `../utils/sound`.
- Produces: default-exported `<AuthGate />`, rendered by `App.jsx` in Task 6. Takes no props — it reads `currentRole` itself to pick the initially-active tab.

- [ ] **Step 1: Write the component**

Create `frontend/src/components/AuthGate.jsx`. Styling follows the existing dark/amber conventions from `ClientView.jsx` (`bg-[#10121a]`, `border-white/[0.06]`, `bg-amber-500 text-slate-950` for primary buttons).

```jsx
import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Scissors, Smartphone, User, Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { sound } from '../utils/sound';

const MIN_PASSWORD_LENGTH = 4;

export default function AuthGate() {
  const { currentRole, login, register } = useAppStore();

  const [tab, setTab] = useState(currentRole === 'barber' ? 'barber' : 'client');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const isBarberTab = tab === 'barber';

  const switchTab = (nextTab) => {
    sound.play('toggle');
    setTab(nextTab);
    setError('');
  };

  const switchMode = (nextMode) => {
    sound.play('click');
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lsin`);
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      setError('Ismingizni kiriting');
      return;
    }

    setIsBusy(true);
    const result = mode === 'login'
      ? await login(phone.trim(), password)
      : await register({ full_name: fullName.trim(), phone: phone.trim(), password, role: tab });
    setIsBusy(false);

    if (result.ok) {
      sound.play('success');
      setPassword('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center">
          {isBarberTab ? <Scissors className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          {mode === 'login' ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}
        </h1>
        <p className="text-xs text-slate-400">
          {isBarberTab
            ? 'Usta sifatida kirib, o\'z navbatingizni boshqaring'
            : 'Mijoz sifatida kirib, jonli navbat oling'}
        </p>
      </div>

      {/* Role tabs */}
      <div className="p-1 rounded-2xl bg-[#10121a] border border-white/[0.06] flex gap-1">
        {[
          { id: 'barber', label: 'Usta', icon: Scissors },
          { id: 'client', label: 'Mijoz', icon: Smartphone }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              tab === id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* The tab only picks the role for registration. Login is credential-only:
          the account's stored role wins, so a wrong tab is never a dead end. */}
      {mode === 'login' && (
        <p className="text-[11px] text-slate-500 text-center px-2">
          Kirishda tab muhim emas — hisobingiz roli avtomatik aniqlanadi
        </p>
      )}

      <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Ismingiz</span>
            </label>
            <input
              type="text"
              required
              placeholder={isBarberTab ? 'Masalan: Anvar Usta' : 'Masalan: Sardorbek'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Telefon raqamingiz</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+998 90 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Parol</span>
          </label>
          <input
            type="password"
            required
            placeholder="Kamida 4 ta belgi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-slate-100 placeholder-slate-500"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{mode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="w-full text-xs text-slate-400 hover:text-amber-400 transition-colors font-semibold"
        >
          {mode === 'login'
            ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting"
            : 'Hisobingiz bormi? Kirish'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build passes**

```bash
cd frontend && npm run build
```

Expected: `✓ built in <time>`, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AuthGate.jsx
git commit -m "feat: add AuthGate login/register screen with barber and client tabs"
```

---

### Task 6: Route views through the gate

**Files:**
- Modify: `frontend/src/App.jsx` (imports at 1-9, destructure at 12-19, render block at 109-113)

**Interfaces:**
- Consumes: `<AuthGate />` (Task 5), `currentUser` (Task 4).
- Produces: the routing rule every later task assumes — `BarberView`/`ClientView` render only when `currentUser.role` matches `currentRole`; `OwnerView` is never gated.

- [ ] **Step 1: Import AuthGate and read currentUser**

In `frontend/src/App.jsx`, add the import after the `OfflineBanner` import (line 4):

```js
import AuthGate from './components/AuthGate';
```

and add `currentUser` to the destructured store values (in the block at lines 12-19):

```js
    currentUser,
```

- [ ] **Step 2: Add the gate rule and update the render block**

Add this just above the `return (` (line 104):

```js
  // Owner stays an open tab; barber and client require a matching account.
  const needsAuth =
    (currentRole === 'barber' || currentRole === 'client') &&
    currentUser?.role !== currentRole;
```

Then replace the `<main>` contents (lines 109-113) with:

```jsx
      <main className="flex-1 pb-16">
        {needsAuth ? (
          <AuthGate />
        ) : (
          <>
            {currentRole === 'owner' && <OwnerView />}
            {currentRole === 'barber' && <BarberView />}
            {currentRole === 'client' && <ClientView />}
          </>
        )}
      </main>
```

- [ ] **Step 3: Verify the build passes**

```bash
cd frontend && npm run build
```

Expected: `✓ built in <time>`, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: gate barber and client views behind AuthGate"
```

---

### Task 7: Barber sees only their own station

**Files:**
- Modify: `frontend/src/components/views/BarberView.jsx` (destructure at 17-27, identity at 30-31, switcher markup at 76-92)

**Interfaces:**
- Consumes: `currentUser` (Task 4), the gate guarantee from Task 6 that this view only renders when `currentUser.role === 'barber'`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Source identity from currentUser instead of the global switcher**

In `frontend/src/components/views/BarberView.jsx`, change the destructured store values (lines 17-27) — remove `selectedBarberId` and `setSelectedBarberId`, add `currentUser`:

```js
  const {
    profiles,
    services,
    appointments,
    transactions,
    currentUser,
    updateAppointmentStatus,
    setActivePaymentApt,
    setIsWalkInModalOpen
  } = useAppStore();
```

Then replace lines 30-31:

```js
  const barbers = profiles.filter(p => p.role === 'barber');
  const currentBarber = barbers.find(b => b.id === currentUser?.id) || currentUser;
```

The fallback to `currentUser` matters: a freshly-registered barber is in `currentUser` immediately, but won't appear in the `profiles` array until the next `fetchServerState`/WebSocket push. Without it, the header would render blank for a few seconds after signup.

- [ ] **Step 2: Delete the barber switcher block**

Remove the entire `{/* 1. Barber Switcher */}` block (lines 76-92) — the `<div>` wrapping the `barbers.map(...)` buttons. A logged-in barber must not be able to open a colleague's queue and earnings.

Renumber the following comment from `{/* 2. Barber Profile & Earnings Hub */}` to `{/* 1. Barber Profile & Earnings Hub */}` and continue renumbering the rest of the sections in that file so the comments stay accurate.

- [ ] **Step 3: Confirm no orphaned references remain**

```bash
cd /c/Users/admin/barberflow && grep -n "selectedBarberId\|setSelectedBarberId\|barbers" frontend/src/components/views/BarberView.jsx
```

Expected: no `selectedBarberId` / `setSelectedBarberId` hits. If `barbers` is now unused, delete that line too; if it is still referenced elsewhere in the file, leave it.

- [ ] **Step 4: Verify the build passes**

```bash
cd frontend && npm run build
```

Expected: `✓ built in <time>`, no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/views/BarberView.jsx
git commit -m "feat: barber station shows only the logged-in barber, drop switcher"
```

---

### Task 8: Client pre-fill and Navbar logout

**Files:**
- Modify: `frontend/src/components/views/ClientView.jsx` (destructure at 16-21, useState at 28-29)
- Modify: `frontend/src/components/Navbar.jsx` (destructure at 21-31, action bar around lines 85-161)

**Interfaces:**
- Consumes: `currentUser`, `logout` (Task 4).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Pre-fill the client booking form**

In `frontend/src/components/views/ClientView.jsx`, add `currentUser` to the destructured store values (lines 16-21):

```js
  const {
    profiles,
    services,
    appointments,
    currentUser,
    addAppointment
  } = useAppStore();
```

Then seed the two form fields from the account (lines 28-29). They stay editable — someone may be booking for a family member:

```js
  const [clientName, setClientName] = useState(currentUser?.full_name || '');
  const [clientPhone, setClientPhone] = useState(currentUser?.phone || '');
```

- [ ] **Step 2: Add the logout control to the Navbar**

In `frontend/src/components/Navbar.jsx`, add to the destructured store values (lines 21-31):

```js
    currentUser,
    logout,
```

Add the `LogOut` icon to the existing `lucide-react` import (lines 3-15):

```js
  LogOut,
```

Then add this block inside the action-tools `<div>` (the one starting at line 85), immediately before the Analytics button, so it sits at the left of that group:

```jsx
              {/* Logged-in user + logout */}
              {currentUser && (
                <div className="flex items-center gap-2 pr-2 mr-1 border-r border-white/[0.08]">
                  <span className="hidden sm:inline text-xs font-semibold text-slate-300 max-w-[140px] truncate">
                    {currentUser.full_name}
                  </span>
                  <button
                    onClick={() => { sound.play('toggle'); logout(); }}
                    title="Hisobdan chiqish"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#14161f] hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-white/[0.08] hover:border-red-500/30 transition-all active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chiqish</span>
                  </button>
                </div>
              )}
```

- [ ] **Step 3: Verify the build passes**

```bash
cd frontend && npm run build
```

Expected: `✓ built in <time>`, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/views/ClientView.jsx frontend/src/components/Navbar.jsx
git commit -m "feat: pre-fill client booking form and add navbar logout"
```

---

### Task 9: Migrate the live database and verify end-to-end

**Files:**
- Run: `scripts/migrate-add-password-hash.mjs` (created in Task 1)
- No source changes expected unless verification finds a defect.

**Interfaces:**
- Consumes: everything from Tasks 1-8.
- Produces: a verified working deployment.

- [ ] **Step 1: Run the full backend test suite one more time**

```bash
cd backend && npm test
```

Expected: PASS, 17 tests, 0 failures. Do not proceed past a failure.

- [ ] **Step 2: Migrate the live Supabase database**

The connection string uses the pooler host and the DB password saved during project setup. Retrieve the password from the operator (it is not in the repo — it lives only in this session's scratchpad, `supabase_db_pass.txt`). Then:

```bash
cd /c/Users/admin/barberflow
PG_CONN="postgresql://postgres.wltykarpnigwqvzenrru:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" node scripts/migrate-add-password-hash.mjs
```

Expected: `MIGRATION_OK`. The `pg` package is needed — if it is not installed, run it from a directory where `pg` is available, or `npm install pg` in a scratch directory first.

- [ ] **Step 3: Verify the column landed**

```bash
PG_CONN="postgresql://postgres.wltykarpnigwqvzenrru:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" node -e "
import('pg').then(async ({ default: pg }) => {
  const c = new pg.Client({ connectionString: process.env.PG_CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = await c.query(\"select column_name from information_schema.columns where table_name='profiles' and column_name='password_hash'\");
  console.log(rows.length === 1 ? 'COLUMN_PRESENT' : 'COLUMN_MISSING');
  await c.end();
});
"
```

Expected: `COLUMN_PRESENT`.

- [ ] **Step 4: Deploy the backend**

```bash
cd /c/Users/admin/barberflow/backend && railway up --detach --service barberflow
```

Then poll until the instance reports `RUNNING`, and confirm health:

```bash
curl -s -m 10 https://barberflow-production-a1a9.up.railway.app/api/health
```

Expected: `{"status":"ok","database":"supabase",...}`.

- [ ] **Step 5: Smoke-test the live auth endpoints**

```bash
BASE=https://barberflow-production-a1a9.up.railway.app
# Register a throwaway barber
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"full_name":"Smoke Test Usta","phone":"+998900000777","password":"test1234","role":"barber"}'
# Log in with it
curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+998900000777","password":"test1234"}'
# Wrong password must be a generic 401
curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+998900000777","password":"wrong"}'
```

Expected: 201 with a user object, then 200 with the same user, then `{"success":false,"error":"Login yoki parol xato"}`. No response may contain `password_hash`.

- [ ] **Step 6: Deploy the frontend**

```bash
cd /c/Users/admin/barberflow/frontend && npx vercel --prod
```

Expected: `READY`, aliased to `https://frontend-bay-two-99.vercel.app`.

- [ ] **Step 7: Manual browser verification**

Open `https://frontend-bay-two-99.vercel.app` and confirm, in order:

1. "Usta Paneli" tab shows the AuthGate, not a dashboard.
2. Register a barber → lands directly in `BarberView`, header shows the new name, **no barber switcher row is present**.
3. "Chiqish" in the Navbar returns to the AuthGate.
4. "Mijoz Navbati" tab shows the AuthGate.
5. Register a client → lands in `ClientView` with the name and phone pre-filled.
6. Book a slot with a specific barber → the booking succeeds and the confirmation names that barber.
7. Log out, log back in as the barber from step 2 → the booking from step 6 appears in that barber's queue if it was booked to them.
8. "Boshqaruv (Ega)" tab still opens directly with no login.

Report any step that fails rather than patching over it — a failure here means an earlier task has a defect worth fixing at its source.

- [ ] **Step 8: Clean up the smoke-test account**

The `+998900000777` account created in Step 5 is test data in a production database. Remove it:

```bash
PG_CONN="postgresql://postgres.wltykarpnigwqvzenrru:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" node -e "
import('pg').then(async ({ default: pg }) => {
  const c = new pg.Client({ connectionString: process.env.PG_CONN, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(\"delete from profiles where phone = '+998900000777'\");
  console.log('deleted rows:', r.rowCount);
  await c.end();
});
"
```

- [ ] **Step 9: Commit any fixes and push**

```bash
cd /c/Users/admin/barberflow
git status
git push origin main
```
