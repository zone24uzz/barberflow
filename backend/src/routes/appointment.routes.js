import express from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';

const router = express.Router();

router.post('/', appointmentController.createAppointment);
router.patch('/:id', appointmentController.updateAppointmentStatus);

export default router;
