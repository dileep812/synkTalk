import Message from '../models/Message.js';

/**
 * Retrieves a paginated chunk (last 10) of the historical message thread.
 * @route GET /messages/:chatUserId?cursor=TIMESTAMP_OR_ID&limit=10
 */
export const getChatHistory = async (req, res) => {
    try {
        const currentUserId = req.session.user.id;
        const { chatUserId } = req.params;
        
        // Parse pagination configurations (Default to 10 items)
        const limit = parseInt(req.query.limit, 10) || 10;
        const { cursor } = req.query; // This will be a timestamp or message ID string

        console.log(`[Message Controller | getChatHistory] Fetching history for User: ${currentUserId} with Contact: ${chatUserId} | Cursor: ${cursor} | Limit: ${limit}`);

        // Base query: Fetch messages between Me -> Them OR Them -> Me
        const baseQuery = {
            $or: [
                { sender: currentUserId, recipient: chatUserId },
                { sender: chatUserId, recipient: currentUserId }
            ]
        };

        // If a cursor is provided, only fetch messages OLDER than the cursor
        if (cursor) {
            baseQuery.timestamp = { $lt: new Date(cursor) };
        }

        // Fetch messages sorted newest first so we get the most recent chunk
        const messages = await Message.find(baseQuery)
            .sort({ timestamp: -1 }) 
            .limit(limit + 1) // Fetch 1 extra to determine if a next page exists
            .lean();

        // Check if there are more messages left to load in history
        const hasMore = messages.length > limit;
        
        // Remove the extra check item if it exists
        if (hasMore) {
            messages.pop();
        }

        // CRITICAL STEP: Reverse the chunk back to oldest-to-newest before responding 
        // so it renders correctly going down the chat timeline UI screen.
        messages.reverse();

        // Identify the next cursor pointer (the oldest message in this current batch)
        const nextCursor = messages.length > 0 ? messages[0].timestamp : null;

        console.log(`[Message Controller | getChatHistory] Sending ${messages.length} messages | hasMore: ${hasMore} | nextCursor: ${nextCursor}`);
        return res.status(200).json({
            success: true,
            count: messages.length,
            hasMore,
            nextCursor,
            messages
        });

    } catch (error) {
        console.error('[Message Controller] getChatHistory Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error while fetching chat timeline.' 
        });
    }
};