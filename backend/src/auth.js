import express from 'express';
import bcrypt from 'bcryptjs';

const BAD_CREDENTIALS = 'Login yoki parol xato';
const ALLOWED_ROLES = ['barber', 'client'];
const MIN_PASSWORD_LENGTH = 4;

// Precomputed at module load (not per request) so that when there is no real
// profile/password_hash to compare against, we still run a bcrypt.compare of
// comparable cost before responding. This keeps the unknown-phone and
// wrong-password paths close in timing so a response-latency side channel
// can't reveal whether a phone number is registered. This hash matches no
// real password — it exists only to burn CPU time.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-never-matches', 10);

function toSafeUser({ id, full_name, phone, role }) {
  return { id, full_name, phone, role };
}

export default function createAuthRouter(db) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { full_name, phone, password, role } = req.body || {};

    if (!full_name?.trim()) {
      return res.status(400).json({ success: false, error: 'Ismingizni kiriting' });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, error: 'Telefon raqamingizni kiriting' });
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lsin` });
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
    } catch (err) {
      if (err.message === 'PHONE_TAKEN') {
        return res.status(409).json({ success: false, error: "Bu raqam allaqachon ro'yxatdan o'tgan" });
      }
      console.error('Register error:', err);
      res.status(500).json({ success: false, error: 'Server xatosi, keyinroq urinib ko\'ring' });
    }
  });

  router.post('/login', async (req, res) => {
    const { phone, password } = req.body || {};

    if (!phone?.trim() || !password) {
      return res.status(400).json({ success: false, error: 'Telefon va parolni kiriting' });
    }

    try {
      const profile = await db.findProfileByPhone(phone.trim());

      // Same generic response for unknown phone, legacy row without a hash,
      // and wrong password — never reveal which one it was. We also always
      // run a bcrypt.compare (against DUMMY_HASH when there's no real hash
      // to check) so the missing-profile/missing-hash path takes comparable
      // time to the wrong-password path, closing the timing side channel.
      const matches = await bcrypt.compare(password, profile?.password_hash || DUMMY_HASH);
      if (!profile?.password_hash || !matches) {
        return res.status(401).json({ success: false, error: BAD_CREDENTIALS });
      }

      res.json({ success: true, user: toSafeUser(profile) });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Server xatosi, keyinroq urinib ko\'ring' });
    }
  });

  return router;
}
