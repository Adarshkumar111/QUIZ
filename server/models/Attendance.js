import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveClass',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinTime: {
      type: Date,
      default: Date.now,
    },
    leaveTime: Date,
    totalMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total minutes on save if leaveTime is present
attendanceSchema.pre('save', function (next) {
  if (this.joinTime && this.leaveTime) {
    const diff = this.leaveTime.getTime() - this.joinTime.getTime();
    this.totalMinutes = Math.round(diff / 60000);
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
