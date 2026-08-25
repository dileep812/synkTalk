import { createClient } from 'redis';
import { sendRedisFailureAlert, sendRedisRecoveryAlert } from '../services/email.js';

let isRedisConnected = false;
let alertSent = false;
let redisAlertTimer = null;
let downStartTime = null;

const redisClient = createClient({
    url: process.env.REDIS_URL,
    pingInterval: 1000 * 30, // Sends active PING every 30s to prevent idle connection closure
    socket: {
        keepAlive: 10000,
        noDelay: true,
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
});

// Reconnection / Recovery handler
redisClient.on('connect', async () => {
    console.log('🚀 Connected to Redis Queue Matrix successfully');
    isRedisConnected = true;

    // Clear pending failure alert if reconnected quickly (< 15s)
    if (redisAlertTimer) {
        clearTimeout(redisAlertTimer);
        redisAlertTimer = null;
    }

    // If a failure email was previously sent to the admin, send a recovery notification
    if (alertSent) {
        const downtimeSec = downStartTime 
            ? Math.round((Date.now() - downStartTime) / 1000) 
            : 0;

        await sendRedisRecoveryAlert(downtimeSec);
        alertSent = false;
        downStartTime = null;
    }
});

// Failure / Error handler
redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err?.message || err);

    if (!isRedisConnected) return;
    isRedisConnected = false;
    downStartTime = Date.now();

    // Debounce: Wait 15s before dispatching email to avoid false alarms on fast reconnects
    if (!redisAlertTimer && !alertSent) {
        redisAlertTimer = setTimeout(async () => {
            if (!isRedisConnected) {
                alertSent = true;
                await sendRedisFailureAlert(`Redis client error: ${err?.message || 'Connection lost'}`);
            }
            redisAlertTimer = null;
        }, 15000); // 15 seconds grace period
    }
});

try {
    await redisClient.connect();
} catch (err) {
    console.error('⚠️ Initial Redis connection failed. Operating in MongoDB Direct-Write mode:', err.message);
    alertSent = true;
    downStartTime = Date.now();
    sendRedisFailureAlert(`Initial Redis connection failed: ${err.message}`);
}

export default redisClient;
