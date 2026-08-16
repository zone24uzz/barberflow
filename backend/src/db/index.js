import { db as supabaseDb, SupabaseAdapter } from './supabase.js';
import { db as sqliteDb, SqliteDB } from './sqlite.js';

export { sqliteDb, SqliteDB, SupabaseAdapter, supabaseDb };
export const db = supabaseDb;
export default db;
