import { io } from 'socket.io-client';

// Use a relative path which will be proxied through Vercel
const SOCKET_URL = '/';
console.log('Using socket URL:', SOCKET_URL);

// Create a single socket instance with robust configuration
export const socket = io(SOCKET_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: false, // Don't connect automatically until needed
  upgrade: true
});

// Socket event listeners for debugging and error handling
socket.on('connect', () => {
  console.log('Socket connected successfully to', SOCKET_URL);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  console.log('Attempting to reconnect to:', SOCKET_URL);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Function to authenticate socket connection
export const authenticateSocket = (userInfo) => {
  if (userInfo && userInfo.id) {
    socket.auth = { userId: userInfo.id };
    socket.connect();
  }
};

// Function to emit game creation
export const createGame = (gameData) => {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit('create-game', gameData, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
};

// Function to emit game joining
export const joinGame = (gameId, items) => {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit('join-game', { gameId, items }, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
};

// Function to cancel a game
export const cancelGame = (gameId) => {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit('cancel-game', gameId, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}; 