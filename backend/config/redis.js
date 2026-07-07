import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        keepAlive: 5000,  // Keep connection warm to prevent Upstash gateway timeouts
        noDelay: true,     // Disable Nagle's algorithm to write packets immediately without buffering latency
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
redisClient.on('connect', () => console.log('🚀 Connected to Redis Queue Matrix successfully'));

await redisClient.connect();

export default redisClient;