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
