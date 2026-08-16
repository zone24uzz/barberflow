import { db } from '../db/index.js';
import { broadcastState } from '../services/websocket.service.js';
import { sendTelegramNotification } from '../services/telegram.service.js';

export const appointmentController = {
  async createAppointment(req, res, next) {
    try {
      const apt = await db.addAppointment(req.body);
      const state = await db.getState();
      const barber = (state.profiles || []).find(p => p.id === apt.barber_id);
      const service = (state.services || []).find(s => s.id === apt.service_id);

      // Send Telegram Notification
      await sendTelegramNotification('NEW_APPOINTMENT', {
        client_name: apt.client_name,
        client_phone: apt.client_phone,
        barber_name: barber?.full_name,
        service_name: service?.name,
        price: apt.price,
        queue_number: apt.queue_number
      });

      await broadcastState('APPOINTMENT_ADDED', apt);
      res.status(201).json({ success: true, data: apt });
    } catch (err) {
      next(err);
    }
  },

  async updateAppointmentStatus(req, res, next) {
    try {
      const updated = await db.updateAppointmentStatus(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }

      const state = await db.getState();
      const barber = (state.profiles || []).find(p => p.id === updated.barber_id);

      if (req.body.status === 'in_progress') {
        await sendTelegramNotification('QUEUE_TURN', {
          client_name: updated.client_name,
          barber_name: barber?.full_name
        });
      } else if (req.body.status === 'completed') {
        await sendTelegramNotification('PAYMENT_RECEIVED', {
          client_name: updated.client_name,
          amount: updated.price,
          payment_type: req.body.payment_type || 'cash'
        });

        // Check low stock
        const blade = (state.inventory || []).find(i => i.id === 'inv-1');
        if (blade && blade.stock_quantity <= blade.min_alert_threshold) {
          await sendTelegramNotification('LOW_STOCK', blade);
        }
      }

      await broadcastState('APPOINTMENT_UPDATED', updated);
      res.json({ success: true, data: updated, state });
    } catch (err) {
      next(err);
    }
  }
};
