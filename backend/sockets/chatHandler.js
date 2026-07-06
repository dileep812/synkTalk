// backend/sockets/chatHandler.js
import Message from '../models/Message.js';

export const registerChatHandlers = (io, socket) => {
    // Listen for incoming chat messages
    socket.on('message:send', async (data) => {
        const startTime = Date.now();
        const { receiverId, text } = data;
        const senderId = socket.user.id; // Pulled safely from authenticated session

        try {
            const recipientRoom = io.sockets.adapter.rooms.get(receiverId);
            const isRecipientOnline = recipientRoom && recipientRoom.size > 0;
            
            // 1. Persist message directly to MongoDB via your model
            const newMessage = new Message({
                sender: senderId,
                recipient: receiverId,
                text: text,
                status: isRecipientOnline ? "delivered" : "sent",
                timestamp: new Date()
            });
            await newMessage.save();

            if (isRecipientOnline) {
                // 2. Real-time emit to the receiver's personal ID room
                io.to(receiverId).emit('message:received', newMessage);
                // 3. Confirm message sent to the sender with the real MongoDB document
                socket.emit('message:sent', newMessage);
                // 4. Update status to delivered instantly since recipient is online
                socket.emit('message:status_update', {
                    messageId: newMessage._id,
                    status: 'delivered',
                    recipientId: receiverId
                });
            } else {
                // Target is completely offline. Confirm sent to the sender (remains single tick).
                socket.emit('message:sent', newMessage);
            }
            
            const duration = Date.now() - startTime;
            console.log(`[Latency Log] message:send from ${senderId} to ${receiverId} took ${duration}ms`);

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Latency Log] message:send FAILED from ${senderId} to ${receiverId} after ${duration}ms. Error:`, error);
            socket.emit('error', { message: "Message delivery failed." });
        }
    });

    // Listen for typing notifications
    socket.on('chat:typing', (data) => {
        const { receiverId, isTyping } = data;
        io.to(receiverId).emit('chat:typing_status', {
            senderId: socket.user.id,
            isTyping
        });
    });
};