import Classroom from '../../models/Classroom.js';

// @desc    Get all published topics from all classrooms (public access for all users)
// @route   GET /api/classrooms/published/all
// @access  Private
export const getAllPublishedTopics = async (req, res) => {
  try {
    // Get all classrooms with published topics
    const classrooms = await Classroom.find({
      deletedAt: null,
    }).select('topics');

    // Extract all published topics from all classrooms
    const allPublishedTopics = [];
    
    classrooms.forEach((classroom) => {
      if (classroom.topics && classroom.topics.length > 0) {
        const publishedTopics = classroom.topics.filter(topic => topic.published === true);
        allPublishedTopics.push(...publishedTopics);
      }
    });

    res.json(allPublishedTopics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get classroom topics with videos (read-only for students)
// @route   GET /api/classrooms/:classroomId/topics
// @access  Private
export const getUserClassroomTopicsWithVideos = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { search = '' } = req.query;

    const classroom = await Classroom.findById(classroomId);

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Ensure user is a member of this classroom
    const isMember = (classroom.members || []).some(
      (m) => m.user?.toString?.() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this classroom' });
    }

    // Filter only published topics for regular users
    let topics = (classroom.topics || []).filter(topic => topic.published === true);

    if (search) {
      const q = search.toLowerCase();
      topics = topics
        .map((t) => {
          const videos = (t.videos || []).filter(
            (v) =>
              v.title?.toLowerCase().includes(q) ||
              v.description?.toLowerCase().includes(q) ||
              t.name?.toLowerCase().includes(q)
          );
          return {
            ...t.toObject?.() || t,
            videos,
          };
        })
        .filter((t) => (t.videos || []).length > 0 || t.name?.toLowerCase().includes(q));
    }

    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
