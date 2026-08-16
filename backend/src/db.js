import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data.json');

const INITIAL_DATA = {
  profiles: [
    { id: 'owner-1', full_name: 'Jasur Aka (Ega)', phone: '+998 90 123 45 67', role: 'owner', is_active: true },
    { id: 'barber-1', full_name: 'Anvar Usta', phone: '+998 93 111 22 33', role: 'barber', is_active: true, avatar: '💈' },
    { id: 'barber-2', full_name: 'Bekzod Usta', phone: '+998 94 444 55 66', role: 'barber', is_active: true, avatar: '✂️' },
    { id: 'barber-3', full_name: 'Sardor Usta', phone: '+998 97 777 88 99', role: 'barber', is_active: true, avatar: '🧴' }
  ],
  services: [
    { id: 'srv-1', name: 'Klassik Soch Olish', duration_minutes: 25, price: 50000, commission_percent: 50, icon: 'Scissors' },
    { id: 'srv-2', name: 'Soqol Tekislash & Dizayn', duration_minutes: 15, price: 30000, commission_percent: 50, icon: 'Smile' },
    { id: 'srv-3', name: 'Kompleks (Soch + Soqol + Yuvish)', duration_minutes: 40, price: 80000, commission_percent: 55, icon: 'Sparkles' },
    { id: 'srv-4', name: 'Bolalar Soch Olishi', duration_minutes: 20, price: 40000, commission_percent: 50, icon: 'Baby' }
  ],
  appointments: [
    {
      id: 'apt-101',
      client_name: 'Otabek',
      client_phone: '+998 90 999 11 22',
      barber_id: 'barber-1',
      service_id: 'srv-3',
      status: 'in_progress', // 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
      queue_number: 1,
      scheduled_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      completed_at: null,
      price: 80000,
      is_offline_created: false,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'apt-102',
      client_name: 'Javohir',
      client_phone: '+998 91 888 33 44',
      barber_id: 'barber-1',
      service_id: 'srv-1',
      status: 'waiting',
      queue_number: 2,
      scheduled_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      started_at: null,
      completed_at: null,
      price: 50000,
      is_offline_created: false,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    },
    {
      id: 'apt-103',
      client_name: 'Diyor',
      client_phone: '+998 99 777 55 66',
      barber_id: 'barber-2',
      service_id: 'srv-1',
      status: 'in_progress',
      queue_number: 1,
      scheduled_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      completed_at: null,
      price: 50000,
      is_offline_created: false,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    },
    {
      id: 'apt-104',
      client_name: 'Bobur',
      client_phone: '+998 93 333 44 55',
      barber_id: 'barber-2',
      service_id: 'srv-2',
      status: 'waiting',
      queue_number: 2,
      scheduled_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      started_at: null,
      completed_at: null,
      price: 30000,
      is_offline_created: false,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    }
  ],
  inventory: [
    { id: 'inv-1', item_name: 'Bir martalik pichoqcha (Blade)', stock_quantity: 42, min_alert_threshold: 15, unit: 'dona', deduct_per_service: 1 },
    { id: 'inv-2', item_name: 'Bo\'yinbog\' salfetkasi (Neck paper)', stock_quantity: 4, min_alert_threshold: 10, unit: 'rulon', deduct_per_service: 0 },
    { id: 'inv-3', item_name: 'Soch fiksator gel (Styling Wax)', stock_quantity: 3, min_alert_threshold: 5, unit: 'banka', deduct_per_service: 0 },
    { id: 'inv-4', item_name: 'Dezinfeksiya spreyi (Barber Spray)', stock_quantity: 6, min_alert_threshold: 3, unit: 'shisha', deduct_per_service: 0 }
  ],
  transactions: [
    {
      id: 'tx-1',
      appointment_id: 'apt-prev-1',
      client_name: 'Alisher',
      barber_id: 'barber-1',
      amount: 50000,
      payment_type: 'cash', // 'cash' | 'card' | 'uzum'
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      id: 'tx-2',
      appointment_id: 'apt-prev-2',
      client_name: 'Sanjar',
      barber_id: 'barber-2',
      amount: 80000,
      payment_type: 'uzum',
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
    }
  ]
};

class DB {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading DB file, fallback to initial data:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving DB file:', e);
    }
  }

  getState() {
    return this.data;
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.save();
    return this.data;
  }

  addAppointment(aptData) {
    const barberId = aptData.barber_id;
    // calculate queue number for this barber
    const existingWaiting = this.data.appointments.filter(
      a => a.barber_id === barberId && (a.status === 'waiting' || a.status === 'in_progress')
    );
    const queue_number = existingWaiting.length + 1;

    const newApt = {
      id: aptData.id || `apt-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      client_name: aptData.client_name || 'Noma\'lum mijoz',
      client_phone: aptData.client_phone || '',
      barber_id: barberId,
      service_id: aptData.service_id,
      status: aptData.status || 'waiting',
      queue_number: aptData.queue_number || queue_number,
      scheduled_time: aptData.scheduled_time || new Date().toISOString(),
      started_at: aptData.started_at || null,
      completed_at: aptData.completed_at || null,
      price: Number(aptData.price) || 50000,
      is_offline_created: Boolean(aptData.is_offline_created),
      created_at: aptData.created_at || new Date().toISOString()
    };

    // Prevent duplicates if synced
    const idx = this.data.appointments.findIndex(a => a.id === newApt.id);
    if (idx >= 0) {
      this.data.appointments[idx] = { ...this.data.appointments[idx], ...newApt };
    } else {
      this.data.appointments.push(newApt);
    }
    this.save();
    return newApt;
  }

  updateAppointmentStatus(id, { status, payment_type = 'cash' }) {
    const apt = this.data.appointments.find(a => a.id === id);
    if (!apt) return null;

    apt.status = status;
    const now = new Date().toISOString();

    if (status === 'in_progress') {
      apt.started_at = now;
    } else if (status === 'completed') {
      apt.completed_at = now;
      
      // 1. Auto-record Cash Transaction
      const tx = {
        id: `tx-${Date.now()}`,
        appointment_id: apt.id,
        client_name: apt.client_name,
        barber_id: apt.barber_id,
        amount: apt.price,
        payment_type: payment_type || 'cash',
        created_at: now
      };
      this.data.transactions.unshift(tx);

      // 2. Auto-deduct inventory (e.g., 1 blade per haircut)
      const blade = this.data.inventory.find(i => i.id === 'inv-1');
      if (blade && blade.stock_quantity > 0) {
        blade.stock_quantity -= 1;
      }
    } else if (status === 'no_show' || status === 'cancelled') {
      apt.completed_at = now;
    }

    this.save();
    return apt;
  }

  addTransaction(txData) {
    const tx = {
      id: txData.id || `tx-${Date.now()}`,
      appointment_id: txData.appointment_id || null,
      client_name: txData.client_name || 'Noma\'lum',
      barber_id: txData.barber_id || 'barber-1',
      amount: Number(txData.amount) || 0,
      payment_type: txData.payment_type || 'cash',
      created_at: txData.created_at || new Date().toISOString()
    };
    this.data.transactions.unshift(tx);
    this.save();
    return tx;
  }

  updateInventory(id, { stock_quantity, min_alert_threshold }) {
    const item = this.data.inventory.find(i => i.id === id);
    if (!item) return null;
    if (stock_quantity !== undefined) item.stock_quantity = Number(stock_quantity);
    if (min_alert_threshold !== undefined) item.min_alert_threshold = Number(min_alert_threshold);
    this.save();
    return item;
  }

  // Batch sync from offline action queue
  syncOfflineActions(actions) {
    if (!Array.isArray(actions)) return this.getState();

    for (const action of actions) {
      try {
        if (action.type === 'ADD_APPOINTMENT') {
          this.addAppointment(action.payload);
        } else if (action.type === 'UPDATE_STATUS') {
          this.updateAppointmentStatus(action.payload.id, action.payload);
        } else if (action.type === 'ADD_TRANSACTION') {
          this.addTransaction(action.payload);
        }
      } catch (err) {
        console.error('Error applying offline action:', action, err);
      }
    }
    this.save();
    return this.getState();
  }
}

export const db = new DB();
