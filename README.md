# 💈 BarberFlow — Mahalla Sartaroshxonasi uchun Micro-CRM & Jonli Navbat

Xakaton g'olibi darajasidagi, 100% **Offline-First**, mobil-moslashuvchan Micro-CRM va Jonli Navbat tizimi.

---

## 📁 Loyiha Strukturasi (Frontend va Backend Alohida)

```
hackaton/
├── frontend/                  # React 19 + Vite + Tailwind CSS + Zustand (Client)
│   ├── src/
│   │   ├── components/
│   │   │   ├── views/
│   │   │   │   ├── OwnerView.jsx     # 👑 Ega: Kassa, Jonli Navbat & Ombor nazorati
│   │   │   │   ├── BarberView.jsx    # 💈 Usta: 3 ta katta touch-tugma, No-show & Daromad
│   │   │   │   └── ClientView.jsx    # 📱 Mijoz: Jonli navbat radari, online navbat olish
│   │   │   ├── Navbar.jsx            # Offline simulator switch & Role switcher
│   │   │   ├── OfflineBanner.jsx     # Internet uzilish signali va avto-sync holati
│   │   │   ├── WalkInModal.jsx       # 1-klikda tezkor mijoz qo'shish
│   │   │   └── PaymentModal.jsx      # Naqd / Karta / Uzum Pay kassa to'lovi + Confetti
│   │   └── store/
│   │       └── useAppStore.js        # LocalStorage persistence & Offline sync queue
│   └── package.json
│
├── backend/                   # Node.js + Express + WebSocket Realtime Server
│   ├── src/
│   │   ├── server.js                 # REST API + Realtime WebSocket kanallari
│   │   └── db.js                     # In-memory + JSON Data store & Sync batch reconciler
│   └── package.json
│
└── package.json               # Root monorepo runner skriptlari
```

---

## 🚀 Ishga Tushirish (Quick Start)

### 1. Backend serverni ishga tushirish (Port: 5000):
```bash
cd backend
npm run dev
```

### 2. Frontend ilovani ishga tushirish (Port: 5173):
```bash
cd frontend
npm run dev
```

*(Yoki asosiy ildiz papkadan turib: `npm run dev:backend` va `npm run dev:frontend`)*

---

## 🏆 Xakaton Hakamlari Uchun "Killer Feature"lar:

1. **⚡ Offline-First Resilience (Internet Uzilishiga Chidamlilik)**:
   - Navbar'dagi **"Onlayn / Offline (Lokal)"** tugmasini bosing yoki Wi-Fi ni o'chirib qo'ying.
   - Ilova to'xtovsiz ishlaydi: yangi mijozlar qo'shiladi, kassa uriladi, ombor kamayadi.
   - Internet yoqilishi bilan barcha o'zgarishlar serverga avtomatik (FIFO) sinxronizatsiya qilinadi.
2. **❌ Mijoz Kelmadi (No-Show) Yechimi**:
   - Usta 1 marta "Kelmadi" tugmasini bossa, navbat buzilmasdan vaqt hisobi qayta hisoblanadi va keyingi mijoz chaqiriladi.
3. **📦 Avto-Ombor Yechilishi**:
   - Har bir xizmat yakunlanganda bir martalik pichoqcha avtomatik yechiladi va tugab qolsa Ega ekranida ogohlantirish beradi.
