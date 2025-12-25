import Note from '../../models/Note.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import Announcement from '../../models/Announcement.js';
import Assignment from '../../models/Assignment.js';
import Notification from '../../models/Notification.js';
import Classroom from '../../models/Classroom.js';
import gamificationService from '../../services/gamificationService.js';
import { performanceService } from '../../services/performanceService.js';

// @desc    Get saved notes
// @route   GET /api/dashboard/saved-notes
// @access  Private
export const getSavedNotes = async (req, res) => {
  try {
    const user = await req.user.populate('savedNotes');

    res.json(user.savedNotes || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get classrooms where user is a member
// @route   GET /api/dashboard/classrooms
// @access  Private
export const getUserClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({
      deletedAt: null,
      'members.user': req.user._id,
    })
      .select('name description inviteCode settings')
      .sort({ createdAt: -1 });

    res.json(classrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quiz history
// @route   GET /api/dashboard/quiz-history
// @access  Private
export const getQuizHistory = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      student: req.user._id,
      status: { $in: ['submitted', 'graded'] },
    })
      .populate('quiz', 'title')
      .sort({ submittedAt: -1 })
      .limit(20);

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get performance stats
// @route   GET /api/dashboard/performance
// @access  Private
export const getPerformance = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      student: req.user._id,
      status: 'graded',
    });

    const totalAttempts = attempts.length;
    const avgScore =
      attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts || 0;

    // Performance trend (last 10 quizzes)
    const recentAttempts = attempts.slice(-10);
    const trend = recentAttempts.map((a) => ({
      quizTitle: a.quiz?.title || 'Unknown',
      percentage: a.percentage,
      date: a.submittedAt,
    }));

    // Improvement suggestions
    const suggestions = [];
    if (avgScore < 60) {
      suggestions.push('Try practicing more with similar quizzes');
      suggestions.push('Review notes before taking quizzes');
    } else if (avgScore < 80) {
      suggestions.push('Great progress! Focus on challenging topics');
    } else {
      suggestions.push('Excellent performance! Keep it up!');
    }

    res.json({
      totalAttempts,
      avgScore: avgScore.toFixed(2),
      trend,
      suggestions,
      rank: await gamificationService.getUserRank(req.user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get upcoming events
// @route   GET /api/dashboard/events
// @access  Private
export const getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();

    // Upcoming quizzes
    const upcomingQuizzes = await import('../../models/Quiz.js').then((m) =>
      m.default.find({
        type: 'live',
        status: 'published',
        startTime: { $gt: now },
        deletedAt: null,
      })
        .populate('classroom', 'name')
        .sort({ startTime: 1 })
        .limit(5)
    );

    // Pending assignments
    const pendingAssignments = await Assignment.find({
      dueDate: { $gt: now },
      deletedAt: null,
    })
      .populate('classroom', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    // Recent announcements
    const announcements = await Announcement.find({
      publishAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      deletedAt: null,
    })
      .sort({ publishAt: -1 })
      .limit(5);

    res.json({
      upcomingQuizzes,
      pendingAssignments,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notifications
// @route   GET /api/dashboard/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;

    const query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/dashboard/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard overview
// @route   GET /api/dashboard/overview
// @access  Private
export const getDashboardOverview = async (req, res) => {
  try {
    const totalQuizzes = await QuizAttempt.countDocuments({
      student: req.user._id,
      status: 'graded',
    });

    // --- Streak Logic ---
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to midnight
    
    let streak = req.user.streak || 0;
    let lastActive = req.user.lastActiveDate ? new Date(req.user.lastActiveDate) : null;
    let lastActiveMidnight = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;

    if (!lastActiveMidnight) {
      // First time active
      streak = 1;
      req.user.streak = streak;
      req.user.lastActiveDate = now;
      await req.user.save();
    } else {
      const diffTime = Math.abs(today - lastActiveMidnight);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        // Consecutive day
        streak += 1;
        req.user.streak = streak;
        req.user.lastActiveDate = now;
        await req.user.save();
      } else if (diffDays > 1) {
        // Streak broken
        streak = 1;
        req.user.streak = streak;
        req.user.lastActiveDate = now;
        await req.user.save();
      } 
      // If diffDays === 0 (same day), do nothing, keep streak
    }

    const savedNotesCount = req.user.savedNotes?.length || 0;

    const unreadNotifications = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    // --- Progress Calculation (Real Data) ---
    
    // 1. Total Content (Admin/Teacher Uploads)
    // Count ONLY valid, published content
    const totalQuizzesAvailable = await import('../../models/Quiz.js').then(m => 
      m.default.countDocuments({ 
        status: 'published', 
        deletedAt: null 
      })
    );
    
    const totalNotesAvailable = await Note.countDocuments({ 
      status: 'approved', 
      deletedAt: null 
    });

    // Count total videos from published playlists in all classrooms
    const classroomsWithVideos = await Classroom.find({ deletedAt: null });
    let totalVideosAvailable = 0;
    classroomsWithVideos.forEach(classroom => {
      (classroom.topics || []).forEach(topic => {
        if (topic.published) {
          totalVideosAvailable += (topic.videos || []).length;
        }
      });
    });

    const totalContent = totalQuizzesAvailable + totalNotesAvailable + totalVideosAvailable;

    // 2. User Consumption
    // Unique quizzes attempted (at least submitted once)
    const uniqueQuizzesAttempted = await QuizAttempt.distinct('quiz', {
      student: req.user._id,
      status: { $in: ['submitted', 'graded'] },
    });
    const completedQuizzesCount = uniqueQuizzesAttempted.length;

    // Notes read by user
    const readNotesCount = req.user.readNotes ? req.user.readNotes.length : 0;

    const userContent = completedQuizzesCount + readNotesCount;

    // 4. Recent Quizzes (Real Data)
    const recentAttempts = await QuizAttempt.find({
      student: req.user._id,
      status: { $in: ['submitted', 'graded'] },
    })
      .populate({
        path: 'quiz',
        select: 'title settings'
      })
      .sort({ submittedAt: -1 })
      .limit(5);

    const recentQuizzes = recentAttempts.map(attempt => {
      const passingScore = attempt.quiz?.settings?.passingScore || 60;
      const isPassed = attempt.percentage >= passingScore;
      return {
        _id: attempt._id,
        title: attempt.quiz?.title || 'Unknown Quiz',
        score: `${attempt.score} / ${attempt.maxScore}`,
        percentage: `${Math.round(attempt.percentage)}%`,
        status: isPassed ? 'Passed' : 'Failed',
        isPassed
      };
    });

    // 3. Percentage
    let progressPercentage = 0;
    if (totalContent > 0) {
      progressPercentage = Math.round((userContent / totalContent) * 100);
    }
    // Cap at 100% just in case
    if (progressPercentage > 100) progressPercentage = 100;

    // Get Global Rank and Daily Top Performers
    const globalRank = await performanceService.getGlobalRank(req.user._id);
    const topPerformers = await performanceService.getTopPerformers();

    res.json({
      user: {
        username: req.user.username,
        avatar: req.user.avatar,
        level: req.user.level,
        xpPoints: req.user.xpPoints,
        course: req.user.course,
        semester: req.user.semester,
        globalRank
      },
      stats: {
        totalQuizzes, 
        savedNotesCount,
        streak, 
        unreadNotifications,
        progressPercentage,
        userContent,
        totalContent,
        completedQuizzesCount,
        readNotesCount
      },
      recentQuizzes, 
      topPerformers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
