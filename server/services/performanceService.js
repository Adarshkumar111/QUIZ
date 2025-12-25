import { getRedisClient } from '../config/redis.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

/**
 * Performance Service
 * Tracks daily student scores for the real-time leaderboard.
 */
export const performanceService = {
  /**
   * Update student score for the day
   * @param {string} userId - ID of the student
   * @param {number} points - Points to add
   */
  updateScore: async (userId, points, reason = '') => {
    try {
      const redis = getRedisClient();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyKey = `leaderboard:daily:${today}`;

      if (redis) {
        // 1. Increment DAILY score
        await redis.zIncrBy(dailyKey, points, userId.toString());
        await redis.expire(dailyKey, 172800);

        // Fetch user info for broadcast if reason exists
        let userInfo = null;
        if (reason) {
           const user = await User.findById(userId).select('username');
           userInfo = { username: user?.username || 'Student', points, reason };
        }

        // Notify admins (and potentially users) of the update
        await performanceService.broadcastTopPerformers(userInfo);
      }
    } catch (err) {
      console.error('Error updating performance score:', err.message);
    }
  },

  /**
   * Update student GLOBAL score (based on total XP)
   */
  updateGlobalScore: async (userId, totalXP) => {
    try {
      const redis = getRedisClient();
      const globalKey = 'leaderboard:global';
      if (redis) {
        await redis.zAdd(globalKey, { score: totalXP, value: userId.toString() });
      }
    } catch (err) {
      console.error('Error updating global score:', err.message);
    }
  },

  /**
   * Get student's GLOBAL rank with lazy-sync
   */
  getGlobalRank: async (userId) => {
    try {
      const redis = getRedisClient();
      const globalKey = 'leaderboard:global';
      if (redis) {
        let rank = await redis.zRevRank(globalKey, userId.toString());
        
        // Lazy-sync: If user not in Redis, add them and try again
        if (rank === null) {
          const user = await User.findById(userId).select('xpPoints');
          if (user) {
            await redis.zAdd(globalKey, { score: user.xpPoints || 0, value: userId.toString() });
            rank = await redis.zRevRank(globalKey, userId.toString());
          }
        }
        
        return rank !== null ? rank + 1 : 'N/A';
      }
      return 'N/A';
    } catch (err) {
      console.error('Error getting global rank:', err.message);
      return 'N/A';
    }
  },

  /**
   * Get top 3 performers for the day
   */
  getTopPerformers: async () => {
    try {
      const redis = getRedisClient();
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `leaderboard:daily:${today}`;

      let topUsers = [];

      if (redis) {
        // Get top 3 from Redis
        const rawTop = await redis.zRangeWithScores(dailyKey, 0, 2, { REV: true });
        
        if (rawTop.length > 0) {
          const userIds = rawTop.map(item => item.value);
          const users = await User.find({ _id: { $in: userIds } })
            .select('username avatar');

          topUsers = rawTop.map(item => {
            const user = users.find(u => u._id.toString() === item.value);
            return {
              userId: item.value,
              username: user?.username || 'Unknown',
              avatar: user?.avatar || '',
              score: item.score
            };
          }).sort((a, b) => b.score - a.score);
        }
      }

      return topUsers;
    } catch (err) {
      console.error('Error fetching daily top performers:', err.message);
      return [];
    }
  },

  /**
   * Get GLOBAL top 3 performers (from Redis with Mongo fallback)
   */
  getGlobalTopPerformers: async () => {
    try {
      const redis = getRedisClient();
      const globalKey = 'leaderboard:global';
      let topUsers = [];

      if (redis) {
        // 1. Try Redis first
        const rawTop = await redis.zRangeWithScores(globalKey, 0, 2, { REV: true });
        
        if (rawTop.length > 0) {
          const userIds = rawTop.map(item => item.value);
          const users = await User.find({ _id: { $in: userIds } }).select('username avatar');

          topUsers = rawTop.map(item => {
            const user = users.find(u => u._id.toString() === item.value);
            return {
              userId: item.value,
              username: user?.username || 'Unknown',
              avatar: user?.avatar || '',
              score: item.score
            };
          }).sort((a, b) => b.score - a.score);
          
          return topUsers;
        }
      }

      // 2. Fallback to MongoDB if Redis is empty
      const students = await User.find({ role: 'student', isActive: true, deletedAt: null })
        .sort({ xpPoints: -1 })
        .limit(3)
        .select('username avatar xpPoints');

      topUsers = students.map(s => ({
        userId: s._id,
        username: s.username,
        avatar: s.avatar,
        score: s.xpPoints
      }));

      // 3. Proactively sync Mongo top performers to Redis for next time
      if (redis && topUsers.length > 0) {
        for (const u of topUsers) {
          await redis.zAdd(globalKey, { score: u.score, value: u.userId.toString() });
        }
      }

      return topUsers;
    } catch (err) {
      console.error('Error fetching global top performers:', err.message);
      return [];
    }
  },

  /**
   * Broadcast top performers to all connected admins and students
   */
  broadcastTopPerformers: async (recentActivity = null) => {
    try {
      const io = getIO();
      const dailyTop = await performanceService.getTopPerformers();
      const globalTop = await performanceService.getGlobalTopPerformers();
      
      // Use Global as fallback for Daily if Daily is empty
      const topPerformers = dailyTop.length > 0 ? dailyTop : globalTop;
      const isDaily = dailyTop.length > 0;

      // Broadcast to admins (includes recent activity details)
      io.to('admin:dashboard').emit('top_performers_update', { 
        topPerformers, 
        recentActivity,
        isDaily
      });
      
      // Broadcast to students (includes only the leaderboard for motivation)
      io.to('rankings:live').emit('top_performers_update', { 
        topPerformers,
        isDaily
      });
    } catch (err) {
      // Socket not ready yet or other error
      console.warn('Could not broadcast top performers:', err.message);
    }
  }
};

export default performanceService;
