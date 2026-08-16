# BarberFlow — Usta/Mijoz Login & Register

Status: Approved for planning
Date: 2026-08-16

## 1. Goal

Today `currentRole` is a free toggle in the Navbar — anyone can switch into
"Usta Paneli" and flip between every barber's queue and earnings via a
"Barber Switcher" widget, or switch into "Boshqaruv (Ega)" and see the full
cash journal. There is no concept of an account.

This feature adds real login/register for two roles — **usta (barber)** and
**mijoz (client)** — with separate registration flows, so that:

- A barber logs in and sees only their own queue/earnings (no switcher).
- A client must log in before booking a queue slot.
- Booking continues to route to whichever specific barber the client picks
  at booking time (already works structurally via `appointments.barber_id`;
  this spec does not change that routing, only gates it behind login).
- Barber accounts can be created either by the barber self-registering, or
  informally by the owner (no gatekeeping is enforced — anyone can register
  as either role, matching the trust level of the rest of this app).

**Owner is explicitly out of scope** — "Boshqaruv (Ega)" stays a free tab,
no login added, per user decision.

## 2. Non-goals

- No server-side authorization enforcement. Every existing REST endpoint
  stays exactly as open as it is today (`cors: origin: '*'`, no auth
  middleware). Login/register only gate the **frontend UI** — which view
  renders — not API access. This mirrors the app's existing trust model
  (this is a single-shop demo app, not a multi-tenant system with
  adversarial users).
- No password reset / forgot-password flow.
- No email, no SMS OTP, no third-party auth provider.
- No change to how an appointment's `barber_id` is chosen (already a picker
  in `ClientView.jsx`) — login just becomes a prerequisite for reaching that
  form.
- No confirm-password field, no password strength rules beyond a 4-char
  minimum (matches the low-stakes nature of the app).

## 3. Approach: client-trust sessions

Login/register hit the backend once to verify credentials. The backend
returns a plain profile object (id, full_name, role, phone — no password
hash). The frontend stores that object as `currentUser` in the existing
Zustand `persist` store, exactly the way `currentRole` and
`selectedBarberId` are stored today. No JWT, no session table, no
`Authorization` header on subsequent requests.

**Why**: every other endpoint in this app is already unauthenticated. Adding
real server-enforced sessions (JWT or an opaque token table) would be
3-4x the work of what was asked, and would be the only authenticated
corner of an otherwise fully open API — inconsistent, not more secure in
practice. If real access control is wanted later, it's a separate,
explicitly-scoped follow-up.

**Known limitation (stated explicitly, not hidden)**: a technically capable
user could forge a `currentUser` object in localStorage and view any
barber's dashboard, same as they could already force `currentRole` today.
Acceptable for this app's threat model; flagged here so it's a conscious
tradeoff, not an oversight.

## 4. Data model changes

Add one column to `profiles` in **both** Supabase and the local SQLite
fallback, and a uniqueness constraint on `phone`:

```sql
ALTER TABLE profiles ADD COLUMN password_hash TEXT;
```

- Supabase: `CREATE UNIQUE INDEX profiles_phone_unique ON profiles(phone) WHERE phone IS NOT NULL;`
  (partial unique index — the 4 existing seeded demo profiles keep sharing
  the table without needing every historical row to have a unique phone
  enforced retroactively if any are blank; new inserts with a real phone
  are still enforced unique.)
- SQLite (`sqliteDb.js` `initSchema()`): add `password_hash TEXT` to the
  `CREATE TABLE IF NOT EXISTS profiles` statement. `better-sqlite3` doesn't
  support `ADD COLUMN IF NOT EXISTS` cleanly for already-created local DBs,
  so `initSchema()` will run a guarded `PRAGMA table_info(profiles)` check
  and `ALTER TABLE profiles ADD COLUMN password_hash TEXT` once if missing,
  so existing local `barberflow.sqlite` files upgrade in place.

Existing seeded profiles (`owner-1`, `barber-1`..) keep `password_hash =
NULL` — they are demo/legacy rows and simply cannot log in until someone
registers a new account. This is acceptable; not a migration this spec
needs to solve.

`role` column already exists and already constrains to `'owner' |
'barber' | 'client'` by convention (not a DB CHECK constraint currently) —
register will validate `role` is `'barber'` or `'client'` at the API layer.

## 5. Backend API

New file `backend/src/auth.js`, wired into `server.js`. Uses `bcryptjs`
(pure JS — deliberately not native `bcrypt`, to avoid repeating the
`better-sqlite3`-on-Alpine native-binary crash already hit once on this
project; see Railway Dockerfile fix from earlier).

### `POST /api/auth/register`
Request: `{ full_name, phone, password, role }` where `role` ∈
`{barber, client}`.

- Validate: `full_name` non-empty, `phone` non-empty, `password.length >=
  4`, `role` is one of the two allowed values. 400 on failure with a
  Uzbek message.
- Check phone uniqueness (via the adapter's `db`, both Supabase and SQLite
  paths). 409 `{ error: "Bu raqam allaqachon ro'yxatdan o'tgan" }` if taken.
- Hash password with `bcryptjs.hash(password, 10)`.
- Insert a new `profiles` row (`id: <role>-<timestamp>`, `is_active: true`).
- Respond 201 with the safe profile shape: `{ id, full_name, phone, role }`.

### `POST /api/auth/login`
Request: `{ phone, password }` — **no role field**; the account's stored
role is authoritative. (See §6 for why login doesn't gate by which tab the
user clicked.)

- Look up profile by phone. 401 `{ error: "Login yoki parol xato" }` if not
  found, if `password_hash` is NULL (legacy seeded row), or if
  `bcryptjs.compare` fails. Same generic message in all three cases (don't
  leak whether the phone exists).
- Respond 200 with `{ id, full_name, phone, role }`.

Both endpoints go through the existing `db` adapter (`supabaseDb.js` +
`sqliteDb.js`) with two new methods, `registerProfile` and
`findProfileByPhone`, following the existing adapter pattern (Supabase
first, SQLite fallback, each with its own try/catch already established in
that file).

## 6. Frontend

### New component: `AuthGate.jsx`
Rendered by `App.jsx` in place of `BarberView`/`ClientView` whenever
`currentRole` is `'barber'` or `'client'` **and** `currentUser` is null (or
`currentUser.role !== currentRole`). Two tabs at the top — **"Usta"** /
**"Mijoz"** — switching which register form's `role` field will be sent;
under each tab, a shared Login/Register toggle (login by default, "Ro'yxatdan
o'tish" link to flip to register).

Fields:
- Register: Ism (`full_name`), Telefon (`phone`), Parol (`password`, min 4
  belgi) — role comes from the active tab, not a form field.
- Login: Telefon, Parol — no role field.

On successful login/register, `useAppStore` sets `currentUser` **and**
`currentRole` to the account's actual role (see next paragraph for why both
are set even on login).

Only one `currentUser` is active at a time (single session, matching how
`currentRole` already works today). If a logged-in barber clicks the
"Mijoz Navbati" tab, `currentRole` changes but `currentUser.role` doesn't
match it, so `AuthGate` re-appears on that tab — they are not logged out of
their barber session, they simply see the gate again if they switch back
without a matching client account logged in. `logout()` is the only way to
clear `currentUser` entirely.

**Login is tab-agnostic in effect**: the backend checks credentials only,
independent of which tab was open. If a user logs in from the "Mijoz" tab
but the account is actually a barber, the frontend just routes them to
`BarberView` anyway and shows a small inline note ("Bu hisob usta sifatida
ro'yxatdan o'tgan") rather than rejecting the login. This avoids a
confusing dead-end for a simple phone/tab mixup, at zero extra backend
complexity. Register, by contrast, DOES fix the role permanently at
creation time from the tab the user was on.

### `useAppStore.js` additions
- State: `currentUser: null` (added to the persisted `partialize` set,
  alongside the existing `selectedBarberId` etc.)
- `login(phone, password)` → `POST /api/auth/login`, sets `currentUser` +
  `currentRole` on success, returns `{ ok, error }` for the form to display.
- `register(full_name, phone, password, role)` → `POST /api/auth/register`,
  same success shape, auto-logs-in on success (no separate login step).
- `logout()` → clears `currentUser`, leaves `currentRole` as-is (so hitting
  the same tab shows `AuthGate` again).
- These calls require network — if offline, `login`/`register` fail fast
  with `{ ok: false, error: "Internetga ulaning" }` rather than queueing
  (unlike appointment writes, credential checks can't happen against local
  state — there is no local password to check against).

### `Navbar.jsx`
Add a **Chiqish** (logout) button, shown only when `currentUser` is set.
Shows `currentUser.full_name` next to it.

### `BarberView.jsx`
Remove the "Barber Switcher" widget entirely (lines ~76-90, the row of
buttons that lets anyone pick any barber). Replace `selectedBarberId`
sourcing with `currentUser.id` throughout the file (queue filtering,
earnings calculation, etc.) — `selectedBarberId` global store field becomes
unused here and can be deleted from `useAppStore.js` once confirmed unused
elsewhere (`ClientView.jsx` keeps its own local `useState` for barber
picking, unrelated to the global one).

### `ClientView.jsx`
No change to the barber-picker / service-picker / booking form itself —
that flow is correct today. Only change: the whole view is now reached
through `AuthGate`, and the name/phone fields pre-fill from
`currentUser.full_name` / `currentUser.phone` (still editable, in case
someone is booking for a family member).

## 7. Error handling summary

| Case | Where | Behavior |
|---|---|---|
| Duplicate phone on register | backend | 409, Uzbek message, form shows it inline |
| Wrong password / unknown phone | backend | 401, generic "Login yoki parol xato" |
| Password < 4 chars | frontend (pre-check) + backend (400) | inline validation before submit |
| Offline during login/register | frontend | immediate error, no offline queueing (see §6) |
| Legacy seeded account (no password_hash) tries to log in | backend | same generic 401 as wrong password |

## 8. Testing plan

- Backend: register happy path, duplicate-phone 409, login happy path,
  wrong-password 401, unknown-phone 401, role validation 400 — against the
  SQLite fallback (fast, no network) and spot-checked once against the live
  Supabase instance.
- Frontend: manual pass in the browser per the project's existing
  UI-testing convention (`run` skill) — register as barber, register as
  client, log out, log back in, confirm `BarberView` shows only that
  barber's queue with no switcher, confirm `ClientView` pre-fills and books
  to the correct `barber_id`.

## 9. Rollout

- Migrate both databases (Supabase via the same `pgrun`-style script used
  earlier in this session, or `supabase db execute`; SQLite via the
  guarded in-code migration in `initSchema()`).
- Add `bcryptjs` to `backend/package.json`.
- Deploy backend to Railway (`railway up`), then frontend to Vercel
  (`vercel --prod`) — same process already used earlier for this project.
