import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { performanceService } from './performanceService.js';

// Badge definitions
const BADGES = {
  FIRST_QUIZ: {
    name: 'First Quiz',
    description: 'Completed your first quiz',
    icon: '🎯',
    xpReward: 10,
  },
  TOP_SCORER: {
    name: 'Top Scorer',
    description: 'Scored 100% in a quiz',
    icon: '🏆',
    xpReward: 50,
  },
  ACTIVE_LEARNER: {
    name: 'Active Learner',
    description: 'Completed 10 quizzes',
    icon: '📚',
    xpReward: 100,
  },
  NOTE_CONTRIBUTOR: {
    name: 'Note Contributor',
    description: 'Uploaded 5 notes',
    icon: '📝',
    xpReward: 30,
  },
  DISCUSSION_MASTER: {
    name: 'Discussion Master',
    description: 'Posted 50 messages in discussions',
    icon: '💬',
    xpReward: 75,
  },
  LEVEL_10: {
    name: 'Level 10 Master',
    description: 'Reached level 10',
    icon: '⭐',
    xpReward: 200,
  },
};

class GamificationService {
  // Award XP to user
  async awardXP(userId, points, reason = 'Activity completed') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const oldLevel = user.level;
      user.addXP(points);
      await user.save();

      // Sync with Redis Global Leaderboard
      await performanceService.updateGlobalScore(userId, user.xpPoints);

      // Check for level up
      if (user.level > oldLevel) {
        await this.notifyLevelUp(user, user.level);
        await this.checkLevelBadges(user);
      }

      return {
        xpAwarded: points,
        totalXP: user.xpPoints,
        level: user.level,
        leveledUp: user.level > oldLevel,
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  // Award badge to user
  async awardBadge(userId, badgeKey) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const badge = BADGES[badgeKey];
      if (!badge) throw new Error('Badge not found');

      // Check if user already has this badge
      const hasBadge = user.badges.some((b) => b.name === badge.name);
      if (hasBadge) return null;

      // Add badge to user
      user.badges.push({
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
      });

      // Award XP for earning badge
      if (badge.xpReward) {
        user.addXP(badge.xpReward);
      }

      await user.save();

      // Sync with Redis Global Leaderboard
      await performanceService.updateGlobalScore(userId, user.xpPoints);

      // Send notification
      await this.notifyBadgeEarned(user, badge);

      return badge;
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  }

  // Check and award level-based badges
  async checkLevelBadges(user) {
    if (user.level >= 10) {
      await this.awardBadge(user._id, 'LEVEL_10');
    }
  }

  // Notify user of level up
  async notifyLevelUp(user, newLevel) {
    const notification = await Notification.create({
      user: user._id,
      type: 'achievement',
      title: 'Level Up!',
      message: `Congratulations! You've reached level ${newLevel}! 🎉`,
    });

    // Send real-time notification
    try {
      const io = getIO();
      io.to(`user:${user._id}`).emit('notification', notification);
    } catch (error) {
      console.error('Socket.io not available:', error);
    }
  }

  // Notify user of badge earned
  async notifyBadgeEarned(user, badge) {
    const notification = await Notification.create({
      user: user._id,
      type: 'achievement',
      title: 'New Badge Earned!',
      message: `You've earned the "${badge.name}" badge! ${badge.icon}`,
    });

    // Send real-time notification
    try {
      const io = getIO();
      io.to(`user:${user._id}`).emit('notification', notification);
    } catch (error) {
      console.error('Socket.io not available:', error);
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 10, period = 'all-time') {
    try {
      const users = await User.find({ isActive: true, deletedAt: null })
        .select('username avatar xpPoints level badges')
        .sort({ xpPoints: -1 })
        .limit(limit);

      return users.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        avatar: user.avatar,
        xpPoints: user.xpPoints,
        level: user.level,
        badgeCount: user.badges.length,
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  // Get user rank
  async getUserRank(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const higherRanked = await User.countDocuments({
        xpPoints: { $gt: user.xpPoints },
        isActive: true,
        deletedAt: null,
      });

      return higherRanked + 1;
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw error;
    }
  }
}

export default new GamificationService();
