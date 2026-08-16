import express from 'express';
import { transactionController } from '../controllers/transaction.controller.js';

const router = express.Router();

router.post('/', transactionController.createTransaction);

export default router;
