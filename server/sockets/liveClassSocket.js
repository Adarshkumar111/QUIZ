import { getIO } from '../config/socket.js';

export const initLiveClassSocket = () => {
  const io = getIO();

  io.on('connection', (socket) => {
    // Join a live class room
    socket.on('join-live-class', ({ classId, userId, username, role }) => {
      // Get existing users in the room before joining
      const room = io.sockets.adapter.rooms.get(`live-class:${classId}`);
      const existingUsers = [];
      if (room) {
        room.forEach(socketId => {
          if (socketId !== socket.id) {
            const existingSocket = io.sockets.sockets.get(socketId);
            if (existingSocket) {
              existingUsers.push({
                socketId,
                userId: existingSocket.userId,
                username: existingSocket.liveClassUsername || 'User',
                role: existingSocket.liveClassRole || 'student'
              });
            }
          }
        });
      }

      // Store user info on socket for future reference
      socket.liveClassUsername = username;
      socket.liveClassRole = role;
      socket.liveClassId = classId;

      socket.join(`live-class:${classId}`);
      
      // Notify the new user of existing users (so they can connect to them)
      socket.emit('existing-users', { users: existingUsers });
      
      // Notify others in the room about the new user
      socket.to(`live-class:${classId}`).emit('user-joined', {
        userId,
        username,
        role,
        socketId: socket.id
      });

      console.log(`👤 ${username} (${role}) joined live-class:${classId}. Existing users: ${existingUsers.length}`);
    });

    // WebRTC Signaling: Offer
    socket.on('webrtc-offer', ({ classId, offer, targetSocketId }) => {
      io.to(targetSocketId).emit('webrtc-offer', {
        offer,
        senderSocketId: socket.id
      });
    });

    // WebRTC Signaling: Answer
    socket.on('webrtc-answer', ({ classId, answer, targetSocketId }) => {
      io.to(targetSocketId).emit('webrtc-answer', {
        answer,
        senderSocketId: socket.id
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('webrtc-ice-candidate', ({ classId, candidate, targetSocketId }) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        candidate,
        senderSocketId: socket.id
      });
    });

    // Leave a live class room
    socket.on('leave-live-class', ({ classId, userId, username }) => {
      socket.leave(`live-class:${classId}`);
      socket.to(`live-class:${classId}`).emit('user-left', {
        userId,
        username,
        socketId: socket.id
      });
      console.log(`👋 ${username} left live-class:${classId}`);
    });

    // Chat message in live class
    socket.on('live-class-message', ({ classId, message, username }) => {
      io.to(`live-class:${classId}`).emit('live-class-message', {
        message,
        username,
        timestamp: new Date()
      });
    });

    // Admin: Mute all participants
    socket.on('mute-all', ({ classId }) => {
      socket.to(`live-class:${classId}`).emit('force-mute', { type: 'all' });
      console.log(`🔇 Admin muted all in live-class:${classId}`);
    });

    // Admin: Unmute all (allow users to unmute themselves)
    socket.on('unmute-all', ({ classId }) => {
      socket.to(`live-class:${classId}`).emit('allow-unmute', { type: 'all' });
      console.log(`🔊 Admin allowed unmute in live-class:${classId}`);
    });

    // Admin: Mute specific user
    socket.on('mute-user', ({ classId, targetSocketId }) => {
      io.to(targetSocketId).emit('force-mute', { type: 'single' });
    });

    // Broadcast class status changes (called from admin controller via socket)
    socket.on('class-started', ({ classId, classData }) => {
      // Broadcast to all connected clients
      io.emit('live-class-update', { type: 'started', classId, classData });
      console.log(`🟢 Class ${classId} is now LIVE`);
    });

    socket.on('class-ended', ({ classId, classData }) => {
      io.emit('live-class-update', { type: 'ended', classId, classData });
      console.log(`🔴 Class ${classId} has ENDED`);
    });
  });
};
