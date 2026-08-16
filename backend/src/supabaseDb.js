import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db as sqliteDb } from './sqliteDb.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

export class SupabaseAdapter {
  constructor() {
    this.isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http'));
    if (this.isConfigured) {
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
      });
      console.log('⚡ Connected to Supabase Cloud PostgreSQL Database:', SUPABASE_URL);
    } else {
      console.log('📦 Supabase credentials not found. Using local SQLite database.');
      this.client = null;
    }
  }

  async getState() {
    if (!this.isConfigured) {
      return sqliteDb.getState();
    }

    try {
      const [
        { data: profiles },
        { data: services },
        { data: appointments },
        { data: inventory },
        { data: transactions }
      ] = await Promise.all([
        this.client.from('profiles').select('*').eq('is_active', true),
        this.client.from('services').select('*'),
        this.client.from('appointments').select('*').order('created_at', { ascending: true }),
        this.client.from('inventory').select('*'),
        this.client.from('transactions').select('*').order('created_at', { ascending: false })
      ]);

      return {
        profiles: profiles || [],
        services: services || [],
        appointments: (appointments || []).map(a => ({
          ...a,
          price: Number(a.price),
          is_offline_created: Boolean(a.is_offline_created)
        })),
        inventory: inventory || [],
        transactions: (transactions || []).map(t => ({
          ...t,
          amount: Number(t.amount)
        }))
      };
    } catch (err) {
      console.error('Supabase getState error, falling back to SQLite:', err.message);
      return sqliteDb.getState();
    }
  }

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

  async addAppointment(data) {
    if (!this.isConfigured) {
      return sqliteDb.addAppointment(data);
    }

    try {
      const barberId = data.barber_id || 'barber-1';
      // Calculate queue count
      const { count } = await this.client
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barberId)
        .in('status', ['waiting', 'in_progress']);

      const queue_number = data.queue_number || ((count || 0) + 1);
      const newApt = {
        id: data.id || `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        client_name: data.client_name || 'Noma\'lum mijoz',
        client_phone: data.client_phone || '',
        barber_id: barberId,
        service_id: data.service_id || 'srv-1',
        status: data.status || 'waiting',
        queue_number,
        scheduled_time: data.scheduled_time || new Date().toISOString(),
        started_at: data.started_at || null,
        completed_at: data.completed_at || null,
        price: Number(data.price) || 50000,
        is_offline_created: Boolean(data.is_offline_created),
        created_at: data.created_at || new Date().toISOString()
      };

      const { data: inserted, error } = await this.client
        .from('appointments')
        .upsert(newApt)
        .select()
        .single();

      if (error) throw error;
      return inserted;
    } catch (err) {
      console.error('Supabase addAppointment error:', err.message);
      return sqliteDb.addAppointment(data);
    }
  }

  async updateAppointmentStatus(id, { status, payment_type = 'cash' }) {
    if (!this.isConfigured) {
      return sqliteDb.updateAppointmentStatus(id, { status, payment_type });
    }

    try {
      const now = new Date().toISOString();
      const updatePayload = { status };

      if (status === 'in_progress') {
        updatePayload.started_at = now;
      } else if (status === 'completed' || status === 'no_show' || status === 'cancelled') {
        updatePayload.completed_at = now;
      }

      const { data: updated, error } = await this.client
        .from('appointments')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (status === 'completed') {
        // Record financial transaction
        await this.client.from('transactions').insert({
          id: `tx-${Date.now()}`,
          appointment_id: id,
          client_name: updated.client_name,
          barber_id: updated.barber_id,
          amount: updated.price,
          payment_type: payment_type || 'cash',
          created_at: now
        });

        // Deduct consumable stock (e.g. 1 blade)
        const { data: blade } = await this.client.from('inventory').select('*').eq('id', 'inv-1').single();
        if (blade && blade.stock_quantity > 0) {
          await this.client.from('inventory').update({ stock_quantity: blade.stock_quantity - 1 }).eq('id', 'inv-1');
        }
      }

      return updated;
    } catch (err) {
      console.error('Supabase updateAppointmentStatus error:', err.message);
      return sqliteDb.updateAppointmentStatus(id, { status, payment_type });
    }
  }

  async addTransaction(data) {
    if (!this.isConfigured) {
      return sqliteDb.addTransaction(data);
    }

    try {
      const newTx = {
        id: data.id || `tx-${Date.now()}`,
        appointment_id: data.appointment_id || null,
        client_name: data.client_name || 'Noma\'lum',
        barber_id: data.barber_id || 'barber-1',
        amount: Number(data.amount) || 0,
        payment_type: data.payment_type || 'cash',
        created_at: data.created_at || new Date().toISOString()
      };

      const { data: inserted, error } = await this.client.from('transactions').insert(newTx).select().single();
      if (error) throw error;
      return inserted;
    } catch (err) {
      console.error('Supabase addTransaction error:', err.message);
      return sqliteDb.addTransaction(data);
    }
  }

  async updateInventory(id, { stock_quantity, min_alert_threshold }) {
    if (!this.isConfigured) {
      return sqliteDb.updateInventory(id, { stock_quantity, min_alert_threshold });
    }

    try {
      const payload = {};
      if (stock_quantity !== undefined) payload.stock_quantity = Number(stock_quantity);
      if (min_alert_threshold !== undefined) payload.min_alert_threshold = Number(min_alert_threshold);

      const { data: updated, error } = await this.client.from('inventory').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return updated;
    } catch (err) {
      console.error('Supabase updateInventory error:', err.message);
      return sqliteDb.updateInventory(id, { stock_quantity, min_alert_threshold });
    }
  }

  async syncOfflineActions(actions) {
    if (!this.isConfigured) {
      return sqliteDb.syncOfflineActions(actions);
    }

    if (!Array.isArray(actions)) return this.getState();

    for (const action of actions) {
      try {
        if (action.type === 'ADD_APPOINTMENT') {
          await this.addAppointment(action.payload);
        } else if (action.type === 'UPDATE_STATUS') {
          await this.updateAppointmentStatus(action.payload.id, action.payload);
        } else if (action.type === 'ADD_TRANSACTION') {
          await this.addTransaction(action.payload);
        }

        await this.client.from('sync_events').insert({
          id: `sync-${Date.now()}-${Math.random()}`,
          action_type: action.type,
          payload_json: action.payload,
          synced_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase sync action error:', action, err);
      }
    }

    return this.getState();
  }

  async reset() {
    if (!this.isConfigured) {
      return sqliteDb.reset();
    }
    // Clean up Supabase
    try {
      await this.client.from('appointments').delete().neq('id', 'null');
      await this.client.from('transactions').delete().neq('id', 'null');
      await this.client.from('sync_events').delete().neq('id', 'null');
    } catch (e) {
      console.warn('Supabase reset warning:', e.message);
    }
    return this.getState();
  }
}

export const db = new SupabaseAdapter();
