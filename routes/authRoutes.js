import { Router } from 'express';
const router = Router();
import * as auth from '../controllers/authController.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter, changePasswordLimiter } from '../middleware/rateLimiters.js';

router.post('/login', loginLimiter, auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAdmin, auth.me);
router.post('/change-password', changePasswordLimiter, auth.changePassword);

export default router;
