import LiveClass from '../../models/LiveClass.js';
import Attendance from '../../models/Attendance.js';
import crypto from 'crypto';
import { uploadToStorage, deleteFromStorage } from '../../config/cloudStorage.js';
import fs from 'fs';

// Get all live classes for admin/teacher
export const getAllLiveClasses = async (req, res) => {
  try {
    const classes = await LiveClass.find({ teacher: req.user._id })
      .populate('classroom', 'name')
      .sort({ createdAt: -1 });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new live class
export const createLiveClass = async (req, res) => {
  try {
    const { title, description, classroom, scheduledTime } = req.body;
    
    // Generate a unique meeting ID
    const meetingId = crypto.randomBytes(8).toString('hex');

    const newClass = new LiveClass({
      title,
      description,
      teacher: req.user._id,
      classroom,
      scheduledTime,
      meetingId,
      status: 'upcoming'
    });

    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Start a live class
export const startLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ message: 'Class not found' });
    
    if (liveClass.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    liveClass.status = 'live';
    liveClass.startedAt = new Date();
    await liveClass.save();

    res.json(liveClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// End a live class
export const endLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ message: 'Class not found' });

    if (liveClass.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    liveClass.status = 'ended';
    liveClass.endedAt = new Date();
    
    if (liveClass.startedAt) {
      const diff = liveClass.endedAt.getTime() - liveClass.startedAt.getTime();
      liveClass.duration = Math.round(diff / 60000);
    }

    await liveClass.save();

    // Mark all active attendance records as finished
    await Attendance.updateMany(
      { liveClass: liveClass._id, leaveTime: { $exists: false } },
      { leaveTime: new Date() }
    );

    res.json(liveClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance for a specific class
export const getClassAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ liveClass: req.params.id })
      .populate('user', 'username email');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload class recording
export const uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No recording file provided' });
    }

    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Upload to ImageKit
    const result = await uploadToStorage(req.file, 'recordings');
    
    // Cleanup local file
    fs.unlinkSync(req.file.path);

    liveClass.recordingUrl = result.url;
    liveClass.recordingId = result.publicId;
    await liveClass.save();

    res.json({ message: 'Recording uploaded successfully', url: result.url });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// Delete a live class (DB + ImageKit)
export const deleteLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (liveClass.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete recording from ImageKit if exists
    if (liveClass.recordingId) {
      try {
        await deleteFromStorage(liveClass.recordingId);
      } catch (err) {
        console.error('Failed to delete from ImageKit:', err.message);
      }
    }

    // Delete attendance records
    await Attendance.deleteMany({ liveClass: liveClass._id });

    // Delete the class
    await LiveClass.findByIdAndDelete(req.params.id);

    res.json({ message: 'Live class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle visibility (Disable/Enable)
export const toggleVisibility = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (liveClass.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    liveClass.isVisible = !liveClass.isVisible;
    await liveClass.save();

    res.json({ message: `Class ${liveClass.isVisible ? 'enabled' : 'disabled'}`, isVisible: liveClass.isVisible });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
