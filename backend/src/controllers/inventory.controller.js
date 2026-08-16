import { db } from '../db/index.js';
import { broadcastState } from '../services/websocket.service.js';

export const inventoryController = {
  async updateInventory(req, res, next) {
    try {
      const item = await db.updateInventory(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Inventory item not found' });
      }
      await broadcastState('INVENTORY_UPDATED', item);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }
};
