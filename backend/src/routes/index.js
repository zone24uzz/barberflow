import express from 'express';
import authRouter from './auth.routes.js';
import appointmentRouter from './appointment.routes.js';
import transactionRouter from './transaction.routes.js';
import inventoryRouter from './inventory.routes.js';
import syncRouter from './sync.routes.js';
import telegramRouter from './telegram.routes.js';
import aiRouter from './ai.routes.js';
import systemRouter from './system.routes.js';
import { systemController } from '../controllers/system.controller.js';

const router = express.Router();

// Root Web Page
router.get('/', systemController.renderRootStatus);

// API Sub-Routers
router.use('/api/auth', authRouter);
router.use('/api/appointments', appointmentRouter);
router.use('/api/transactions', transactionRouter);
router.use('/api/inventory', inventoryRouter);
router.use('/api/sync', syncRouter);
router.use('/api/telegram', telegramRouter);
router.use('/api/ai', aiRouter);
router.use('/api', systemRouter);

export default router;
