import User from '../../models/User.js';
import fileService from '../../services/fileService.js';
import gamificationService from '../../services/gamificationService.js';
import { performanceService } from '../../services/performanceService.js';

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const globalRank = await performanceService.getGlobalRank(req.user._id);

    res.json({
      ...user.toObject(),
      globalRank
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { username, bio, course, semester } = req.body;

    const user = await User.findById(req.user._id);

    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (course !== undefined) user.course = course;
    if (semester !== undefined) user.semester = semester;

    // Upload avatar if provided
    if (req.file) {
      // Delete old avatar if exists
      if (user.avatar) {
        // Extract publicId from avatar URL if needed
        // await fileService.deleteFile(oldPublicId);
      }

      const fileData = await fileService.uploadFile(req.file, 'avatars');
      user.avatar = fileData.url;
    }

    await user.save();

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get achievements and badges
// @route   GET /api/profile/achievements
// @access  Private
export const getAchievements = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('badges xpPoints level');
    const globalRank = await performanceService.getGlobalRank(req.user._id);

    res.json({
      badges: user.badges,
      xpPoints: user.xpPoints,
      level: user.level,
      rank: globalRank,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/profile/notifications
// @access  Private
export const updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...req.body,
    };

    await user.save();

    res.json(user.notificationPreferences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leaderboard
// @route   GET /api/profile/leaderboard
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    const { period = 'all-time', limit = 10 } = req.query;

    const leaderboard = await gamificationService.getLeaderboard(
      parseInt(limit),
      period
    );

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
