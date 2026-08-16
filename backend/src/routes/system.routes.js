import express from 'express';
import { systemController } from '../controllers/system.controller.js';

const router = express.Router();

router.get('/health', systemController.getHealth);
router.get('/state', systemController.getState);
router.post('/reset', systemController.resetDemo);

export default router;
