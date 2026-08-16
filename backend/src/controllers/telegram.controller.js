import { sendTelegramNotification, getTelegramStatus } from '../services/telegram.service.js';

export const telegramController = {
  async testNotify(req, res, next) {
    try {
      const { type, data } = req.body || {};
      const result = await sendTelegramNotification(type || 'NEW_APPOINTMENT', data || {
        client_name: 'Test Mijoz (Demo)',
        barber_name: 'Anvar Usta',
        service_name: 'Klassik Soch Olish',
        price: 50000,
        queue_number: 1
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getStatus(req, res) {
    res.json(getTelegramStatus());
  }
};
