import Classroom from '../../models/Classroom.js';
import User from '../../models/User.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import fileService from '../../services/fileService.js';

// @desc    Create classroom
// @route   POST /api/admin/classrooms
// @access  Private/Admin
export const createClassroom = async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    const classroom = await Classroom.create({
      name,
      description,
      createdBy: req.user._id,
      inviteCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      settings,
    });

    res.status(201).json(classroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update classroom
// @route   PUT /api/admin/classrooms/:id
// @access  Private/Admin
export const updateClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    Object.assign(classroom, req.body);
    await classroom.save();

    res.json(classroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete classroom
// @route   DELETE /api/admin/classrooms/:id
// @access  Private/Admin
export const deleteClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    classroom.deletedAt = new Date();
    classroom.isActive = false;
    await classroom.save();

    res.json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate new invite code
// @route   POST /api/admin/classrooms/:id/invite
// @access  Private/Admin
export const generateInvite = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    classroom.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    await classroom.save();

    res.json({
      inviteCode: classroom.inviteCode,
      inviteLink: `${process.env.CLIENT_URL}/join/${classroom.inviteCode}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add members to classroom
// @route   POST /api/admin/classrooms/:id/members
// @access  Private/Admin
export const addMembers = async (req, res) => {
  try {
    const { userIds, role = 'student' } = req.body;
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Add members
    const newMembers = userIds.map((userId) => ({
      user: userId,
      role,
      joinedAt: new Date(),
    }));

    classroom.members.push(...newMembers);
    await classroom.save();

    res.json(classroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update member role
// @route   PUT /api/admin/classrooms/:id/members/:userId/role
// @access  Private/Admin
export const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const member = classroom.members.find(
      (m) => m.user.toString() === req.params.userId
    );

    if (!member) {
      return res.status(404).json({ message: 'Member not found in classroom' });
    }

    member.role = role;
    await classroom.save();

    res.json(classroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all classrooms
// @route   GET /api/admin/classrooms
// @access  Private/Admin
export const getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ deletedAt: null })
      .populate('createdBy', 'username email')
      .populate('members.user', 'username email')
      .sort({ createdAt: -1 });

    res.json(classrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from classroom
// @route   DELETE /api/admin/classrooms/:id/members/:userId
// @access  Private/Admin
export const removeMember = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    classroom.members = classroom.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );

    await classroom.save();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get classroom topics (with videos)
// @route   GET /api/admin/classrooms/:id/topics
// @access  Private/Admin/Teacher
export const getClassroomTopics = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    res.json(classroom.topics || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create topic inside classroom
// @route   POST /api/admin/classrooms/:id/topics
// @access  Private/Admin/Teacher
export const createClassroomTopic = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Topic name is required' });
    }

    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (!classroom.topics) classroom.topics = [];

    const topicId = new mongoose.Types.ObjectId();
    const topic = {
      _id: topicId,
      name: name.trim(),
      description: description?.trim() || '',
      videos: [],
    };

    classroom.topics.push(topic);
    await classroom.save();

    res.status(201).json(topic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add video to classroom topic (URL or uploaded file)
// @route   POST /api/admin/classrooms/:id/topics/:topicId/videos
// @access  Private/Admin/Teacher
export const addClassroomTopicVideo = async (req, res) => {
  try {
    const { kind, title, description, url } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Video title is required' });
    }

    if (!kind || !['url', 'upload'].includes(kind)) {
      return res.status(400).json({ message: 'Invalid video kind' });
    }

    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const topic = (classroom.topics || []).find(
      (t) => t._id?.toString() === req.params.topicId || t.id?.toString() === req.params.topicId
    );

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    let finalUrl = url;

    if (kind === 'url') {
      if (!finalUrl || !finalUrl.trim()) {
        return res.status(400).json({ message: 'Video URL is required' });
      }
      finalUrl = finalUrl.trim();
    } else if (kind === 'upload') {
      if (!req.file) {
        return res.status(400).json({ message: 'Please upload a video file' });
      }

      const fileData = await fileService.uploadFile(req.file, 'classroom-videos');
      finalUrl = fileData.url;
    }

    const videoId = new mongoose.Types.ObjectId();
    const video = {
      _id: videoId,
      title: title.trim(),
      description: description?.trim() || '',
      kind,
      url: finalUrl,
      createdAt: new Date(),
    };

    if (!topic.videos) topic.videos = [];
    topic.videos.unshift(video);

    await classroom.save();

    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Delete classroom topic
// @route   DELETE /api/admin/classrooms/:id/topics/:topicId
// @access  Private/Admin
export const deleteClassroomTopic = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (!classroom.topics) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const topicIndex = classroom.topics.findIndex(
      (t) => t._id?.toString() === req.params.topicId || t.id?.toString() === req.params.topicId
    );

    if (topicIndex === -1) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    classroom.topics.splice(topicIndex, 1);
    await classroom.save();

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove video from topic
// @route   DELETE /api/admin/classrooms/:id/topics/:topicId/videos/:videoId
// @access  Private/Admin
export const removeClassroomTopicVideo = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const topic = (classroom.topics || []).find(
      (t) => t._id?.toString() === req.params.topicId || t.id?.toString() === req.params.topicId
    );

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (!topic.videos) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const videoIndex = topic.videos.findIndex(
      (v) => v._id?.toString() === req.params.videoId || v.id?.toString() === req.params.videoId
    );

    if (videoIndex === -1) {
      return res.status(404).json({ message: 'Video not found' });
    }

    topic.videos.splice(videoIndex, 1);
    await classroom.save();

    res.json({ message: 'Video removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
