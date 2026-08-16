import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5050,
  HOST: process.env.HOST || '0.0.0.0',
  APP_URL: process.env.APP_URL || 'http://localhost:5173',

  // Database
  SQLITE_DB_PATH: process.env.SQLITE_DB_PATH,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,

  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID,

  // Gemini AI Agent
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.AI_API_KEY,
};
