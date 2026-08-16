import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = ENV.SQLITE_DB_PATH || path.join(__dirname, '../../barberflow.sqlite');

// Initialize Real SQLite DB on disk with WAL mode for ultra-fast concurrency
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Initialize Schema
function initSchema() {
  sqlite.exec(`
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

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      commission_percent INTEGER NOT NULL,
      icon_name TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      barber_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      status TEXT NOT NULL, -- 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
      queue_number INTEGER NOT NULL,
      scheduled_time TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      price INTEGER NOT NULL,
      is_offline_created INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (barber_id) REFERENCES profiles(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      stock_quantity INTEGER NOT NULL,
      min_alert_threshold INTEGER NOT NULL,
      unit TEXT NOT NULL,
      deduct_per_service INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      appointment_id TEXT,
      client_name TEXT NOT NULL,
      barber_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_type TEXT NOT NULL, -- 'cash' | 'card' | 'uzum'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_events (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );
  `);

  // Existing barberflow.sqlite files predate password_hash — add it once.
  const profileColumns = sqlite.prepare('PRAGMA table_info(profiles)').all();
  if (!profileColumns.some(c => c.name === 'password_hash')) {
    sqlite.exec('ALTER TABLE profiles ADD COLUMN password_hash TEXT');
  }

  // Seed default dataset if empty
  const profileCount = sqlite.prepare('SELECT COUNT(*) as count FROM profiles').get().count;
  if (profileCount === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const insertProfile = sqlite.prepare(`
    INSERT INTO profiles (id, full_name, phone, role, is_active, avatar_badge, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertService = sqlite.prepare(`
    INSERT INTO services (id, name, duration_minutes, price, commission_percent, icon_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertInventory = sqlite.prepare(`
    INSERT INTO inventory (id, item_name, stock_quantity, min_alert_threshold, unit, deduct_per_service)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAppointment = sqlite.prepare(`
    INSERT INTO appointments (id, client_name, client_phone, barber_id, service_id, status, queue_number, scheduled_time, started_at, completed_at, price, is_offline_created, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTx = sqlite.prepare(`
    INSERT INTO transactions (id, appointment_id, client_name, barber_id, amount, payment_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const ownerPasswordHash = bcrypt.hashSync('admin123', 10);

  // 1. Profiles
  insertProfile.run('owner-1', 'Jasur Xidoyatov (Boshqaruvchi)', '+998 90 123 45 67', 'owner', 1, '👑', ownerPasswordHash, now);
  insertProfile.run('barber-1', 'Anvar Usta', '+998 93 111 22 33', 'barber', 1, '💈', null, now);
  insertProfile.run('barber-2', 'Bekzod Usta', '+998 94 444 55 66', 'barber', 1, '✂️', null, now);
  insertProfile.run('barber-3', 'Sardor Usta', '+998 97 777 88 99', 'barber', 1, '🧴', null, now);

  // 2. Services
  insertService.run('srv-1', 'Klassik Soch Olish', 25, 50000, 50, 'Scissors');
  insertService.run('srv-2', 'Soqol Shakllantirish & Dizayn', 15, 30000, 50, 'Smile');
  insertService.run('srv-3', 'Premium Kompleks (Soch + Soqol + Spa)', 40, 85000, 55, 'Sparkles');
  insertService.run('srv-4', 'Bolalar Soch Olishi', 20, 40000, 50, 'Baby');

  // 3. Inventory
  insertInventory.run('inv-1', 'Bir martalik pichoqcha (Blade)', 38, 15, 'dona', 1);
  insertInventory.run('inv-2', 'Bo\'yinbog\' himoya qog\'ozi', 5, 10, 'rulon', 0);
  insertInventory.run('inv-3', 'Soch fiksator matviy vosita', 4, 5, 'banka', 0);
  insertInventory.run('inv-4', 'Dezinfeksiya spreyi (Antiseptik)', 7, 3, 'shisha', 0);

  // 4. Initial Active Appointments
  insertAppointment.run(
    'apt-101', 'Otabek Mirzayev', '+998 90 999 11 22', 'barber-1', 'srv-3',
    'in_progress', 1, now, now, null, 85000, 0, now
  );
  insertAppointment.run(
    'apt-102', 'Javohir Rasulov', '+998 91 888 33 44', 'barber-1', 'srv-1',
    'waiting', 2, now, null, null, 50000, 0, now
  );
  insertAppointment.run(
    'apt-103', 'Diyorbek Qodirov', '+998 99 777 55 66', 'barber-2', 'srv-1',
    'in_progress', 1, now, now, null, 50000, 0, now
  );
  insertAppointment.run(
    'apt-104', 'Bobur Shokirov', '+998 93 333 44 55', 'barber-2', 'srv-2',
    'waiting', 2, now, null, null, 30000, 0, now
  );

  // 5. Initial Transactions
  insertTx.run('tx-1', 'apt-prev-1', 'Alisher Usmonov', 'barber-1', 50000, 'cash', now);
  insertTx.run('tx-2', 'apt-prev-2', 'Sanjar Karimov', 'barber-2', 85000, 'uzum', now);
  insertTx.run('tx-3', 'apt-prev-3', 'Farrux Zokirov', 'barber-1', 50000, 'card', now);
}

// Database API Controller
export class SqliteDB {
  constructor() {
    initSchema();
  }

  getState() {
    // Explicit column list: never let a future ALTER TABLE (e.g. password_hash)
    // silently reach the unauthenticated /api/state response or WS broadcast.
    const profiles = sqlite.prepare(
      'SELECT id, full_name, phone, role, is_active, avatar_badge, created_at FROM profiles WHERE is_active = 1'
    ).all();
    const services = sqlite.prepare('SELECT * FROM services').all();
    const appointments = sqlite.prepare('SELECT * FROM appointments ORDER BY datetime(created_at) ASC').all();
    const inventory = sqlite.prepare('SELECT * FROM inventory').all();
    const transactions = sqlite.prepare('SELECT * FROM transactions ORDER BY datetime(created_at) DESC').all();

    return {
      profiles,
      services,
      appointments: appointments.map(a => ({ ...a, is_offline_created: Boolean(a.is_offline_created) })),
      inventory,
      transactions
    };
  }

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

  addAppointment(data) {
    const barberId = data.barber_id || 'barber-1';
    const waitingCount = sqlite.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE barber_id = ? AND (status = 'waiting' OR status = 'in_progress')
    `).get(barberId).count;

    const queue_number = data.queue_number || (waitingCount + 1);
    const id = data.id || `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO appointments (
        id, client_name, client_phone, barber_id, service_id, status, 
        queue_number, scheduled_time, started_at, completed_at, price, 
        is_offline_created, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.client_name || 'Noma\'lum mijoz',
      data.client_phone || '',
      barberId,
      data.service_id || 'srv-1',
      data.status || 'waiting',
      queue_number,
      data.scheduled_time || now,
      data.started_at || null,
      data.completed_at || null,
      Number(data.price) || 50000,
      data.is_offline_created ? 1 : 0,
      data.created_at || now
    );

    return sqlite.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  }

  updateAppointmentStatus(id, { status, payment_type = 'cash' }) {
    const apt = sqlite.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!apt) return null;

    const now = new Date().toISOString();

    // Execute within an ACID SQLite Transaction
    const tx = sqlite.transaction(() => {
      let startedAt = apt.started_at;
      let completedAt = apt.completed_at;

      if (status === 'in_progress') {
        startedAt = now;
      } else if (status === 'completed' || status === 'no_show' || status === 'cancelled') {
        completedAt = now;
      }

      sqlite.prepare(`
        UPDATE appointments 
        SET status = ?, started_at = ?, completed_at = ?
        WHERE id = ?
      `).run(status, startedAt, completedAt, id);

      if (status === 'completed') {
        // 1. Record Real Financial Transaction
        const txId = `tx-${Date.now()}`;
        sqlite.prepare(`
          INSERT INTO transactions (id, appointment_id, client_name, barber_id, amount, payment_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(txId, id, apt.client_name, apt.barber_id, apt.price, payment_type || 'cash', now);

        // 2. Auto Deduct Consumable Inventory (e.g. 1 blade)
        sqlite.prepare(`
          UPDATE inventory 
          SET stock_quantity = MAX(0, stock_quantity - 1)
          WHERE id = 'inv-1'
        `).run();
      }
    });

    tx();
    return sqlite.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  }

  addTransaction(data) {
    const id = data.id || `tx-${Date.now()}`;
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO transactions (id, appointment_id, client_name, barber_id, amount, payment_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.appointment_id || null,
      data.client_name || 'Noma\'lum',
      data.barber_id || 'barber-1',
      Number(data.amount) || 0,
      data.payment_type || 'cash',
      data.created_at || now
    );

    return sqlite.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  }

  updateInventory(id, { stock_quantity, min_alert_threshold }) {
    if (stock_quantity !== undefined) {
      sqlite.prepare('UPDATE inventory SET stock_quantity = ? WHERE id = ?').run(Number(stock_quantity), id);
    }
    if (min_alert_threshold !== undefined) {
      sqlite.prepare('UPDATE inventory SET min_alert_threshold = ? WHERE id = ?').run(Number(min_alert_threshold), id);
    }
    return sqlite.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  }

  syncOfflineActions(actions) {
    if (!Array.isArray(actions)) return this.getState();

    const syncTx = sqlite.transaction(() => {
      for (const action of actions) {
        try {
          if (action.type === 'ADD_APPOINTMENT') {
            this.addAppointment(action.payload);
          } else if (action.type === 'UPDATE_STATUS') {
            this.updateAppointmentStatus(action.payload.id, action.payload);
          } else if (action.type === 'ADD_TRANSACTION') {
            this.addTransaction(action.payload);
          }
          sqlite.prepare(`
            INSERT INTO sync_events (id, action_type, payload_json, synced_at)
            VALUES (?, ?, ?, ?)
          `).run(`sync-${Date.now()}-${Math.random()}`, action.type, JSON.stringify(action.payload), new Date().toISOString());
        } catch (err) {
          console.error('Error applying SQLite sync action:', action, err);
        }
      }
    });

    syncTx();
    return this.getState();
  }

  reset() {
    sqlite.exec(`
      DELETE FROM appointments;
      DELETE FROM transactions;
      DELETE FROM sync_events;
      DELETE FROM inventory;
      DELETE FROM services;
      DELETE FROM profiles;
    `);
    seedDatabase();
    return this.getState();
  }
}

export const db = new SqliteDB();
