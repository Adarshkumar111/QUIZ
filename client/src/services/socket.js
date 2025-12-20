import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.pendingEmits = [];
    this.pendingListeners = [];
    this.joinedClassrooms = new Set();
    this.joinedGroups = new Set();
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');

      // Re-join rooms after reconnect (rooms are lost on a new socket id)
      this.joinedClassrooms.forEach((classroomId) => {
        this.socket?.emit('joinClassroom', classroomId);
      });
      this.joinedGroups.forEach((groupId) => {
        this.socket?.emit('joinGroup', groupId);
      });

      // Flush queued emits
      const queued = [...this.pendingEmits];
      this.pendingEmits = [];
      queued.forEach(({ event, data }) => {
        this.socket?.emit(event, data);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connect_error:', error?.message || error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Attach any listeners that were registered before socket was ready
    const queuedListeners = [...this.pendingListeners];
    this.pendingListeners = [];
    queuedListeners.forEach(({ event, callback }) => {
      this.socket?.on(event, callback);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.pendingEmits = [];
    this.pendingListeners = [];
    this.joinedClassrooms.clear();
    this.joinedGroups.clear();
  }

  // Classroom discussions
  joinClassroom(classroomId) {
    if (!classroomId) return;
    this.joinedClassrooms.add(classroomId);
    this.emit('joinClassroom', classroomId);
  }

  leaveClassroom(classroomId) {
    if (!classroomId) return;
    this.joinedClassrooms.delete(classroomId);
    this.emit('leaveClassroom', classroomId);
  }

  // Group discussions
  joinGroup(groupId) {
    if (!groupId) return;
    this.joinedGroups.add(groupId);
    this.emit('joinGroup', groupId);
  }

  leaveGroup(groupId) {
    if (!groupId) return;
    this.joinedGroups.delete(groupId);
    this.emit('leaveGroup', groupId);
  }

  sendTyping(classroomId, username) {
    this.emit('typing', { classroomId, username });
  }

  stopTyping(classroomId) {
    this.emit('stopTyping', { classroomId });
  }

  onNewMessage(callback) {
    this.on('newMessage', callback);
  }

  onNewGroupMessage(callback) {
    this.on('newGroupMessage', callback);
  }

  onNewReply(callback) {
    this.on('newReply', callback);
  }

  onUserTyping(callback) {
    this.on('userTyping', callback);
  }

  onUserStoppedTyping(callback) {
    this.on('userStoppedTyping', callback);
  }

  // Whiteboard
  joinWhiteboard(sessionId) {
    this.socket?.emit('joinWhiteboard', sessionId);
  }

  leaveWhiteboard(sessionId) {
    this.socket?.emit('leaveWhiteboard', sessionId);
  }

  sendDrawing(sessionId, drawData) {
    this.socket?.emit('draw', { sessionId, drawData });
  }

  sendCursorMove(sessionId, position) {
    this.socket?.emit('cursorMove', { sessionId, position });
  }

  clearCanvas(sessionId) {
    this.socket?.emit('clearCanvas', sessionId);
  }

  onDrawing(callback) {
    this.on('drawing', callback);
  }

  onCursorPosition(callback) {
    this.on('cursorPosition', callback);
  }

  onCanvasCleared(callback) {
    this.on('canvasCleared', callback);
  }

  // Notifications
  onNotification(callback) {
    this.on('notification', callback);
  }

  onAnnouncement(callback) {
    this.on('announcement', callback);
  }

  // Generic event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      return;
    }
    this.pendingListeners.push({ event, callback });
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      return;
    }
    // Remove from queued listeners if not yet attached
    this.pendingListeners = this.pendingListeners.filter(
      (l) => !(l.event === event && l.callback === callback)
    );
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return;
    }
    this.pendingEmits.push({ event, data });
  }
}

export default new SocketService();
