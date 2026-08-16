import express from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';

const router = express.Router();

router.patch('/:id', inventoryController.updateInventory);

export default router;
