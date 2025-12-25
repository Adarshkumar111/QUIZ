import express from 'express';
import { protect } from '../../middleware/auth.js';
import { getUserClassroomTopicsWithVideos, getAllPublishedTopics } from '../../controllers/user/classroomContentController.js';

const router = express.Router();

router.use(protect);

// Get all published topics across all classrooms (no membership required)
router.get('/published/all', getAllPublishedTopics);

// Get topics for a specific classroom (membership required)
router.get('/:classroomId/topics', getUserClassroomTopicsWithVideos);

export default router;
