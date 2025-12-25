import express from 'express';
import {
  createClassroom,
  updateClassroom,
  deleteClassroom,
  generateInvite,
  addMembers,
  updateMemberRole,
  getAllClassrooms,
  removeMember,
  getClassroomTopics,
  createClassroomTopic,
  addClassroomTopicVideo,
  deleteClassroomTopic,
  removeClassroomTopicVideo,
} from '../../controllers/admin/classroomController.js';
import upload from '../../middleware/upload.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.route('/').get(getAllClassrooms).post(createClassroom);

router.route('/:id').put(updateClassroom).delete(deleteClassroom);

router.post('/:id/invite', generateInvite);
router.post('/:id/members', addMembers);
router.put('/:id/members/:userId/role', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);

// Topics & videos
router.get('/:id/topics', getClassroomTopics);
router.post('/:id/topics', createClassroomTopic);
router.delete('/:id/topics/:topicId', deleteClassroomTopic);

router.post(
  '/:id/topics/:topicId/videos',
  upload.single('file'),
  addClassroomTopicVideo
);
router.delete('/:id/topics/:topicId/videos/:videoId', removeClassroomTopicVideo);

export default router;
