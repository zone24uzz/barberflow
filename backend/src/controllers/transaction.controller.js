import { db } from '../db/index.js';
import { broadcastState } from '../services/websocket.service.js';

export const transactionController = {
  async createTransaction(req, res, next) {
    try {
      const tx = await db.addTransaction(req.body);
      await broadcastState('TRANSACTION_ADDED', tx);
      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      next(err);
    }
  }
};
