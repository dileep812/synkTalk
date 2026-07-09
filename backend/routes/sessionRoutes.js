import express from 'express';
import { manageSessions,getSessionStats} from '../controllers/sessionController.js';

const router = express.Router();

// All conditions funnel through this single HTTP endpoint
router.get('/', getSessionStats);
router.delete('/', manageSessions);

export default router;