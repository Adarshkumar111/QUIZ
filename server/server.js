import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import connectDB from './config/database.js';
import { initSocket } from './config/socket.js';
import { initRedis } from './config/redis.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminNotesRoutes from './routes/admin/notes.js';
import adminQuizRoutes from './routes/admin/quiz.js';
import adminClassroomRoutes from './routes/admin/classroom.js';
import adminAnalyticsRoutes from './routes/admin/analytics.js';
import adminModerationRoutes from './routes/admin/moderation.js';
import adminAnnouncementRoutes from './routes/admin/announcements.js';
import adminTicketRoutes from './routes/admin/tickets.js';
import adminGroupRoutes from './routes/admin/groups.js';
import adminProfileRoutes from './routes/admin/profile.js';
import adminLiveClassRoutes from './routes/admin/liveClass.js';
import userNotesRoutes from './routes/user/notes.js';
import userQuizRoutes from './routes/user/quiz.js';
import userDiscussionRoutes from './routes/user/discussions.js';
import userGroupRoutes from './routes/user/groups.js';
import userDashboardRoutes from './routes/user/dashboard.js';
import userAssignmentRoutes from './routes/user/assignments.js';
import userProfileRoutes from './routes/user/profile.js';
import userClassroomsRoutes from './routes/user/classrooms.js';
import userLiveClassRoutes from './routes/user/liveClass.js';
import whiteboardRoutes from './routes/whiteboard.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Initialize socket event handlers
import { initDiscussionSocket } from './sockets/discussionSocket.js';
import { initWhiteboardSocket } from './sockets/whiteboardSocket.js';
import { initAdminSocket } from './sockets/adminSocket.js';
import { initLiveClassSocket } from './sockets/liveClassSocket.js';

initDiscussionSocket();
initWhiteboardSocket();
initAdminSocket();
initLiveClassSocket();

//Connect to database
connectDB();

// Initialize Redis (optional)
initRedis().catch((err) => {
  console.error('Redis initialization failed:', err.message || err);
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map(url => url.trim());
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin/notes', adminNotesRoutes);
app.use('/api/admin/quizzes', adminQuizRoutes);
app.use('/api/admin/classrooms', adminClassroomRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/moderation', adminModerationRoutes);
app.use('/api/admin/announcements', adminAnnouncementRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);
app.use('/api/admin/groups', adminGroupRoutes);
app.use('/api/admin/profile', adminProfileRoutes);
app.use('/api/admin/live-classes', adminLiveClassRoutes);

// User routes
app.use('/api/notes', userNotesRoutes);
app.use('/api/quizzes', userQuizRoutes);
app.use('/api/discussions', userDiscussionRoutes);
app.use('/api/groups', userGroupRoutes);
app.use('/api/dashboard', userDashboardRoutes);
app.use('/api/assignments', userAssignmentRoutes);
app.use('/api/profile', userProfileRoutes);
app.use('/api/classrooms', userClassroomsRoutes);
app.use('/api/live-classes', userLiveClassRoutes);
app.use('/api/whiteboard', whiteboardRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Quiz App API',
    status: 'Running',
    documentation: '/api/docs' // Optional usage
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;
