import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

let io;

export const initSocket = (server) => {
  const allowedOrigins = (process.env.CLIENT_URL || 'https://quiz-seven-lemon.vercel.app,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    // Helpful dev fallbacks when CLIENT_URL is missing/mismatched
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://127.0.0.1:5173');
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://127.0.0.1:3000');
  }

  io = new Server(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    },
  });

  // Optional: use Redis adapter for multi-instance scalability / smoother fan-out
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();

      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          console.log('✅ Socket.io Redis adapter attached');
        })
        .catch((err) => {
          console.error('Failed to attach Redis adapter for Socket.io:', err?.message || err);
        });
    } catch (err) {
      console.error('Error initializing Redis adapter for Socket.io:', err?.message || err);
    }
  } else {
    console.warn('REDIS_URL not set. Socket.io will run without Redis adapter.');
  }

  // Authentication middleware for socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
