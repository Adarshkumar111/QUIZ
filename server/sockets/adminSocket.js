import { getIO } from '../config/socket.js';
import { performanceService } from '../services/performanceService.js';

/**
 * Admin Socket Handler
 * Manages admin-specific socket events and rooms.
 */
export const initAdminSocket = () => {
  const io = getIO();

  io.on('connection', (socket) => {
    // Only allow admins and teachers to join the dashboard room
    if (socket.userRole === 'admin' || socket.userRole === 'teacher') {
      
      socket.on('join_admin_dashboard', async () => {
        socket.join('admin:dashboard');
        console.log(`📡 Admin connected to dashboard: ${socket.userId}`);
        
        // Push initial top performers data
        const topPerformers = await performanceService.getTopPerformers();
        socket.emit('top_performers_update', { topPerformers });
      });

      socket.on('leave_admin_dashboard', () => {
        socket.leave('admin:dashboard');
        console.log(`🔌 Admin left dashboard: ${socket.userId}`);
      });
    }

    // Allow everyone to join the live rankings room
    socket.on('join_rankings', async () => {
      socket.join('rankings:live');
      // Push initial data
      const topPerformers = await performanceService.getTopPerformers();
      socket.emit('top_performers_update', { topPerformers });
    });

    socket.on('leave_rankings', () => {
      socket.leave('rankings:live');
    });
  });
};

export default initAdminSocket;
