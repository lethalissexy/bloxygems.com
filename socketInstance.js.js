/**
 * Shared Socket.io instance to be used across both server.js and discord-bot.js
 * This file will be initialized by server.js and then imported by discord-bot.js
 */

import { io as socketIO } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://bloxroll-development.onrender.com';

const socket = socketIO(SOCKET_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  extraHeaders: {
    'Origin': 'https://bloxroll-development.onrender.com'
  }
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('connect', () => {
  console.log('Socket connected successfully to', SOCKET_URL);
});

export default socket; 