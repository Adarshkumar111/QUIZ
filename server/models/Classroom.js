import mongoose from 'mongoose';

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Classroom name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['student', 'moderator', 'teacher'],
          default: 'student',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      allowDiscussions: {
        type: Boolean,
        default: true,
      },
      maxStudents: {
        type: Number,
        default: 100,
      },
      autoApproveNotes: {
        type: Boolean,
        default: false,
      },
    },
    topics: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: String,
        videos: [
          {
            title: {
              type: String,
              required: true,
              trim: true,
            },
            description: String,
            kind: {
              type: String,
              enum: ['url', 'upload'],
              required: true,
            },
            url: {
              type: String,
              required: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Generate unique invite code
classroomSchema.pre('save', async function (next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

const Classroom = mongoose.model('Classroom', classroomSchema);

export default Classroom;
