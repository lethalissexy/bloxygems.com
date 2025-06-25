import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Use a relative path which will be proxied through Vercel
const SOCKET_URL = '/';

// Create the socket context
const SocketContext = createContext(null);

// Create a provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      upgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });

    // Add debug listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected to', SOCKET_URL);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.log('Attempting to connect to:', SOCKET_URL);
    });

    // Set socket in state
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket
export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
}; 