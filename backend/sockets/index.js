// backend/sockets/index.js
import { registerChatHandlers } from './chatHandler.js';
import { registerStatusHandlers } from './statusHandler.js';

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
        console.log(`🔌 User connected to socket: ${socket.user.username} (${socket.id})`);

        // Automatically drop the user into a private room matching their individual user ID
        socket.join(socket.user.id);

        // Register separate event handler files
        registerChatHandlers(io, socket);
        registerStatusHandlers(io, socket);

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.user.username}`);
        });
    });
};