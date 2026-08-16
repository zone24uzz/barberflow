import express from 'express';
import { syncController } from '../controllers/sync.controller.js';

const router = express.Router();

router.post('/', syncController.syncOfflineActions);

export default router;
