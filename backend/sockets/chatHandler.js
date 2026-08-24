// backend/sockets/chatHandler.js
import Message from '../models/Message.js';
import redisClient from '../config/redis.js'; 
import { flushRedisToMongo, BATCH_THRESHOLD } from '../services/reddisToDb.js';
import { sendRedisFailureAlert } from '../services/email.js';

export const registerChatHandlers = (io, socket) => {
    // Listen for incoming chat messages
    socket.on('message:send', async (data) => {
        if (!socket.user || !(socket.user.id || socket.user._id)) {
            socket.emit('error', { message: "Unauthorized. Please log in first." });
            socket.disconnect(true);
            return;
        }

        const startTime = Date.now();
        const { receiverId, text } = data;
        const senderId = (socket.user.id || socket.user._id).toString();
        const targetId = (receiverId?._id || receiverId).toString();

        try {
            // Check if recipient is actively connected in their private room
            const recipientRoom = io.sockets.adapter.rooms.get(targetId);
            const isRecipientOnline = recipientRoom && recipientRoom.size > 0;
            
            // 1. Create message model instance
            const newMessage = new Message({
                sender: senderId,
                recipient: targetId,
                text: text,
                status: isRecipientOnline ? "delivered" : "sent",
                timestamp: new Date()
            });

            // 2. Real-time emit to the receiver's personal ID room (Immediate, in-memory)
            io.to(targetId).emit('message:received', newMessage);

            // 3. Confirm message sent to the sender
            socket.emit('message:sent', newMessage);

            // 4. Update status to delivered if online
            if (isRecipientOnline) {
                socket.emit('message:status_update', {
                    messageId: newMessage._id,
                    status: 'delivered',
                    recipientId: targetId
                });
            }

            // 5. Calculate & log real-time dispatch latency (Sub-5ms)
            const duration = Date.now() - startTime;
            console.log(`⚡ [Latency Log] message:send from ${senderId} to ${targetId} delivered in ${duration}ms`);

            // 6. Redis Enqueue with Automatic Direct Database Fallback and Email Alert
            if (redisClient.isOpen) {
                redisClient.lPush('chat:message_queue', JSON.stringify(newMessage))
                    .then((queueLength) => {
                        if (queueLength >= BATCH_THRESHOLD) {
                            console.log(`🚀 [Threshold Reached] Queue reached ${queueLength}/${BATCH_THRESHOLD}. Flushing batch to MongoDB...`);
                            flushRedisToMongo(BATCH_THRESHOLD);
                        }
                    })
                    .catch(async (queueErr) => {
                        console.warn('⚠️ [Redis Queue Error] Falling back to direct MongoDB write:', queueErr.message);
                        sendRedisFailureAlert(`Redis push failed: ${queueErr.message}`);
                        await newMessage.save().catch(e => console.error('❌ MongoDB direct write error:', e.message));
                    });
            } else {
                // If Redis is offline, persist directly to MongoDB and notify administrator
                console.warn('⚠️ [Redis Offline] Writing message directly to database...');
                sendRedisFailureAlert('Redis connection is offline or closed.');
                await newMessage.save().catch(e => console.error('❌ Direct DB save error:', e.message));
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ [Latency Log] message:send FAILED after ${duration}ms. Error:`, error);
            socket.emit('error', { message: "Message delivery failed." });
        }
    });

    // Listen for typing notifications
    socket.on('chat:typing', (data) => {
        const { receiverId, isTyping } = data;
        const targetId = (receiverId?._id || receiverId).toString();
        io.to(targetId).emit('chat:typing_status', {
            senderId: (socket.user.id || socket.user._id).toString(),
            isTyping
        });
    });
};
