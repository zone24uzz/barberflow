import express from 'express';
import { authController, createAuthController } from '../controllers/auth.controller.js';

export function createAuthRouter(customDb, customBroadcast) {
  const router = express.Router();
  const controller = (customDb || customBroadcast) 
    ? createAuthController(customDb, customBroadcast) 
    : authController;

  router.post('/register', controller.register);
  router.post('/login', controller.login);

  return router;
}

export default createAuthRouter();
