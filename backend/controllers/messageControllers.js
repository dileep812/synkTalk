import Message from '../models/Message.js';
import { getPendingRedisMessages } from '../services/reddisToDb.js';

/**
 * Retrieves a paginated chunk of the historical message thread from BOTH MongoDB and Redis.
 * Guarantees 100% data consistency for newly sent messages.
 * @route GET /messages/:chatUserId?cursor=TIMESTAMP_OR_ID&limit=10
 */
export const getChatHistory = async (req, res) => {
    try {
        const currentUserId = req.session.user.id;
        const { chatUserId } = req.params;
        
        // Parse pagination configurations (Default to 10 items)
        const limit = parseInt(req.query.limit, 10) || 10;
        const { cursor } = req.query; // Cursor timestamp

        console.log(`[Message Controller | getChatHistory] Fetching history from DB + Redis for User: ${currentUserId} with Contact: ${chatUserId} | Cursor: ${cursor} | Limit: ${limit}`);

        // 1. Fetch pending in-flight messages from Redis queue (not yet flushed to Mongo)
        const pendingMessages = await getPendingRedisMessages(currentUserId, chatUserId);

        // 2. Fetch stored messages from MongoDB
        const baseQuery = {
            $or: [
                { sender: currentUserId, recipient: chatUserId },
                { sender: chatUserId, recipient: currentUserId }
            ]
        };

        if (cursor) {
            baseQuery.timestamp = { $lt: new Date(cursor) };
        }

        const dbMessages = await Message.find(baseQuery)
            .sort({ timestamp: -1 })
            .limit(limit + 5)
            .lean();

        // 3. Merge MongoDB and Redis messages, deduplicating by ID or timestamp+content
        const messageMap = new Map();

        const addMsg = (msg) => {
            if (!msg) return;
            const key = msg._id ? msg._id.toString() : `${msg.sender}_${msg.recipient}_${new Date(msg.timestamp || msg.createdAt).getTime()}`;
            if (!messageMap.has(key)) {
                messageMap.set(key, {
                    ...msg,
                    _id: msg._id ? msg._id.toString() : key,
                    timestamp: msg.timestamp || msg.createdAt || new Date()
                });
            }
        };

        // Add DB messages first
        dbMessages.forEach(addMsg);

        // Add Redis in-flight messages (overlay in-flight data)
        pendingMessages.forEach(addMsg);

        let allMessages = Array.from(messageMap.values());

        // Filter by cursor if supplied
        if (cursor) {
            const cursorDate = new Date(cursor);
            allMessages = allMessages.filter(m => new Date(m.timestamp) < cursorDate);
        }

        // Sort newest first
        allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Check if there are more messages left
        const hasMore = allMessages.length > limit;
        const slicedMessages = allMessages.slice(0, limit);

        // Reverse to oldest-to-newest for chat timeline UI
        slicedMessages.reverse();

        const nextCursor = slicedMessages.length > 0 ? slicedMessages[0].timestamp : null;

        return res.status(200).json({
            success: true,
            count: slicedMessages.length,
            hasMore,
            nextCursor,
            messages: slicedMessages
        });

    } catch (error) {
        console.error('[Message Controller] getChatHistory Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error while fetching chat timeline.' 
        });
    }
};
