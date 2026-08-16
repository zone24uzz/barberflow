# 💈 BarberFlow — Mahalla Sartaroshxonasi uchun Micro-CRM & Jonli Navbat

Mahalla sartaroshxonalari uchun real-vaqt navbat boshqaruvi, kassa hisobi va ombor nazorati. Internet uzilganda ham to'liq ishlaydi, ulanish tiklanganda o'zi sinxronlanadi.

**🔗 Jonli demo:** https://frontend-bay-two-99.vercel.app
**⚙️ Backend API:** https://barberflow-production-a1a9.up.railway.app

---

## 🎬 Demoni 2 daqiqada ko'rish

Ro'yxatdan o'tmasdan ko'rish uchun **"Boshqaruv (Ega)"** yorlig'ini oching — u parolsiz va butun tizimni ko'rsatadi: jonli navbat radari, kassa jurnali, ombor va analitika.

To'liq oqimni sinash uchun:

1. **"Mijoz Navbati"** → ro'yxatdan o'ting (ism, telefon, kamida 4 belgili parol) → usta va xizmatni tanlab navbat oling.
2. **"Usta Paneli"** → *o'sha mijoz tanlagan ustaning* telefon raqami bilan alohida hisob oching → navbatingizda o'sha mijoz turganini ko'rasiz → **"Keyingi mijozni chaqirish"** → xizmat tugagach kassaga urasiz.
3. **"Boshqaruv (Ega)"** → to'lov kassa jurnalida, pichoqcha omborda kamayganini ko'rasiz.

> Ikki qurilmada (yoki ikki brauzer oynasida) ochsangiz, WebSocket orqali o'zgarishlar bir-biriga darhol ko'chadi.

**Offline rejimni sinash:** Navbar'dagi **"Onlayn"** tugmasini bosing — ilova offline rejimga o'tadi, lekin navbat olish va kassa ishlayveradi. Qayta yoqsangiz, hamma o'zgarish FIFO tartibida serverga yuboriladi.

---

## 👥 Uch rol

| Rol | Kirish | Nima qiladi |
|---|---|---|
| **Ega (Owner)** | parolsiz | Kunlik tushum, to'lov turlari bo'yicha taqsimot, barcha ustalar radari, ombor va analitika |
| **Usta (Barber)** | telefon + parol | **Faqat o'z navbatini** ko'radi, mijozni chaqiradi, kassaga uradi, 50% ulushini kuzatadi, "kelmadi" va tanaffus |
| **Mijoz (Client)** | telefon + parol | Ustalar bandligini ko'radi, navbat oladi, o'z navbat raqamini kuzatadi |

Usta o'zi ro'yxatdan o'tadi va shu zahoti eganing ekranida hamda mijozlarning usta tanlash ro'yxatida paydo bo'ladi (WebSocket orqali, sahifani yangilamasdan).

---

## 📁 Loyiha strukturasi

```
barberflow/
├── backend/                        # Node.js (ESM) + Express + WebSocket
│   ├── src/
│   │   ├── server.js               # REST API, WebSocket broadcast, status sahifasi
│   │   ├── auth.js                 # /api/auth/register va /api/auth/login (bcryptjs)
│   │   ├── supabaseDb.js           # Supabase Cloud adapteri (SQLite'ga fallback qiladi)
│   │   ├── sqliteDb.js             # Lokal SQLite (WAL rejimi, ACID tranzaksiyalar)
│   │   └── telegramBot.js          # Telegram bot va push-xabarnomalar
│   ├── test/                       # node:test — 19 ta test
│   ├── supabase_schema.sql         # Supabase jadvallari, RLS va Realtime
│   └── Dockerfile                  # Railway uchun (node:22-slim)
│
├── frontend/                       # React 19 + Vite + Tailwind v4 + Zustand
│   └── src/
│       ├── App.jsx                 # WebSocket listener, offline kuzatuvi, rol marshrutlash
│       ├── store/useAppStore.js    # Zustand + localStorage + offline sync navbati
│       ├── utils/sound.js          # Web Audio API bilan sintez qilingan ovozlar (mp3 fayllarsiz)
│       └── components/
│           ├── AuthGate.jsx        # Usta / Mijoz login va ro'yxatdan o'tish
│           ├── views/{Owner,Barber,Client}View.jsx
│           ├── {WalkIn,Payment,Analytics,ThermalReceipt}Modal.jsx
│           ├── TelegramDrawer.jsx  # Telegram bot boshqaruvi
│           ├── Navbar.jsx          # Rol almashtirish, offline simulyatori, chiqish
│           └── OfflineBanner.jsx
│
├── scripts/                        # Bir martalik migratsiya skriptlari
└── docs/superpowers/               # Feature spec va implementatsiya rejalari
```

---

## 🚀 Lokal ishga tushirish

Supabase kalitlarisiz ham ishlaydi — bu holda avtomatik lokal SQLite bazasiga tushadi va hech qanday sozlash talab qilmaydi.

```bash
# 1. Backend (port 5050)
cd backend
npm install
cp .env.example .env      # kalitlarsiz qoldirsangiz ham bo'ladi
npm run dev

# 2. Frontend (port 5173) — yangi terminalda
cd frontend
npm install
npm run dev
```

Brauzerda `http://localhost:5173` ni oching. Vite `/api` so'rovlarini `localhost:5050` ga proksilab beradi, shuning uchun frontend uchun `.env` shart emas.

**Testlar:**
```bash
cd backend && npm test      # 19 ta test — auth endpointlari va DB qatlami
cd frontend && npm run lint # oxlint
```

---

## 🌐 Deploy

To'liq qo'llanma: [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

Qisqacha: baza **Supabase** (SQL Editor'da `backend/supabase_schema.sql` ni ishga tushiring), backend **Railway** (root = `backend`, Dockerfile bilan), frontend **Vercel** (root = `frontend`, `VITE_API_URL` ni Railway domeniga qarating).

---

## 🔌 API

| Metod | Yo'l | Vazifasi |
|---|---|---|
| `GET` | `/api/health` | Server holati, qaysi baza ishlayotgani, Telegram faolmi |
| `GET` | `/api/state` | Butun holat: profillar, xizmatlar, navbatlar, ombor, tranzaksiyalar |
| `POST` | `/api/auth/register` | `{full_name, phone, password, role}` → yangi hisob (`barber` yoki `client`) |
| `POST` | `/api/auth/login` | `{phone, password}` → hisob ma'lumotlari |
| `POST` | `/api/appointments` | Yangi navbat (walk-in yoki onlayn) |
| `PATCH` | `/api/appointments/:id` | Holat: `in_progress` / `completed` / `no_show` / `cancelled` |
| `PATCH` | `/api/inventory/:id` | Ombor qoldig'ini yangilash |
| `POST` | `/api/sync` | Offline navbatni FIFO tartibida serverga yuborish |
| `WS` | `/ws` | Har bir o'zgarishda to'liq holat broadcast qilinadi |

---

## 🔐 Xavfsizlik modeli — ochiq aytilgan chegaralar

Bu bitta sartaroshxona uchun mo'ljallangan ishonchli muhit ilovasi, ko'p ijarachili (multi-tenant) tizim emas. Shuning uchun:

- **REST endpointlar autentifikatsiyadan o'tmaydi.** Login faqat frontend qaysi ekranni ko'rsatishini hal qiladi, API'ga kirishni cheklamaydi. Texnik bilimli foydalanuvchi `localStorage`dagi `currentUser`ni o'zgartirib boshqa panelni ocha oladi.
- **Ro'yxatdan o'tish ochiq** — istalgan odam o'zini usta sifatida qo'shishi mumkin. Bu ongli tanlov: mahalla sartaroshxonasida yangi usta ishga kirganda uni ega kutib o'tirmasdan o'zi qo'shsin degan talab bo'lgan.
- Parollar `bcryptjs` bilan (cost 10) hash qilinadi va hech qachon mijozga qaytarilmaydi — `GET /api/state` va WebSocket broadcast'ida profil maydonlari aniq ro'yxat bilan tanlanadi, `SELECT *` ishlatilmaydi.
- Login noto'g'ri parol, mavjud bo'lmagan raqam va parolsiz eski yozuv uchun **bir xil xabar va bir xil vaqt** sarflaydi, ya'ni raqam ro'yxatdan o'tganini aniqlab bo'lmaydi.

Agar bu tizim bir nechta sartaroshxonaga xizmat qiladigan bo'lsa, birinchi qadam har bir endpointga server tomonida rol tekshiruvi qo'shish bo'lishi kerak.

---

## ⚡ Diqqatga sazovor yechimlar

**Offline-first.** Internet uzilganda Zustand `localStorage`ga yozadi va amallarni FIFO navbatga qo'yadi; ulanish tiklanganda `POST /api/sync` orqali serverga birma-bir yuboriladi. Demo uchun Navbar'da uzilishni simulyatsiya qiluvchi tugma bor.

**Ikki bazali adapter.** `supabaseDb.js` va `sqliteDb.js` bir xil interfeysni taqdim etadi; `SUPABASE_URL` bo'lmasa yoki bulut javob bermasa, tizim jimgina lokal SQLite'ga o'tadi va ishlashda davom etadi. Demo paytida internet yo'qolsa ham hech narsa buzilmaydi.

**Tashqi fayllarsiz ovoz.** `utils/sound.js` Web Audio API bilan ovozlarni matematik sintez qiladi — bitta ham `.mp3` fayl yo'q, bundle kichik va litsenziya muammosi yo'q.

**Chop etiluvchi termal chek.** Kassa jurnalidagi har bir to'lov uchun STIR, QR-kod va usta ulushi bilan haqiqiy kassa cheki — `window.print()` orqali termal printerga chiqadi.

**Telegram bot.** `/start`, `/navbat`, `/kassa`, `/ustalar` komandalari; yangi navbat, to'lov va ombor tugashi bo'yicha push-xabarnomalar.
