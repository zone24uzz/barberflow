# 💈 BarberFlow Enterprise — Full Project Context & Handoff Prompt

Sen tajribali Senior Full-Stack dasturchisan. Men senga ishlab chiqilgan va to'liq ishga tushirilgan "BarberFlow Enterprise" (Mahalla sartaroshxonasi uchun Micro-CRM) loyihasining barcha kontekstini, arxitekturasini va fayllar tuzilmasini taqdim etaman. Loyiha xakaton talablari asosida qurilgan.

---

### 🏢 Loyiha Haqida:
- **Nomi**: BarberFlow Enterprise (Atelier Edition)
- **Maqsadi**: Mahalladagi sartaroshxona va xizmat ko'rsatish shoxobchalari uchun real-vaqt rejimida ishlovchi, offline-first va Telegram bot integratsiyasiga ega Micro-CRM tizimi.
- **Dizayn uslubi**: "Warm Amber & Deep Charcoal" (Senior Studio Minimalist — hech qanday ortiqcha sun'iy AI gradientlari, binafsha ranglar yoki keraksiz emojilarsiz, Linear/Stripe darajasidagi toza interfeys).

---

### 🛠️ Texnologiyalar Staki (Stack):
1. **Frontend**:
   - React 19 + Vite + Tailwind CSS v4 + Zustand (Offline LocalStorage + FIFO sync queue).
   - Web Audio API (Ovoz effektlarini sof matematik usulda sintezlash - tashqi mp3 fayllarsiz).
   - Lucide React / Phosphor Icons + Canvas Confetti.
   - Vercel SPA routing (`vercel.json`) & `VITE_API_URL` / `VITE_WS_URL` qo'llab-quvvatlash.
2. **Backend**:
   - Node.js (ESM), Express.js, HTTP + WebSocket (`ws`) Real-time server.
   - `@supabase/supabase-js` (Bulutli PostgreSQL) + `better-sqlite3` (Lokal fallback SQLite bazasi).
   - `node-telegram-bot-api` (Interaktiv Telegram Bot & Mini App xabarnomalari).
   - CORS, Morgan logger, Docker (`Dockerfile` Railway uchun `0.0.0.0` host binding bilan).
3. **Ma'lumotlar Bazasi (Database)**:
   - Supabase Cloud PostgreSQL (`backend/supabase_schema.sql` orqali yaratiladi).
   - Lokal rejim uchun `barberflow.sqlite` (WAL rejimida, Foreign Key va ACID SQL tranzaksiyalari bilan).
4. **Deploy Tayyorgarligi**:
   - Backend: Railway (Dockerfile bilan)
   - Baza: Supabase (SQL Editor script bilan)
   - Frontend: Vercel / Railway (`VITE_API_URL` bilan)

---

### 🌟 Amalga Oshirilgan Funksiyalar (Completed Features):
1. **3 ta asosiy rol**:
   - **Boshqaruv (Ega)**: Kunlik yalpi tushum, to'lov turlari bo'yicha taqsimot (Naqd, Plastik, Uzum), barcha usta stansiyalarining jonli radari, pichoqcha va materiallarning avtomatik sarfi hamda ombor nazorati.
   - **Usta Paneli**: Katta touch-ekran, navbatdagi mijozni chaqirish, xizmatni kassa hisobiga urish, 50% shaxsiy daromad kalkulyatori, "Mijoz kelmadi" (No-Show) tugmasi va pauza/tanaffus rejimi.
   - **Mijoz Navbati (Web & Telegram)**: Jonli navbat olish, ustalar bandlik radari, telefon orqali o'z navbat raqamini qidirish va taxminiy kutish vaqti.
2. **Chop Etiluvchi Termal Chek (Thermal Receipt Modal)**: Kassa jurnalidagi har bir to'lov uchun STIR, QR-kod, usta ulushi va `window.print()` orqali haqiqiy kassa chekini chop etish.
3. **Biznes Analitika Modali**: Ustalar reytingi, o'rtacha chek va xizmatlar taqsimoti.
4. **Offline-First & Auto Sync**: Internet uzilganda ham tizim to'liq ishlaydi; internet qayta ulanganda navbatlar avtomatik server bilan sinxronlanadi.
5. **Telegram Bot**: `/start`, `/navbat`, `/kassa`, `/ustalar` komandalari va yangi navbat/to'lov/kam qolgan tovar bo'yicha push-xabarnomalar.

---

### 📁 Loyiha Tuzilmasi (Folder Structure):
```
hackaton/
├── ABDUVORIS.md                  # Ushbu to'liq kontekst va handoff fayli
├── DEPLOY_GUIDE.md               # Supabase, Railway va Vercel deploy qo'llanmasi
├── backend/
│   ├── Dockerfile                # Railway uchun Node 20 Dockerfile
│   ├── .dockerignore
│   ├── .env.example              # SUPABASE_URL, PORT, TELEGRAM_BOT_TOKEN
│   ├── package.json              # express, ws, better-sqlite3, @supabase/supabase-js, node-telegram-bot-api
│   ├── supabase_schema.sql       # Supabase PostgreSQL jadvallari, RLS va Realtime skripti
│   └── src/
│       ├── server.js             # Express + WebSocket + REST API + 0.0.0.0 binding
│       ├── supabaseDb.js         # Supabase Cloud klienti va SQLite fallback adapteri
│       ├── sqliteDb.js           # Lokal SQLite kontrolleri (WAL + Tranzaksiyalar)
│       └── telegramBot.js        # Telegram Bot va broadcast xabarnomalar
└── frontend/
    ├── package.json              # React 19, Vite, Tailwind v4, Zustand, Canvas Confetti
    ├── vite.config.js            # Proxy /api -> http://localhost:5050
    ├── vercel.json               # SPA routing rewrite qoidalari
    ├── .env.example              # VITE_API_URL, VITE_WS_URL
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx               # WebSocket Realtime listener & offline tracking
    │   ├── index.css             # Tailwind v4 & Warm Amber/Titanium tema
    │   ├── store/
    │   │   └── useAppStore.js    # Zustand store + LocalStorage persistence + API_BASE
    │   ├── utils/
    │   │   └── sound.js          # Web Audio API sof tovush sintezatori
    │   └── components/
    │       ├── Navbar.jsx        # Rol almashtirish, Offline simulator, Analitika & TG
    │       ├── ThermalReceiptModal.jsx  # Chop etiluvchi kassa cheki (Print/QR)
    │       ├── AnalyticsModal.jsx       # Biznes analitika va ustalar reytingi
    │       ├── TelegramDrawer.jsx       # Telegram bot boshqaruvi va test xabarnomalar
    │       ├── WalkInModal.jsx          # Yangi mijoz qo'shish modali
    │       ├── PaymentModal.jsx         # Kassa to'lovini qabul qilish modali
    │       └── views/
    │           ├── OwnerView.jsx        # Ega boshqaruv ekrani & Kassa jurnali
    │           ├── BarberView.jsx       # Usta mobil stansiyasi (Touch UI)
    │           └── ClientView.jsx       # Mijoz navbat ekrani & Radar
```

---

Ushbu kontekst asosida loyihani to'liq tushunganingni tasdiqla va keyingi qadamlar bo'yicha menga yordam berishga tayyorligingni bildir.
