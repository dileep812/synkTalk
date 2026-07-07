import redisClient from '../config/redis.js';
import Message from '../models/Message.js';

/**
 * Background worker task responsible for syncing Redis data logs to MongoDB.
 */
export async function startRedisToMongoSync() {
    console.log('🤖 Background Database Sync Worker active and polling...');

    setInterval(async () => {
        const startTime = Date.now();
        const batchSize = 50; // Process chunks of 50 messages at a time
        const messagesToSave = [];

        try {
            // Pop up to 50 items out of the queue sequentially
            for (let i = 0; i < batchSize; i++) {
                const rawMessage = await redisClient.rPop('chat:message_queue');
                if (!rawMessage) break; // Queue is empty, break out early
                
                const parsedMsg = JSON.parse(rawMessage);
                
                // Strip out our temporary working ID so MongoDB can provision real default ObjectIds
                delete parsedMsg._id; 
                messagesToSave.push(parsedMsg);
            }

            // If we found messages, bulk write them to MongoDB in ONE efficient transaction
            const duration = Date.now() - startTime;
            if (messagesToSave.length > 0) {
                await Message.insertMany(messagesToSave, { ordered: false });
                console.log(`💾 [Worker Sync] Flushed ${messagesToSave.length} messages safely to MongoDB | Latency: ${duration}ms`);
            } else {
                // NOTE: Prints every 2 seconds. You can comment this out if it spams your terminal logs.
                console.log(`🤖 [Worker Sync] Polled queue. 0 messages to sync | Latency: ${duration}ms`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ [Worker Sync Error] Failed to flush batch to MongoDB after ${duration}ms. Error:`, error);
            // Edge Case Guard: If DB write fails, push payloads back into Redis so data isn't lost
            if (messagesToSave.length > 0) {
                for (const msg of messagesToSave) {
                    await redisClient.lPush('chat:message_queue', JSON.stringify(msg));
                }
            }
        }
    }, 1000*60); // Runs every 2 seconds
}