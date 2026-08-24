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
 * Updates status of messages in Redis queue matching sender and recipient (e.g. marking as 'read').
 */
export async function updateRedisMessagesStatus(senderId, recipientId, newStatus) {
    if (!redisClient?.isOpen) return 0;
    try {
        const rawList = await redisClient.lRange('chat:message_queue', 0, -1);
        if (!rawList || rawList.length === 0) return 0;

        const sId = senderId.toString();
        const rId = recipientId.toString();
        let modified = 0;

        for (let i = 0; i < rawList.length; i++) {
            try {
                const msg = typeof rawList[i] === 'string' ? JSON.parse(rawList[i]) : rawList[i];
                if (!msg) continue;
                const msgSender = (msg.sender?._id || msg.sender)?.toString();
                const msgRecipient = (msg.recipient?._id || msg.recipient)?.toString();

                if (msgSender === sId && msgRecipient === rId && msg.status !== newStatus) {
                    msg.status = newStatus;
                    await redisClient.lSet('chat:message_queue', i, JSON.stringify(msg));
                    modified++;
                }
            } catch {}
        }
        return modified;
    } catch (err) {
        console.warn('⚠️ [Redis] updateRedisMessagesStatus error:', err.message);
        return 0;
    }
}

/**
 * Updates status of in-flight messages in Redis from 'sent' to 'delivered' when recipient connects.
 */
export async function markDeliveredForRecipientInRedis(recipientId) {
    if (!redisClient?.isOpen) return [];
    try {
        const rawList = await redisClient.lRange('chat:message_queue', 0, -1);
        if (!rawList || rawList.length === 0) return [];

        const rId = recipientId.toString();
        const updated = [];

        for (let i = 0; i < rawList.length; i++) {
            try {
                const msg = typeof rawList[i] === 'string' ? JSON.parse(rawList[i]) : rawList[i];
                if (!msg) continue;
                const msgRecipient = (msg.recipient?._id || msg.recipient)?.toString();

                if (msgRecipient === rId && msg.status === 'sent') {
                    msg.status = 'delivered';
                    await redisClient.lSet('chat:message_queue', i, JSON.stringify(msg));
                    updated.push(msg);
                }
            } catch {}
        }
        return updated;
    } catch (err) {
        console.warn('⚠️ [Redis] markDeliveredForRecipientInRedis error:', err.message);
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

