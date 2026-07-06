// backend/io.js
import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true // Crucial for reading your session cookies!
        }
    });
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized yet!");
    }
    return io;
};