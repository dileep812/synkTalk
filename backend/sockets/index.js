// backend/sockets/index.js
import { registerChatHandlers } from './chatHandler.js';
import { registerStatusHandlers } from './statusHandler.js';

// Global Map of userId -> active socket count
const onlineUsers = new Map();

export const setupSockets = (io, sessionMiddleware) => {
    // 🔒 Middleware: Share the Express Session cookie parsing with Socket.io
    io.use((socket, next) => {
        sessionMiddleware(socket.request, socket.request.res || {}, next);
    });

    // 🔒 Middleware: Reject websocket connection if user isn't logged in
    io.use((socket, next) => {
        const session = socket.request.session;
        if (session && session.user) {
            socket.user = session.user; // Attach user payload directly to the socket
            return next();
        }
        return next(new Error("Authentication failed: No active session."));
    });

    // Connection Orchestrator
    io.on('connection', (socket) => {
        const userId = (socket.user.id || socket.user._id)?.toString();
        if (!userId) return;

        console.log(`🔌 User connected to socket: ${socket.user.username} (${userId})`);

        // Automatically drop the user into a private room matching their individual user ID
        socket.join(userId);

        // Update online tracking
        const currentCount = onlineUsers.get(userId) || 0;
        onlineUsers.set(userId, currentCount + 1);

        // Broadcast user online event and updated active users list to everyone
        io.emit('user:online', { userId });
        io.emit('users:online_list', Array.from(onlineUsers.keys()));

        // Allow any client to query the active users list at any time
        socket.on('users:get_online', () => {
            socket.emit('users:online_list', Array.from(onlineUsers.keys()));
        });

        // Register separate event handler files
        registerChatHandlers(io, socket);
        registerStatusHandlers(io, socket);

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.user.username}`);
            const remainingCount = (onlineUsers.get(userId) || 1) - 1;
            if (remainingCount <= 0) {
                onlineUsers.delete(userId);
                io.emit('user:offline', { userId });
                io.emit('users:online_list', Array.from(onlineUsers.keys()));
            } else {
                onlineUsers.set(userId, remainingCount);
            }
        });
    });
};