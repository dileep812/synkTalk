// backend/routes/requestRoutes.js
import express from 'express';
import { 
    sendRequest, 
    getIncomingRequests, 
    handleRequestStatus, 
    withdrawRequest 
} from '../controllers/requestControllers.js';

const router = express.Router();

// Maps parameters mounted at /api/v1/requests
router.post('/send', sendRequest);
router.get('/inbox', getIncomingRequests);
router.post('/handle', handleRequestStatus);
router.delete('/withdraw/:requestId', withdrawRequest); // 🌟 New DELETE endpoint for withdrawal

export default router;