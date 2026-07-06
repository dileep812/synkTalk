// backend/routes/messageRoutes.js
import express from 'express';
import { getChatHistory } from '../controllers/messageControllers.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// All message interactions require a valid active session cookie
router.use(isAuthenticated);

/**
 * @desc    Fetch historical message array between current user and chatUserId
 * @access  Private
 */
router.get('/:chatUserId', getChatHistory);

export default router;