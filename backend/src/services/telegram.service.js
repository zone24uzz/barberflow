import TelegramBot from 'node-telegram-bot-api';
import { ENV } from '../config/env.js';
import { db as defaultDb } from '../db/index.js';

const TOKEN = ENV.TELEGRAM_BOT_TOKEN;
let bot = null;
let activeDb = defaultDb;

export function initTelegramBot(appUrl = ENV.APP_URL, database = defaultDb) {
  activeDb = database;

  if (!TOKEN || TOKEN.trim() === '') {
    console.log('🤖 Telegram Bot: TELEGRAM_BOT_TOKEN topilmadi. Mock/Simulyatsiya rejimida ishga tushirildi.');
    bot = {
      isMock: true,
      sendMessage: async (chatId, text) => {
        console.log(`[Telegram Mock to ${chatId}]:`, text);
        return { success: true, mock: true };
      }
    };
    return bot;
  }

  try {
    bot = new TelegramBot(TOKEN, { polling: true });
    console.log('🚀 BarberFlow Telegram Bot muvaffaqiyatli ishga tushdi!');

    // /start command
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from.first_name || 'Hurmatli mijoz';

      const welcomeText = `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
        `💈 <b>BarberFlow</b> — Mahalla sartaroshxonasi onlayn navbat va boshqaruv tizimiga xush kelibsiz!\n\n` +
        `Siz bu yerda jonli navbatni ko'rishingiz, uydan turib navbat olishingiz va kutish vaqtingizni aniq bilishingiz mumkin.`;

      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: '📱 Mini Appni Ochish (Jonli Navbat)', 
              web_app: { url: appUrl } 
            }
          ],
          [
            { text: '⏳ Jonli Navbat Holati', callback_data: 'cmd_queue' },
            { text: '✂️ Ustalar va Narxlar', callback_data: 'cmd_barbers' }
          ],
          [
            { text: '💰 Bugungi Kassa (Ega uchun)', callback_data: 'cmd_kassa' }
          ]
        ]
      };

      bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    });

    // Handle Callback Queries (Buttons)
    bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;

      try {
        if (data === 'cmd_queue') {
          const state = await activeDb.getState();
          const waiting = (state.appointments || []).filter(a => a.status === 'waiting');
          const inProgress = (state.appointments || []).filter(a => a.status === 'in_progress');

          let msg = `💈 <b>Jonli Navbat Holati:</b>\n\n`;
          msg += `🟢 <b>Kresloda xizmat olayotganlar (${inProgress.length}):</b>\n`;
          if (inProgress.length === 0) {
            msg += `<i>Hozirda barcha kreslolar bo'sh</i>\n`;
          } else {
            inProgress.forEach(a => {
              const barber = (state.profiles || []).find(p => p.id === a.barber_id);
              const srv = (state.services || []).find(s => s.id === a.service_id);
              msg += `• <b>${a.client_name}</b> ➔ ${barber?.full_name || 'Usta'} (${srv?.name || 'Xizmat'})\n`;
            });
          }

          msg += `\n⏳ <b>Kutayotganlar soni (${waiting.length}):</b>\n`;
          if (waiting.length === 0) {
            msg += `<i>Navbatda hech kim yo'q. Istalgan vaqtda kelishingiz mumkin!</i>\n`;
          } else {
            waiting.forEach((a, i) => {
              msg += `${i + 1}. <b>${a.client_name}</b> (Taxminan ${ (i + 1) * 15 } daqiqa)\n`;
            });
          }

          await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
        } else if (data === 'cmd_barbers') {
          const state = await activeDb.getState();
          let msg = `💈 <b>Bizning Ustalar va Xizmatlar:</b>\n\n`;
          (state.profiles || []).filter(p => p.role === 'barber').forEach(b => {
            msg += `✂️ <b>${b.full_name}</b> (${b.phone || 'Tel ko\'rsatilmadi'})\n`;
          });
          msg += `\n📋 <b>Xizmatlar narxi:</b>\n`;
          (state.services || []).forEach(s => {
            msg += `• ${s.name}: <b>${Number(s.price).toLocaleString()} so'm</b> (${s.duration_minutes} daq)\n`;
          });

          await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
        } else if (data === 'cmd_kassa') {
          const state = await activeDb.getState();
          const txs = state.transactions || [];
          const total = txs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
          const cash = txs.filter(t => t.payment_type === 'cash').reduce((acc, t) => acc + Number(t.amount || 0), 0);
          const card = txs.filter(t => t.payment_type === 'card').reduce((acc, t) => acc + Number(t.amount || 0), 0);
          const uzum = txs.filter(t => t.payment_type === 'uzum').reduce((acc, t) => acc + Number(t.amount || 0), 0);

          let msg = `💰 <b>Bugungi Sartaroshxona Kassasi:</b>\n\n`;
          msg += `💵 <b>Jami tushum:</b> ${total.toLocaleString()} so'm\n`;
          msg += `• Naqd: ${cash.toLocaleString()} so'm\n`;
          msg += `• Plastik: ${card.toLocaleString()} so'm\n`;
          msg += `• Uzum Pay: ${uzum.toLocaleString()} so'm\n\n`;
          msg += `📦 Jami xizmatlar: ${txs.length} ta`;

          await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
        }
      } catch (err) {
        console.error('Telegram bot callback error:', err);
      }

      try {
        bot.answerCallbackQuery(query.id);
      } catch (e) {
        // Ignore answerCallbackQuery failures
      }
    });

    bot.on('polling_error', (error) => {
      if (error.code === 'ETELEGRAM' && error.response?.statusCode === 404) {
        console.warn('⚠️ Telegram Bot tokeni noto\'g\'ri kiritilgan. Bot to\'xtatildi.');
        bot.stopPolling();
      }
    });

    return bot;
  } catch (err) {
    console.error('Telegram bot init error:', err);
    return null;
  }
}

export function formatNotificationMessage(type, data = {}) {
  switch (type) {
    case 'NEW_APPOINTMENT':
      return `🔔 <b>Yangi Navbat Olinadi!</b>\n` +
        `👤 Mijoz: <b>${data.client_name || 'Noma\'lum'}</b> (${data.client_phone || 'Tel ko\'rsatilmadi'})\n` +
        `💈 Usta: <b>${data.barber_name || 'Usta'}</b>\n` +
        `✂️ Xizmat: <b>${data.service_name || 'Soch olish'}</b> (${Number(data.price || 0).toLocaleString()} so'm)\n` +
        `⏳ Navbat raqami: <b>#${data.queue_number || 1}</b>`;

    case 'QUEUE_TURN':
      return `🎉 <b>Navbat Sizniki!</b>\n` +
        `Hurmatli <b>${data.client_name || 'Mijoz'}</b>, sizning navbatingiz yetib keldi!\n` +
        `💈 Usta <b>${data.barber_name || 'Usta'}</b> sizni kresloga taklif qilmoqda.`;

    case 'PAYMENT_RECEIVED': {
      const amount = Number(data.amount || 0);
      return `💰 <b>To'lov Qabul Qilindi!</b>\n` +
        `👤 Mijoz: <b>${data.client_name || 'Mijoz'}</b>\n` +
        `💵 Summa: <b>${amount.toLocaleString()} so'm</b> (${(data.payment_type || 'cash').toUpperCase()})\n` +
        `💈 Usta ulushi (50%): <b>${(amount * 0.5).toLocaleString()} so'm</b>`;
    }

    case 'LOW_STOCK':
      return `⚠️ <b>DIQQAT! Omborxonada Mahsulot Kam Qoldi!</b>\n` +
        `📦 Mahsulot: <b>${data.item_name || 'Mahsulot'}</b>\n` +
        `Qoldiq: <b>${data.stock_quantity || 0} ${data.unit || 'dona'}</b> (Kritik chegara: ${data.min_alert_threshold || 0})`;

    default:
      return `ℹ️ <b>BarberFlow Bildirishnomasi:</b> ${JSON.stringify(data)}`;
  }
}

export async function sendTelegramNotification(type, payload) {
  const notificationText = formatNotificationMessage(type, payload);
  console.log(`📣 [Telegram Live Broadcast - ${type}]:\n`, notificationText);

  const adminChatId = ENV.TELEGRAM_ADMIN_CHAT_ID;
  if (bot && adminChatId && !bot.isMock) {
    try {
      await bot.sendMessage(adminChatId, notificationText, { parse_mode: 'HTML' });
    } catch (e) {
      console.warn('Telegram notification delivery failed:', e.message);
    }
  }
  return { success: true, text: notificationText };
}

export function getTelegramStatus() {
  return {
    active: Boolean(ENV.TELEGRAM_BOT_TOKEN),
    botTokenConfigured: Boolean(ENV.TELEGRAM_BOT_TOKEN),
    adminChatConfigured: Boolean(ENV.TELEGRAM_ADMIN_CHAT_ID),
    isMock: Boolean(!bot || bot.isMock)
  };
}

export function getBot() {
  return bot;
}
