import bcrypt from 'bcryptjs';
import { db as defaultDb } from '../db/index.js';
import { broadcastState as defaultBroadcast } from '../services/websocket.service.js';
import { ALLOWED_ROLES, MIN_PASSWORD_LENGTH, BAD_CREDENTIALS_MSG } from '../config/constants.js';

// Precomputed dummy hash to prevent side-channel timing attacks
const DUMMY_HASH = bcrypt.hashSync('dummy-password-never-matches', 10);

function toSafeUser({ id, full_name, phone, role }) {
  return { id, full_name, phone, role };
}

export function createAuthController(db = defaultDb, broadcastState = defaultBroadcast) {
  return {
    async register(req, res, next) {
      const { full_name, phone, password, role } = req.body || {};

      if (!full_name?.trim()) {
        return res.status(400).json({ success: false, error: 'Ismingizni kiriting' });
      }
      if (!phone?.trim()) {
        return res.status(400).json({ success: false, error: 'Telefon raqamingizni kiriting' });
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ 
          success: false, 
          error: `Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lsin` 
        });
      }
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: "Roli noto'g'ri (faqat usta yoki mijoz)" });
      }

      try {
        const password_hash = await bcrypt.hash(password, 10);
        const user = await db.registerProfile({
          full_name: full_name.trim(),
          phone: phone.trim(),
          password_hash,
          role
        });

        res.status(201).json({ success: true, user: toSafeUser(user) });

        if (typeof broadcastState === 'function') {
          Promise.resolve(broadcastState('PROFILE_REGISTERED', toSafeUser(user))).catch(err => {
            console.error('Register broadcast error:', err);
          });
        }
      } catch (err) {
        if (err.message === 'PHONE_TAKEN') {
          return res.status(409).json({ success: false, error: "Bu raqam allaqachon ro'yxatdan o'tgan" });
        }
        next(err);
      }
    },

    async login(req, res, next) {
      const { phone, password } = req.body || {};

      if (!phone?.trim() || !password) {
        return res.status(400).json({ success: false, error: 'Telefon va parolni kiriting' });
      }

      try {
        const profile = await db.findProfileByPhone(phone.trim());
        const matches = await bcrypt.compare(password, profile?.password_hash || DUMMY_HASH);

        if (!profile?.password_hash || !matches) {
          return res.status(401).json({ success: false, error: BAD_CREDENTIALS_MSG });
        }

        res.json({ success: true, user: toSafeUser(profile) });
      } catch (err) {
        next(err);
      }
    }
  };
}

export const authController = createAuthController();
