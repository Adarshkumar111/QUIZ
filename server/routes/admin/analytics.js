import express from 'express';
import {
  getQuizPerformance,
  getNotesDownloads,
  getEngagement,
  getActiveUsers,
  getFlaggedContent,
  getDashboardStats,
  getUserQuizPerformanceSummary,
  getUserQuizPerformanceDetail,
  getAllStudents,
  getQuizSubmissions,
} from '../../controllers/admin/analyticsController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.get('/quiz-performance', getQuizPerformance);
router.get('/notes-downloads', getNotesDownloads);
router.get('/engagement', getEngagement);
router.get('/active-users', getActiveUsers);
router.get('/flagged-content', getFlaggedContent);
router.get('/dashboard', getDashboardStats);
router.get('/user-performance', getUserQuizPerformanceSummary);
router.get('/user-performance/:userId', getUserQuizPerformanceDetail);
router.get('/all-students', getAllStudents);
router.get('/quiz-submissions/:quizId', getQuizSubmissions);

export default router;
