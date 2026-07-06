import Message from '../models/Message.js';

export const registerStatusHandlers = async (io, socket) => {
    const userId = socket.user.id;
    try {
        // Fetch missing elements using .lean() to allow safe local property modification
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
                // Mutate the plain object state -> Becomes Double Tick on client UI
                msg.status = 'delivered'; 

                // Dispatch the historical record straight to the newly reconnected user
                socket.emit('message:received', msg);

                // Ping the original sender's personal room to turn their Single Tick into a Double Tick
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
     * Executed when a user opens an active chat timeline view window or receives a message while focused.
     */
    socket.on('message:read_receipt', async (data) => {
        const startTime = Date.now();
        const { chatWithUserId } = data; // The ID of the friend whose messages I am reading
        const currentUserId = socket.user.id; // The logged-in user who is reading the messages

        if (!chatWithUserId) {
            return socket.emit('error', { message: "Missing required tracking parameters: chatWithUserId." });
        }

        try {
            // 1. Bulk update all incoming 'sent' or 'delivered' messages from this friend to 'read'
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

            // 2. Only broadcast if messages were actually modified to avoid wasting network bandwidth
            if (dbResult.modifiedCount > 0) {
                
                // Ping the original sender's personal room to transform their Gray Ticks into Blue Ticks instantly
                io.to(chatWithUserId).emit('messages:marked_read', {
                    readerId: currentUserId
                });

                const duration = Date.now() - startTime;
                console.log(`[Latency Log] Read receipt processed. Updated ${dbResult.modifiedCount} messages from ${chatWithUserId} read by ${currentUserId} in ${duration}ms`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Latency Log] Failed to update read receipts for user ${currentUserId} after ${duration}ms. Error:`, error);
            socket.emit('error', { message: "Failed to sync read status." });
        }
    });
};
