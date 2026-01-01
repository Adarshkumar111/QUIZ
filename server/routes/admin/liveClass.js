import express from 'express';
import {
  getAllLiveClasses,
  createLiveClass,
  startLiveClass,
  endLiveClass,
  getClassAttendance,
  uploadRecording,
  deleteLiveClass,
  toggleVisibility
} from '../../controllers/admin/liveClassController.js';
import { protect, authorize } from '../../middleware/auth.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.get('/', getAllLiveClasses);
router.post('/', createLiveClass);
router.patch('/:id/start', startLiveClass);
router.patch('/:id/end', endLiveClass);
router.get('/:id/attendance', getClassAttendance);
router.post('/:id/upload', upload.single('recording'), uploadRecording);
router.delete('/:id', deleteLiveClass);
router.patch('/:id/visibility', toggleVisibility);

export default router;
