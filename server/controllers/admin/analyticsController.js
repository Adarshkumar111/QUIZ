import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import Note from '../../models/Note.js';
import User from '../../models/User.js';
import Discussion from '../../models/Discussion.js';
import Ticket from '../../models/Ticket.js';

// @desc    Get quiz performance analytics
// @route   GET /api/admin/analytics/quiz-performance
// @access  Private/Admin
export const getQuizPerformance = async (req, res) => {
  try {
    const { classroomId, quizId, startDate, endDate } = req.query;

    const query = { status: 'graded' };

    if (quizId) query.quiz = quizId;
    if (startDate && endDate) {
      query.submittedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Average scores
    const avgScores = await QuizAttempt.aggregate([
      { $match: query },
      { $group: { _id: '$quiz', avgScore: { $avg: '$percentage' } } },
    ]);

    // Top performers
    const topPerformers = await QuizAttempt.find(query)
      .populate('student', 'username avatar')
      .sort({ score: -1 })
      .limit(10);

    // Quiz-wise statistics
    const quizStats = await QuizAttempt.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$quiz',
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: '$percentage' },
          maxScore: { $max: '$percentage' },
          minScore: { $min: '$percentage' },
        },
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: '_id',
          as: 'quiz',
        },
      },
    ]);

    res.json({
      avgScores,
      topPerformers,
      quizStats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notes download statistics
// @route   GET /api/admin/analytics/notes-downloads
// @access  Private/Admin
export const getNotesDownloads = async (req, res) => {
  try {
    const mostDownloaded = await Note.find({ deletedAt: null })
      .sort({ downloads: -1 })
      .limit(20)
      .populate('uploadedBy', 'username')
      .populate('classroom', 'name');

    const totalDownloads = await Note.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$downloads' } } },
    ]);

    // Downloads by subject
    const downloadsBySubject = await Note.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$subject', downloads: { $sum: '$downloads' } } },
      { $sort: { downloads: -1 } },
    ]);

    res.json({
      mostDownloaded,
      totalDownloads: totalDownloads[0]?.total || 0,
      downloadsBySubject,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student engagement metrics
// @route   GET /api/admin/analytics/engagement
// @access  Private/Admin
export const getEngagement = async (req, res) => {
  try {
    // Total users
    const totalStudents = await User.countDocuments({
      role: 'student',
      isActive: true,
    });

    // Active users (quiz attempts in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeStudents = await QuizAttempt.distinct('student', {
      submittedAt: { $gte: thirtyDaysAgo },
    });

    // Discussion participation
    const discussionParticipants = await Discussion.distinct('author', {
      createdAt: { $gte: thirtyDaysAgo },
      isDeleted: false,
    });

    // Top contributors
    const topContributors = await Discussion.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          isDeleted: false,
        },
      },
      { $group: { _id: '$author', messageCount: { $sum: 1 } } },
      { $sort: { messageCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
    ]);

    res.json({
      totalStudents,
      activeStudents: activeStudents.length,
      discussionParticipants: discussionParticipants.length,
      engagementRate: ((activeStudents.length / totalStudents) * 100).toFixed(2),
      topContributors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active users
// @route   GET /api/admin/analytics/active-users
// @access  Private/Admin
export const getActiveUsers = async (req, res) => {
  try {
    const {  period = '7d' } = req.query;

    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (periodDays[period] || 7));

    // Users who took quizzes
    const activeInQuizzes = await QuizAttempt.distinct('student', {
      createdAt: { $gte: daysAgo },
    });

    // Users who posted in discussions
    const activeInDiscussions = await Discussion.distinct('author', {
      createdAt: { $gte: daysAgo },
      isDeleted: false,
    });

    // Combine and get unique users
    const allActiveUsers = [
      ...new Set([...activeInQuizzes, ...activeInDiscussions]),
    ];

    const activeUsers = await User.find({
      _id: { $in: allActiveUsers },
    }).select('username email avatar xpPoints level');

    res.json({
      count: activeUsers.length,
      users: activeUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get flagged content
// @route   GET /api/admin/analytics/flagged-content
// @access  Private/Admin
export const getFlaggedContent = async (req, res) => {
  try {
    const flaggedDiscussions = await Discussion.find({
      flagged: true,
      isDeleted: false,
    })
      .populate('author', 'username email')
      .populate('classroom', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      count: flaggedDiscussions.length,
      items: flaggedDiscussions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get overall dashboard stats
// @route   GET /api/admin/analytics/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const notDeletedQuery = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const totalStudents = await User.countDocuments({
      role: 'student',
      isActive: true,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });

    const now = new Date();
    const activeWindowMs = 5 * 60 * 1000;
    const activeSince = new Date(now.getTime() - activeWindowMs);
    const activeUsersNow = await User.countDocuments({
      isActive: true,
      lastSeenAt: { $gte: activeSince },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });

    const activeQuizzesNow = await Quiz.countDocuments({
      ...notDeletedQuery,
      status: 'published',
      type: 'live',
      startTime: { $lte: now },
      endTime: { $gte: now },
    });

    const pendingNotes = await Note.countDocuments({
      ...notDeletedQuery,
      status: 'pending',
    });

    const openTickets = await Ticket.countDocuments({
      status: { $in: ['open', 'in-progress'] },
    });

    const totalQuizzes = await Quiz.countDocuments(notDeletedQuery);
    const totalNotes = await Note.countDocuments(notDeletedQuery);
    const totalAttempts = await QuizAttempt.countDocuments();

    const recentQuizzes = await Quiz.find(notDeletedQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('classroom', 'name');

    const recentNotes = await Note.find(notDeletedQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('uploadedBy', 'username');

    res.json({
      stats: {
        totalStudents,
        activeUsersNow,
        activeQuizzesNow,
        pendingNotes,
        openTickets,
        totalQuizzes,
        totalNotes,
        totalAttempts,
      },
      recentQuizzes,
      recentNotes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
