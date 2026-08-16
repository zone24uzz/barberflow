# 🚀 BarberFlow — Supabase, Railway & Vercel Deploy Qo'llanmasi

Ushbu qo'llanma orqali loyihangizni **Supabase** (PostgreSQL ma'lumotlar bazasi), **Railway** (Backend API & WebSocket) va **Vercel / Railway** (Frontend) ga 5 daqiqada to'liq joylashingiz mumkin.

---

## 1-Qadam: Supabase Bazasini Sozlash (Cloud PostgreSQL)

1. [supabase.com](https://supabase.com) ga kiring va yangi loyiha (Project) oching.
2. Chap menyudan **SQL Editor** bo'limiga kiring.
3. Loyihadagi `backend/supabase_schema.sql` fayli ichidagi barcha SQL kodni nusxalab, Supabase SQL Editor'ga tashlang va **RUN** tugmasini bosing.
   * ✅ Barcha jadvallar (`profiles`, `services`, `appointments`, `inventory`, `transactions`, `sync_events`) yaratiladi.
   * ✅ Boshlang'ich ustalar va xizmatlar kiritiladi.
   * ✅ Realtime WebSocket va RLS qoidalari yoqiladi.
4. **Project Settings -> API** bo'limiga kiring va quyidagilarni nusxalang:
   * `Project URL` (masalan: `https://xyzcompany.supabase.co`)
   * `anon / public key` yoki `service_role key`

---

## 2-Qadam: Backendni Railway'ga Yuklash (Node.js & WebSocket)

1. [railway.app](https://railway.app) ga kiring va **New Project -> Deploy from GitHub repo** tanlang.
2. Root Directory qilib **`backend`** papkasini ko'rsating.
3. Railway loyihasining **Variables** (Environment variables) bo'limiga quyidagilarni kiriting:
   ```env
   PORT=5050
   NODE_ENV=production
   APP_URL=https://your-frontend.vercel.app
   SUPABASE_URL=https://xyzcompany.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
   TELEGRAM_BOT_TOKEN=your-bot-token (ixtiyoriy)
   ```
4. **Settings -> Networking -> Generate Domain** tugmasini bosing (masalan: `barberflow-backend.up.railway.app`).
5. ✅ Backend muvaffaqiyatli ishga tushadi! Brauzerda ushbu domenni ochib tekshirib ko'rishingiz mumkin.

---

## 3-Qadam: Frontendni Vercel (yoki Railway) ga Yuklash

1. [vercel.com](https://vercel.com) ga kiring va **Add New -> Project** bosing.
2. Repository'ni tanlang va **Root Directory** sifatida **`frontend`** papkasini tanlang.
3. **Environment Variables** bo'limiga Railway'dagi Backend URL manzilingizni kiriting:
   ```env
   VITE_API_URL=https://barberflow-backend.up.railway.app
   ```
4. **Deploy** tugmasini bosing.
5. ✅ Frontend muvaffaqiyatli ishga tushadi va to'g'ridan-to'g'ri Railway + Supabase bilan ishlaydi!

---

## 💡 Lokal Ishga Tushirish (Offline / Development):
Agar Supabase yoki Railway kalitlari kiritilmagan bo'lsa, loyiha **avtomatik ravishda lokal SQLite bazasi (`barberflow.sqlite`)** bilan offline/lokal rejimda ishlayveradi. Hech qanday xatolik yuz bermaydi.
