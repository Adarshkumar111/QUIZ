import Note from '../../models/Note.js';
import gamificationService from '../../services/gamificationService.js';

// @desc    Browse notes with filters
// @route   GET /api/notes
// @access  Private
export const browseNotes = async (req, res) => {
  try {
    const {
      subject,
      topic,
      difficulty,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
    } = req.query;

    const query = { status: 'approved', deletedAt: null };

    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const notes = await Note.find(query)
      .populate('uploadedBy', 'username avatar')
      .populate('classroom', 'name')
      .sort({ [sortBy]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Note.countDocuments(query);

    res.json({
      notes,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get note details
// @route   GET /api/notes/:id
// @access  Private
export const getNoteDetails = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploadedBy', 'username avatar bio')
      .populate('classroom', 'name')
      .populate('ratings.user', 'username');

    if (!note || note.deletedAt) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.status !== 'approved') {
      return res.status(403).json({ message: 'Note is not approved yet' });
    }

    res.json(note);

    // Track read progress (if not already read)
    if (req.user && !req.user.readNotes.includes(note._id)) {
      await req.user.updateOne({ $addToSet: { readNotes: note._id } });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download note
// @route   GET /api/notes/:id/download
// @access  Private
export const downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note || note.deletedAt || note.status !== 'approved') {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Increment download count
    note.downloads += 1;
    await note.save();

    // Track read progress (if not already read)
    if (req.user && !req.user.readNotes.includes(note._id)) {
      await req.user.updateOne({ $addToSet: { readNotes: note._id } });
    }

    // Award XP to uploader
    await gamificationService.awardXP(note.uploadedBy, 2, 'Note downloaded');

    res.json({ url: note.file.url, fileName: note.file.fileName });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rate note
// @route   POST /api/notes/:id/rate
// @access  Private
export const rateNote = async (req, res) => {
  try {
    const { rating } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if user already rated
    const existingRating = note.ratings.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingRating) {
      existingRating.rating = rating;
    } else {
      note.ratings.push({
        user: req.user._id,
        rating,
      });
    }

    note.calculateAverageRating();
    await note.save();

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save note to favorites
// @route   POST /api/notes/:id/save
// @access  Private
export const saveNote = async (req, res) => {
  try {
    const { default: User } = await import('../../models/User.js');
    const user = await User.findById(req.user._id);

    if (!user.savedNotes) {
      user.savedNotes = [];
    }

    if (user.savedNotes.includes(req.params.id)) {
      return res.status(400).json({ message: 'Note already saved' });
    }

    user.savedNotes.push(req.params.id);
    await user.save();

    res.json({ message: 'Note saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unsave note (remove from favorites)
// @route   DELETE /api/notes/:id/save
// @access  Private
export const unsaveNote = async (req, res) => {
  try {
    const { default: User } = await import('../../models/User.js');
    const user = await User.findById(req.user._id);

    // console.log('Unsaving note:', req.params.id);
    // console.log('Current savedNotes:', user.savedNotes);

    if (user.savedNotes) {
      // Use filter for robust removal (converts ObjectId to string for comparison)
      user.savedNotes = user.savedNotes.filter(
        (id) => id.toString() !== req.params.id
      );
      await user.save();
    }

    res.json({ message: 'Note removed from saved list' });
  } catch (error) {
    console.error('Unsave error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload note (student)
// @route   POST /api/notes/upload
// @access  Private
export const uploadNote = async (req, res) => {
  try {
    const { title, description, subject, topic, difficulty, tags, classroom } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { default: fileService } = await import('../../services/fileService.js');
    const fileData = await fileService.uploadFile(req.file, 'notes');

    const note = await Note.create({
      title,
      description,
      file: fileData,
      uploadedBy: req.user._id,
      subject,
      topic,
      difficulty,
      tags: tags ? JSON.parse(tags) : [],
      classroom,
      status: 'pending', // Student notes need approval
    });

    // Award XP for uploading note
    await gamificationService.awardXP(req.user._id, 10, 'Note uploaded');

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get trending/popular notes
// @route   GET /api/notes/trending
// @access  Private
export const getTrendingNotes = async (req, res) => {
  try {
    const notes = await Note.find({ status: 'approved', deletedAt: null })
      .sort({ downloads: -1, averageRating: -1 })
      .limit(10)
      .populate('uploadedBy', 'username avatar');

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
