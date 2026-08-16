import { db } from '../db/index.js';
import { broadcastState } from '../services/websocket.service.js';

export const syncController = {
  async syncOfflineActions(req, res, next) {
    try {
      const { actions } = req.body;
      console.log(`🔄 Processing ${actions?.length || 0} offline sync actions...`);
      const newState = await db.syncOfflineActions(actions);
      await broadcastState('SYNC_COMPLETED', { count: actions?.length || 0 });
      res.json({ success: true, syncedCount: actions?.length || 0, state: newState });
    } catch (err) {
      next(err);
    }
  }
};
