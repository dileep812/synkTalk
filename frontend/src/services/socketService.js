import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socketInstance = null;

/**
 * Returns a singleton Socket.io client instance to ensure only ONE connection is established.
 */
export const getSocket = () => {
  if (!socketInstance || !socketInstance.connected) {
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: true,
        transports: ['websocket', 'polling']
      });
    } else if (socketInstance.disconnected) {
      socketInstance.connect();
    }
  }
  return socketInstance;
};

/**
 * Closes the singleton socket connection (e.g., on logout).
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
