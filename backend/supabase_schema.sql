-- =========================================================
-- 💈 BarberFlow Supabase PostgreSQL Database Schema
-- Paste this script into your Supabase SQL Editor and click RUN
-- =========================================================

-- 1. Profiles Table (Owner, Barbers, Clients)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'barber', -- 'owner' | 'barber' | 'client'
    is_active BOOLEAN DEFAULT true,
    avatar_badge TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 25,
    price NUMERIC NOT NULL DEFAULT 50000,
    commission_percent INTEGER NOT NULL DEFAULT 50,
    icon_name TEXT DEFAULT 'Scissors'
);

-- 3. Appointments & Queue Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    barber_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    queue_number INTEGER NOT NULL DEFAULT 1,
    scheduled_time TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    price NUMERIC NOT NULL DEFAULT 50000,
    is_offline_created BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_alert_threshold INTEGER NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'dona',
    deduct_per_service INTEGER DEFAULT 0
);

-- 5. Transactions Table (Cash & Card Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    client_name TEXT NOT NULL,
    barber_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'card' | 'uzum'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Sync Events Table (Offline-First Audit Log)
CREATE TABLE IF NOT EXISTS public.sync_events (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- Initial Seed Data
-- =========================================================

INSERT INTO public.profiles (id, full_name, phone, role, is_active, avatar_badge) VALUES
('owner-1', 'Jasur Xidoyatov (Boshqaruvchi)', '+998 90 123 45 67', 'owner', true, '👑'),
('barber-1', 'Anvar Usta', '+998 93 111 22 33', 'barber', true, '💈'),
('barber-2', 'Bekzod Usta', '+998 94 444 55 66', 'barber', true, '✂️'),
('barber-3', 'Sardor Usta', '+998 97 777 88 99', 'barber', true, '🧴')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (id, name, duration_minutes, price, commission_percent, icon_name) VALUES
('srv-1', 'Klassik Soch Olish', 25, 50000, 50, 'Scissors'),
('srv-2', 'Soqol Shakllantirish & Dizayn', 15, 30000, 50, 'Smile'),
('srv-3', 'Premium Kompleks (Soch + Soqol + Spa)', 40, 85000, 55, 'Sparkles'),
('srv-4', 'Bolalar Soch Olishi', 20, 40000, 50, 'Baby')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory (id, item_name, stock_quantity, min_alert_threshold, unit, deduct_per_service) VALUES
('inv-1', 'Bir martalik pichoqcha (Blade)', 38, 15, 'dona', 1),
('inv-2', 'Bo''yinbog'' himoya qog''ozi', 5, 10, 'rulon', 0),
('inv-3', 'Soch fiksator matviy vosita', 4, 5, 'banka', 0),
('inv-4', 'Dezinfeksiya spreyi (Antiseptik)', 7, 3, 'shisha', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (id, client_name, client_phone, barber_id, service_id, status, queue_number, price) VALUES
('apt-101', 'Otabek Mirzayev', '+998 90 999 11 22', 'barber-1', 'srv-3', 'in_progress', 1, 85000),
('apt-102', 'Javohir Rasulov', '+998 91 888 33 44', 'barber-1', 'srv-1', 'waiting', 2, 50000),
('apt-103', 'Diyorbek Qodirov', '+998 99 777 55 66', 'barber-2', 'srv-1', 'in_progress', 1, 50000),
('apt-104', 'Bobur Shokirov', '+998 93 333 44 55', 'barber-2', 'srv-2', 'waiting', 2, 30000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, appointment_id, client_name, barber_id, amount, payment_type) VALUES
('tx-1', 'apt-prev-1', 'Alisher Usmonov', 'barber-1', 50000, 'cash'),
('tx-2', 'apt-prev-2', 'Sanjar Karimov', 'barber-2', 85000, 'uzum'),
('tx-3', 'apt-prev-3', 'Farrux Zokirov', 'barber-1', 50000, 'card')
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime for live WebSocket updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;

-- Enable Row Level Security (RLS) with open read/write for MVP
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for all" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for all" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for all" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for all" ON public.sync_events FOR ALL USING (true) WITH CHECK (true);
