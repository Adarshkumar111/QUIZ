import express from 'express';
import {
  getAvailableLiveClasses,
  joinLiveClass,
  leaveLiveClass
} from '../../controllers/user/liveClassController.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAvailableLiveClasses);
router.post('/:id/join', joinLiveClass);
router.post('/:id/leave', leaveLiveClass);

export default router;
