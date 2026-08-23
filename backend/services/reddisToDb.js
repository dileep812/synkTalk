import redisClient from '../config/redis.js';
import Message from '../models/Message.js';

let isSyncing = false;
export const BATCH_THRESHOLD = 100; // Flushes to MongoDB exclusively when 100 messages accumulate

/**
 * Flushes a batch of up to batchSize (default 100) messages from Redis queue to MongoDB.
 * Pure count-based: No background timers or intervals.
 */
export async function flushRedisToMongo(batchSize = BATCH_THRESHOLD) {
    if (isSyncing) return;
    isSyncing = true;
    const startTime = Date.now();
    const messagesToSave = [];

    try {
        if (!redisClient.isOpen) {
            isSyncing = false;
            return;
        }

        for (let i = 0; i < batchSize; i++) {
            const rawMessage = await redisClient.rPop('chat:message_queue');
            if (!rawMessage) break; // Queue empty, stop popping

            const parsedMsg = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
            delete parsedMsg._id; // Let MongoDB generate clean ObjectIds on insert
            messagesToSave.push(parsedMsg);
        }

        const duration = Date.now() - startTime;
        if (messagesToSave.length > 0) {
            await Message.insertMany(messagesToSave, { ordered: false });
            console.log(`💾 [Count Batch Sync] 100-Message Threshold Reached: Flushed ${messagesToSave.length} messages to MongoDB | Latency: ${duration}ms`);
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Worker Sync Error] Failed to flush batch to MongoDB after ${duration}ms. Error:`, error.message);
        if (messagesToSave.length > 0 && redisClient.isOpen) {
            for (const msg of messagesToSave) {
                await redisClient.lPush('chat:message_queue', JSON.stringify(msg)).catch(() => {});
            }
        }
    } finally {
        isSyncing = false;
    }
}

/**
 * Reads pending in-flight messages from Redis queue for a specific conversation.
 * ⚡ Guarantees data consistency: messages 1 to 99 sitting in Redis are loaded alongside MongoDB data.
 */
export async function getPendingRedisMessages(userId1, userId2) {
    try {
        if (!redisClient.isOpen) return [];

        const rawList = await redisClient.lRange('chat:message_queue', 0, -1);
        if (!rawList || rawList.length === 0) return [];

        const u1 = userId1.toString();
        const u2 = userId2.toString();
        const matching = [];

        for (const item of rawList) {
            try {
                const msg = typeof item === 'string' ? JSON.parse(item) : item;
                if (!msg) continue;
                const senderStr = (msg.sender?._id || msg.sender)?.toString();
                const recipientStr = (msg.recipient?._id || msg.recipient)?.toString();

                if (
                    (senderStr === u1 && recipientStr === u2) ||
                    (senderStr === u2 && recipientStr === u1)
                ) {
                    matching.push(msg);
                }
            } catch (e) {}
        }
        return matching;
    } catch (err) {
        console.warn('⚠️ [Redis] getPendingRedisMessages error:', err.message);
        return [];
    }
}

/**
 * Initializes Redis sync on server start (drains queue if already >= 100, otherwise keeps in Redis).
 */
export async function startRedisToMongoSync() {
    console.log(`🤖 Background Database Sync Worker initialized (Count-Based: Flushes per ${BATCH_THRESHOLD} messages)`);
    try {
        if (redisClient.isOpen) {
            const queueLen = await redisClient.lLen('chat:message_queue');
            if (queueLen >= BATCH_THRESHOLD) {
                await flushRedisToMongo(BATCH_THRESHOLD);
            }
        }
    } catch (err) {
        console.warn('[Redis] Startup queue check warning:', err.message);
    }
}
