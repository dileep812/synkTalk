import Message from '../models/Message.js';
import { flushRedisToMongo, updateRedisMessagesStatus, markDeliveredForRecipientInRedis } from '../services/reddisToDb.js';

export const registerStatusHandlers = async (io, socket) => {
    const userId = (socket.user.id || socket.user._id).toString();
    try {
        // 1. Mark in-flight Redis messages as 'delivered' for connecting user
        const redisDelivered = await markDeliveredForRecipientInRedis(userId);
        redisDelivered.forEach((msg) => {
            const senderId = (msg.sender?._id || msg.sender)?.toString();
            if (senderId) {
                io.to(senderId).emit('message:status_update', {
                    messageId: msg._id,
                    status: 'delivered',
                    recipientId: userId
                });
            }
        });

        // 2. Fetch missing elements from MongoDB
        const missedMessages = await Message.find({ 
            recipient: userId, 
            status: 'sent' 
        }).lean();

        if (missedMessages.length > 0) {
            // Bulk update states inside the database cluster instantly
            await Message.updateMany(
                { recipient: userId, status: 'sent' },
                { $set: { status: 'delivered' } }
            );

            // Process delivery dispatches asynchronously to clear the socket thread quickly
            missedMessages.forEach((msg) => {
                msg.status = 'delivered'; 
                socket.emit('message:received', msg);

                io.to(msg.sender.toString()).emit('message:status_update', {
                    messageId: msg._id,
                    status: 'delivered',
                    recipientId: userId
                });
            });
            
            console.log(`[Sync Service] Synchronized ${missedMessages.length} offline payloads for user: ${userId}`);
        }
    } catch (syncError) {
        console.error(`[Sync Service] Critical sync loop error for user ${userId}:`, syncError);
    }

    /**
     * Event: Chat Window Read Acknowledgment (Blue Tick Trigger)
     */
    socket.on('message:read_receipt', async (data) => {
        const startTime = Date.now();
        const { chatWithUserId } = data;
        const currentUserId = (socket.user.id || socket.user._id).toString();

        if (!chatWithUserId) {
            return socket.emit('error', { message: "Missing required tracking parameters: chatWithUserId." });
        }

        try {
            // 1. Update in-flight messages in Redis queue
            const redisUpdated = await updateRedisMessagesStatus(chatWithUserId, currentUserId, 'read');

            // 2. Update persisted messages in MongoDB
            const dbResult = await Message.updateMany(
                { 
                    sender: chatWithUserId, 
                    recipient: currentUserId, 
                    status: { $ne: 'read' } 
                },
                { 
                    $set: { status: 'read' } 
                }
            );

            // 3. Broadcast read acknowledgment to sender
            io.to(chatWithUserId.toString()).emit('messages:marked_read', {
                readerId: currentUserId
            });

            const duration = Date.now() - startTime;
            console.log(`[Latency Log] Read receipt processed in ${duration}ms (DB: ${dbResult.modifiedCount}, Redis: ${redisUpdated})`);

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Latency Log] Failed to update read receipts after ${duration}ms. Error:`, error);
            socket.emit('error', { message: "Failed to sync read status." });
        }
    });
};
