import mongoose from 'mongoose';

const liveClassSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
    },
    meetingId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'ended'],
      default: 'upcoming',
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number, // in minutes
    recordingUrl: String,
    recordingId: String,
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const LiveClass = mongoose.model('LiveClass', liveClassSchema);

export default LiveClass;
