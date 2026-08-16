import express from 'express';
import { telegramController } from '../controllers/telegram.controller.js';

const router = express.Router();

router.post('/test-notify', telegramController.testNotify);
router.get('/status', telegramController.getStatus);

export default router;
