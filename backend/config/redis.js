import { createClient } from 'redis';
import { sendRedisFailureAlert } from '../services/email.js';

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        keepAlive: 5000,  // Keep connection warm to prevent Upstash gateway timeouts
        noDelay: true,     // Disable Nagle's algorithm to write packets immediately without buffering latency
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err?.message || err);
    sendRedisFailureAlert(`Redis client error: ${err?.message || 'Connection lost'}`);
});

redisClient.on('connect', () => console.log('🚀 Connected to Redis Queue Matrix successfully'));

try {
    await redisClient.connect();
} catch (err) {
    console.error('⚠️ Initial Redis connection failed. Operating in MongoDB Direct-Write mode:', err.message);
    sendRedisFailureAlert(`Initial Redis connection failed: ${err.message}`);
}

export default redisClient;