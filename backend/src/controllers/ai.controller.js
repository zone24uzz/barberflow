import { db } from '../db/index.js';
import { askBarberAI } from '../services/ai.service.js';

export const aiController = {
  async chatWithAI(req, res, next) {
    try {
      const { role = 'client', prompt, image, userContext } = req.body || {};
      const state = await db.getState();

      const result = await askBarberAI({
        role,
        prompt: prompt || '',
        image: image || null,
        userContext: userContext || {},
        state
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
};
