import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import Note from '../../models/Note.js';
import User from '../../models/User.js';
import Discussion from '../../models/Discussion.js';
import Ticket from '../../models/Ticket.js';
import Classroom from '../../models/Classroom.js';
import { performanceService } from '../../services/performanceService.js';

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

// @desc    Get per-user quiz performance summary for admin
// @route   GET /api/admin/analytics/user-performance
// @access  Private/Admin
export const getUserQuizPerformanceSummary = async (req, res) => {
  try {
    const { search } = req.query;

    const matchStage = { status: 'graded' };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$student',
          attemptsCount: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          bestPercentage: { $max: '$percentage' },
          lastAttemptAt: { $max: '$submittedAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          username: '$user.username',
          email: '$user.email',
          avatar: '$user.avatar',
          attemptsCount: 1,
          avgPercentage: { $round: ['$avgPercentage', 2] },
          bestPercentage: { $round: ['$bestPercentage', 2] },
          lastAttemptAt: 1,
        },
      },
      { $sort: { avgPercentage: -1 } },
    ];

    let users = await QuizAttempt.aggregate(pipeline);

    if (search) {
      const s = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s)
      );
    }

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get detailed quiz performance for a single user
// @route   GET /api/admin/analytics/user-performance/:userId
// @access  Private/Admin
export const getUserQuizPerformanceDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'username email avatar course semester xpPoints level readNotes watchedVideos lastSeenAt isActive createdAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const attempts = await QuizAttempt.find({
      student: userId,
      status: 'graded',
    })
      .populate('quiz', 'title subject totalMarks')
      .sort({ submittedAt: -1 });

    // --- Calculate Overall Progress ---
    const totalQuizzesAvailable = await Quiz.countDocuments({ 
      status: 'published', 
      deletedAt: null 
    });
    const totalNotesAvailable = await Note.countDocuments({ 
      status: 'approved', 
      deletedAt: null 
    });
    const classrooms = await Classroom.find({ deletedAt: null });
    let totalVideosAvailable = 0;
    classrooms.forEach(c => {
      (c.topics || []).forEach(t => {
        if (t.published) totalVideosAvailable += (t.videos || []).length;
      });
    });

    const totalContent = totalQuizzesAvailable + totalNotesAvailable + totalVideosAvailable;
    
    const uniqueQuizzesAttempted = await QuizAttempt.distinct('quiz', {
      student: userId,
      status: { $in: ['submitted', 'graded'] },
    });
    
    const completedQuizzesCount = uniqueQuizzesAttempted.length;
    const readNotesCount = user.readNotes?.length || 0;
    const watchedVideosCount = user.watchedVideos?.length || 0;
    const userContent = completedQuizzesCount + readNotesCount + watchedVideosCount;

    let progressPercentage = 0;
    if (totalContent > 0) {
      progressPercentage = Math.round((userContent / totalContent) * 100);
    }

    const globalRank = await performanceService.getGlobalRank(userId);

    const summary = {
      totalAttempts: attempts.length,
      avgPercentage:
        attempts.length === 0
          ? 0
          : Number(
              (
                attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) /
                attempts.length
              ).toFixed(2)
            ),
      bestPercentage:
        attempts.length === 0
          ? 0
          : Math.max(...attempts.map((a) => a.percentage || 0)),
      lastAttemptAt:
        attempts.length === 0 ? null : attempts[0].submittedAt || attempts[0].createdAt,
      readNotesCount,
      watchedVideosCount,
      progressPercentage,
      totalContent,
      userContent,
      globalRank
    };

    res.json({ user, summary, attempts });
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

    // Count all quizzes that are currently published (non-deleted)
    // so the dashboard "active quizzes" metric reflects how many
    // quizzes admin has kept active, regardless of type/schedule.
    const activeQuizzesNow = await Quiz.countDocuments({
      ...notDeletedQuery,
      status: 'published',
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

// @desc    Get all students
// @route   GET /api/admin/analytics/all-students
// @access  Private/Admin
export const getAllStudents = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {
      role: 'student',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (search) {
      const s = String(search).toLowerCase();
      query.$or = [
        { username: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }

    const studentsRaw = await User.find(query)
      .select('username email avatar course semester xpPoints level createdAt isActive isBanned isMuted')
      .sort({ createdAt: -1 });

    const students = await Promise.all(studentsRaw.map(async (s) => {
      const globalRank = await performanceService.getGlobalRank(s._id);
      return { ...s.toObject(), globalRank };
    }));

    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
