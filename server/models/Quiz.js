import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    // Settings
    settings: {
      timeLimit: {
        type: Number, // in minutes
        default: 30,
      },
      shuffleQuestions: {
        type: Boolean,
        default: false,
      },
      shuffleOptions: {
        type: Boolean,
        default: false,
      },
      showSolutions: {
        type: Boolean,
        default: true,
      },
      allowRetake: {
        type: Boolean,
        default: true,
      },
      passingScore: {
        type: Number,
        default: 60,
      },
    },
    // Type
    type: {
      type: String,
      enum: ['live', 'practice'],
      default: 'practice',
    },
    // Schedule
    startTime: Date,
    endTime: Date,
    // Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
