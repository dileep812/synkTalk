// backend/io.js
import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
    if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL.trim().replace(/\/$/, ''));
    }

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
                    callback(null, true);
                } else {
                    callback(null, true); // Permissive in dev to prevent transport handshake drops
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 25000
    });
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized yet!");
    }
    return io;
};
