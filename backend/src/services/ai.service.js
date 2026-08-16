import { ENV } from '../config/env.js';

const GEMINI_API_KEY = ENV.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.7-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

export async function askBarberAI({ role = 'client', prompt, image, userContext = {}, state = {} }) {
  // 1. Build System Instruction & Context based on Role
  const { systemPrompt, dynamicContext } = buildRolePromptAndContext({ role, userContext, state });

  // 2. Prepare Gemini Request Parts
  const parts = [];

  // Add contextual instruction & prompt
  const fullPromptText = `${systemPrompt}\n\n[JONLI TIZIM MA'LUMOTLARI / KONTEKST]:\n${JSON.stringify(dynamicContext, null, 2)}\n\n[FOYDALANUVCHI SAVOLI / TALABI]:\n${prompt || 'Assalomu alaykum! Menga yordam bering.'}`;
  parts.push({ text: fullPromptText });

  // If image provided (base64 data)
  if (image && typeof image === 'string') {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Data
      }
    });
  }

  // 3. Call Gemini 3.7 Flash API if key is configured
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '') {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      const data = await res.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (replyText && replyText.trim() !== '') {
        return {
          success: true,
          model: MODEL_NAME,
          role,
          reply: replyText.trim(),
          source: 'gemini'
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, using intelligent fallback:', err.message);
    }
  }

  // 4. Intelligent Role-Specific Offline Fallback
  return {
    success: true,
    model: 'barberflow-local-ai',
    role,
    reply: generateSmartFallback({ role, prompt, userContext, state }),
    source: 'local_engine'
  };
}

function buildRolePromptAndContext({ role, userContext, state }) {
  const appointments = state.appointments || [];
  const profiles = state.profiles || [];
  const services = state.services || [];
  const inventory = state.inventory || [];
  const transactions = state.transactions || [];

  if (role === 'barber') {
    const barberId = userContext.id || 'barber-1';
    const barberProfile = profiles.find(p => p.id === barberId) || { full_name: 'Anvar Usta' };
    const myWaiting = appointments.filter(a => a.barber_id === barberId && a.status === 'waiting');
    const myInProgress = appointments.find(a => a.barber_id === barberId && a.status === 'in_progress');
    const myTxs = transactions.filter(t => t.barber_id === barberId);
    const myTotalRevenue = myTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const myShare = myTotalRevenue * 0.5;

    const dynamicContext = {
      barber_name: barberProfile.full_name,
      kreslodagi_mijoz: myInProgress ? {
        client_name: myInProgress.client_name,
        service: services.find(s => s.id === myInProgress.service_id)?.name,
        price: myInProgress.price
      } : null,
      kutayotgan_mijozlar_soni: myWaiting.length,
      navbatdagi_mijozlar: myWaiting.map((a, i) => ({
        tartib: i + 1,
        mijoz: a.client_name,
        xizmat: services.find(s => s.id === a.service_id)?.name,
        kutish_vaqti: `taxminan ${(i + 1) * 15} daqiqa`
      })),
      bugungi_daromad: {
        jami_tushum: `${myTotalRevenue.toLocaleString()} so'm`,
        shaxsiy_50_foiz_ulush: `${myShare.toLocaleString()} so'm`,
        xizmatlar_soni: myTxs.length
      }
    };

    const systemPrompt = `Siz BarberFlow sartaroshxonasining "Usta Co-Pilot" aqlli yordamchisisiz.
Siz faqat shu ustaga oid navbatlar, kreslodagi mijoz va shaxsiy 50% daromad hisob-kitoblarini bilasiz.
Savolga aniq, qisqa, o'zbek tilida samimiy va professional javob bering.
Agar soch kesish yoki texnik savol so'ralsa, professional sartaroshlik usullarini tushuntiring.`;

    return { systemPrompt, dynamicContext };
  }

  if (role === 'owner') {
    const totalRev = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const cashTotal = transactions.filter(t => t.payment_type === 'cash').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const cardTotal = transactions.filter(t => t.payment_type === 'card').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const uzumTotal = transactions.filter(t => t.payment_type === 'uzum').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const lowStock = inventory.filter(i => i.stock_quantity <= i.min_alert_threshold);

    const barberBreakdown = profiles.filter(p => p.role === 'barber').map(b => {
      const bTxs = transactions.filter(t => t.barber_id === b.id);
      const bRev = bTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      return {
        usta: b.full_name,
        tushum: `${bRev.toLocaleString()} so'm`,
        usta_ulushi: `${(bRev * 0.5).toLocaleString()} so'm`,
        xizmatlar: bTxs.length
      };
    });

    const dynamicContext = {
      kassa: {
        yalpi_tushum: `${totalRev.toLocaleString()} so'm`,
        naqd: `${cashTotal.toLocaleString()} so'm`,
        plastik_karta: `${cardTotal.toLocaleString()} so'm`,
        uzum_pay: `${uzumTotal.toLocaleString()} so'm`,
        jami_to_lovlar: transactions.length
      },
      ustalar_samaradorligi: barberBreakdown,
      ombor_xavf_holati: lowStock.map(i => ({
        mahsulot: i.item_name,
        qoldiq: `${i.stock_quantity} ${i.unit}`,
        chegara: i.min_alert_threshold
      })),
      faol_navbatlar: appointments.filter(a => a.status === 'waiting' || a.status === 'in_progress').length
    };

    const systemPrompt = `Siz BarberFlow sartaroshxonasining Boshqaruvchi / Ega uchun "Executive AI Biznes Analitik" hisoblanasiz.
Sizda sartaroshxonaning barcha kassa tushumlari, to'lov turlari, ustalar reytingi va ombor zaxiralari mavjud.
Vazifangiz: Egaga biznes tahlili, kassa holati, ombordagi kamchiliklar va daromadni oshirish bo'yicha aniq strategik tavsiyalar berish.
O'zbek tilida raqamlarga asoslangan, jiddiy va aniq tahliliy uslubda javob bering.`;

    return { systemPrompt, dynamicContext };
  }

  // Default: Client (Mijoz)
  const dynamicContext = {
    sartaroshxona: 'BarberFlow Atelier Edition',
    ustalar: profiles.filter(p => p.role === 'barber').map(b => b.full_name),
    xizmatlar_va_narxlar: services.map(s => `${s.name}: ${s.price.toLocaleString()} so'm (${s.duration_minutes} daqiqa)`),
    jonli_kutish_vaqti: `Hozirda navbatda taxminan ${appointments.filter(a => a.status === 'waiting').length * 15} daqiqa kutish bor`
  };

  const systemPrompt = `Siz BarberFlow sartaroshxonasining professional "AI Stilist va Soch Turmagi Maslahatchisi" hisoblanasiz.
Vazifangiz:
1. Agar mijoz rasm yuklasa yoki yuz shaklini aytsa, yuz shakliga (oval, dumaloq, to'rtburchak, yurak, uzunchoq) mos eng chiroyli 2-3 ta zamonaviy soch va soqol turmaklarini tavsiya qilish (masalan: Low/Mid Fade, Textured Crop, Classic Side Part, French Crop, Pompadour, Buzz Cut, Beard Fade).
2. Soch va bosh terisi parvarishi, vositalari bo'yicha maslahat berish.
3. Sartaroshxonamiz xizmatlaridan qaysi biriga yozilish maqsadga muvofiqligini ko'rsatish.
O'zbek tilida zamonaviy, xushmuomala, stilist darajasida qiziqarli javob bering.`;

  return { systemPrompt, dynamicContext };
}

function generateSmartFallback({ role, prompt = '', userContext = {}, state = {} }) {
  const p = prompt.toLowerCase();

  if (role === 'owner') {
    const transactions = state.transactions || [];
    const total = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const lowStock = (state.inventory || []).filter(i => i.stock_quantity <= i.min_alert_threshold);

    if (p.includes('kassa') || p.includes('tushum') || p.includes('daromad') || p.includes('pul')) {
      return `📊 **Bugungi Kassa Hisoboti:**\n\n• **Jami Yalpi Tushum:** ${total.toLocaleString()} so'm\n• **Amalga oshirilgan to'lovlar:** ${transactions.length} ta\n• **Ombor holati:** ${lowStock.length > 0 ? `⚠️ ${lowStock.length} ta mahsulot kam qolgan` : '✅ Zaxira yetarli'}\n\n💡 *Tavsiya:* Kechki soat 17:00 dan 20:00 gacha eng ko'p talab bo'ladi, barcha kreslolarni to'liq quvvatda ushlab turish tavsiya etiladi.`;
    }

    if (p.includes('usta') || p.includes('reyting') || p.includes('kim')) {
      return `👑 **Ustalar Samaradorligi:**\n\nBarcha ustalar faol holatda. Jami xizmatlar ichida eng ko'p mijoz qabul qilgan ustalar yaxshi ko'rsatkich ko'rsatmoqda. Har bir usta o'zining 50% ulushini shaffof kuzatib bormoqda.`;
    }

    return `🏢 **BarberFlow Biznes Tahlilchisi:**\n\nSartaroshxona barqaror ishlamoqda. Jami tushum: **${total.toLocaleString()} so'm**. Yangi mijozlarni jalb qilish uchun Telegram bot orqali onlayn navbat xizmatini kengroq targ'ib qilish tavsiya etiladi.`;
  }

  if (role === 'barber') {
    const barberId = userContext.id || 'barber-1';
    const myWaiting = (state.appointments || []).filter(a => a.barber_id === barberId && a.status === 'waiting');
    const myInProgress = (state.appointments || []).filter(a => a.barber_id === barberId && a.status === 'in_progress');

    if (p.includes('mijoz') || p.includes('navbat') || p.includes('kim') || p.includes('qachon')) {
      if (myInProgress) {
        return `💈 **Hozirgi Holatingiz:**\n\nKreslongizda: **${myInProgress.client_name}** (${myInProgress.price?.toLocaleString()} so'm).\n\n⏳ Sizning navbatingizda yana **${myWaiting.length} ta mijoz** kutmoqda.`;
      }
      return `💈 **Navbat Holati:**\n\nHozirda stansiyangiz bo'sh. Navbatda **${myWaiting.length} ta mijoz** kutmoqda. Yangi mijozni chaqirish uchun "Navbatdagi mijozni chaqirish" tugmasini bosing!`;
    }

    return `✂️ **Usta Yordamchisi:**\n\nNavbatingizda ${myWaiting.length} ta mijoz bor. Xizmatni yakunlagach darhol kassa hisobiga o'tkazishingiz mumkin, tizim 50% ulushingizni avtomatik hisoblab boradi.`;
  }

  // Client (Mijoz)
  if (p.includes('dumaloq') || p.includes('yuz') || p.includes('oval') || p.includes('soch')) {
    return `💈 **AI Stilist Tavsiyasi:**\n\n1. **Textured Crop / French Crop:** Yuz tuzilishini chiroyli ochib beradi va har kuni oson shakllantiriladi.\n2. **Mid Fade + Side Part:** Klassik va biznes uslubiga juda mos keladi.\n3. **Low Fade + Textured Top:** Zamonaviy va yoshlarbop ko'rinish beradi.\n\n✂️ Sartaroshxonamizda **"Klassik Soch Olish" (50 000 so'm)** yoki **"Premium Kompleks" (85 000 so'm)** xizmatiga hoziroq navbat olishingiz mumkin!`;
  }

  return `💈 **BarberFlow AI Stilistiga xush kelibsiz!**\n\nMenga yuzingiz rasmini yuklashingiz yoki o'zingizga yoqadigan uslub haqida yozishingiz mumkin. Men yuz shaklingizga eng mos soch va soqol turmaklarini tavsiya qilaman!`;
}
