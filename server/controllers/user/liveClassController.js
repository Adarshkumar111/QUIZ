import LiveClass from '../../models/LiveClass.js';
import Attendance from '../../models/Attendance.js';
import Classroom from '../../models/Classroom.js';

// Get available live classes for student
export const getAvailableLiveClasses = async (req, res) => {
  try {
    // Get all live, upcoming, and ended classes (so users can watch recordings)
    const classes = await LiveClass.find({
      status: { $in: ['live', 'upcoming', 'ended'] },
      isVisible: true
    })
    .populate('teacher', 'username')
    .populate('classroom', 'name')
    .sort({ status: -1, scheduledTime: -1 });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Join a live class (track attendance)
export const joinLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass || liveClass.status !== 'live') {
      return res.status(400).json({ message: 'Class is not currently live' });
    }

    // Check if attendance already exists for this user in this class
    let attendance = await Attendance.findOne({
      liveClass: liveClass._id,
      user: req.user._id,
      leaveTime: { $exists: false }
    });

    if (!attendance) {
      attendance = new Attendance({
        liveClass: liveClass._id,
        user: req.user._id,
        joinTime: new Date()
      });
      await attendance.save();
    }

    res.json({ message: 'Joined successfully', meetingId: liveClass.meetingId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Leave a live class (update attendance)
export const leaveLiveClass = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      liveClass: req.params.id,
      user: req.user._id,
      leaveTime: { $exists: false }
    });

    if (attendance) {
      attendance.leaveTime = new Date();
      await attendance.save();
    }

    res.json({ message: 'Left successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
