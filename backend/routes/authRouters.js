// backend/routes/authRoutes.js
import express from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { requestOtp, verifyOtp, getMe, logout } from '../controllers/authControllers.js';

const router = express.Router();


router.post('/request-otp', requestOtp);

router.post('/verify-otp', verifyOtp);

router.get('/me', isAuthenticated, getMe);

router.post('/logout', isAuthenticated, logout);

export default router;